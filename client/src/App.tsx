import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Portfolio from "@/pages/portfolio";
import Analytics from "@/pages/analytics";
import NotFound from "@/pages/not-found";
import BottomNavigation from "@/components/ui/bottom-navigation";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Portfolio} />
      <Route path="/analytics" component={Analytics} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <BottomNavigation />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
