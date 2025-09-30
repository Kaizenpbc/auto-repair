/*
  # Add Parts Inventory and Materials Management System

  1. New Tables
    - `parts_inventory` - Master catalog of all available parts
      - `id` (uuid, primary key)
      - `part_number` (text, unique) - Part SKU/number
      - `name` (text) - Display name
      - `description` (text) - Detailed description
      - `category` (text) - Oil, Brakes, Engine, etc.
      - `unit_cost` (numeric) - What shop pays
      - `unit_price` (numeric) - What customer pays
      - `current_stock` (numeric) - Quantity on hand
      - `min_stock_level` (numeric) - Reorder point
      - `supplier` (text) - Where to order from
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `parts_used` - Track actual parts consumption per work order
      - `id` (uuid, primary key)
      - `work_order_id` (uuid, foreign key)
      - `part_id` (uuid, foreign key to parts_inventory)
      - `quantity_used` (numeric) - How many used
      - `cost_each` (numeric) - Unit cost at time of use
      - `price_each` (numeric) - Unit price charged to customer
      - `technician` (text) - Who used the part
      - `used_at` (timestamptz) - When part was consumed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for anonymous demo access and authenticated users
*/

-- Parts Inventory Master Catalog
CREATE TABLE IF NOT EXISTS parts_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'General',
  unit_cost numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  current_stock numeric DEFAULT 0,
  min_stock_level numeric DEFAULT 5,
  supplier text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Parts Usage Tracking
CREATE TABLE IF NOT EXISTS parts_used (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id),
  part_id uuid REFERENCES parts_inventory(id),
  quantity_used numeric NOT NULL DEFAULT 1,
  cost_each numeric NOT NULL DEFAULT 0,
  price_each numeric NOT NULL DEFAULT 0,
  technician text DEFAULT 'Technician',
  used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE parts_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_used ENABLE ROW LEVEL SECURITY;

-- Demo-friendly policies (allow anonymous access)
CREATE POLICY "Allow anonymous access for demo" ON parts_inventory FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access for demo" ON parts_used FOR ALL TO anon USING (true) WITH CHECK (true);

-- Also allow authenticated users
CREATE POLICY "Allow authenticated access" ON parts_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON parts_used FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert sample parts data
INSERT INTO parts_inventory (part_number, name, description, category, unit_cost, unit_price, current_stock, min_stock_level, supplier) VALUES
  ('BP-001', 'Brake Pads - Front', 'Ceramic brake pads for front wheels', 'Brakes', 45.00, 89.99, 12, 3, 'AutoParts Direct'),
  ('BP-002', 'Brake Pads - Rear', 'Ceramic brake pads for rear wheels', 'Brakes', 38.00, 79.99, 8, 3, 'AutoParts Direct'),
  ('OIL-5W30', '5W-30 Motor Oil', 'Full synthetic 5W-30 motor oil (1 quart)', 'Oil', 4.50, 12.99, 24, 6, 'Oil Supply Co'),
  ('FILTER-001', 'Oil Filter', 'Standard oil filter', 'Oil', 6.00, 15.99, 18, 5, 'Filter Plus'),
  ('SPARK-001', 'Spark Plugs', 'Iridium spark plugs (set of 4)', 'Engine', 28.00, 59.99, 10, 2, 'Engine Parts Ltd'),
  ('AIR-FILTER', 'Air Filter', 'Engine air filter', 'Engine', 8.50, 24.99, 15, 4, 'Filter Plus'),
  ('BRAKE-FLUID', 'Brake Fluid', 'DOT 3 brake fluid (12 oz)', 'Brakes', 3.25, 8.99, 20, 5, 'Fluid Systems'),
  ('COOLANT-001', 'Engine Coolant', 'Pre-mixed engine coolant (1 gallon)', 'Engine', 12.00, 19.99, 6, 2, 'Coolant Co')
ON CONFLICT (part_number) DO NOTHING;