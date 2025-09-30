/*
  # Add Created By Field to Work Orders

  1. Changes
    - Add `created_by` column to `work_orders` table to track who created each work order
    - This will store the name of the service advisor or manager who created the work order

  2. Notes
    - Field is optional (nullable) to support existing records
    - New work orders should populate this field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN created_by text;
  END IF;
END $$;