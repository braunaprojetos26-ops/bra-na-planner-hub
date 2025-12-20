import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ActingUserProvider } from "@/contexts/ActingUserContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import Pipeline from "./pages/Pipeline";
import AdminPipelines from "./pages/AdminPipelines";

const queryClient = new QueryClient();

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ActingUserProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedPage><Index /></ProtectedPage>} />
              <Route path="/contacts" element={<ProtectedPage><Contacts /></ProtectedPage>} />
              <Route path="/contacts/:contactId" element={<ProtectedPage><ContactDetail /></ProtectedPage>} />
              <Route path="/pipeline" element={<ProtectedPage><Pipeline /></ProtectedPage>} />
              <Route path="/admin/pipelines" element={<ProtectedPage><AdminPipelines /></ProtectedPage>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ActingUserProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
