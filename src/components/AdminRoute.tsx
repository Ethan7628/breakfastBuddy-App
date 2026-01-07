import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSupabaseRole } from '@/hooks/useSupabaseRole';

const AdminRoute = () => {
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useSupabaseRole();
  const location = useLocation();

  const loading = authLoading || roleLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent"></div>
          <p className="text-amber-700 text-sm font-medium">Loading admin...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login with return path
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated but not admin, redirect to home
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
