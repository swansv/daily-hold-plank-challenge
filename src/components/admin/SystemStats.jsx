import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function SystemStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPlankTime: 0,
    totalLogs: 0,
    averagePlankDuration: 0,
    activeToday: 0,
    activeThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch total users
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch total plank time
      const { data: totalData } = await supabase
        .from('users')
        .select('total_plank_seconds');

      const totalPlankTime = totalData?.reduce(
        (sum, user) => sum + (user.total_plank_seconds || 0),
        0
      ) || 0;

      // Fetch total logs
      const { count: logCount } = await supabase
        .from('plank_logs')
        .select('*', { count: 'exact', head: true });

      // Fetch average plank duration
      const { data: avgData } = await supabase
        .from('plank_logs')
        .select('duration_seconds');

      const averagePlankDuration = avgData?.length > 0
        ? Math.round(
            avgData.reduce((sum, log) => sum + log.duration_seconds, 0) /
              avgData.length
          )
        : 0;

      // Fetch active users today (count unique users)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: todayLogs } = await supabase
        .from('plank_logs')
        .select('user_id')
        .gte('created_at', today.toISOString());

      const activeTodayCount = todayLogs
        ? new Set(todayLogs.map((log) => log.user_id)).size
        : 0;

      // Fetch active users this week (count unique users)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: weekLogs } = await supabase
        .from('plank_logs')
        .select('user_id')
        .gte('created_at', weekAgo.toISOString());

      const activeWeekCount = weekLogs
        ? new Set(weekLogs.map((log) => log.user_id)).size
        : 0;

      setStats({
        totalUsers: userCount || 0,
        totalPlankTime,
        totalLogs: logCount || 0,
        averagePlankDuration,
        activeToday: activeTodayCount || 0,
        activeThisWeek: activeWeekCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const statCards = [
    {
      name: 'Total Users',
      value: stats.totalUsers,
      icon: '👥',
      color: 'bg-blue-500',
    },
    {
      name: 'Total Plank Time',
      value: formatTime(stats.totalPlankTime),
      icon: '⏱️',
      color: 'bg-green-500',
    },
    {
      name: 'Total Logs',
      value: stats.totalLogs,
      icon: '📝',
      color: 'bg-purple-500',
    },
    {
      name: 'Average Duration',
      value: formatTime(stats.averagePlankDuration),
      icon: '📊',
      color: 'bg-yellow-500',
    },
    {
      name: 'Active Today',
      value: stats.activeToday,
      icon: '🔥',
      color: 'bg-orange-500',
    },
    {
      name: 'Active This Week',
      value: stats.activeThisWeek,
      icon: '📅',
      color: 'bg-indigo-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
        <p className="text-sm text-gray-600 mt-1">
          Key metrics and statistics for the Daily Hold Plank Challenge
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3 mr-4`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Stats
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Engagement Rate (Weekly)</span>
            <span className="font-semibold text-gray-900">
              {stats.totalUsers > 0
                ? Math.round((stats.activeThisWeek / stats.totalUsers) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Avg. Logs per User</span>
            <span className="font-semibold text-gray-900">
              {stats.totalUsers > 0
                ? Math.round(stats.totalLogs / stats.totalUsers)
                : 0}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Daily Active Users</span>
            <span className="font-semibold text-gray-900">
              {stats.activeToday}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Total Community Time</span>
            <span className="font-semibold text-gray-900">
              {formatTime(stats.totalPlankTime)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
