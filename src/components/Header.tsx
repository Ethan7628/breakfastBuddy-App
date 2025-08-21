import { useState, useEffect } from 'react';
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
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import logo from "../images/logo.png"
import '../styles/Header.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Listen for unread messages for regular users
  useEffect(() => {
    if (!currentUser || userData?.isAdmin) {
      setUnreadCount(0);
      return;
    }

    const messagesQuery = query(
      collection(db, 'chatMessages'),
      where('userId', '==', currentUser.uid),
      where('isFromAdmin', '==', true),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    });

    return () => unsubscribe();
  }, [currentUser, userData?.isAdmin]);

  // Listen for unread messages for admin users
  useEffect(() => {
    if (!currentUser || !userData?.isAdmin) {
      setAdminUnreadCount(0);
      return;
    }

    const messagesQuery = query(
      collection(db, 'chatMessages'),
      where('isFromAdmin', '==', false),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setAdminUnreadCount(snapshot.docs.length);
    });

    return () => unsubscribe();
  }, [currentUser, userData?.isAdmin]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/menu', label: 'Menu', icon: null },
    ...(currentUser ? [{ to: '/orders', label: 'Orders', icon: null }] : []),
    ...(userData?.isAdmin ? [{
      to: '/admin',
      label: 'Admin',
      icon: null,
      badge: adminUnreadCount > 0 ? adminUnreadCount : null
    }] : []),
    ...(currentUser && !userData?.isAdmin ? [{
      to: '/dashboard',
      label: 'Dashboard',
      icon: null,
      badge: unreadCount > 0 ? unreadCount : null
    }] : []),
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
              className={`header-nav-link${isActive(link.to) ? ' active' : ''} relative`}
            >
              {link.label}
              {link.badge && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="header-auth">
          {currentUser ? (
            <div className="header-auth-user">
              
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
                  className="w-48 header-dropdown-content"
                >
                  <DropdownMenuItem
                    onClick={handleSettingsClick}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-accent/10"
                  >
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
                className={`header-mobile-menu-link${isActive(link.to) ? ' active' : ''} relative`}
              >
                {link.label}
                {link.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}

            {currentUser ? (
              <div className="header-mobile-auth">
                <button
                  onClick={() => {
                    handleSettingsClick();
                    setIsMenuOpen(false);
                  }}
                  className="header-mobile-menu-link flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
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
