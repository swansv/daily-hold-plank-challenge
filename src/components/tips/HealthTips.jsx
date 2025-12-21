import { useState, useEffect } from 'react';

const healthTips = [
  {
    title: 'Perfect Plank Form',
    tip: 'Keep your body in a straight line from head to heels. Engage your core and avoid letting your hips sag or rise too high.',
    category: 'Form',
  },
  {
    title: 'Breathe Properly',
    tip: "Don't hold your breath during planks! Breathe steadily and deeply to maintain oxygen flow to your muscles.",
    category: 'Technique',
  },
  {
    title: 'Progressive Overload',
    tip: 'Gradually increase your plank duration by 5-10 seconds each week to build strength safely and effectively.',
    category: 'Training',
  },
  {
    title: 'Rest and Recovery',
    tip: 'Allow at least 48 hours between intense plank sessions to give your core muscles time to recover and grow stronger.',
    category: 'Recovery',
  },
  {
    title: 'Hydration Matters',
    tip: 'Stay well-hydrated before, during, and after your workout. Proper hydration helps muscle function and recovery.',
    category: 'Nutrition',
  },
  {
    title: 'Warm Up First',
    tip: 'Always warm up with light cardio or dynamic stretches before planking to prepare your muscles and reduce injury risk.',
    category: 'Safety',
  },
  {
    title: 'Listen to Your Body',
    tip: "If you feel sharp pain (not muscle fatigue), stop immediately. It's better to rest than to risk injury.",
    category: 'Safety',
  },
  {
    title: 'Engage Your Glutes',
    tip: 'Squeeze your glutes during the plank to help maintain proper alignment and maximize core activation.',
    category: 'Form',
  },
  {
    title: 'Variety is Key',
    tip: 'Mix up your plank routine with variations like side planks, plank jacks, or walking planks to work different muscle groups.',
    category: 'Training',
  },
  {
    title: 'Consistency Over Perfection',
    tip: 'Regular short planks are better than sporadic long ones. Aim for consistency to see the best results.',
    category: 'Motivation',
  },
  {
    title: 'Core Beyond Abs',
    tip: 'Planks strengthen your entire core, including your back, hips, and shoulders - not just your abs!',
    category: 'Education',
  },
  {
    title: 'Post-Workout Nutrition',
    tip: 'Consume protein within 30 minutes after your workout to support muscle recovery and growth.',
    category: 'Nutrition',
  },
  {
    title: 'Quality Sleep',
    tip: 'Get 7-9 hours of quality sleep each night. Sleep is when your muscles repair and strengthen.',
    category: 'Recovery',
  },
  {
    title: 'Mental Focus',
    tip: 'Use planking time for mindfulness. Focus on your breathing and form rather than just watching the clock.',
    category: 'Motivation',
  },
  {
    title: 'Track Your Progress',
    tip: "Keep logging your planks! Seeing your improvement over time is a powerful motivator to keep going.",
    category: 'Motivation',
  },
];

export default function HealthTips() {
  const [currentTip, setCurrentTip] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Get tip of the day based on current date
    const today = new Date();
    const dayOfYear = Math.floor(
      (today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24
    );
    const tipIndex = dayOfYear % healthTips.length;
    setCurrentTip(healthTips[tipIndex]);
  }, []);

  const getRandomTip = () => {
    setIsRefreshing(true);
    // Get a random tip different from the current one
    const availableTips = healthTips.filter((tip) => tip !== currentTip);
    const randomIndex = Math.floor(Math.random() * availableTips.length);
    setCurrentTip(availableTips[randomIndex]);

    // Reset animation
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const getCategoryColor = (category) => {
    const colors = {
      Form: 'bg-blue-100 text-blue-800 border border-blue-200',
      Technique: 'bg-purple-100 text-purple-800 border border-purple-200',
      Training: 'bg-success-50 text-success-600 border border-success-600',
      Recovery: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      Nutrition: 'bg-green-100 text-green-800 border border-green-200',
      Safety: 'bg-red-100 text-red-800 border border-red-200',
      Motivation: 'bg-orange-100 text-orange-800 border border-orange-200',
      Education: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    };
    return colors[category] || 'bg-gray-100 text-dark-900 border border-gray-200';
  };

  if (!currentTip) {
    return null;
  }

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-bold text-dark-900">Health Tip</h2>
        <button
          onClick={getRandomTip}
          className="inline-flex items-center text-sm font-medium text-brand-teal hover:text-brand-ocean focus:outline-none transition-colors duration-200"
          aria-label="Get new tip"
        >
          <svg
            className={`w-5 h-5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          New Tip
        </button>
      </div>

      <div
        className={`transition-opacity duration-300 ${
          isRefreshing ? 'opacity-50' : 'opacity-100'
        }`}
      >
        <div className="mb-3">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(
              currentTip.category
            )}`}
          >
            {currentTip.category}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-dark-900 mb-2">
          {currentTip.title}
        </h3>

        <p className="text-sm text-dark-900 leading-relaxed">{currentTip.tip}</p>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center text-xs text-dark-800">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Tip of the day • {healthTips.length} tips available
          </div>
        </div>
      </div>
    </div>
  );
}
