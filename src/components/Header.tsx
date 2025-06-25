
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Menu, X, User, LogOut, Settings, Home } from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/menu', label: 'Menu', icon: null },
    ...(userData?.isAdmin ? [{ to: '/admin', label: 'Admin', icon: null }] : []),
    ...(currentUser && !userData?.isAdmin ? [{ to: '/dashboard', label: 'Dashboard', icon: null }] : []),
  ];

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 font-bold text-xl text-breakfast-800 hover:text-breakfast-700 transition-colors"
          >
            <span className="text-2xl">🥞</span>
            <span className="hidden sm:inline">Breakfast Buddy</span>
            <span className="sm:hidden">BB</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive(link.to)
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-foreground hover:text-accent-foreground hover:bg-accent/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden lg:flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Welcome, {userData?.name || 'User'}!
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center space-x-2 border-border hover:bg-accent/10"
                    >
                      <User className="h-4 w-4" />
                      <span>Account</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-48 bg-popover border border-border shadow-lg"
                  >
                    <DropdownMenuItem className="flex items-center space-x-2 cursor-pointer hover:bg-accent/10">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-destructive/10 text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  asChild
                  className="hover:bg-accent/10"
                >
                  <Link to="/login">Login</Link>
                </Button>
                <Button 
                  asChild
                  className="btn-primary"
                >
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-accent/10 transition-colors"
            aria-label="Toggle mobile menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border bg-white/95 backdrop-blur-sm">
            <div className="space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isActive(link.to)
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-accent/10'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              {currentUser ? (
                <div className="border-t border-border pt-4 mt-4">
                  <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
                    Welcome, {userData?.name || 'User'}!
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="border-t border-border pt-4 mt-4 space-y-3">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg font-medium text-foreground hover:bg-accent/10 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg font-medium bg-breakfast-gradient text-white text-center transition-all duration-200 hover:shadow-md"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
