import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import logo from "../images/logo.png";
import '../styles/Signup.css';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signup, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast({
        title: 'Google sign-up failed',
        description: 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        variant: 'destructive'
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password must be at least 6 characters',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const result = await signup(email, password, name);

      if (result.error) {
        toast({
          title: 'Signup failed',
          description: result.error.message || 'Please try again.',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Account created!',
        description: 'Please check your email to confirm your account before logging in.',
        variant: 'default'
      });

      // Navigate to login after showing message
      setTimeout(() => navigate('/login'), 2000);

    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'Signup failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  return (<div className="signup-background">
    <Card className="signup-card">
      <CardHeader className="signup-card-header">
        <div className="signup-logo-container">
          <img src={logo} alt="logo" className="signup-logo-img" />
        </div>
        <CardTitle className="signup-title">Join Breakfast Buddy</CardTitle>
        <p className="signup-subtitle">Create your account to get started</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="signup-form-group">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="signup-input"
            />
          </div>
          <div className="signup-form-group">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="signup-input"
            />
          </div>
          <div className="signup-form-group">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              className="signup-input"
            />
          </div>
          <div className="signup-form-group">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="signup-input"
            />
          </div>
          <Button
            type="submit"
            className="signup-submit-btn"
            disabled={loading || googleLoading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
        
        <div className="flex items-center gap-4 my-4">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-sm">or</span>
          <Separator className="flex-1" />
        </div>
        
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {googleLoading ? 'Connecting...' : 'Continue with Google'}
        </Button>
        
        <div className="signup-footer">
          <p className="signup-footer-text">
            Already have an account?{' '}
            <Link to="/login" className="signup-footer-link">
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  </div>);

};

export default Signup;