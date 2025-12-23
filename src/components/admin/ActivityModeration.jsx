import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, formatDistanceToNow } from 'date-fns';

export default function ActivityModeration() {
  const [activities, setActivities] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, company_code, company_name')
        .order('company_code', { ascending: true });

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Fetch activities with user company_id
      const { data, error } = await supabase
        .from('plank_logs')
        .select(`
          id,
          duration_seconds,
          created_at,
          user_id,
          users!inner (
            full_name,
            email,
            total_plank_seconds,
            company_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteActivity = async (activityId) => {
    if (!confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('plank_logs')
        .delete()
        .eq('id', activityId);

      if (error) throw error;

      // Refresh activities
      await fetchData();
      setSelectedActivity(null);
      alert('Activity deleted successfully');
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Failed to delete activity');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getActivityFlag = (duration) => {
    // Flag unusually long planks (over 10 minutes)
    if (duration > 600) {
      return { color: 'text-red-600', label: 'Unusually Long', icon: '⚠️' };
    }
    // Flag very short planks (under 5 seconds)
    if (duration < 5) {
      return { color: 'text-yellow-600', label: 'Very Short', icon: '⚡' };
    }
    return null;
  };

  const filteredActivities = activities.filter((activity) => {
    // Company filter
    if (selectedCompanyId && activity.users?.company_id !== selectedCompanyId) {
      return false;
    }
    // Flagged filter
    if (filter === 'flagged') {
      return getActivityFlag(activity.duration_seconds) !== null;
    }
    return true;
  });

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
        <h2 className="text-2xl font-bold text-gray-900">Activity Moderation</h2>
        <p className="text-sm text-gray-600 mt-1">
          Review and manage user activities
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Activities
              </button>
              <button
                onClick={() => setFilter('flagged')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'flagged'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Flagged Only
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Activities {selectedCompanyId && '(Filtered)'}</p>
          <p className="text-2xl font-bold text-gray-900">{filteredActivities.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Flagged Activities</p>
          <p className="text-2xl font-bold text-yellow-600">
            {filteredActivities.filter((a) => getActivityFlag(a.duration_seconds)).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Unique Users</p>
          <p className="text-2xl font-bold text-indigo-600">
            {new Set(filteredActivities.map((a) => a.user_id)).size}
          </p>
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredActivities.map((activity) => {
                const flag = getActivityFlag(activity.duration_seconds);
                return (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {activity.users.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {activity.users.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatTime(activity.duration_seconds)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(activity.created_at), 'MMM d, yyyy')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {flag ? (
                        <span className={`text-sm font-medium ${flag.color} flex items-center`}>
                          <span className="mr-1">{flag.icon}</span>
                          {flag.label}
                        </span>
                      ) : (
                        <span className="text-sm text-green-600">Normal</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedActivity(activity)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => deleteActivity(activity.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredActivities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No activities found</p>
          </div>
        )}
      </div>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Activity Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">User</p>
                  <p className="text-sm text-gray-900">
                    {selectedActivity.users.full_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedActivity.users.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Duration</p>
                  <p className="text-sm text-gray-900">
                    {formatTime(selectedActivity.duration_seconds)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Timestamp</p>
                  <p className="text-sm text-gray-900">
                    {format(
                      new Date(selectedActivity.created_at),
                      'MMM d, yyyy h:mm a'
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    User Total Time
                  </p>
                  <p className="text-sm text-gray-900">
                    {formatTime(selectedActivity.users.total_plank_seconds || 0)}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Close
                </button>
                <button
                  onClick={() => deleteActivity(selectedActivity.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
