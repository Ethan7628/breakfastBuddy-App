import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ResponsiveLogo } from '../components/ResponsiveLogo';
import '../styles/Signup.css';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

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
      await signup(email, password, name);

      toast({
        title: 'Account created successfully!',
        variant: 'default'
      });

      // Navigate after toast is shown
      setTimeout(() => navigate('/dashboard'), 1000);

    } catch (error) {
      console.error('Signup error:', error);
      // toast({
      //   title: 'Signup failed',
      //   description: error instanceof Error ? error.message : 'Please try again.',
      //   variant: 'destructive'
      // });
    } finally {
      setLoading(false);
    }
  };
  return (<div className="signup-background">
    <Card className="signup-card">
      <CardHeader className="signup-card-header">
        <div className="signup-logo-container">
          <ResponsiveLogo size="small" className="signup-logo-img" />
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
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
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