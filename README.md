# Wellness Plank Challenge App

A corporate wellness app for running plank challenges. Users can log plank times, track progress toward milestones, view activity feeds, and access health tips.

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Supabase
- React Router
- date-fns

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/       # Reusable components
│   ├── common/      # Shared UI components
│   ├── layout/      # Layout components
│   ├── auth/        # Authentication components
│   ├── plank/       # Plank logging components
│   ├── activity/    # Activity feed components
│   └── tips/        # Health tips components
├── pages/           # Page components
├── lib/             # Libraries and configurations
├── hooks/           # Custom React hooks
├── context/         # React context providers
└── utils/           # Utility functions
```

## Database Schema

The app uses the following Supabase tables:
- `companies` - Company information
- `teams` - Team information
- `users` - User profiles
- `plank_logs` - Plank time entries
- `milestones` - Challenge milestones
- `user_milestones` - User milestone progress
- `activity_feed` - Activity feed entries
- `health_tips` - Health and wellness tips
- `admin_users` - Admin user information

## Features

- User authentication
- Plank time logging
- Cumulative progress tracking
- Milestone achievements
- Activity feed
- Health tips
- Team and company leaderboards
