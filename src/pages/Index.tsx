import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import logo from "../images/logo.png";
import '../styles/Index.css';

const Index = () => {
  const { currentUser } = useAuth();

  return (
    <div className="index-root">
      {/* Hero Section */}
      <section className="index-hero-section">
        <div className="index-hero-inner">
          <div className="index-hero-logo-wrap">
            <div className="index-hero-logo-bg">
              <img src={logo} alt="Breakfast Buddy Logo" className="index-hero-logo" />
            </div>
            <p className="index-hero-desc">
              Your perfect breakfast companion. Order delicious morning meals delivered fresh to your campus location.
              Start your day right with our carefully curated breakfast menu designed for students who value quality and convenience.
              <div className="index-hero-btns">
                {currentUser ? (
                  <>
                    <Button asChild variant="hero" size="lg">
                      <Link to="/dashboard">Go to Dashboard</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link to="/menu">Browse Menu</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="hero" size="lg">
                      <Link to="/signup">Get Started</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link to="/login">Sign In</Link>
                    </Button>
                  </>
                )}
              </div>
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="index-section">
        <div className="index-section-inner">
          <h2 className="index-section-title">
            Why Choose Breakfast Buddy?
          </h2>

          <div className="index-features-grid">
            <Card className="index-feature-card">
              <CardContent className="index-feature-card-content">
                <div className="index-feature-icon">🚀</div>
                <h3 className="index-feature-title">Lightning Fast Delivery</h3>
                <p className="index-feature-desc">
                  Get your breakfast delivered to your campus block in under 30 minutes. Fresh, hot, and ready when you need it most.
                </p>
              </CardContent>
            </Card>

            <Card className="index-feature-card">
              <CardContent className="index-feature-card-content">
                <div className="index-feature-icon">🍳</div>
                <h3 className="index-feature-title">Premium Fresh Ingredients</h3>
                <p className="index-feature-desc">
                  Every meal is crafted with the finest, locally-sourced ingredients. Nutritious, delicious, and perfect for busy students.
                </p>
              </CardContent>
            </Card>

            <Card className="index-feature-card">
              <CardContent className="index-feature-card-content">
                <div className="index-feature-icon">📱</div>
                <h3 className="index-feature-title">Seamless Experience</h3>
                <p className="index-feature-desc">
                  Intuitive ordering, real-time tracking, and personalized recommendations. Your perfect breakfast is just a few taps away.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!currentUser && (
        <section className="index-cta-section">
          <div className="index-cta-inner">
            <h2 className="index-cta-title">
              Ready to Transform Your Mornings?
            </h2>
            <p className="index-cta-desc">
              Join thousands of satisfied students who've made Breakfast Buddy their go-to morning fuel. Your taste buds will thank you.
            </p>
            <Button asChild variant="hero" size="lg" className="text-lg py-6">
              <Link to="/signup">Start Your Journey</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
