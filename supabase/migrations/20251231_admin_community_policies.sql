-- Admin Community Moderation RLS Policies
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: Admin RLS Policies for community_posts
-- ============================================

-- Admins can view all posts from any company
CREATE POLICY "Admins can view all posts"
  ON community_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Admins can delete any post
CREATE POLICY "Admins can delete any post"
  ON community_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.is_admin = true
    )
  );

-- ============================================
-- PART 2: Admin RLS Policies for post_reactions
-- ============================================

-- Admins can view all reactions from any company
CREATE POLICY "Admins can view all reactions"
  ON post_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Admins can delete any reaction (for cleanup when deleting posts)
CREATE POLICY "Admins can delete any reaction"
  ON post_reactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.is_admin = true
    )
  );
