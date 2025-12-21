import { useState } from 'react';

export default function PlankLogForm({ onLogPlank, loading }) {
  const [duration, setDuration] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const seconds = parseInt(duration, 10);

    if (isNaN(seconds) || seconds <= 0) {
      setError('Please enter a valid duration in seconds');
      return;
    }

    if (seconds > 3600) {
      setError('Duration cannot exceed 1 hour (3600 seconds)');
      return;
    }

    await onLogPlank(seconds);
    setDuration('');
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <h2 className="text-xl font-display font-bold text-dark-900 mb-4">Log Your Plank</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 p-3 border border-red-200">
            <p className="text-sm font-medium text-red-900">{error}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="duration"
            className="block text-sm font-semibold text-dark-900 mb-2"
          >
            Duration (seconds)
          </label>
          <div className="flex items-center space-x-3">
            <input
              id="duration"
              type="number"
              min="1"
              max="3600"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
              className="flex-1 block w-full px-4 py-3 text-base text-dark-900 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-brand-teal transition-colors duration-200"
              disabled={loading}
            />
            {duration && (
              <span className="text-sm font-medium text-dark-500 min-w-[60px]">
                {formatTime(parseInt(duration, 10))}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-dark-500">
            Enter the number of seconds you held your plank
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !duration}
          className="w-full flex justify-center px-6 py-3 text-base font-semibold text-white bg-brand-ocean rounded-lg shadow-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-ocean transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging...' : 'Log Plank'}
        </button>
      </form>
    </div>
  );
}
