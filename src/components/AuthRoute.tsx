import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const AuthRoute = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-breakfast-600"></div>
      </div>
    );
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />;
};

export default AuthRoute;
