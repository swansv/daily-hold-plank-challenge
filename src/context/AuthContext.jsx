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

  // Helper: Log signup errors to database for debugging (mobile users can't see console)
  const logSignupError = async (email, errorMessage, errorDetails) => {
    try {
      console.log('[SignUp] Logging error to signup_errors table...');
      await supabase.from('signup_errors').insert([
        {
          email,
          error_message: errorMessage,
          error_details: errorDetails,
        },
      ]);
      console.log('[SignUp] Error logged to signup_errors table');
    } catch (logError) {
      console.error('[SignUp] Failed to log error to signup_errors table:', logError);
    }
  };

  // Helper: Clean up after failed signup - sign out user and log for manual deletion
  const cleanupAuthUser = async (userId, email) => {
    try {
      console.log('[SignUp] Cleaning up failed signup for user:', userId);

      // Sign out the user so they're not left in a broken state
      await supabase.auth.signOut();
      console.log('[SignUp] User signed out');

      // Log to signup_errors that this auth user needs manual deletion
      await supabase.from('signup_errors').insert([
        {
          email,
          error_message: 'GHOST ACCOUNT: Auth user created but profile insert failed - needs manual deletion',
          error_details: { auth_user_id: userId, needs_deletion: true },
        },
      ]);
      console.log('[SignUp] Ghost account logged for manual cleanup');
    } catch (cleanupError) {
      console.error('[SignUp] Exception during cleanup:', cleanupError);
    }
  };

  const signUp = async (email, password, userData) => {
    console.log('[SignUp] ========== SIGNUP START ==========');
    console.log('[SignUp] Email:', email);
    console.log('[SignUp] User data:', JSON.stringify(userData, null, 2));

    try {
      // STEP 1: Validate that access code is provided
      if (!userData.company_code) {
        const errorMsg = 'Access code is required';
        console.error('[SignUp] ' + errorMsg);
        throw new Error(errorMsg);
      }

      // STEP 2: Look up company UUID from access code BEFORE creating auth user
      let companyId = null;
      console.log('[SignUp] STEP 2: Looking up access code:', userData.company_code);
      try {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('company_code', userData.company_code)
          .single();

        if (companyError) {
          console.error('[SignUp] Access code lookup FAILED:', companyError);
          throw new Error(`Invalid access code "${userData.company_code}"`);
        }
        companyId = companyData?.id;
        console.log('[SignUp] Access code lookup result - companyId:', companyId, 'type:', typeof companyId);
      } catch (companyLookupError) {
        console.error('[SignUp] Access code lookup exception:', companyLookupError);
        throw companyLookupError;
      }

      // CRITICAL CHECK: company_id is NOT NULL in database
      if (!companyId) {
        const errorMsg = `Invalid access code "${userData.company_code}"`;
        console.error('[SignUp] ' + errorMsg);
        throw new Error(errorMsg);
      }

      // Log resolved ID before proceeding
      console.log('[SignUp] Pre-auth check - companyId:', companyId);

      // STEP 3: Create auth user
      console.log('[SignUp] STEP 3: Calling supabase.auth.signUp...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        console.error('[SignUp] Auth signUp FAILED:', error);
        throw error;
      }

      console.log('[SignUp] Auth signUp succeeded:', {
        userId: data.user?.id,
        email: data.user?.email,
        session: data.session ? 'present' : 'null',
      });

      // STEP 4: Create user profile in users table
      if (data.user) {
        console.log('[SignUp] STEP 4: Creating user profile in users table...');

        // Log EXACT values being inserted
        const insertValues = {
          auth_user_id: data.user.id,
          email: data.user.email,
          full_name: userData.full_name,
          company_id: companyId,
        };

        console.log('[SignUp] INSERT VALUES (exact):');
        console.log('  auth_user_id:', insertValues.auth_user_id, '| type:', typeof insertValues.auth_user_id);
        console.log('  email:', insertValues.email, '| type:', typeof insertValues.email);
        console.log('  full_name:', insertValues.full_name, '| type:', typeof insertValues.full_name);
        console.log('  company_id:', insertValues.company_id, '| type:', typeof insertValues.company_id);

        // CRITICAL: Check for null company_id before INSERT (column is NOT NULL)
        if (insertValues.company_id === null || insertValues.company_id === undefined) {
          const errorMsg = 'SIGNUP FAILED: company_id is ' + (insertValues.company_id === null ? 'null' : 'undefined') + ' - cannot insert into users table (NOT NULL constraint)';
          console.error('[SignUp] ' + errorMsg);
          throw new Error(errorMsg);
        }

        // Wrap INSERT in its own try/catch for detailed error capture
        try {
          console.log('[SignUp] Executing INSERT...');
          const { data: insertData, error: profileError } = await supabase
            .from('users')
            .insert([insertValues])
            .select();

          if (profileError) {
            console.error('[SignUp] INSERT FAILED with Supabase error:');
            console.error('  message:', profileError.message);
            console.error('  code:', profileError.code);
            console.error('  details:', profileError.details);
            console.error('  hint:', profileError.hint);

            // Log error to signup_errors table for debugging (mobile users can't see console)
            await logSignupError(email, profileError.message, {
              code: profileError.code,
              details: profileError.details,
              hint: profileError.hint,
              insertValues,
              step: 'users_table_insert',
            });

            // Clean up the auth user to prevent ghost accounts
            console.log('[SignUp] Cleaning up: signing out and logging ghost account...');
            await cleanupAuthUser(data.user.id, email);

            throw profileError;
          }

          console.log('[SignUp] INSERT SUCCEEDED! Created user:', insertData);
        } catch (insertError) {
          console.error('[SignUp] INSERT exception caught:', insertError);
          console.error('[SignUp] INSERT exception message:', insertError.message);

          // Log error to signup_errors table if not already logged (Supabase errors have .code)
          if (!insertError.code) {
            await logSignupError(email, insertError.message, {
              insertValues,
              step: 'users_table_insert_exception',
            });

            // Clean up the auth user to prevent ghost accounts
            console.log('[SignUp] Cleaning up: signing out and logging ghost account...');
            await cleanupAuthUser(data.user.id, email);
          }

          throw insertError;
        }

        console.log('[SignUp] Profile created successfully!');
      } else {
        console.warn('[SignUp] No user returned from auth.signUp - email confirmation may be required');
      }

      console.log('[SignUp] ========== SIGNUP COMPLETE ==========');
      return { data, error: null };
    } catch (error) {
      console.error('[SignUp] ========== SIGNUP FAILED ==========');
      console.error('[SignUp] Final error:', error);
      console.error('[SignUp] Error message:', error.message);
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
