import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, subDays, startOfDay } from 'date-fns';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [dailyData, setDailyData] = useState([]);
  const [milestoneDistribution, setMilestoneDistribution] = useState({});
  const [topPerformers, setTopPerformers] = useState([]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_code, company_name')
        .order('company_code', { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Get user IDs for selected company (if any)
      let companyUserIds = null;
      if (selectedCompanyId) {
        const { data: companyUsers } = await supabase
          .from('users')
          .select('id')
          .eq('company_id', selectedCompanyId);
        companyUserIds = companyUsers?.map(u => u.id) || [];
      }

      // Fetch daily activity for the last 7 days
      const days = 7;
      const dailyStats = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const startDate = startOfDay(date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        let query = supabase
          .from('plank_logs')
          .select('duration_seconds, user_id', { count: 'exact' })
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endDate.toISOString());

        // Filter by company users if selected
        if (companyUserIds && companyUserIds.length > 0) {
          query = query.in('user_id', companyUserIds);
        } else if (companyUserIds && companyUserIds.length === 0) {
          // Company selected but has no users
          dailyStats.push({
            date: format(date, 'MMM d'),
            logs: 0,
            totalSeconds: 0,
          });
          continue;
        }

        const { data: logsData, count } = await query;

        const totalSeconds = logsData?.reduce(
          (sum, log) => sum + log.duration_seconds,
          0
        ) || 0;

        dailyStats.push({
          date: format(date, 'MMM d'),
          logs: count || 0,
          totalSeconds,
        });
      }

      setDailyData(dailyStats);

      // Fetch milestone distribution
      let usersQuery = supabase.from('users').select('total_plank_seconds');
      if (selectedCompanyId) {
        usersQuery = usersQuery.eq('company_id', selectedCompanyId);
      }
      const { data: usersData } = await usersQuery;

      const distribution = {
        Starter: 0,
        Beginner: 0,
        Intermediate: 0,
        Advanced: 0,
        Expert: 0,
        Master: 0,
      };

      usersData?.forEach((user) => {
        const seconds = user.total_plank_seconds || 0;
        if (seconds >= 14400) distribution.Master++;
        else if (seconds >= 7200) distribution.Expert++;
        else if (seconds >= 3600) distribution.Advanced++;
        else if (seconds >= 1800) distribution.Intermediate++;
        else if (seconds >= 600) distribution.Beginner++;
        else distribution.Starter++;
      });

      setMilestoneDistribution(distribution);

      // Fetch top performers
      let topQuery = supabase
        .from('users')
        .select('full_name, total_plank_seconds')
        .order('total_plank_seconds', { ascending: false })
        .limit(10);
      if (selectedCompanyId) {
        topQuery = topQuery.eq('company_id', selectedCompanyId);
      }
      const { data: topUsers } = await topQuery;

      setTopPerformers(topUsers || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
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

  const getBarHeight = (value, max) => {
    return Math.max((value / max) * 100, 2);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const maxLogs = Math.max(...dailyData.map((d) => d.logs), 1);
  const maxSeconds = Math.max(...dailyData.map((d) => d.totalSeconds), 1);
  const totalMilestoneUsers = Object.values(milestoneDistribution).reduce(
    (sum, count) => sum + count,
    0
  );

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Analytics & Insights</h2>
        <p className="text-sm text-gray-600 mt-1">
          Visual representation of user engagement and progress
          {selectedCompany && ` for ${selectedCompany.company_code}`}
        </p>
      </div>

      {/* Company Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="max-w-md">
          <label htmlFor="company-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Company Code
          </label>
          <select
            id="company-filter"
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.company_code} - {company.company_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Daily Activity (Last 7 Days)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logs Count Chart */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Number of Plank Logs
            </p>
            <div className="flex items-end justify-between space-x-2 h-48">
              {dailyData.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center h-40">
                    <div
                      className="w-full bg-indigo-500 rounded-t transition-all hover:bg-indigo-600"
                      style={{ height: `${getBarHeight(day.logs, maxLogs)}%` }}
                      title={`${day.logs} logs`}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">
                    {day.date}
                  </div>
                  <div className="text-xs font-semibold text-gray-900">
                    {day.logs}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Time Chart */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Total Plank Time
            </p>
            <div className="flex items-end justify-between space-x-2 h-48">
              {dailyData.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center h-40">
                    <div
                      className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                      style={{
                        height: `${getBarHeight(day.totalSeconds, maxSeconds)}%`,
                      }}
                      title={formatTime(day.totalSeconds)}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">
                    {day.date}
                  </div>
                  <div className="text-xs font-semibold text-gray-900">
                    {formatTime(day.totalSeconds)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Milestone Distribution */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          User Level Distribution
        </h3>
        <div className="space-y-3">
          {Object.entries(milestoneDistribution).map(([level, count]) => {
            const percentage =
              totalMilestoneUsers > 0
                ? Math.round((count / totalMilestoneUsers) * 100)
                : 0;
            const colors = {
              Starter: 'bg-gray-500',
              Beginner: 'bg-green-500',
              Intermediate: 'bg-yellow-500',
              Advanced: 'bg-orange-500',
              Expert: 'bg-red-500',
              Master: 'bg-purple-500',
            };

            return (
              <div key={level}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{level}</span>
                  <span className="text-gray-600">
                    {count} users ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`${colors[level]} h-4 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top 10 Performers
        </h3>
        <div className="space-y-3">
          {topPerformers.map((user, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0
                      ? 'bg-yellow-400 text-yellow-900'
                      : index === 1
                      ? 'bg-gray-300 text-gray-800'
                      : index === 2
                      ? 'bg-orange-400 text-orange-900'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {user.full_name}
                </span>
              </div>
              <span className="text-sm font-semibold text-indigo-600">
                {formatTime(user.total_plank_seconds || 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
