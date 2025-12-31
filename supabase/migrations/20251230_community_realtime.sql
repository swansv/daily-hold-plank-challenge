-- Community Real-time and Performance Migration
-- Run this in Supabase SQL Editor AFTER the main community migration

-- ============================================
-- PART 1: Enable Real-time Replication
-- ============================================

-- Enable real-time for community_posts table
ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;

-- Enable real-time for post_reactions table
ALTER PUBLICATION supabase_realtime ADD TABLE post_reactions;

-- ============================================
-- PART 2: Additional Performance Indexes
-- ============================================

-- Composite index for fetching posts by company (via user's company_id)
-- This helps the RLS policy perform faster lookups
CREATE INDEX IF NOT EXISTS idx_community_posts_user_created
  ON community_posts(user_id, created_at DESC);

-- Index for faster reaction lookups by post
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_emoji
  ON post_reactions(post_id, emoji);

-- Index on users.company_id for faster company-scoped queries
CREATE INDEX IF NOT EXISTS idx_users_company_id
  ON users(company_id);
