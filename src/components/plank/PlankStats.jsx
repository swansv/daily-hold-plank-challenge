export default function PlankStats({ totalSeconds }) {
  const milestones = [
    { name: 'Beginner', seconds: 600, label: '10 minutes' },
    { name: 'Intermediate', seconds: 1800, label: '30 minutes' },
    { name: 'Advanced', seconds: 3600, label: '60 minutes' },
    { name: 'Expert', seconds: 7200, label: '2 hours' },
    { name: 'Master', seconds: 14400, label: '4 hours' },
  ];

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getNextMilestone = () => {
    for (const milestone of milestones) {
      if (totalSeconds < milestone.seconds) {
        return milestone;
      }
    }
    return null;
  };

  const getCurrentMilestone = () => {
    for (let i = milestones.length - 1; i >= 0; i--) {
      if (totalSeconds >= milestones[i].seconds) {
        return milestones[i];
      }
    }
    return null;
  };

  const nextMilestone = getNextMilestone();
  const currentMilestone = getCurrentMilestone();

  const getProgress = () => {
    if (!nextMilestone) return 100;

    const previousMilestoneSeconds = currentMilestone?.seconds || 0;
    const range = nextMilestone.seconds - previousMilestoneSeconds;
    const progress = totalSeconds - previousMilestoneSeconds;

    return Math.min((progress / range) * 100, 100);
  };

  const progress = getProgress();

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <h2 className="text-xl font-display font-bold text-dark-900 mb-4">Your Progress</h2>

      <div className="space-y-6">
        {/* Total Time */}
        <div className="text-center">
          <p className="text-sm font-medium text-dark-800 mb-1">Total Plank Time</p>
          <p className="text-4xl font-bold text-brand-teal">
            {formatTime(totalSeconds || 0)}
          </p>
          {currentMilestone && (
            <p className="text-sm text-dark-800 mt-2">
              Current Level: <span className="font-semibold text-brand-teal">{currentMilestone.name}</span>
            </p>
          )}
        </div>

        {/* Progress to Next Milestone */}
        {nextMilestone ? (
          <div>
            <div className="flex justify-between text-sm font-medium text-dark-900 mb-2">
              <span>Progress to {nextMilestone.name}</span>
              <span className="text-brand-teal">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-5 shadow-inner overflow-hidden">
              <div
                className="bg-brand-turquoise h-5 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-dark-800 mt-1">
              <span>{formatTime(totalSeconds || 0)}</span>
              <span>{nextMilestone.label}</span>
            </div>
            <p className="text-sm font-medium text-dark-900 mt-2 text-center">
              {formatTime(nextMilestone.seconds - (totalSeconds || 0))} to go!
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gold-100 to-gold-200 border border-gold-300 rounded-full mb-2 shadow-sm">
              <span className="text-3xl">🏆</span>
            </div>
            <p className="text-sm font-semibold text-dark-900">
              Congratulations! You've reached Master level!
            </p>
            <p className="text-xs text-dark-800 mt-1">
              Keep planking to maintain your strength
            </p>
          </div>
        )}

        {/* Milestones Overview */}
        <div>
          <p className="text-sm font-semibold text-dark-900 mb-3">Milestones</p>
          <div className="space-y-3">
            {milestones.map((milestone) => {
              const achieved = totalSeconds >= milestone.seconds;
              return (
                <div
                  key={milestone.name}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                    achieved
                      ? 'bg-success-50 border-2 border-success-600 shadow-sm'
                      : 'bg-dark-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        achieved ? 'bg-success-600 text-white' : 'bg-gray-300 text-dark-800'
                      }`}
                    >
                      <span className="text-lg">{achieved ? '✓' : '○'}</span>
                    </div>
                    <span
                      className={`text-base font-semibold ${
                        achieved ? 'text-dark-900' : 'text-dark-800'
                      }`}
                    >
                      {milestone.name}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      achieved ? 'text-success-600' : 'text-dark-800'
                    }`}
                  >
                    {milestone.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
