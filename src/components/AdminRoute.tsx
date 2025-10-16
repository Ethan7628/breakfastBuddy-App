
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { useSupabaseRole } from '@/hooks/useSupabaseRole';

const AdminRoute = () => {
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useSupabaseRole();

  const loading = authLoading || roleLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-breakfast-600"></div>
      </div>
    );
  }

  // Server-side role check via Supabase
  return (session && isAdmin) ? <Outlet /> : <Navigate to="/" replace />;
};

export default AdminRoute;
