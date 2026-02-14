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
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import PaymentBridge from "@/pages/PaymentBridge";
import KushkiCheckout from "@/pages/KushkiCheckout";
import NotFound from "@/pages/not-found";
import React from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PaymentPage} />
      <Route path="/payment/:requestId" component={LoadingPage} />
      <Route path="/payment-options" component={PaymentOptionsPage} />
      <Route path="/payment-quotas" component={PaymentQuotasPage} />
      <Route path="/payment-bridge" component={PaymentBridge} />
      <Route path="/payment-success" component={PaymentSuccessPage} />
      <Route path="/kushki-checkout" component={KushkiCheckout} />
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
