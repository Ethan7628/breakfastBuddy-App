
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute = () => {
  const { currentUser, userData, loading } = useAuth();
  const adminEmail = "kusasirakwe.ethan.upti@gmail.com";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-breakfast-600"></div>
      </div>
    );
  }

  // Check both currentUser email and userData.isAdmin for double security
  const isAdmin = currentUser?.email === adminEmail && userData?.isAdmin === true;
  
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
};

export default AdminRoute;
