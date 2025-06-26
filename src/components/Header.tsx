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
import logo from "../images/logo.png"
import '../styles/Header.css';

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
    <header className="header-root">
      <div className="header-inner">
        {/* Logo */}
        <Link
          to="/"
          className="header-logo-link"
        >
          <img src={logo} alt='logo' className="header-logo-img" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="header-nav">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`header-nav-link${isActive(link.to) ? ' active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="header-auth">
          {currentUser ? (
            <div className="header-auth-user">
              <span className="header-auth-welcome">
                Welcome, {userData?.name || 'User'}!
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="header-dropdown-btn"
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
            <div className="header-auth-user">
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
          className="header-mobile-btn"
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
        <div className="header-mobile-menu">
          <div className="header-mobile-menu-links">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className={`header-mobile-menu-link${isActive(link.to) ? ' active' : ''}`}
              >
                {link.label}
              </Link>
            ))}

            {currentUser ? (
              <div className="header-mobile-auth">
                <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
                  Welcome, {userData?.name || 'User'}!
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="header-mobile-menu-link text-destructive flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="header-mobile-auth">
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="header-mobile-menu-link"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="header-mobile-auth-link"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
