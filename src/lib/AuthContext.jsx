import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'supabase-app', public_settings: {} });

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Map Supabase user to app user structure
        const appUser = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.user_metadata?.role || 'user',
          name: session.user.user_metadata?.full_name || session.user.email.split('@')[0]
        };
        setUser(appUser);
        setIsAuthenticated(true);
      }
      setIsLoadingAuth(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        const appUser = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.user_metadata?.role || 'user',
          name: session.user.user_metadata?.full_name || session.user.email.split('@')[0]
        };
        setUser(appUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError({ type: 'login_failed', message: error.message });
      setIsLoadingAuth(false);
      return false;
    }

    setIsLoadingAuth(false);
    return true;
  };

  const logout = async () => {
    setIsLoadingAuth(true);
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error.message);
    
    setUser(null);
    setSession(null);
    setIsAuthenticated(false);
    setIsLoadingAuth(false);
    window.location.href = '/';
  };

  const navigateToLogin = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const checkAppState = async () => {
    // No-op in Supabase mode for now
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      login,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
