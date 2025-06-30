import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import logo from "../images/logo.png";
import '../styles/Index.css';
import { setupAdminAccount } from '@/utils/adminSetup';

const Index = () => {
  const { currentUser } = useAuth();

  return (
    <div className="index-root">
      {/* Hero Section */}
      <section
        className="index-hero-section"
      >
        <div className="index-hero-inner">
          <div className="index-hero-logo-wrap">
            <div className="index-hero-logo-bg">
              <img src={logo} alt="logo" className="index-hero-logo" />
            </div>
            <p className="index-hero-desc">
              Your perfect breakfast companion. Order delicious morning meals delivered fresh to your campus location.
              Start your day right with our carefully curated breakfast menu.
              <div className="index-hero-btns">
                {currentUser ? (
                  <>
                    <Button asChild size="lg" style={{ background: 'linear-gradient(135deg, #ffd54f 0%, #ffeb3b 100%)', color: '#fff', fontSize: 18, padding: '0.75rem 2rem', borderRadius: 8, fontWeight: 500 }}>
                      <Link to="/dashboard">Go to Dashboard</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" style={{ fontSize: 18, padding: '0.75rem 2rem', borderRadius: 8, fontWeight: 500 }}>
                      <Link to="/menu">Browse Menu</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="lg" style={{ background: 'linear-gradient(135deg, #ffd54f 0%, #ffeb3b 100%)', color: '#fff', fontSize: 18, padding: '0.75rem 2rem', borderRadius: 8, fontWeight: 500 }}>
                      <Link to="/signup">Get Started</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" style={{ fontSize: 18, padding: '0.75rem 2rem', borderRadius: 8, fontWeight: 500 }}>
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
              <CardContent style={{ padding: 32 }}>
                <div className="index-feature-icon">🚀</div>
                <h3 className="index-feature-title">Fast Delivery</h3>
                <p className="index-feature-desc">
                  Quick delivery to your campus block. Fresh breakfast ready when you need it.
                </p>
              </CardContent>
            </Card>

            <Card className="index-feature-card">
              <CardContent style={{ padding: 32 }}>
                <div className="index-feature-icon">🍳</div>
                <h3 className="index-feature-title">Fresh Ingredients</h3>
                <p className="index-feature-desc">
                  Made with the freshest ingredients and prepared with care for the perfect start to your day.
                </p>
              </CardContent>
            </Card>

            <Card className="index-feature-card">
              <CardContent style={{ padding: 32 }}>
                <div className="index-feature-icon">📱</div>
                <h3 className="index-feature-title">Easy Ordering</h3>
                <p className="index-feature-desc">
                  Simple, intuitive ordering process. Select your location and get your favorite breakfast delivered.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {
        !currentUser && (
          <section className="index-cta-section">
            <div className="index-cta-inner">
              <h2 className="index-cta-title">
                Ready to Start Your Morning Right?
              </h2>
              <p className="index-cta-desc">
                Join thousands of students who trust Breakfast Buddy for their daily dose of deliciousness.
              </p>
              <Button asChild size="lg" style={{ background: 'linear-gradient(135deg, #ffd54f 0%, #ffeb3b 100%)', color: '#fff', fontSize: 18, padding: '0.75rem 2rem', borderRadius: 8, fontWeight: 500 }}>
                <Link to="/signup">Create Your Account</Link>
              </Button>
            </div>
          </section>
        )
      }
    </div>
  );
};

export default Index;
