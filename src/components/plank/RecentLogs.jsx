import { format, formatDistanceToNow } from 'date-fns';

export default function RecentLogs({ logs, loading }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200">
        <h2 className="text-xl font-display font-bold text-dark-900 mb-4">My Recent Logs</h2>
        <div className="flex justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-brand-teal"></div>
        </div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200">
        <h2 className="text-xl font-display font-bold text-dark-900 mb-4">My Recent Logs</h2>
        <div className="text-center py-8">
          <p className="text-dark-800 font-medium">No plank logs yet</p>
          <p className="text-sm text-dark-800 mt-1">
            Log your first plank to get started!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <h2 className="text-xl font-display font-bold text-dark-900 mb-4">My Recent Logs</h2>
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between p-3 bg-dark-50 rounded-xl hover:bg-gray-100 transition-colors duration-200 border border-gray-200 hover:border-brand-turquoise"
          >
            <div className="flex-1">
              <p className="text-lg font-semibold text-brand-teal">
                {formatTime(log.duration_seconds)}
              </p>
              <p className="text-xs text-dark-800">
                {formatDistanceToNow(new Date(log.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-dark-900">
                {format(new Date(log.created_at), 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-dark-800">
                {format(new Date(log.created_at), 'h:mm a')}
              </p>
            </div>
          </div>
        ))}
      </div>
      {logs.length >= 5 && (
        <p className="text-xs text-dark-800 text-center mt-4">
          Showing last 5 entries
        </p>
      )}
    </div>
  );
}
