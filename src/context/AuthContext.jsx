import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId) => {
    console.log('[LoadProfile] Loading profile for user:', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (error) {
        console.error('[LoadProfile] Failed to load profile:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
      console.log('[LoadProfile] Profile loaded successfully:', data);
      setProfile(data);
    } catch (error) {
      console.error('[LoadProfile] Error loading user profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, userData) => {
    console.log('[SignUp] Starting signup process for:', email);
    console.log('[SignUp] User data:', userData);

    try {
      // Look up company UUID from company_code if provided
      let companyId = null;
      if (userData.company_code) {
        console.log('[SignUp] Looking up company code:', userData.company_code);
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('company_code', userData.company_code)
          .single();

        if (companyError) {
          console.error('[SignUp] Company lookup failed:', companyError);
          throw new Error(`Company code "${userData.company_code}" not found`);
        }
        companyId = companyData.id;
        console.log('[SignUp] Found company ID:', companyId);
      }

      // Look up team UUID from team_code if provided
      let teamId = null;
      if (userData.team_code) {
        console.log('[SignUp] Looking up team code:', userData.team_code);
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id')
          .eq('team_code', userData.team_code)
          .single();

        if (teamError) {
          console.error('[SignUp] Team lookup failed:', teamError);
          throw new Error(`Team code "${userData.team_code}" not found`);
        }
        teamId = teamData.id;
        console.log('[SignUp] Found team ID:', teamId);
      }

      console.log('[SignUp] Calling supabase.auth.signUp...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        console.error('[SignUp] Auth signUp failed:', error);
        throw error;
      }

      console.log('[SignUp] Auth signUp succeeded:', {
        userId: data.user?.id,
        email: data.user?.email,
        session: data.session ? 'present' : 'null',
      });

      // Create user profile in users table
      if (data.user) {
        console.log('[SignUp] Creating user profile in users table...');
        const profileData = {
          auth_user_id: data.user.id,
          email: data.user.email,
          full_name: userData.full_name,
          company_id: companyId,
          team_id: teamId,
        };
        console.log('[SignUp] Profile data:', profileData);

        const { error: profileError } = await supabase
          .from('users')
          .insert([profileData]);

        if (profileError) {
          console.error('[SignUp] Profile INSERT failed:', profileError);
          console.error('[SignUp] Profile error details:', {
            message: profileError.message,
            code: profileError.code,
            details: profileError.details,
            hint: profileError.hint,
          });
          throw profileError;
        }

        console.log('[SignUp] Profile created successfully!');
      } else {
        console.warn('[SignUp] No user returned from auth.signUp - email confirmation may be required');
      }

      return { data, error: null };
    } catch (error) {
      console.error('[SignUp] Caught error:', error);
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const reloadProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    reloadProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
