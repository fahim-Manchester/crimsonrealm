import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RequireAuth } from "@/components/auth/RequireAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Resources from "./pages/Resources";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Achievements from "./pages/Achievements";
import Campaigns from "./pages/Campaigns";
import CampaignSession from "./pages/CampaignSession";
import Diary from "./pages/Diary";
import Settings from "./pages/Settings";
import Codex from "./pages/Codex";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // Data stays fresh for 5 minutes
      gcTime: 10 * 60 * 1000,          // Cache persists for 10 minutes
      refetchOnWindowFocus: false,     // DON'T refetch when tab regains focus
      refetchOnReconnect: false,       // DON'T refetch on internet reconnect
      retry: 1,                        // Only retry failed requests once
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected routes - wrapped with RequireAuth */}
          <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/resources" element={<RequireAuth><Resources /></RequireAuth>} />
          <Route path="/projects" element={<RequireAuth><Projects /></RequireAuth>} />
          <Route path="/tasks" element={<RequireAuth><Tasks /></RequireAuth>} />
          <Route path="/achievements" element={<RequireAuth><Achievements /></RequireAuth>} />
          <Route path="/campaigns" element={<RequireAuth><Campaigns /></RequireAuth>} />
          <Route path="/campaigns/:id" element={<RequireAuth><CampaignSession /></RequireAuth>} />
          <Route path="/diary" element={<RequireAuth><Diary /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/codex" element={<RequireAuth><Codex /></RequireAuth>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
