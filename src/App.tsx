

import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ActivityLogProvider } from "@/contexts/ActivityLogContext";
import { FunThemeProvider } from "@/contexts/FunThemeContext";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Success from "./pages/Success";
import Purchase from "./pages/Purchase";
import ImageGenerationPage from "./pages/ImageGeneration";
import AuthPage from "./components/AuthPage";
import Help from "./pages/Help";
import Features from "./pages/Features";
import WhatsNew from "./pages/WhatsNew";
import Terms from "./pages/Terms";
import Analytics from "./components/Analytics";
import { loadAIModelsFromDB } from "@/config/aiModels";

// Hydrate the AI model catalog from the DB pricing table at app boot.
loadAIModelsFromDB();

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ActivityLogProvider>
      <FunThemeProvider>
      <TooltipProvider>
        
        <BrowserRouter>
          <Analytics />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/purchase" element={<Purchase />} />
            <Route path="/images" element={<ImageGenerationPage />} />
            <Route path="/success" element={<Success />} />
            <Route path="/help" element={<Help />} />
            <Route path="/features" element={<Features />} />
            <Route path="/whats-new" element={<WhatsNew />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </FunThemeProvider>
      </ActivityLogProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
