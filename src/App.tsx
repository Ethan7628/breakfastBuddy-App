
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthRoute from "@/components/AuthRoute";
import AdminRoute from "@/components/AdminRoute";
import Header from "@/components/Header";
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

// Layout component that includes Header
const Layout = () => (
  <div className="min-h-screen bg-gradient-to-br from-breakfast-50 to-sunrise-50">
    <Header />
    <Outlet />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
