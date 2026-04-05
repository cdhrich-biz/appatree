import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#16a34a', '#2563eb', '#dc2626', '#f59e0b'];

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);

  const searchLogsQuery = trpc.admin.analytics.searchLogs.useQuery({ days, limit: 10 });
  const userActivityQuery = trpc.admin.analytics.userActivity.useQuery({ days });
  const popularQuery = trpc.admin.analytics.popularContent.useQuery({ limit: 10 });

  const dailyCounts = searchLogsQuery.data?.dailyCounts ?? [];
  const topQueries = searchLogsQuery.data?.topQueries ?? [];
  const signups = userActivityQuery.data?.signups ?? [];
  const topBookmarked = popularQuery.data?.topBookmarked ?? [];

  // Voice vs Text ratio
  const totalVoice = dailyCounts.reduce((sum, d) => sum + (d.voiceCount ?? 0), 0);
  const totalText = dailyCounts.reduce((sum, d) => sum + (d.textCount ?? 0), 0);
  const pieData = [
    { name: '음성 검색', value: totalVoice },
    { name: '텍스트 검색', value: totalText },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">분석 대시보드</h1>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">최근 7일</SelectItem>
            <SelectItem value="30">최근 30일</SelectItem>
            <SelectItem value="90">최근 90일</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Searches */}
        <Card>
          <CardHeader><CardTitle>일별 검색량</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyCounts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Voice vs Text */}
        <Card>
          <CardHeader><CardTitle>검색 방식 비율</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        {/* Top Queries */}
        <Card>
          <CardHeader><CardTitle>인기 검색어 Top 10</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topQueries.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="query" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Signups */}
        <Card>
          <CardHeader><CardTitle>사용자 가입 추이</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={signups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Popular Bookmarked */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>인기 북마크 콘텐츠</CardTitle></CardHeader>
          <CardContent>
            {topBookmarked.length > 0 ? (
              <div className="space-y-2">
                {topBookmarked.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm truncate flex-1">{item.title}</span>
                    <span className="text-sm text-muted-foreground ml-4">{item.count}명</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
