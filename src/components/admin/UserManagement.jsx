import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('total_plank_seconds');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  // Edit user state
  const [editingUser, setEditingUser] = useState(null);
  const [newCompanyId, setNewCompanyId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch companies first
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, company_code, company_name')
        .order('company_code', { ascending: true });

      if (companiesError) throw companiesError;

      // Fetch users with company_id
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          username,
          email,
          total_plank_seconds,
          created_at,
          is_admin,
          company_id
        `)
        .order('total_plank_seconds', { ascending: false });

      if (error) throw error;

      // Fetch log count for each user
      const usersWithLogCount = await Promise.all(
        data.map(async (user) => {
          const { count } = await supabase
            .from('plank_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          // Find company info for this user
          const company = companiesData?.find(c => c.id === user.company_id);

          return {
            ...user,
            logCount: count || 0,
            company_code: company?.company_code || null,
            company_name: company?.company_name || null
          };
        })
      );

      // Calculate user counts per company
      const companiesWithCounts = companiesData.map(company => {
        const userCount = usersWithLogCount.filter(u => u.company_id === company.id).length;
        return { ...company, userCount };
      });

      setCompanies(companiesWithCounts);
      setUsers(usersWithLogCount);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const getMilestoneLevel = (seconds) => {
    if (seconds >= 14400) return { level: 'Master', color: 'text-purple-600' };
    if (seconds >= 7200) return { level: 'Expert', color: 'text-red-600' };
    if (seconds >= 3600) return { level: 'Advanced', color: 'text-orange-600' };
    if (seconds >= 1800) return { level: 'Intermediate', color: 'text-yellow-600' };
    if (seconds >= 600) return { level: 'Beginner', color: 'text-green-600' };
    return { level: 'Starter', color: 'text-gray-600' };
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setNewCompanyId(user.company_id || '');
    setShowConfirm(false);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setNewCompanyId('');
    setShowConfirm(false);
  };

  const handleSaveClick = () => {
    // Show confirmation if company is changing
    if (newCompanyId !== (editingUser?.company_id || '')) {
      setShowConfirm(true);
    } else {
      handleCancelEdit();
    }
  };

  const handleConfirmSave = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ company_id: newCompanyId || null })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Refresh data
      await fetchData();
      handleCancelEdit();
      alert('User company updated successfully!');
    } catch (error) {
      console.error('Error updating user company:', error);
      alert('Failed to update user company: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getCompanyDisplay = (companyId) => {
    if (!companyId) return 'No Company';
    const company = companies.find(c => c.id === companyId);
    return company ? `${company.company_code} - ${company.company_name}` : 'Unknown';
  };

  // Filter by company first, then by search term
  const filteredUsers = users.filter((user) => {
    // Company filter
    if (selectedCompanyId && user.company_id !== selectedCompanyId) {
      return false;
    }
    // Search filter
    if (searchTerm) {
      return (
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    if (sortBy === 'created_at') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
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
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage and view all registered users
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  {company.company_code} - {company.company_name} ({company.userCount} users)
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Users
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="total_plank_seconds">Total Plank Time</option>
              <option value="logCount">Log Count</option>
              <option value="created_at">Join Date</option>
              <option value="full_name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Active Users</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter((u) => u.logCount > 0).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Master Level</p>
          <p className="text-2xl font-bold text-purple-600">
            {users.filter((u) => u.total_plank_seconds >= 14400).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Admin Users</p>
          <p className="text-2xl font-bold text-indigo-600">
            {users.filter((u) => u.is_admin).length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Logs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedUsers.map((user) => {
                const milestone = getMilestoneLevel(user.total_plank_seconds || 0);
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name}
                        </div>
                        {user.username && (
                          <div className="text-sm text-indigo-600">@{user.username}</div>
                        )}
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.company_code ? (
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {user.company_code}
                        </code>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${milestone.color}`}>
                        {milestone.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatTime(user.total_plank_seconds || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.logCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_admin ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                        title="Edit user company"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found</p>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {!showConfirm ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Edit User Company
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">User</p>
                      <p className="text-sm text-gray-900">{editingUser.full_name}</p>
                      <p className="text-sm text-gray-500">{editingUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Current Company</p>
                      <p className="text-sm text-gray-900">
                        {editingUser.company_code ? (
                          <code className="bg-gray-100 px-2 py-1 rounded">
                            {editingUser.company_code} - {editingUser.company_name}
                          </code>
                        ) : (
                          <span className="text-gray-400">No company assigned</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <label htmlFor="new-company" className="block text-sm font-medium text-gray-700 mb-1">
                        New Company
                      </label>
                      <select
                        id="new-company"
                        value={newCompanyId}
                        onChange={(e) => setNewCompanyId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">No Company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.company_code} - {company.company_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveClick}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Confirm Company Change
                  </h3>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">
                      Are you sure you want to move <strong>{editingUser.full_name}</strong> to:
                    </p>
                    <p className="text-sm">
                      <code className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                        {getCompanyDisplay(newCompanyId)}
                      </code>
                    </p>
                    {editingUser.company_code && (
                      <p className="text-sm text-gray-500">
                        (Currently in: {editingUser.company_code})
                      </p>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowConfirm(false)}
                      disabled={saving}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmSave}
                      disabled={saving}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                      {saving ? 'Saving...' : 'Confirm'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
