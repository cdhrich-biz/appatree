import { lazy, Suspense, useEffect, useMemo, type ComponentType } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { RemoteSessionProvider } from "./contexts/RemoteSessionContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import IncomingSessionDialog from "./components/remote/IncomingSessionDialog";
import ActiveSessionBanner from "./components/remote/ActiveSessionBanner";
import ParentActionExecutor from "./components/remote/ParentActionExecutor";
import HighlightOverlay from "./components/remote/HighlightOverlay";
import ConnectionStatusBanner from "./components/remote/ConnectionStatusBanner";
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

// 원격 가족 지원 라우트 (Sprint 2~)
const RemoteInvite = lazy(() => import("./pages/RemoteInvite"));
const RemoteAccept = lazy(() => import("./pages/RemoteAccept"));
const Family = lazy(() => import("./pages/Family"));
const RemoteHelper = lazy(() => import("./pages/RemoteHelper"));

// 인증
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));

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

        {/* 원격 가족 지원 */}
        <Route path={"/help"} component={RemoteInvite} />
        <Route path={"/family"} component={Family} />
        <Route path={"/family/accept"} component={RemoteAccept} />
        <Route path={"/remote/:sessionKey"} component={RemoteHelper} />

        {/* 인증 */}
        <Route path={"/login"} component={Login} />
        <Route path={"/auth/callback"} component={AuthCallback} />

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

function useObserverMode(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("observer") === "1" || window.self !== window.top;
  }, []);
}

function ObserverApp() {
  // iframe 내부에서 실행되는 읽기 전용 미러. 포인터 이벤트 차단 + 하단 네비 숨김.
  useEffect(() => {
    document.documentElement.classList.add("remote-observer");
    return () => {
      document.documentElement.classList.remove("remote-observer");
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <PreferencesProvider>
          <TooltipProvider>
            <Router />
          </TooltipProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function App() {
  const observer = useObserverMode();
  if (observer) return <ObserverApp />;

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <PreferencesProvider>
            <RemoteSessionProvider>
              <TooltipProvider>
                <Toaster />
                <ActiveSessionBanner />
                <ConnectionStatusBanner />
                <ParentActionExecutor />
                <HighlightOverlay />
                <Router />
                <IncomingSessionDialog />
              </TooltipProvider>
            </RemoteSessionProvider>
          </PreferencesProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
