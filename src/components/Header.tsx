
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, User, Home, ShoppingCart, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentUser, userData, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast({ title: 'Logged out successfully' });
    } catch (error) {
      toast({ title: 'Error logging out', variant: 'destructive' });
    }
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Menu', path: '/menu', icon: ShoppingCart },
    { name: 'Dashboard', path: '/dashboard', icon: User },
    ...(userData?.isAdmin ? [{ name: 'Admin', path: '/admin', icon: Settings }] : []),
  ];

  return (
    <header className="bg-white shadow-lg border-b-2 border-breakfast-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 breakfast-gradient rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">BB</span>
            </div>
            <span className="text-xl font-bold text-breakfast-800">Breakfast Buddy</span>
          </Link>

          {/* Desktop Navigation */}
          {currentUser && (
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-breakfast-100 text-breakfast-800'
                      : 'text-gray-600 hover:text-breakfast-700 hover:bg-breakfast-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          )}

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <>
                <span className="hidden sm:block text-sm text-gray-600">
                  Welcome, {userData?.name || currentUser.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden md:flex items-center space-x-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
                
                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="md:hidden"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <div className="space-x-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild size="sm" className="breakfast-gradient text-white">
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && currentUser && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-breakfast-100 text-breakfast-800'
                      : 'text-gray-600 hover:text-breakfast-700 hover:bg-breakfast-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-red-700 hover:bg-red-50 w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
