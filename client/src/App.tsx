import { lazy, Suspense, type ComponentType } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { ThemeProvider } from "./contexts/ThemeContext";
// 첫 페이지로 가장 자주 진입하는 Home만 eager import (스플래시 레이턴시 최소화)
import Home from "./pages/Home";

// 메인 시니어 앱 라우트는 lazy
const SearchResults = lazy(() => import("./pages/SearchResults"));
const Player = lazy(() => import("./pages/Player"));
const AIChat = lazy(() => import("./pages/AIChat"));
const Library = lazy(() => import("./pages/Library"));
const Settings = lazy(() => import("./pages/Settings"));
const VideoHome = lazy(() => import("./pages/VideoHome"));
const Camera = lazy(() => import("./pages/Camera"));
const Magnifier = lazy(() => import("./pages/Magnifier"));
const NotFound = lazy(() => import("./pages/NotFound"));

// 관리자 페이지는 일반 시니어 사용자에게 로드될 필요 전혀 없음 → 전부 lazy
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminCurated = lazy(() => import("./pages/admin/AdminCurated"));
const AdminConfig = lazy(() => import("./pages/admin/AdminConfig"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));

function PageFallback() {
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center app-surface text-senior-body text-gray-500"
      role="status"
      aria-live="polite"
    >
      불러오는 중...
    </div>
  );
}

function AdminRoute({
  Page,
}: {
  Page: ComponentType;
}) {
  return (
    <Suspense fallback={<PageFallback />}>
      <AdminLayout>
        <Page />
      </AdminLayout>
    </Suspense>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/search"} component={SearchResults} />
        <Route path={"/player"} component={Player} />
        <Route path={"/chat"} component={AIChat} />
        <Route path={"/library"} component={Library} />
        <Route path={"/settings"} component={Settings} />
        <Route path={"/video"} component={VideoHome} />
        <Route path={"/camera"} component={Camera} />
        <Route path={"/magnifier"} component={Magnifier} />

        {/* Admin Routes (lazy 전부) */}
        <Route path="/admin">{() => <AdminRoute Page={AdminOverview} />}</Route>
        <Route path="/admin/users">{() => <AdminRoute Page={AdminUsers} />}</Route>
        <Route path="/admin/categories">{() => <AdminRoute Page={AdminCategories} />}</Route>
        <Route path="/admin/curated">{() => <AdminRoute Page={AdminCurated} />}</Route>
        <Route path="/admin/config">{() => <AdminRoute Page={AdminConfig} />}</Route>
        <Route path="/admin/announcements">{() => <AdminRoute Page={AdminAnnouncements} />}</Route>
        <Route path="/admin/analytics">{() => <AdminRoute Page={AdminAnalytics} />}</Route>

        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
