import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useSupabaseRole } from '@/hooks/useSupabaseRole';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { currentUser, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useSupabaseRole();

  const loading = authLoading || (adminOnly ? roleLoading : false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-breakfast-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;