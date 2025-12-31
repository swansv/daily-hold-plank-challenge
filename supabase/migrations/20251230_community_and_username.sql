-- Community Feature and Username Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: Add username column to users table
-- ============================================

-- Add username column (unique, required for new users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(20);

-- Create unique index for username
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;

-- ============================================
-- PART 2: Community Posts Table
-- ============================================

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  emoji_type VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by user and time
CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);

-- ============================================
-- PART 3: Post Reactions Table
-- ============================================

CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON post_reactions(user_id);

-- ============================================
-- PART 4: Enable RLS
-- ============================================

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 5: RLS Policies for community_posts
-- ============================================

-- Users can view posts from their company only
CREATE POLICY "Users can view posts from their company"
  ON community_posts FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.company_id = (
        SELECT company_id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Users can create posts
CREATE POLICY "Users can create posts"
  ON community_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON community_posts FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- ============================================
-- PART 6: RLS Policies for post_reactions
-- ============================================

-- Users can view reactions on posts from their company
CREATE POLICY "Users can view reactions from their company"
  ON post_reactions FOR SELECT
  TO authenticated
  USING (
    post_id IN (
      SELECT cp.id FROM community_posts cp
      JOIN users u ON cp.user_id = u.id
      WHERE u.company_id = (
        SELECT company_id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Users can add reactions
CREATE POLICY "Users can add reactions"
  ON post_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
  ON post_reactions FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );
