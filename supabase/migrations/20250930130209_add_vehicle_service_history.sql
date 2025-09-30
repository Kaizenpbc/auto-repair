/*
  # Add Vehicle Service History System

  1. New Tables
    - `service_history`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, references vehicles)
      - `work_order_id` (uuid, references work_orders)
      - `service_date` (date) - Date service was completed
      - `mileage_at_service` (integer) - Vehicle mileage when serviced
      - `services_performed` (jsonb) - Array of services completed with details
      - `parts_replaced` (jsonb) - Array of parts replaced with details
      - `labor_total` (numeric) - Total labor cost
      - `parts_total` (numeric) - Total parts cost
      - `total_cost` (numeric) - Grand total
      - `technician_name` (text) - Who performed the work
      - `service_advisor` (text) - Who handled customer interaction
      - `customer_notes` (text) - Notes shared with customer
      - `internal_notes` (text) - Internal shop notes
      - `created_at` (timestamptz)

    - `future_recommendations`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, references vehicles)
      - `work_order_id` (uuid, references work_orders)
      - `recommendation` (text) - What should be done
      - `reason` (text) - Why it's recommended
      - `priority` (text) - HIGH, MEDIUM, LOW
      - `estimated_cost` (numeric) - Approximate cost
      - `recommended_mileage` (integer) - When it should be done by mileage
      - `recommended_date` (date) - When it should be done by date
      - `status` (text) - PENDING, COMPLETED, DECLINED, SUPERSEDED
      - `completed_on_work_order_id` (uuid) - If completed, which WO
      - `recommended_by` (text) - Who made the recommendation
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read/write history

  3. Important Notes
    - Service history is created when a work order is completed/invoiced
    - Future recommendations are tracked separately and updated when completed
    - This provides complete vehicle maintenance timeline for customer service
    - Recommendations follow the vehicle across multiple visits
*/

CREATE TABLE IF NOT EXISTS service_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id),
  work_order_id uuid REFERENCES work_orders(id),
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  mileage_at_service integer DEFAULT 0,
  services_performed jsonb DEFAULT '[]'::jsonb,
  parts_replaced jsonb DEFAULT '[]'::jsonb,
  labor_total numeric DEFAULT 0,
  parts_total numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  technician_name text DEFAULT 'Technician',
  service_advisor text DEFAULT 'Service Advisor',
  customer_notes text DEFAULT '',
  internal_notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS future_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id),
  work_order_id uuid REFERENCES work_orders(id),
  recommendation text NOT NULL,
  reason text DEFAULT '',
  priority text DEFAULT 'MEDIUM',
  estimated_cost numeric DEFAULT 0,
  recommended_mileage integer,
  recommended_date date,
  status text DEFAULT 'PENDING',
  completed_on_work_order_id uuid REFERENCES work_orders(id),
  recommended_by text DEFAULT 'Technician',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read service history"
  ON service_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert service history"
  ON service_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read future recommendations"
  ON future_recommendations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert future recommendations"
  ON future_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update future recommendations"
  ON future_recommendations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_service_history_vehicle 
  ON service_history(vehicle_id, service_date DESC);

CREATE INDEX IF NOT EXISTS idx_service_history_work_order 
  ON service_history(work_order_id);

CREATE INDEX IF NOT EXISTS idx_future_recommendations_vehicle 
  ON future_recommendations(vehicle_id, status);

CREATE INDEX IF NOT EXISTS idx_future_recommendations_work_order 
  ON future_recommendations(work_order_id);