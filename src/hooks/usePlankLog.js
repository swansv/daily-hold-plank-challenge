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

  const COMPANY_MILESTONES = [
    { name: 'Bronze', emoji: '🥉', seconds: 30000, label: '500 minutes' },
    { name: 'Silver', emoji: '🥈', seconds: 60000, label: '1,000 minutes' },
    { name: 'Gold', emoji: '🥇', seconds: 150000, label: '2,500 minutes' },
    { name: 'Platinum', emoji: '🏆', seconds: 300000, label: '5,000 minutes' },
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

  const checkCompanyMilestones = useCallback(
    async (oldTotal, newTotal) => {
      const achievedMilestones = [];

      for (const milestone of COMPANY_MILESTONES) {
        if (oldTotal < milestone.seconds && newTotal >= milestone.seconds) {
          achievedMilestones.push(milestone);
        }
      }

      return achievedMilestones;
    },
    []
  );

  const recordCompanyMilestones = useCallback(
    async (milestones, companyTotal) => {
      if (!profile?.company_id) return;

      try {
        for (const milestone of milestones) {
          // Check if milestone already exists for this company
          const { data: existing } = await supabase
            .from('company_milestone_achievements')
            .select('id')
            .eq('company_id', profile.company_id)
            .eq('milestone_name', milestone.name)
            .single();

          if (!existing) {
            // Get milestone id from company_milestones table
            const { data: milestoneData } = await supabase
              .from('company_milestones')
              .select('id')
              .eq('name', milestone.name)
              .single();

            if (milestoneData) {
              // Record company milestone achievement
              const { error: achievementError } = await supabase
                .from('company_milestone_achievements')
                .insert([
                  {
                    company_id: profile.company_id,
                    milestone_id: milestoneData.id,
                    milestone_name: milestone.name,
                    total_seconds_at_achievement: companyTotal,
                  },
                ]);

              if (achievementError) {
                console.error('Error recording company milestone:', achievementError);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error recording company milestones:', err);
      }
    },
    [profile]
  );

  const createCompanyMilestoneActivity = useCallback(
    async (milestones) => {
      if (!profile?.company_id) return;

      try {
        const activities = milestones.map((milestone) => ({
          company_id: profile.company_id,
          user_id: profile.id,
          activity_type: 'company_milestone_achieved',
          message: `Company achieved ${milestone.emoji} ${milestone.name} milestone (${milestone.label})!`,
          metadata: { milestone: milestone.name, threshold: milestone.seconds },
          created_at: new Date().toISOString(),
        }));

        if (activities.length > 0) {
          const { error } = await supabase
            .from('activity_feed')
            .insert(activities);

          if (error) throw error;
        }
      } catch (err) {
        console.error('Error creating company milestone activity:', err);
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

        // 3. Check for individual milestone achievements
        const achievedMilestones = await checkMilestones(oldTotal, newTotal);

        // 4. Record individual milestones
        if (achievedMilestones.length > 0) {
          await recordMilestones(achievedMilestones);
        }

        // 5. Create activity feed entries for individual milestones
        await createActivityFeedEntry(durationSeconds, achievedMilestones);

        // 6. Check for company milestone achievements
        let achievedCompanyMilestones = [];
        if (profile?.company_id) {
          // Get company total
          const { data: companyUsers, error: companyError } = await supabase
            .from('users')
            .select('total_plank_seconds')
            .eq('company_id', profile.company_id);

          if (!companyError && companyUsers) {
            const oldCompanyTotal = companyUsers.reduce(
              (sum, u) => sum + (u.total_plank_seconds || 0),
              0
            ) - durationSeconds; // Subtract the duration we just added to get old total
            const newCompanyTotal = oldCompanyTotal + durationSeconds;

            achievedCompanyMilestones = await checkCompanyMilestones(
              oldCompanyTotal,
              newCompanyTotal
            );

            // 7. Record company milestones
            if (achievedCompanyMilestones.length > 0) {
              await recordCompanyMilestones(achievedCompanyMilestones, newCompanyTotal);
              await createCompanyMilestoneActivity(achievedCompanyMilestones);
            }
          }
        }

        setLoading(false);
        return {
          success: true,
          newTotal,
          achievedMilestones,
          achievedCompanyMilestones,
        };
      } catch (err) {
        console.error('Error logging plank:', err);
        setError(err.message);
        setLoading(false);
        return { success: false, error: err.message };
      }
    },
    [user, profile, checkMilestones, recordMilestones, createActivityFeedEntry, checkCompanyMilestones, recordCompanyMilestones, createCompanyMilestoneActivity]
  );

  return {
    logPlank,
    loading,
    error,
  };
};
