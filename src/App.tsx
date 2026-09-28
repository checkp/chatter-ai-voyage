import { lazy, Suspense } from "react";


import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ActivityLogProvider } from "@/contexts/ActivityLogContext";
import { FunThemeProvider } from "@/contexts/FunThemeContext";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
const NotFound = lazy(() => import("./pages/NotFound"));
const Success = lazy(() => import("./pages/Success"));
const Purchase = lazy(() => import("./pages/Purchase"));
const ImageGenerationPage = lazy(() => import("./pages/ImageGeneration"));
const AuthPage = lazy(() => import("./components/AuthPage"));
const Help = lazy(() => import("./pages/Help"));
const Features = lazy(() => import("./pages/Features"));
const WhatsNew = lazy(() => import("./pages/WhatsNew"));
const Terms = lazy(() => import("./pages/Terms"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const McpSetup = lazy(() => import("./pages/McpSetup"));
const Tools = lazy(() => import("./pages/Tools"));
const ApiAccess = lazy(() => import("./pages/ApiAccess"));
const Coordination = lazy(() => import("./pages/Coordination"));
const MeshModels = lazy(() => import("./pages/MeshModels"));

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
          <Suspense fallback={null}>
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
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/mcp" element={<McpSetup />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/api" element={<ApiAccess />} />
            <Route path="/coordination" element={<Coordination />} />
            <Route path="/mesh-models" element={<MeshModels />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
      </FunThemeProvider>
      </ActivityLogProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
