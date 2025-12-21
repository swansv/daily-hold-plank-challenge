import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import SystemStats from '../components/admin/SystemStats';
import UserManagement from '../components/admin/UserManagement';
import ActivityModeration from '../components/admin/ActivityModeration';
import Analytics from '../components/admin/Analytics';
import CompanyManagement from '../components/admin/CompanyManagement';

export default function Admin() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Check if user is admin
    if (profile && !profile.is_admin) {
      // Redirect non-admin users
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'companies', name: 'Companies', icon: '🏢' },
    { id: 'users', name: 'Users', icon: '👥' },
    { id: 'activity', name: 'Activity', icon: '📝' },
    { id: 'analytics', name: 'Analytics', icon: '📈' },
  ];

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-brand-teal mb-4"></div>
          <p className="text-dark-800 font-medium">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-50">
      <nav className="bg-brand-teal shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-display font-bold text-white tracking-tight">
                Admin Panel
              </h1>
              <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white text-brand-teal border border-white">
                Admin
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm font-medium text-white/90 hover:text-white transition-colors duration-200"
              >
                Back to Dashboard
              </button>
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

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b-2 border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-brand-teal text-brand-teal'
                    : 'border-transparent text-dark-800 hover:text-dark-900 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm flex items-center transition-colors duration-200`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && <SystemStats />}
        {activeTab === 'companies' && <CompanyManagement />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'activity' && <ActivityModeration />}
        {activeTab === 'analytics' && <Analytics />}
      </div>
    </div>
  );
}
