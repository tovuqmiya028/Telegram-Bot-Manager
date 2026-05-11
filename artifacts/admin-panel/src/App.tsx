import { useEffect, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react/custom-fetch";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetAdminMe } from "@workspace/api-client-react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Users from "@/pages/Users";
import Sessions from "@/pages/Sessions";
import Tasks from "@/pages/Tasks";
import Logs from "@/pages/Logs";
import Broadcast from "@/pages/Broadcast";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

setAuthTokenGetter(() => {
  return localStorage.getItem("admin_token");
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useGetAdminMe();

  useEffect(() => {
    if (!isLoading && (!data || !data.authenticated)) {
      setLocation("/login");
    }
  }, [data, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Initializing Command Center...</p>
        </div>
      </div>
    );
  }

  if (!data?.authenticated) return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 min-w-0 bg-background h-screen overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}

function RedirectToDashboard() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/dashboard"); }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/" component={RedirectToDashboard} />

      <Route path="/dashboard">
        {() => <AuthGuard><Dashboard /></AuthGuard>}
      </Route>
      <Route path="/users">
        {() => <AuthGuard><Users /></AuthGuard>}
      </Route>
      <Route path="/sessions">
        {() => <AuthGuard><Sessions /></AuthGuard>}
      </Route>
      <Route path="/tasks">
        {() => <AuthGuard><Tasks /></AuthGuard>}
      </Route>
      <Route path="/logs">
        {() => <AuthGuard><Logs /></AuthGuard>}
      </Route>
      <Route path="/broadcast">
        {() => <AuthGuard><Broadcast /></AuthGuard>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Dark mode setup
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

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
