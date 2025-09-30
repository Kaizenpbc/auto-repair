/*
  # Add Maintenance Intervals Catalog

  1. New Tables
    - `maintenance_intervals`
      - `id` (uuid, primary key)
      - `make` (text) - Vehicle make (can be NULL for universal)
      - `model` (text) - Vehicle model (can be NULL for make-wide)
      - `year_start` (integer) - Starting year (can be NULL for all years)
      - `year_end` (integer) - Ending year (can be NULL for all years)
      - `service_type` (text) - Type of service (OIL_CHANGE, BRAKE_INSPECTION, etc.)
      - `service_name` (text) - Display name
      - `interval_miles` (integer) - Mileage interval
      - `interval_months` (integer) - Time interval
      - `first_service_miles` (integer) - When first service is due
      - `estimated_cost_min` (numeric) - Minimum estimated cost
      - `estimated_cost_max` (numeric) - Maximum estimated cost
      - `priority` (text) - HIGH, MEDIUM, LOW
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `part_lifespans`
      - `id` (uuid, primary key)
      - `part_category` (text) - BRAKE_PADS, TIRES, BATTERY, etc.
      - `part_name` (text) - Display name
      - `make` (text) - Vehicle make (can be NULL for universal)
      - `model` (text) - Vehicle model (can be NULL for make-wide)
      - `average_lifespan_miles` (integer) - Typical mileage life
      - `average_lifespan_months` (integer) - Typical time life
      - `warning_threshold_percent` (numeric) - When to warn (0.8 = 80% of lifespan)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read (write restricted to admins in future)

  3. Important Notes
    - These tables provide the "rules" for predictive maintenance
    - More specific rules (make/model/year) take precedence over general rules
    - This is the "tech-based" prediction layer
    - AI layer will come later based on actual shop data
*/

CREATE TABLE IF NOT EXISTS maintenance_intervals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text,
  model text,
  year_start integer,
  year_end integer,
  service_type text NOT NULL,
  service_name text NOT NULL,
  interval_miles integer,
  interval_months integer,
  first_service_miles integer,
  estimated_cost_min numeric DEFAULT 0,
  estimated_cost_max numeric DEFAULT 0,
  priority text DEFAULT 'MEDIUM',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS part_lifespans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_category text NOT NULL,
  part_name text NOT NULL,
  make text,
  model text,
  average_lifespan_miles integer,
  average_lifespan_months integer,
  warning_threshold_percent numeric DEFAULT 0.80,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE maintenance_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_lifespans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read maintenance intervals"
  ON maintenance_intervals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert maintenance intervals"
  ON maintenance_intervals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update maintenance intervals"
  ON maintenance_intervals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read part lifespans"
  ON part_lifespans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert part lifespans"
  ON part_lifespans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update part lifespans"
  ON part_lifespans FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_maintenance_intervals_vehicle
  ON maintenance_intervals(make, model, year_start, year_end);

CREATE INDEX IF NOT EXISTS idx_maintenance_intervals_service_type
  ON maintenance_intervals(service_type);

CREATE INDEX IF NOT EXISTS idx_part_lifespans_category
  ON part_lifespans(part_category);

CREATE INDEX IF NOT EXISTS idx_part_lifespans_vehicle
  ON part_lifespans(make, model);

-- Insert some universal maintenance intervals (applies to all vehicles)
INSERT INTO maintenance_intervals (make, model, service_type, service_name, interval_miles, interval_months, first_service_miles, estimated_cost_min, estimated_cost_max, priority)
VALUES
  (NULL, NULL, 'OIL_CHANGE', 'Oil Change', 5000, 6, 5000, 40, 80, 'HIGH'),
  (NULL, NULL, 'TIRE_ROTATION', 'Tire Rotation', 5000, 6, 5000, 30, 60, 'MEDIUM'),
  (NULL, NULL, 'BRAKE_INSPECTION', 'Brake Inspection', 10000, 12, 10000, 0, 50, 'HIGH'),
  (NULL, NULL, 'AIR_FILTER', 'Engine Air Filter Replacement', 15000, 12, 15000, 25, 60, 'MEDIUM'),
  (NULL, NULL, 'CABIN_FILTER', 'Cabin Air Filter Replacement', 15000, 12, 15000, 25, 50, 'LOW'),
  (NULL, NULL, 'BATTERY_TEST', 'Battery Test', 30000, 24, 30000, 0, 30, 'MEDIUM'),
  (NULL, NULL, 'COOLANT_FLUSH', 'Coolant System Flush', 30000, 24, 30000, 100, 200, 'MEDIUM'),
  (NULL, NULL, 'TRANSMISSION_FLUID', 'Transmission Fluid Change', 60000, 48, 60000, 150, 300, 'HIGH'),
  (NULL, NULL, 'SPARK_PLUGS', 'Spark Plug Replacement', 30000, 36, 30000, 100, 250, 'MEDIUM'),
  (NULL, NULL, 'TIMING_BELT', 'Timing Belt Replacement', 100000, 84, 100000, 500, 1000, 'HIGH'),
  (NULL, NULL, 'WHEEL_ALIGNMENT', 'Wheel Alignment', 20000, 24, 20000, 75, 150, 'MEDIUM')
ON CONFLICT DO NOTHING;

-- Insert some universal part lifespans
INSERT INTO part_lifespans (part_category, part_name, make, model, average_lifespan_miles, average_lifespan_months, warning_threshold_percent)
VALUES
  ('BRAKE_PADS_FRONT', 'Front Brake Pads', NULL, NULL, 35000, 36, 0.85),
  ('BRAKE_PADS_REAR', 'Rear Brake Pads', NULL, NULL, 40000, 36, 0.85),
  ('BRAKE_ROTORS', 'Brake Rotors', NULL, NULL, 70000, 60, 0.85),
  ('TIRES', 'Tires', NULL, NULL, 50000, 60, 0.80),
  ('BATTERY', 'Battery', NULL, NULL, 60000, 48, 0.75),
  ('WIPER_BLADES', 'Wiper Blades', NULL, NULL, 10000, 12, 0.80),
  ('SERPENTINE_BELT', 'Serpentine Belt', NULL, NULL, 60000, 60, 0.85),
  ('SHOCKS_STRUTS', 'Shocks/Struts', NULL, NULL, 75000, 84, 0.80)
ON CONFLICT DO NOTHING;