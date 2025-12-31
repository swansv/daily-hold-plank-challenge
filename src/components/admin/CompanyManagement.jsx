import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Format a date string (YYYY-MM-DD) for display without timezone shift
const formatDateUTC = (dateString) => {
  const [year, month, day] = dateString.split('-');
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Parse a date string as local date for comparison
const parseLocalDate = (dateString) => {
  return new Date(dateString + 'T00:00:00');
};

export default function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    company_code: '',
    challenge_start_date: '',
    challenge_end_date: '',
    is_active: true,
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user count and total plank time for each company
      const companiesWithStats = await Promise.all(
        data.map(async (company) => {
          const { count: userCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

          const { data: usersData } = await supabase
            .from('users')
            .select('total_plank_seconds')
            .eq('company_id', company.id);

          const totalPlankTime = usersData?.reduce(
            (sum, user) => sum + (user.total_plank_seconds || 0),
            0
          ) || 0;

          return {
            ...company,
            userCount: userCount || 0,
            totalPlankTime,
          };
        })
      );

      setCompanies(companiesWithStats);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setFormError('');
  };

  const validateForm = () => {
    if (!formData.company_name.trim()) {
      setFormError('Company name is required');
      return false;
    }
    if (!formData.company_code.trim()) {
      setFormError('Company code is required');
      return false;
    }
    if (!/^[A-Z0-9_-]+$/i.test(formData.company_code)) {
      setFormError('Company code can only contain letters, numbers, hyphens, and underscores');
      return false;
    }
    if (!formData.challenge_start_date) {
      setFormError('Challenge start date is required');
      return false;
    }
    if (!formData.challenge_end_date) {
      setFormError('Challenge end date is required');
      return false;
    }
    if (new Date(formData.challenge_end_date) <= new Date(formData.challenge_start_date)) {
      setFormError('Challenge end date must be after start date');
      return false;
    }
    return true;
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setFormError('');

    try {
      // Check if company code already exists
      const { data: existing } = await supabase
        .from('companies')
        .select('id')
        .eq('company_code', formData.company_code)
        .single();

      if (existing) {
        setFormError('Company code already exists. Please choose a different code.');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('companies').insert([
        {
          company_name: formData.company_name.trim(),
          company_code: formData.company_code.trim().toUpperCase(),
          challenge_start_date: formData.challenge_start_date,
          challenge_end_date: formData.challenge_end_date,
          is_active: formData.is_active,
        },
      ]);

      if (error) throw error;

      // Reset form and refresh companies
      setFormData({
        company_name: '',
        company_code: '',
        challenge_start_date: '',
        challenge_end_date: '',
        is_active: true,
      });
      setShowCreateForm(false);
      await fetchCompanies();
      alert('Company created successfully!');
    } catch (error) {
      console.error('Error creating company:', error);
      setFormError(error.message || 'Failed to create company');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setFormError('');

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          company_name: formData.company_name.trim(),
          challenge_start_date: formData.challenge_start_date,
          challenge_end_date: formData.challenge_end_date,
          is_active: formData.is_active,
        })
        .eq('id', editingCompany.id);

      if (error) throw error;

      // Reset form and refresh companies
      setEditingCompany(null);
      setFormData({
        company_name: '',
        company_code: '',
        challenge_start_date: '',
        challenge_end_date: '',
        is_active: true,
      });
      await fetchCompanies();
      alert('Company updated successfully!');
    } catch (error) {
      console.error('Error updating company:', error);
      setFormError(error.message || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (company) => {
    setEditingCompany(company);
    setFormData({
      company_name: company.company_name,
      company_code: company.company_code,
      challenge_start_date: company.challenge_start_date,
      challenge_end_date: company.challenge_end_date,
      is_active: company.is_active,
    });
    setShowCreateForm(false);
  };

  const handleCancelEdit = () => {
    setEditingCompany(null);
    setFormData({
      company_name: '',
      company_code: '',
      challenge_start_date: '',
      challenge_end_date: '',
      is_active: true,
    });
    setFormError('');
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

  const getChallengeStatus = (startDate, endDate, isActive) => {
    if (!isActive) {
      return { label: 'Inactive', color: 'bg-gray-100 text-gray-800' };
    }

    const now = new Date();
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);

    if (now < start) {
      return { label: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
    } else if (now > end) {
      return { label: 'Ended', color: 'bg-red-100 text-red-800' };
    } else {
      return { label: 'Active', color: 'bg-green-100 text-green-800' };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Company Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage corporate wellness challenge clients
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingCompany(null);
            setFormData({
              company_name: '',
              company_code: '',
              challenge_start_date: '',
              challenge_end_date: '',
              is_active: true,
            });
            setFormError('');
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {showCreateForm ? 'Cancel' : '+ Create Company'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingCompany) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingCompany ? 'Edit Company' : 'Create New Company'}
          </h3>
          <form onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Acme Corporation"
                />
              </div>

              <div>
                <label htmlFor="company_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Code * {editingCompany && '(cannot be changed)'}
                </label>
                <input
                  type="text"
                  id="company_code"
                  name="company_code"
                  value={formData.company_code}
                  onChange={handleInputChange}
                  disabled={!!editingCompany}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    editingCompany ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="e.g., ACME2024"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Letters, numbers, hyphens, and underscores only
                </p>
              </div>

              <div>
                <label htmlFor="challenge_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Challenge Start Date *
                </label>
                <input
                  type="date"
                  id="challenge_start_date"
                  name="challenge_start_date"
                  value={formData.challenge_start_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="challenge_end_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Challenge End Date *
                </label>
                <input
                  type="date"
                  id="challenge_end_date"
                  name="challenge_end_date"
                  value={formData.challenge_end_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Active (users can register with this company code)
                </span>
              </label>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              {editingCompany && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : editingCompany ? 'Update Company' : 'Create Company'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Companies List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Challenge Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => {
                const status = getChallengeStatus(
                  company.challenge_start_date,
                  company.challenge_end_date,
                  company.is_active
                );
                return (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {company.company_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {company.company_code}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDateUTC(company.challenge_start_date)}
                      </div>
                      <div className="text-sm text-gray-500">
                        to {formatDateUTC(company.challenge_end_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.userCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatTime(company.totalPlankTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEditClick(company)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {companies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No companies yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Create your first company to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
