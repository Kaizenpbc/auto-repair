/*
  # Add Labor Rates and Service Catalog

  ## Overview
  Adds configurable labor rates and a service catalog with predefined labor times
  for common automotive services.

  ## 1. New Tables

  ### `labor_rates`
  Configurable labor rates for the shop
  - `id` (uuid, primary key)
  - `rate_name` (text) - Description (e.g., "Standard Rate", "Master Tech Rate")
  - `hourly_rate` (numeric) - Rate in dollars per hour
  - `is_default` (boolean) - Whether this is the default rate
  - `is_active` (boolean) - Whether this rate is currently in use
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `service_catalog`
  Pre-defined services with estimated labor times
  - `id` (uuid, primary key)
  - `service_code` (text, unique) - Service identifier
  - `service_name` (text) - Display name
  - `category` (text) - Brakes, Engine, Oil Change, etc.
  - `description` (text) - Detailed description
  - `estimated_hours` (numeric) - Labor time estimate
  - `requires_parts` (boolean) - Whether this service typically needs parts
  - `common_parts` (text[]) - Array of commonly used part numbers
  - `is_active` (boolean) - Whether this service is currently offered
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Security
  - Enable RLS on both tables
  - Demo-friendly policies for anonymous and authenticated access

  ## 3. Sample Data
  - Insert default labor rates
  - Insert common automotive services
*/

-- Create labor_rates table
CREATE TABLE IF NOT EXISTS labor_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_name text NOT NULL,
  hourly_rate numeric NOT NULL DEFAULT 0,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service_catalog table
CREATE TABLE IF NOT EXISTS service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code text UNIQUE NOT NULL,
  service_name text NOT NULL,
  category text DEFAULT 'General',
  description text DEFAULT '',
  estimated_hours numeric NOT NULL DEFAULT 0,
  requires_parts boolean DEFAULT false,
  common_parts text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous demo access
CREATE POLICY "Allow anonymous access for demo" ON labor_rates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access for demo" ON service_catalog FOR ALL TO anon USING (true) WITH CHECK (true);

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated access" ON labor_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON service_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default labor rates
INSERT INTO labor_rates (rate_name, hourly_rate, is_default, is_active) VALUES
  ('Standard Rate', 95.00, true, true),
  ('Master Technician Rate', 120.00, false, true),
  ('Apprentice Rate', 75.00, false, true),
  ('Diagnostic Rate', 110.00, false, true)
ON CONFLICT DO NOTHING;

-- Insert common services
INSERT INTO service_catalog (service_code, service_name, category, description, estimated_hours, requires_parts, common_parts, is_active) VALUES
  ('OIL-CHANGE', 'Oil Change', 'Maintenance', 'Oil and filter change', 0.5, true, ARRAY['OIL-5W30', 'FILTER-001'], true),
  ('BRAKE-PAD-F', 'Front Brake Pad Replacement', 'Brakes', 'Replace front brake pads and resurface rotors', 2.0, true, ARRAY['BP-001'], true),
  ('BRAKE-PAD-R', 'Rear Brake Pad Replacement', 'Brakes', 'Replace rear brake pads and resurface rotors', 1.5, true, ARRAY['BP-002'], true),
  ('BRAKE-FLUID', 'Brake Fluid Flush', 'Brakes', 'Complete brake fluid flush and bleed', 1.0, true, ARRAY['BRAKE-FLUID'], true),
  ('TIRE-ROTATE', 'Tire Rotation', 'Tires', 'Rotate all four tires', 0.5, false, ARRAY[]::text[], true),
  ('WHEEL-ALIGN', 'Wheel Alignment', 'Tires', 'Four-wheel alignment', 1.0, false, ARRAY[]::text[], true),
  ('AIR-FILTER', 'Air Filter Replacement', 'Maintenance', 'Replace engine air filter', 0.25, true, ARRAY['AIR-FILTER'], true),
  ('SPARK-PLUGS', 'Spark Plug Replacement', 'Engine', 'Replace spark plugs (4-cylinder)', 1.5, true, ARRAY['SPARK-001'], true),
  ('BATTERY-TEST', 'Battery Test & Replace', 'Electrical', 'Test battery and replace if needed', 0.5, true, ARRAY[]::text[], true),
  ('COOLANT-FLUSH', 'Coolant Flush', 'Engine', 'Complete coolant system flush', 1.5, true, ARRAY['COOLANT-001'], true),
  ('TRANS-FLUID', 'Transmission Fluid Service', 'Transmission', 'Drain and refill transmission fluid', 1.0, true, ARRAY[]::text[], true),
  ('DIAG-CHECK', 'Diagnostic Inspection', 'Diagnostics', 'Comprehensive vehicle diagnostic scan', 1.0, false, ARRAY[]::text[], true),
  ('STRUT-FRONT', 'Front Strut Replacement', 'Suspension', 'Replace front struts (pair)', 3.0, true, ARRAY[]::text[], true),
  ('SHOCK-REAR', 'Rear Shock Replacement', 'Suspension', 'Replace rear shocks (pair)', 2.0, true, ARRAY[]::text[], true)
ON CONFLICT (service_code) DO NOTHING;