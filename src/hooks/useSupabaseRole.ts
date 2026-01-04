import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSupabaseRole = () => {
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!currentUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Get the current session to use the JWT token
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Check if user has admin role using the has_role function
        console.log('Checking admin role for user:', session.user.id);
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin'
        });

        console.log('has_role result:', { data, error });

        let isUserAdmin = false;

        if (error) {
          console.error('Error checking admin role via RPC:', error);
        } else {
          isUserAdmin = data || false;
          console.log('isAdmin set to:', isUserAdmin);
        }

        setIsAdmin(isUserAdmin);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [currentUser]);

  return { isAdmin, loading };
};
