
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import logo from "../images/logo.png";
import '../styles/Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
      toast({ title: 'Welcome back!' });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login failed',
        description: 'Please check your credentials and try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address first.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setResetLoading(true);
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Password reset email sent',
        description: 'Check your email for password reset instructions.',
      });
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: 'Failed to send reset email',
        description: 'Please check your email address and try again.',
        variant: 'destructive'
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-root">
      <Card className="login-card">
        <CardHeader className="login-header">
          <div className="login-logo-wrap">
            <img src={logo} alt="logo" className="login-logo" />
          </div>
          <CardTitle className="login-title">Welcome Back</CardTitle>
          <p className="login-desc">Sign in to your Breakfast Buddy account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-form-group">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="login-input"
              />
            </div>
            <div className="login-form-group">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="login-input"
              />
            </div>
            <div className="flex justify-end mb-4">
              <Button
                type="button"
                variant="link"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-sm text-breakfast-600 hover:text-breakfast-700 p-0 h-auto"
              >
                {resetLoading ? 'Sending...' : 'Forgot password?'}
              </Button>
            </div>
            <Button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="login-footer">
            <p className="login-footer-text">
              Don't have an account?{' '}
              <Link to="/signup" className="login-footer-link">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
