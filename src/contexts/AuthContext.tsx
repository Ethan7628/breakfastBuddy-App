import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserData {
  uid: string;
  name: string;
  email: string;
  selectedBlock?: string;
  createdAt?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserBlock: (blockId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const signup = async (email: string, password: string, name: string): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: name
        }
      }
    });

    if (error) throw error;
    
    console.log('User signed up successfully:', data.user?.email);
  };

  const login = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const updateUserBlock = async (blockId: string): Promise<void> => {
    if (!currentUser) throw new Error('No user logged in');

    console.log('Updating user block:', { userId: currentUser.id, blockId });
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          selected_block: blockId,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      console.log('Successfully updated user block');

      // Update local state
      if (userData) {
        const updatedUserData = { ...userData, selectedBlock: blockId };
        setUserData(updatedUserData);
        console.log('Updated local user data:', updatedUserData);
      }
    } catch (error) {
      console.error('Error updating user block:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setCurrentUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetching to avoid blocking auth state changes
          setTimeout(async () => {
            try {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (error) {
                console.error('Error fetching profile:', error);
                return;
              }

              if (profile) {
                const userData: UserData = {
                  uid: session.user.id,
                  name: profile.name,
                  email: profile.email,
                  selectedBlock: profile.selected_block,
                  createdAt: profile.created_at
                };
                
                console.log('User profile loaded:', userData);
                setUserData(userData);
              }
            } catch (error) {
              console.error('Error fetching user profile:', error);
            }
          }, 0);
        } else {
          setUserData(null);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCurrentUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    session,
    loading,
    login,
    signup,
    logout,
    updateUserBlock
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
