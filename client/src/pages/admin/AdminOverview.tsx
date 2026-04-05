import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Search, BookOpen, Bell } from 'lucide-react';

export default function AdminOverview() {
  const overviewQuery = trpc.admin.analytics.overview.useQuery();
  const searchLogsQuery = trpc.admin.analytics.searchLogs.useQuery({ days: 7, limit: 10 });

  const stats = overviewQuery.data;
  const topQueries = searchLogsQuery.data?.topQueries ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">관리자 대시보드</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">오늘 검색 수</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todaySearches ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 북마크</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBookmarks ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">활성 공지</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeAnnouncements ?? '-'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Queries */}
      <Card>
        <CardHeader>
          <CardTitle>최근 7일 인기 검색어</CardTitle>
        </CardHeader>
        <CardContent>
          {topQueries.length > 0 ? (
            <div className="space-y-2">
              {topQueries.map((q, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm">{q.query}</span>
                  <span className="text-sm text-muted-foreground">{q.count}회</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">검색 데이터가 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
