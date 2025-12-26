-- Company Milestones Migration
-- Run this in Supabase SQL Editor

-- Table for company milestone definitions
CREATE TABLE IF NOT EXISTS company_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  emoji VARCHAR(10) NOT NULL,
  threshold_seconds INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default company milestones
INSERT INTO company_milestones (name, emoji, threshold_seconds, description) VALUES
  ('Bronze', '🥉', 30000, '500 total minutes of planking'),
  ('Silver', '🥈', 60000, '1,000 total minutes of planking'),
  ('Gold', '🥇', 150000, '2,500 total minutes of planking'),
  ('Platinum', '🏆', 300000, '5,000 total minutes of planking')
ON CONFLICT (name) DO NOTHING;

-- Table to track which companies have achieved which milestones
CREATE TABLE IF NOT EXISTS company_milestone_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES company_milestones(id) ON DELETE CASCADE,
  milestone_name VARCHAR(100) NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_seconds_at_achievement INTEGER NOT NULL,
  UNIQUE(company_id, milestone_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_milestone_achievements_company
  ON company_milestone_achievements(company_id);

-- Enable RLS
ALTER TABLE company_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_milestone_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_milestones (read-only for all authenticated users)
CREATE POLICY "Anyone can view company milestones"
  ON company_milestones FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for company_milestone_achievements
CREATE POLICY "Users can view their company milestone achievements"
  ON company_milestone_achievements FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert company milestone achievements for their company"
  ON company_milestone_achievements FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE auth_user_id = auth.uid()
    )
  );
