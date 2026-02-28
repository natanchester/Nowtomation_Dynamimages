import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Login from "./pages/Login";
import Dynamimages from "./pages/Dynamimages";
import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isLoggedIn, isLoading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn && !isLoading ? <Navigate to="/Dynamimages" replace /> : <Login />} />
      <Route path="/Dynamimages" element={<ProtectedRoute><Dynamimages /></ProtectedRoute>} />
      <Route path="/Documentation" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/Dynamimages" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
