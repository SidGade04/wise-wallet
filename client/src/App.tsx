import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Subscriptions from "./pages/Subscriptions";
import AIAssistant from "./pages/AIAssistant";
import Upgrade from "./pages/Upgrade";
import Investments from "./pages/Investments";
import NotFound from "./pages/NotFound";
import { PaymentDebugTool } from '@/components/debug/PaymentDebugTool';
import SettingsPage from "./pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000, // 1 minute
      retry: 2,
    },
  },
});

// Inner component with routes
const AppContent = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={
        <ProtectedRoute requiresBankConnection={true}>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/transactions" element={
        <ProtectedRoute requiresBankConnection={true}>
          <AppLayout>
            <Transactions />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/subscriptions" element={
        <ProtectedRoute requiresBankConnection={true} requiresSubscription={true}>
          <AppLayout>
            <Subscriptions />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/investments" element={
        <ProtectedRoute requiresBankConnection={true} requiresSubscription={true}>
          <AppLayout>
            <Investments />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/assistant" element={
        <ProtectedRoute requiresBankConnection={true} requiresSubscription={true}>
          <AppLayout>
            <AIAssistant />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/upgrade" element={
        <ProtectedRoute>
          <AppLayout>
            <Upgrade />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/debug-payment" element={
        <ProtectedRoute>
          <AppLayout>
            <PaymentDebugTool />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <AppLayout>
            <SettingsPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;