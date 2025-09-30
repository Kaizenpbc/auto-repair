/*
  # Add Workflow Support Tables

  ## Overview
  Adds supporting tables for complete work order lifecycle management including
  assignment history, communications, and quality control.

  ## 1. New Tables

  ### `work_order_assignments`
  History of technician assignments to work orders
  - `id` (uuid, primary key)
  - `work_order_id` (uuid, foreign key)
  - `technician_id` (uuid, foreign key)
  - `assigned_at` (timestamptz) - When assignment was made
  - `assigned_by` (text) - Who made the assignment
  - `expected_start` (timestamptz) - Expected start time
  - `created_at` (timestamptz)

  ### `work_order_communications`
  Log of all customer communications
  - `id` (uuid, primary key)
  - `work_order_id` (uuid, foreign key)
  - `communication_type` (text) - SMS, EMAIL, PHONE, IN_PERSON
  - `direction` (text) - OUTBOUND, INBOUND
  - `subject` (text) - Brief subject
  - `message` (text) - Communication content
  - `sent_by` (text) - Staff member
  - `created_at` (timestamptz)

  ### `quality_checks`
  Quality control inspection records
  - `id` (uuid, primary key)
  - `work_order_id` (uuid, foreign key)
  - `inspector` (text) - Who performed QC
  - `checklist_items` (jsonb) - Flexible QC checklist
  - `test_drive_performed` (boolean)
  - `test_drive_notes` (text)
  - `overall_status` (text) - PASSED, FAILED, PENDING
  - `failure_reasons` (text)
  - `inspected_at` (timestamptz)
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all new tables
  - Demo-friendly policies for anonymous and authenticated access
*/

-- Create work_order_assignments table
CREATE TABLE IF NOT EXISTS work_order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES technicians(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by text DEFAULT 'Manager',
  expected_start timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create work_order_communications table
CREATE TABLE IF NOT EXISTS work_order_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  communication_type text DEFAULT 'PHONE',
  direction text DEFAULT 'OUTBOUND',
  subject text DEFAULT '',
  message text DEFAULT '',
  sent_by text DEFAULT 'Staff',
  created_at timestamptz DEFAULT now()
);

-- Create quality_checks table
CREATE TABLE IF NOT EXISTS quality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  inspector text DEFAULT 'Inspector',
  checklist_items jsonb DEFAULT '[]'::jsonb,
  test_drive_performed boolean DEFAULT false,
  test_drive_notes text DEFAULT '',
  overall_status text DEFAULT 'PENDING',
  failure_reasons text DEFAULT '',
  inspected_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE work_order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous demo access
CREATE POLICY "Allow anonymous access for demo" ON work_order_assignments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access for demo" ON work_order_communications FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access for demo" ON quality_checks FOR ALL TO anon USING (true) WITH CHECK (true);

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated access" ON work_order_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON work_order_communications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON quality_checks FOR ALL TO authenticated USING (true) WITH CHECK (true);