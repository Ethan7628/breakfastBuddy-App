
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthRoute from "@/components/AuthRoute";
import AdminRoute from "@/components/AdminRoute";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load components for better performance
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));  
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Menu = lazy(() => import("./pages/Menu"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Settings = lazy(() => import("./pages/Settings"));
const Orders = lazy(() => import("./pages/Orders"));

// Loading component for suspense
const PageSkeleton = () => (
  <div className="min-h-screen p-6">
    <div className="max-w-4xl mx-auto space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes  
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Layout component that includes Header and Footer
const Layout = () => {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandaloneMode = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone || 
                        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
      
      // Add app-specific class to body when in standalone mode
      if (standalone) {
        document.body.classList.add('pwa-standalone');
      } else {
        document.body.classList.remove('pwa-standalone');
      }
    };

    checkStandaloneMode();
    
    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandaloneMode);
    
    return () => {
      mediaQuery.removeEventListener('change', checkStandaloneMode);
      document.body.classList.remove('pwa-standalone');
    };
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-breakfast-50 to-sunrise-50 flex flex-col ${isStandalone ? 'pwa-app-layout' : ''}`}>
      <Header />
      <main className={`flex-1 ${isStandalone ? 'pwa-main-content' : ''}`}>
        <Outlet />
      </main>
      {!isStandalone && <Footer />}
    </div>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Suspense fallback={<PageSkeleton />}><Index /></Suspense>} />
                <Route path="login" element={<Suspense fallback={<PageSkeleton />}><Login /></Suspense>} />
                <Route path="signup" element={<Suspense fallback={<PageSkeleton />}><Signup /></Suspense>} />
                <Route element={<AuthRoute />}>
                  <Route path="dashboard" element={<Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense>} />
                  <Route path="menu" element={<Suspense fallback={<PageSkeleton />}><Menu /></Suspense>} />
                  <Route path="orders" element={<Suspense fallback={<PageSkeleton />}><Orders /></Suspense>} />
                  <Route path="settings" element={<Suspense fallback={<PageSkeleton />}><Settings /></Suspense>} />
                </Route>
                <Route element={<AdminRoute />}>
                  <Route path="admin" element={<Suspense fallback={<PageSkeleton />}><Admin /></Suspense>} />
                </Route>
                <Route path="*" element={<Suspense fallback={<PageSkeleton />}><NotFound /></Suspense>} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
