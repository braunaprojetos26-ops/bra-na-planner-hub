import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ActingUserProvider } from "@/contexts/ActingUserContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import ContactAnalysis from "./pages/ContactAnalysis";
import Pipeline from "./pages/Pipeline";
import OpportunityDetail from "./pages/OpportunityDetail";
import Structure from "./pages/Structure";
import AdminSettings from "./pages/AdminSettings";
import Contracts from "./pages/Contracts";
import Tasks from "./pages/Tasks";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Analytics from "./pages/Analytics";
import HealthScore from "./pages/HealthScore";
import Wiki from "./pages/Wiki";
import WikiCategory from "./pages/WikiCategory";
import Team from "./pages/Team";
import TeamManagement from "./pages/TeamManagement";
import PlannerDetail from "./pages/PlannerDetail";
import Tickets from "./pages/Tickets";
import MeuFuturo from "./pages/MeuFuturo";
import NotificationHistory from "./pages/NotificationHistory";
import OpportunityMap from "./pages/OpportunityMap";

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
              <Route path="/contacts/:contactId/analise" element={<ProtectedPage><ContactAnalysis /></ProtectedPage>} />
              <Route path="/pipeline" element={<ProtectedPage><Pipeline /></ProtectedPage>} />
              <Route path="/pipeline/:opportunityId" element={<ProtectedPage><OpportunityDetail /></ProtectedPage>} />
              <Route path="/tasks" element={<ProtectedPage><Tasks /></ProtectedPage>} />
              <Route path="/clients" element={<ProtectedPage><Clients /></ProtectedPage>} />
              <Route path="/clients/:planId" element={<ProtectedPage><ClientDetail /></ProtectedPage>} />
              <Route path="/structure" element={<ProtectedPage><Structure /></ProtectedPage>} />
              <Route path="/admin/settings" element={<ProtectedPage><AdminSettings /></ProtectedPage>} />
              <Route path="/admin/settings/:tab" element={<ProtectedPage><AdminSettings /></ProtectedPage>} />
              {/* Redirects from old routes to new unified settings */}
              <Route path="/admin/users" element={<Navigate to="/admin/settings" replace />} />
              <Route path="/admin/pipelines" element={<Navigate to="/admin/settings" replace state={{ tab: 'pipelines' }} />} />
              <Route path="/admin/products" element={<Navigate to="/admin/settings" replace state={{ tab: 'products' }} />} />
              <Route path="/admin/data-collection" element={<Navigate to="/admin/settings" replace state={{ tab: 'data-collection' }} />} />
              <Route path="/admin/assistant" element={<Navigate to="/admin/settings" replace state={{ tab: 'ai' }} />} />
              <Route path="/admin/diagnostic" element={<Navigate to="/admin/settings" replace state={{ tab: 'ai' }} />} />
              <Route path="/contracts" element={<ProtectedPage><Contracts /></ProtectedPage>} />
              <Route path="/analytics" element={<ProtectedPage><Analytics /></ProtectedPage>} />
              <Route path="/analytics/health-score" element={<ProtectedPage><HealthScore /></ProtectedPage>} />
              <Route path="/analytics/opportunity-map" element={<ProtectedPage><OpportunityMap /></ProtectedPage>} />
              <Route path="/wiki" element={<ProtectedPage><Wiki /></ProtectedPage>} />
              <Route path="/wiki/:categorySlug" element={<ProtectedPage><WikiCategory /></ProtectedPage>} />
              <Route path="/wiki/:categorySlug/:folderId" element={<ProtectedPage><WikiCategory /></ProtectedPage>} />
              <Route path="/equipe" element={<ProtectedPage><Team /></ProtectedPage>} />
              <Route path="/equipe/gestao" element={<ProtectedPage><TeamManagement /></ProtectedPage>} />
              <Route path="/equipe/gestao/:userId" element={<ProtectedPage><PlannerDetail /></ProtectedPage>} />
              <Route path="/tickets" element={<ProtectedPage><Tickets /></ProtectedPage>} />
              <Route path="/notifications" element={<ProtectedPage><NotificationHistory /></ProtectedPage>} />
              <Route path="/meu-futuro" element={<ProtectedPage><MeuFuturo /></ProtectedPage>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ActingUserProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
