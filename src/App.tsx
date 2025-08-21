
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
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Menu from "./pages/Menu";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Orders from "./pages/Orders";

const queryClient = new QueryClient();

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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Index />} />
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route element={<AuthRoute />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="menu" element={<Menu />} />
                <Route path="orders" element={<Orders />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route element={<AdminRoute />}>
                <Route path="admin" element={<Admin />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
