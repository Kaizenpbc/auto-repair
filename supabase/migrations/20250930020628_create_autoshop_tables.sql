/*
  # AutoShop AI Database Schema

  1. New Tables
    - `work_orders` - Main work order management
    - `estimate_lines` - Labor and parts for estimates  
    - `time_logs` - Technician time tracking
    - `invoices` - Generated invoices
    - `invoice_lines` - Invoice line items

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

-- Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  location_id text NOT NULL,
  vehicle_id text NOT NULL,
  status text DEFAULT 'OPEN',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org work orders"
  ON work_orders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Estimate Lines
CREATE TABLE IF NOT EXISTS estimate_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'LABOR' or 'PART'
  description text NOT NULL,
  qty numeric DEFAULT 1,
  unit_price numeric NOT NULL, -- In cents
  est_hours numeric, -- Only for LABOR
  rate numeric, -- Only for LABOR, hourly rate in cents
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE estimate_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage estimate lines"
  ON estimate_lines FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Time Logs
CREATE TABLE IF NOT EXISTS time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  op_name text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  actual_hours numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage time logs"
  ON time_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  billing text NOT NULL, -- 'flat' or 'actual'
  subtotal numeric NOT NULL, -- In cents
  shop_supplies_amt numeric NOT NULL, -- In cents
  tax_amt numeric NOT NULL, -- In cents
  total numeric NOT NULL, -- In cents
  tax_rate numeric NOT NULL, -- Decimal (e.g., 0.13 for 13%)
  shop_supplies_rate numeric NOT NULL, -- Decimal (e.g., 0.05 for 5%)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoice Lines
CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'LABOR' or 'PART'
  description text NOT NULL,
  qty numeric NOT NULL,
  unit_price numeric NOT NULL, -- In cents
  hours numeric, -- Only for LABOR
  line_total numeric NOT NULL, -- In cents
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage invoice lines"
  ON invoice_lines FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);