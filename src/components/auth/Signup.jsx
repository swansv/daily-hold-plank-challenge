import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyCode: '',
    teamCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error } = await signUp(formData.email, formData.password, {
      full_name: formData.fullName,
      company_code: formData.companyCode || null,
      team_code: formData.teamCode || null,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-display font-bold text-dark-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-dark-800">
            Join the Daily Hold Plank Challenge
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-red-50 p-4 border border-red-200">
              <p className="text-sm font-medium text-red-900">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-semibold text-dark-900 mb-2"
              >
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="block w-full px-4 py-3 text-base text-dark-900 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-brand-teal transition-colors duration-200"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-dark-900 mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="block w-full px-4 py-3 text-base text-dark-900 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-brand-teal transition-colors duration-200"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-dark-900 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full px-4 py-3 text-base text-dark-900 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-brand-teal transition-colors duration-200"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-dark-900 mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="block w-full px-4 py-3 text-base text-dark-900 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-brand-teal transition-colors duration-200"
                placeholder="Confirm your password"
              />
            </div>

            <div>
              <label
                htmlFor="companyCode"
                className="block text-sm font-semibold text-dark-900 mb-2"
              >
                Company Code (Optional)
              </label>
              <input
                id="companyCode"
                name="companyCode"
                type="text"
                value={formData.companyCode}
                onChange={handleChange}
                className="block w-full px-4 py-3 text-base text-dark-900 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-brand-teal transition-colors duration-200"
                placeholder="e.g., TEST2025"
              />
            </div>

            <div>
              <label
                htmlFor="teamCode"
                className="block text-sm font-semibold text-dark-900 mb-2"
              >
                Team Code (Optional)
              </label>
              <input
                id="teamCode"
                name="teamCode"
                type="text"
                value={formData.teamCode}
                onChange={handleChange}
                className="block w-full px-4 py-3 text-base text-dark-900 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-brand-teal transition-colors duration-200"
                placeholder="e.g., TEAM001"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center px-6 py-3 text-base font-semibold text-white bg-brand-ocean rounded-lg shadow-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-ocean transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-dark-800">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-brand-teal hover:text-brand-ocean transition-colors duration-200"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
