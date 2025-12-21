import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePlankLog } from '../hooks/usePlankLog';
import PlankLogForm from '../components/plank/PlankLogForm';
import PlankStats from '../components/plank/PlankStats';
import RecentLogs from '../components/plank/RecentLogs';
import ActivityFeed from '../components/activity/ActivityFeed';
import HealthTips from '../components/tips/HealthTips';
import CompanyProgress from '../components/company/CompanyProgress';

export default function Dashboard() {
  const { user, profile, signOut, reloadProfile } = useAuth();
  const navigate = useNavigate();
  const { logPlank, loading: plankLoading } = usePlankLog();
  const [recentLogs, setRecentLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchRecentLogs = useCallback(async () => {
    if (!profile) return;

    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('plank_logs')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentLogs(data || []);
    } catch (error) {
      console.error('Error fetching recent logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      setTotalSeconds(profile.total_plank_seconds || 0);
      fetchRecentLogs();
    }
  }, [profile, fetchRecentLogs]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleLogPlank = async (duration) => {
    // Prevent multiple simultaneous submissions
    if (plankLoading) {
      return;
    }

    const result = await logPlank(duration);

    if (result.success) {
      // Update local state
      setTotalSeconds(result.newTotal);

      // Show success message immediately
      if (result.achievedMilestones && result.achievedMilestones.length > 0) {
        const milestoneNames = result.achievedMilestones
          .map((m) => m.name)
          .join(', ');
        setSuccessMessage(
          `Great job! You've achieved the ${milestoneNames} milestone!`
        );
      } else {
        setSuccessMessage('Plank logged successfully!');
      }

      // Reload profile and refresh logs with a slight delay to ensure database commit
      setTimeout(async () => {
        await Promise.all([reloadProfile(), fetchRecentLogs()]);
      }, 100);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } else if (result.error) {
      // Show error message if logging failed
      setSuccessMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-dark-50">
      <nav className="bg-brand-teal shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-display font-bold text-white tracking-tight">
                Wellness Plank Challenge
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {profile?.is_admin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-lg text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 transition-all duration-200"
                >
                  Admin Panel
                </button>
              )}
              <span className="text-sm font-medium text-white/90">
                {profile?.full_name || user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-brand-ocean hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 transition-all duration-200 shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 rounded-xl bg-success-50 p-4 border border-success-600 animate-slide-up">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-success-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-semibold text-dark-900">
                    {successMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Log Form and Stats */}
            <div className="lg:col-span-2 space-y-6">
              <PlankLogForm onLogPlank={handleLogPlank} loading={plankLoading} />
              <CompanyProgress
                userTotalSeconds={totalSeconds}
                onRefresh={fetchRecentLogs}
              />
              <PlankStats totalSeconds={totalSeconds} />
              <HealthTips />
            </div>

            {/* Right Column - Recent Logs and Activity Feed */}
            <div className="lg:col-span-1 space-y-6">
              <RecentLogs logs={recentLogs} loading={logsLoading} />
              <ActivityFeed />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
