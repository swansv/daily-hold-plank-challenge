-- Admin RLS Policies for plank_logs and activity_feed
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: Admin RLS Policies for plank_logs
-- ============================================

-- Admins can view all plank logs
CREATE POLICY "Admins can view all plank logs"
  ON plank_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Admins can delete any plank log
CREATE POLICY "Admins can delete plank logs"
  ON plank_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.is_admin = true
    )
  );

-- ============================================
-- PART 2: Admin RLS Policies for activity_feed
-- ============================================

-- Admins can view all activity feed entries
CREATE POLICY "Admins can view all activity feed"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Admins can delete any activity feed entry
CREATE POLICY "Admins can delete activity feed"
  ON activity_feed FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.is_admin = true
    )
  );

-- ============================================
-- PART 3: Admin RLS Policies for users table (for updating total_plank_seconds)
-- ============================================

-- Admins can update any user record
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_admin = true
    )
  );
