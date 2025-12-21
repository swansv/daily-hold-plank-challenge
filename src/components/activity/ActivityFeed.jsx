import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
        },
        (payload) => {
          // Fetch the new activity with user data
          fetchSingleActivity(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select(`
          id,
          company_id,
          user_id,
          activity_type,
          message,
          metadata,
          created_at,
          users!inner (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleActivity = async (activityId) => {
    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select(`
          id,
          company_id,
          user_id,
          activity_type,
          message,
          metadata,
          created_at,
          users!inner (
            full_name
          )
        `)
        .eq('id', activityId)
        .single();

      if (error) throw error;

      setActivities((prev) => [data, ...prev.slice(0, 19)]);
    } catch (error) {
      console.error('Error fetching single activity:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getActivityIcon = (activity) => {
    const iconMap = {
      milestone_achieved: '🏆',
      plank_logged: '💪',
      level_up: '⬆️',
      streak: '🔥',
      default: '📝',
    };

    const icon = iconMap[activity.activity_type] || iconMap.default;
    const colorMap = {
      milestone_achieved: 'bg-yellow-100 border border-yellow-300',
      plank_logged: 'bg-blue-100 border border-blue-300',
      level_up: 'bg-success-50 border border-success-600',
      streak: 'bg-orange-100 border border-orange-300',
      default: 'bg-gray-100 border border-gray-300',
    };

    const bgColor = colorMap[activity.activity_type] || colorMap.default;

    return (
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center shadow-sm`}>
        <span className="text-2xl">{icon}</span>
      </div>
    );
  };

  const getActivityText = (activity) => {
    // Use the pre-formatted message from the activity_feed table
    if (activity.message) {
      return (
        <span
          className="text-sm text-dark-900"
          dangerouslySetInnerHTML={{ __html: activity.message }}
        />
      );
    }

    // Fallback to basic format
    return (
      <>
        <span className="font-semibold text-dark-900">
          {activity.users?.full_name || 'Someone'}
        </span>{' '}
        performed an activity
      </>
    );
  };

  if (loading) {
    return (
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200">
        <h2 className="text-xl font-display font-bold text-dark-900 mb-4">Activity Feed</h2>
        <div className="flex justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-brand-teal"></div>
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200">
        <h2 className="text-xl font-display font-bold text-dark-900 mb-4">Activity Feed</h2>
        <div className="text-center py-8">
          <p className="text-dark-800 font-medium">No activities yet</p>
          <p className="text-sm text-dark-800 mt-1">
            Be the first to log a plank!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-bold text-dark-900">Activity Feed</h2>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-success-50 text-success-600 border border-success-600">
          Live
        </span>
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start space-x-3 p-3 rounded-xl hover:bg-dark-50 transition-colors duration-200"
          >
            {getActivityIcon(activity)}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-dark-900">{getActivityText(activity)}</p>
              <p className="text-xs text-dark-800 mt-1">
                {formatDistanceToNow(new Date(activity.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
      {activities.length >= 20 && (
        <p className="text-xs text-dark-800 text-center mt-4">
          Showing last 20 activities
        </p>
      )}
    </div>
  );
}
