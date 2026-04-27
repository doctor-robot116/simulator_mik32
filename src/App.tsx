import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ChapterPage from "@/pages/chapter";
import AdminPage from "@/pages/admin";
import EditorPage from "@/pages/editor";
import SimulatorPage from "@/pages/simulator";
import DiagramEditorPage from "@/pages/diagram-editor";
import ElementsPage from "@/pages/elements";
import ConfigToolsPage from "@/pages/config-tools";
import SdkPage from "@/pages/sdk";
import BaremetalPage from "@/pages/baremetal";
import ComparePage from "@/pages/compare";
import Mik32ConfiguratorPage from "@/pages/mik32-configurator";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/simulator" component={SimulatorPage} />
      <Route path="/diagram" component={DiagramEditorPage} />
      <Route path="/elements" component={ElementsPage} />
      <Route path="/config-tools" component={ConfigToolsPage} />
      <Route path="/sdk" component={SdkPage} />
      <Route path="/baremetal" component={BaremetalPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/mik32-configurator" component={Mik32ConfiguratorPage} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/chapter/:id" component={ChapterPage} />
            <Route path="/admin" component={AdminPage} />
            <Route path="/editor" component={EditorPage} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
