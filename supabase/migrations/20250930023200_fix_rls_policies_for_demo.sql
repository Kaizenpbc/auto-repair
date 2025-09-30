/*
  # Fix RLS Policies for Demo Application

  1. Changes
    - Update all RLS policies to allow anonymous access for demo purposes
    - Keep RLS enabled but allow anon role to perform all operations
    - This is appropriate for a demo but would need proper auth in production

  2. Security Note
    - These policies allow anonymous access for demo purposes
    - In production, you would want proper user authentication
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can manage their org work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can manage estimate lines" ON estimate_lines;
DROP POLICY IF EXISTS "Users can manage time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Users can manage invoice lines" ON invoice_lines;

-- Create demo-friendly policies that allow anonymous access
CREATE POLICY "Allow anonymous access for demo" ON work_orders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access for demo" ON estimate_lines FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access for demo" ON time_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access for demo" ON invoices FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access for demo" ON invoice_lines FOR ALL TO anon USING (true) WITH CHECK (true);

-- Also allow authenticated users (for future expansion)
CREATE POLICY "Allow authenticated access" ON work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON estimate_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON time_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON invoice_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);