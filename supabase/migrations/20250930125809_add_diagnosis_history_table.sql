/*
  # Add Diagnosis History Table

  1. New Tables
    - `diagnosis_history`
      - `id` (uuid, primary key)
      - `work_order_id` (uuid, references work_orders)
      - `version` (integer) - Version number of the diagnosis
      - `additional_findings` (text) - Diagnostic findings at this version
      - `recommended_services` (text) - Recommended services at this version
      - `estimated_total` (numeric) - Total estimate at this version
      - `service_lines` (jsonb) - Service line items
      - `part_lines` (jsonb) - Part line items
      - `created_by` (text) - Who created this diagnosis version
      - `revision_reason` (text) - Why revision was requested (if applicable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `diagnosis_history` table
    - Add policy for authenticated users to read diagnosis history
    - Add policy for authenticated users to insert diagnosis history

  3. Important Notes
    - This table maintains a complete history of all diagnosis versions
    - When a work order is sent back for revision, the current diagnosis is archived here
    - Technicians can reference previous diagnoses when making revisions
    - Version numbers increment with each revision (1, 2, 3, etc.)
*/

CREATE TABLE IF NOT EXISTS diagnosis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id),
  version integer NOT NULL DEFAULT 1,
  additional_findings text DEFAULT '',
  recommended_services text DEFAULT '',
  estimated_total numeric DEFAULT 0,
  service_lines jsonb DEFAULT '[]'::jsonb,
  part_lines jsonb DEFAULT '[]'::jsonb,
  created_by text DEFAULT 'Technician',
  revision_reason text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE diagnosis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read diagnosis history"
  ON diagnosis_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert diagnosis history"
  ON diagnosis_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_diagnosis_history_work_order 
  ON diagnosis_history(work_order_id, version DESC);