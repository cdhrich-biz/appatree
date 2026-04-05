import { useAuth } from '@/_core/hooks/useAuth';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarInset, SidebarTrigger,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Users, FolderOpen, Settings, Bell, BarChart3, BookOpen, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

const menuItems = [
  { icon: LayoutDashboard, label: '대시보드', path: '/admin' },
  { icon: Users, label: '사용자 관리', path: '/admin/users' },
  { icon: FolderOpen, label: '카테고리', path: '/admin/categories' },
  { icon: BookOpen, label: '큐레이션', path: '/admin/curated' },
  { icon: Settings, label: '앱 설정', path: '/admin/config' },
  { icon: Bell, label: '공지사항', path: '/admin/announcements' },
  { icon: BarChart3, label: '분석', path: '/admin/analytics' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const [location, setLocation] = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p>로딩 중...</p></div>;
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">접근 권한이 없습니다</h1>
          <p className="text-muted-foreground">관리자만 접근할 수 있습니다.</p>
          <button onClick={() => setLocation('/')} className="px-6 py-2 bg-green-700 text-white rounded-lg">홈으로</button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r-0">
        <SidebarHeader className="h-14 justify-center px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎧</span>
            <span className="font-semibold group-data-[collapsible=icon]:hidden">관리자</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="px-2 py-1">
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  isActive={location === item.path}
                  onClick={() => setLocation(item.path)}
                  tooltip={item.label}
                  className="h-10"
                >
                  <item.icon className={`h-4 w-4 ${location === item.path ? 'text-primary' : ''}`} />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setLocation('/')} tooltip="사용자 앱으로" className="h-10">
                <ArrowLeft className="h-4 w-4" />
                <span>사용자 앱으로</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex border-b h-14 items-center px-4 bg-background/95 backdrop-blur sticky top-0 z-40">
          <SidebarTrigger className="h-9 w-9 rounded-lg" />
          <span className="ml-3 font-medium">{menuItems.find((m) => m.path === location)?.label ?? '관리자'}</span>
        </div>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
