import { type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Home as HomeIcon, Search, MessageCircle, BookOpen, Settings as SettingsIcon } from 'lucide-react';

interface AppShellProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  headerRight?: ReactNode;
  hideBottomNav?: boolean;
  children: ReactNode;
}

export default function AppShell({
  title,
  subtitle,
  showBack = false,
  onBack,
  headerRight,
  hideBottomNav = false,
  children,
}: AppShellProps) {
  const [location, navigate] = useLocation();

  const handleBack = () => {
    if (onBack) onBack();
    else window.history.length > 1 ? window.history.back() : navigate('/');
  };

  return (
    <div className="app-surface min-h-screen flex flex-col">
      {(title || showBack || headerRight) && (
        <header className="sticky top-0 z-20 app-surface border-b border-[color:var(--app-border)]">
          <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
            {showBack ? (
              <button
                onClick={handleBack}
                className="btn-icon -ml-2"
                aria-label="뒤로가기"
              >
                <ArrowLeft size={28} />
              </button>
            ) : (
              <button
                onClick={() => navigate('/settings')}
                className="btn-icon -ml-2"
                aria-label="설정"
              >
                <SettingsIcon size={28} />
              </button>
            )}
            <div className="flex-1 min-w-0">
              {title && <h1 className="text-senior-heading truncate">{title}</h1>}
              {subtitle && <p className="text-senior-body text-gray-600 truncate">{subtitle}</p>}
            </div>
            {headerRight && <div className="flex items-center gap-1">{headerRight}</div>}
          </div>
        </header>
      )}

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-6 pb-28">
        {children}
      </main>

      {!hideBottomNav && <BottomNav current={location} onNavigate={navigate} />}
    </div>
  );
}

function BottomNav({ current, onNavigate }: { current: string; onNavigate: (path: string) => void }) {
  const items = [
    { path: '/', label: '홈', icon: HomeIcon, aria: '홈' },
    { path: '/search', label: '검색', icon: Search, aria: '검색' },
    { path: '/chat', label: 'AI 대화', icon: MessageCircle, aria: 'AI 대화' },
    { path: '/library', label: '즐겨찾기', icon: BookOpen, aria: '즐겨찾기' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return current === '/';
    return current.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 app-surface border-t-2 border-[color:var(--app-border)]"
      aria-label="주요 탐색"
    >
      <div className="max-w-2xl mx-auto grid grid-cols-4">
        {items.map(({ path, label, icon: Icon, aria }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => onNavigate(path)}
              aria-label={aria}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                active ? 'text-green-700' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span
                className={`flex items-center justify-center rounded-2xl px-4 py-1.5 transition-all ${
                  active ? 'bg-green-100' : ''
                }`}
              >
                <Icon size={28} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className={`text-sm ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
