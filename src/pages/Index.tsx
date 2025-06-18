
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Index = () => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-24 h-24 breakfast-gradient rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white font-bold text-4xl">BB</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-breakfast-800 mb-6">
              Breakfast Buddy
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Your perfect breakfast companion. Order delicious morning meals delivered fresh to your campus location. 
              Start your day right with our carefully curated breakfast menu.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {currentUser ? (
              <>
                <Button asChild size="lg" className="breakfast-gradient text-white text-lg px-8 py-3">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
                  <Link to="/menu">Browse Menu</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="breakfast-gradient text-white text-lg px-8 py-3">
                  <Link to="/signup">Get Started</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
                  <Link to="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-breakfast-800 mb-12">
            Why Choose Breakfast Buddy?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-xl font-semibold text-breakfast-800 mb-3">Fast Delivery</h3>
                <p className="text-gray-600">
                  Quick delivery to your campus block. Fresh breakfast ready when you need it.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="text-6xl mb-4">🍳</div>
                <h3 className="text-xl font-semibold text-breakfast-800 mb-3">Fresh Ingredients</h3>
                <p className="text-gray-600">
                  Made with the freshest ingredients and prepared with care for the perfect start to your day.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-xl font-semibold text-breakfast-800 mb-3">Easy Ordering</h3>
                <p className="text-gray-600">
                  Simple, intuitive ordering process. Select your location and get your favorite breakfast delivered.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!currentUser && (
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-breakfast-800 mb-6">
              Ready to Start Your Morning Right?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join thousands of students who trust Breakfast Buddy for their daily dose of deliciousness.
            </p>
            <Button asChild size="lg" className="breakfast-gradient text-white text-lg px-8 py-3">
              <Link to="/signup">Create Your Account</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
