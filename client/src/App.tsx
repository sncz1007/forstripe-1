import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import PaymentPage from "@/pages/PaymentPage";
import LoadingPage from "@/pages/LoadingPage";
import AdminPanel from "@/pages/AdminPanel";
import AdminQuotasPanel from "@/pages/AdminQuotasPanel";
import PaymentOptionsPage from "@/pages/PaymentOptionsPage";
import PaymentQuotasPage from "@/pages/PaymentQuotasPage";
import NotFound from "@/pages/not-found";
import React from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PaymentPage} />
      <Route path="/payment/:requestId" component={LoadingPage} />
      <Route path="/payment-options/:requestId" component={PaymentOptionsPage} />
      <Route path="/payment-quotas" component={PaymentQuotasPage} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/admin-quotas" component={AdminQuotasPanel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
