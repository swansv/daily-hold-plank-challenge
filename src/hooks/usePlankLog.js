import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const usePlankLog = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const MILESTONES = [
    { name: 'Beginner', seconds: 600, label: '10 minutes' },
    { name: 'Intermediate', seconds: 1800, label: '30 minutes' },
    { name: 'Advanced', seconds: 3600, label: '60 minutes' },
    { name: 'Expert', seconds: 7200, label: '2 hours' },
    { name: 'Master', seconds: 14400, label: '4 hours' },
  ];

  const checkMilestones = useCallback(
    async (oldTotal, newTotal) => {
      const achievedMilestones = [];

      for (const milestone of MILESTONES) {
        if (oldTotal < milestone.seconds && newTotal >= milestone.seconds) {
          achievedMilestones.push(milestone);
        }
      }

      return achievedMilestones;
    },
    []
  );

  const createActivityFeedEntry = useCallback(
    async (duration, milestones) => {
      try {
        const activities = [];
        const now = new Date().toISOString();

        // Add plank log activity
        activities.push({
          company_id: profile.company_id,
          user_id: profile.id,
          activity_type: 'plank_logged',
          message: `Logged a ${Math.floor(duration / 60)}m ${
            duration % 60
          }s plank`,
          metadata: { duration_seconds: duration },
          created_at: now,
        });

        // Add milestone activities
        for (const milestone of milestones) {
          activities.push({
            company_id: profile.company_id,
            user_id: profile.id,
            activity_type: 'milestone_achieved',
            message: `Achieved ${milestone.name} milestone (${milestone.label})`,
            metadata: { milestone: milestone.name, threshold: milestone.seconds },
            created_at: now,
          });
        }

        if (activities.length > 0) {
          const { error } = await supabase
            .from('activity_feed')
            .insert(activities);

          if (error) throw error;
        }
      } catch (err) {
        console.error('Error creating activity feed entries:', err);
      }
    },
    [profile]
  );

  const recordMilestones = useCallback(
    async (milestones) => {
      try {
        for (const milestone of milestones) {
          // Check if milestone already exists for this user
          const { data: existing } = await supabase
            .from('user_milestones')
            .select('id')
            .eq('user_id', profile.id)
            .eq('milestone_name', milestone.name)
            .single();

          if (!existing) {
            // Get or create milestone
            let milestoneId;
            const { data: milestoneData } = await supabase
              .from('milestones')
              .select('id')
              .eq('name', milestone.name)
              .single();

            if (milestoneData) {
              milestoneId = milestoneData.id;
            } else {
              // Create milestone if it doesn't exist
              const { data: newMilestone, error: createError } = await supabase
                .from('milestones')
                .insert([
                  {
                    name: milestone.name,
                    description: `Reach ${milestone.label} of total plank time`,
                    threshold_seconds: milestone.seconds,
                  },
                ])
                .select()
                .single();

              if (createError) throw createError;
              milestoneId = newMilestone.id;
            }

            // Record user milestone achievement
            const { error: userMilestoneError } = await supabase
              .from('user_milestones')
              .insert([
                {
                  user_id: profile.id,
                  milestone_id: milestoneId,
                  milestone_name: milestone.name,
                },
              ]);

            if (userMilestoneError) throw userMilestoneError;
          }
        }
      } catch (err) {
        console.error('Error recording milestones:', err);
      }
    },
    [profile]
  );

  const logPlank = useCallback(
    async (durationSeconds) => {
      if (!user || !profile) {
        setError('You must be logged in to log a plank');
        return { success: false, error: 'Not authenticated' };
      }

      // Prevent multiple simultaneous submissions
      if (loading) {
        return { success: false, error: 'Already logging a plank' };
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Fetch the latest total from database to avoid race conditions
        const { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('total_plank_seconds')
          .eq('id', profile.id)
          .single();

        if (fetchError) throw fetchError;

        const oldTotal = userData.total_plank_seconds || 0;
        const newTotal = oldTotal + durationSeconds;

        // 2. Create plank log entry
        const { error: logError } = await supabase.from('plank_logs').insert([
          {
            user_id: profile.id,
            duration_seconds: durationSeconds,
            logged_at: new Date().toISOString(),
          },
        ]);

        if (logError) throw logError;

        // 3. Update user's total plank time
        const { error: updateError } = await supabase
          .from('users')
          .update({ total_plank_seconds: newTotal })
          .eq('id', profile.id);

        if (updateError) throw updateError;

        // 3. Check for milestone achievements
        const achievedMilestones = await checkMilestones(oldTotal, newTotal);

        // 4. Record milestones
        if (achievedMilestones.length > 0) {
          await recordMilestones(achievedMilestones);
        }

        // 5. Create activity feed entries
        await createActivityFeedEntry(durationSeconds, achievedMilestones);

        setLoading(false);
        return {
          success: true,
          newTotal,
          achievedMilestones,
        };
      } catch (err) {
        console.error('Error logging plank:', err);
        setError(err.message);
        setLoading(false);
        return { success: false, error: err.message };
      }
    },
    [user, profile, checkMilestones, recordMilestones, createActivityFeedEntry]
  );

  return {
    logPlank,
    loading,
    error,
  };
};
