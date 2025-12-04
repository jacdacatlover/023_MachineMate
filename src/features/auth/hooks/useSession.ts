/**
 * useSession Hook
 *
 * Manages authentication state and provides auth operations
 * throughout the application.
 */

import { Session, User, AuthError } from '@supabase/supabase-js';
import { useState, useEffect, useCallback } from 'react';

import { supabase } from '../../../services/api';
import { createLogger } from '../../../shared/logger';
import { setMonitoringUser } from '../../../shared/observability/monitoring';

const logger = createLogger('auth.useSession');

export interface SessionState {
  /** Current authenticated user */
  user: User | null;
  /** Current session (includes access_token) */
  session: Session | null;
  /** Loading state for initial session check */
  isLoading: boolean;
  /** Error from auth operations */
  error: AuthError | null;
}

export interface UseSessionReturn extends SessionState {
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign up with email and password */
  signUp: (email: string, password: string) => Promise<void>;
  /** Sign out current user */
  signOut: () => Promise<void>;
  /** Clear any auth errors */
  clearError: () => void;
}

/**
 * Hook for managing authentication state
 *
 * Features:
 * - Real-time session state tracking
 * - Automatic token refresh
 * - Sentry user context integration
 * - Email/password authentication
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, signIn, signOut, isLoading } = useSession();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!user) return <LoginScreen onLogin={signIn} />;
 *
 *   return <App user={user} onLogout={signOut} />;
 * }
 * ```
 */
export function useSession(): UseSessionReturn {
  const [sessionState, setSessionState] = useState<SessionState>({
    user: null,
    session: null,
    isLoading: true,
    error: null,
  });

  /**
   * Initialize session from storage and set up listener
   */
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then((response) => {
        // Defensive check: ensure response is properly structured
        if (!response || typeof response !== 'object' || !response.data) {
          logger.error('Failed to get initial session: invalid response', {
            hasResponse: !!response,
            responseType: typeof response,
            hasData: !!(response?.data)
          });
          setSessionState({
            user: null,
            session: null,
            isLoading: false,
            error: null, // Don't show error on initial load, just start with no session
          });
          return;
        }

        const { data, error } = response;

        if (error) {
          logger.error('Failed to get initial session', { error });
          setSessionState({
            user: null,
            session: null,
            isLoading: false,
            error: null, // Don't show error on initial load
          });
          return;
        }

        const session = data?.session ?? null;
        const user = session?.user ?? null;

        // Update monitoring context
        if (user) {
          setMonitoringUser({ id: user.id, email: user.email });
          logger.info('User session restored', {
            userId: user.id,
            email: user.email,
          });
        }

        setSessionState({
          user,
          session,
          isLoading: false,
          error: null,
        });
      })
      .catch((err) => {
        logger.error('Exception during session initialization', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error'
        });
        // Don't block the app, just start with no session
        setSessionState({
          user: null,
          session: null,
          isLoading: false,
          error: null,
        });
      });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;

      // Update monitoring context
      if (user) {
        setMonitoringUser({ id: user.id, email: user.email });
        logger.info('Auth state changed', {
          event: _event,
          userId: user.id,
          email: user.email,
        });
      } else {
        setMonitoringUser(null);
        logger.info('User logged out', { event: _event });
      }

      setSessionState((prev) => ({
        ...prev,
        user,
        session,
        isLoading: false,
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setSessionState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Defensive check: ensure response is properly structured
      if (!response || typeof response !== 'object') {
        const errorMessage = 'Authentication service returned an invalid response. Please check your network connection.';
        logger.error('Sign in failed: invalid response type', {
          email,
          hasResponse: !!response,
          responseType: typeof response
        });
        const error = new Error(errorMessage) as AuthError;
        error.status = 500;
        setSessionState((prev) => ({
          ...prev,
          isLoading: false,
          error,
        }));
        throw error;
      }

      // Safely extract data and error
      const { data, error: authError } = response as { data: any; error: AuthError | null };

      if (authError) {
        logger.error('Sign in failed', { email, error: authError });
        setSessionState((prev) => ({
          ...prev,
          isLoading: false,
          error: authError,
        }));
        throw authError;
      }

      if (!data || !data.user) {
        const errorMessage = 'Authentication succeeded but no user data was returned.';
        logger.error('Sign in failed: no user data', { email, hasData: !!data });
        const error = new Error(errorMessage) as AuthError;
        error.status = 500;
        setSessionState((prev) => ({
          ...prev,
          isLoading: false,
          error,
        }));
        throw error;
      }

      logger.info('Sign in successful', {
        userId: data.user.id,
        email: data.user.email,
      });

      // State will be updated by onAuthStateChange listener
    } catch (error) {
      // Ensure error is properly formatted as AuthError
      let authError: AuthError;
      if ((error as AuthError).status !== undefined) {
        authError = error as AuthError;
      } else {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during sign in.';
        authError = new Error(errorMessage) as AuthError;
        authError.status = 500;
      }

      setSessionState((prev) => ({
        ...prev,
        isLoading: false,
        error: authError,
      }));
      throw authError;
    }
  }, []);

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setSessionState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await supabase.auth.signUp({
        email,
        password,
      });

      // Defensive check: ensure response is properly structured
      if (!response || typeof response !== 'object') {
        const errorMessage = 'Authentication service returned an invalid response. Please check your network connection.';
        logger.error('Sign up failed: invalid response type', {
          email,
          hasResponse: !!response,
          responseType: typeof response
        });
        const error = new Error(errorMessage) as AuthError;
        error.status = 500;
        setSessionState((prev) => ({
          ...prev,
          isLoading: false,
          error,
        }));
        throw error;
      }

      // Safely extract data and error
      const { data, error: authError } = response as { data: any; error: AuthError | null };

      if (authError) {
        logger.error('Sign up failed', { email, error: authError });
        setSessionState((prev) => ({
          ...prev,
          isLoading: false,
          error: authError,
        }));
        throw authError;
      }

      if (!data || !data.user) {
        const errorMessage = 'Sign up succeeded but no user data was returned.';
        logger.error('Sign up failed: no user data', { email, hasData: !!data });
        const error = new Error(errorMessage) as AuthError;
        error.status = 500;
        setSessionState((prev) => ({
          ...prev,
          isLoading: false,
          error,
        }));
        throw error;
      }

      logger.info('Sign up successful', {
        userId: data.user.id,
        email: data.user.email,
        needsEmailConfirmation: !data.session,
      });

      // State will be updated by onAuthStateChange listener
    } catch (error) {
      // Ensure error is properly formatted as AuthError
      let authError: AuthError;
      if ((error as AuthError).status !== undefined) {
        authError = error as AuthError;
      } else {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during sign up.';
        authError = new Error(errorMessage) as AuthError;
        authError.status = 500;
      }

      setSessionState((prev) => ({
        ...prev,
        isLoading: false,
        error: authError,
      }));
      throw authError;
    }
  }, []);

  /**
   * Sign out current user
   */
  const signOut = useCallback(async () => {
    try {
      setSessionState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.error('Sign out failed', { error });
        setSessionState((prev) => ({
          ...prev,
          isLoading: false,
          error,
        }));
        throw error;
      }

      logger.info('Sign out successful');

      // State will be updated by onAuthStateChange listener
    } catch (error) {
      const authError = error as AuthError;
      setSessionState((prev) => ({
        ...prev,
        isLoading: false,
        error: authError,
      }));
      throw error;
    }
  }, []);

  /**
   * Clear any auth errors
   */
  const clearError = useCallback(() => {
    setSessionState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...sessionState,
    signIn,
    signUp,
    signOut,
    clearError,
  };
}
