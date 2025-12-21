import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function CompanyProgress({ userTotalSeconds, onRefresh }) {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    companyTotal: 0,
    participantCount: 0,
    myContribution: 0,
    companyGoal: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      fetchCompanyStats();
    } else {
      setLoading(false);
    }
  }, [profile?.company_id, userTotalSeconds]);

  const fetchCompanyStats = async () => {
    if (!profile?.company_id) return;

    setLoading(true);
    try {
      // Get all users in the same company with their total plank seconds
      const { data: companyUsers, error } = await supabase
        .from('users')
        .select('id, total_plank_seconds')
        .eq('company_id', profile.company_id);

      if (error) throw error;

      // Calculate company total and participant count
      let companyTotal = 0;
      let participantCount = 0;

      companyUsers?.forEach((user) => {
        const userSeconds = user.total_plank_seconds || 0;
        if (userSeconds > 0) {
          participantCount++;
        }
        companyTotal += userSeconds;
      });

      // Calculate my contribution percentage
      const myContribution = companyTotal > 0
        ? ((userTotalSeconds / companyTotal) * 100).toFixed(1)
        : 0;

      setStats({
        companyTotal,
        participantCount,
        myContribution,
        companyGoal: null, // Can be fetched from companies table if goal field exists
      });
    } catch (error) {
      console.error('Error fetching company stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Don't show if user is not part of a company
  if (!profile?.company_id) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200">
        <h2 className="text-xl font-display font-bold text-dark-900 mb-4">
          Company Progress
        </h2>
        <div className="flex justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-brand-teal"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-bold text-dark-900">
          Company Progress
        </h2>
        <button
          onClick={fetchCompanyStats}
          className="text-sm font-medium text-brand-teal hover:text-brand-ocean transition-colors duration-200"
          aria-label="Refresh company stats"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        {/* Company Total Time */}
        <div className="text-center p-4 bg-gradient-to-br from-brand-teal to-brand-ocean rounded-xl">
          <p className="text-sm font-medium text-white/90 mb-1">
            Company Total Plank Time
          </p>
          <p className="text-3xl font-bold text-white">
            {formatTime(stats.companyTotal)}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Participants */}
          <div className="text-center p-4 bg-dark-50 rounded-xl border border-gray-200">
            <p className="text-xs font-medium text-dark-800 mb-1">
              Participants
            </p>
            <p className="text-2xl font-bold text-brand-teal">
              {stats.participantCount}
            </p>
          </div>

          {/* My Contribution */}
          <div className="text-center p-4 bg-dark-50 rounded-xl border border-gray-200">
            <p className="text-xs font-medium text-dark-800 mb-1">
              My Contribution
            </p>
            <p className="text-2xl font-bold text-brand-turquoise">
              {stats.myContribution}%
            </p>
          </div>
        </div>

        {/* Optional: Company Goal Progress */}
        {stats.companyGoal && (
          <div>
            <div className="flex justify-between text-sm font-medium text-dark-900 mb-2">
              <span>Company Goal</span>
              <span className="text-brand-teal">
                {Math.round((stats.companyTotal / stats.companyGoal) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner overflow-hidden">
              <div
                className="bg-gradient-to-r from-brand-teal to-brand-turquoise h-4 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min((stats.companyTotal / stats.companyGoal) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-dark-800 mt-1">
              <span>{formatTime(stats.companyTotal)}</span>
              <span>{formatTime(stats.companyGoal)}</span>
            </div>
          </div>
        )}

        {/* Info message if user is the only participant */}
        {stats.participantCount === 1 && (
          <div className="text-center py-3 px-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800">
              You're the first to log planks in your company! 🎉
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Encourage your colleagues to join the challenge!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
