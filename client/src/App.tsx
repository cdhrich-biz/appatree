import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SearchResults from "./pages/SearchResults";
import Player from "./pages/Player";
import AIChat from "./pages/AIChat";
import Library from "./pages/Library";
import Settings from "./pages/Settings";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminCurated from "./pages/admin/AdminCurated";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/search"} component={SearchResults} />
      <Route path={"/player"} component={Player} />
      <Route path={"/chat"} component={AIChat} />
      <Route path={"/library"} component={Library} />
      <Route path={"/settings"} component={Settings} />

      {/* Admin Routes */}
      <Route path="/admin">{() => <AdminLayout><AdminOverview /></AdminLayout>}</Route>
      <Route path="/admin/users">{() => <AdminLayout><AdminUsers /></AdminLayout>}</Route>
      <Route path="/admin/categories">{() => <AdminLayout><AdminCategories /></AdminLayout>}</Route>
      <Route path="/admin/curated">{() => <AdminLayout><AdminCurated /></AdminLayout>}</Route>
      <Route path="/admin/config">{() => <AdminLayout><AdminConfig /></AdminLayout>}</Route>
      <Route path="/admin/announcements">{() => <AdminLayout><AdminAnnouncements /></AdminLayout>}</Route>
      <Route path="/admin/analytics">{() => <AdminLayout><AdminAnalytics /></AdminLayout>}</Route>

      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <PreferencesProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
