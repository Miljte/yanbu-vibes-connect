
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, nickname: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          
          // Fetch user role if logged in
          if (currentSession?.user) {
            fetchUserRole(currentSession.user.id);
          } else {
            setUserRole('user'); // Default role for non-authenticated users
          }
          
          // Force loading to finish after a short delay
          setTimeout(() => {
            if (mounted) {
              setLoading(false);
            }
          }, 100);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setUserRole('user');
        }
      }
    };

    // Initialize auth
    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (mounted) {
        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          fetchUserRole(session.user.id);
        } else {
          setUserRole('user');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      console.log('Fetching user role for:', userId);
      
      // Temporarily bypass database check and set default role
      console.log('User role set to: user (bypassed database)');
      setUserRole('user');
      return;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('role', { ascending: false }) // admin > merchant > user
        .limit(1);
      
      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole('user');
        return;
      }
      
      const role = data?.[0]?.role || 'user';
      console.log('User role set to:', role);
      setUserRole(role);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('user');
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('signIn called with email:', email);
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('signIn result:', result);
    return result;
  };

  const signUp = async (email: string, password: string, nickname: string) => {
    console.log('signUp called with email:', email, 'nickname:', nickname);
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname,
        },
      },
    });
    console.log('signUp result:', result);
    return result;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: any) => {
    if (!user) return { error: 'No user logged in' };
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    
    return { data, error };
  };

  const value = {
    user,
    session,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
