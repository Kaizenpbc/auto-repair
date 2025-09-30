/*
  # Add Invoice Review, Customer Contact, and Delivery Tracking

  1. Changes to work_orders table
    - `invoice_created_at` - When manager created/finalized invoice
    - `invoice_created_by` - Manager who created invoice
    - `customer_contacted_at` - When customer was called about pickup/delivery
    - `customer_contacted_by` - Who called the customer
    - `fulfillment_method` - 'PICKUP' or 'DELIVERY'
    - `delivery_address` - Customer address for delivery
    - `delivery_scheduled_time` - When delivery is scheduled
    - `delivery_driver` - Name of driver assigned
    - `delivery_status` - 'PENDING', 'IN_TRANSIT', 'DELIVERED'
    - `vehicle_location` - Physical location (e.g., 'BAY_1', 'LOT_AWAITING_PICKUP', 'CASHIER', 'OUT_FOR_DELIVERY')
    - `payment_status` - 'PENDING', 'PAID', 'PARTIAL'
    - `payment_method` - 'CASH', 'CARD', 'CHECK', 'ACCOUNT'
    - `completed_at` - When work order was fully completed (customer left with vehicle)

  2. Security
    - Existing RLS policies apply to new columns

  3. Notes
    - All new fields are nullable to support existing records
    - Fields will be populated as work orders progress through new workflow stages
*/

-- Add invoice tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'invoice_created_at'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN invoice_created_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'invoice_created_by'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN invoice_created_by text;
  END IF;
END $$;

-- Add customer contact tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'customer_contacted_at'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN customer_contacted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'customer_contacted_by'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN customer_contacted_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'fulfillment_method'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN fulfillment_method text;
  END IF;
END $$;

-- Add delivery tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'delivery_address'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN delivery_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'delivery_scheduled_time'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN delivery_scheduled_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'delivery_driver'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN delivery_driver text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN delivery_status text DEFAULT 'PENDING';
  END IF;
END $$;

-- Add vehicle location and payment tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'vehicle_location'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN vehicle_location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN payment_status text DEFAULT 'PENDING';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN completed_at timestamptz;
  END IF;
END $$;