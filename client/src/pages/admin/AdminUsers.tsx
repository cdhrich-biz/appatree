import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const usersQuery = trpc.admin.users.list.useQuery({ limit, offset: page * limit, search: search || undefined });
  const updateRoleMutation = trpc.admin.users.updateRole.useMutation({ onSuccess: () => usersQuery.refetch() });

  const users = usersQuery.data?.items ?? [];
  const total = usersQuery.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">사용자 관리</h1>

      <Input placeholder="이름 또는 이메일로 검색..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="max-w-sm" />

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>로그인 방식</TableHead>
              <TableHead>마지막 로그인</TableHead>
              <TableHead>가입일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name ?? '-'}</TableCell>
                <TableCell>{user.email ?? '-'}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(value) => updateRoleMutation.mutate({ userId: user.id, role: value as 'user' | 'admin' })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{user.loginMethod ?? '-'}</TableCell>
                <TableCell>{new Date(user.lastSignedIn).toLocaleDateString('ko-KR')}</TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {total > limit && (
        <div className="flex gap-2 justify-center">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-4 py-2 border rounded disabled:opacity-50">이전</button>
          <span className="px-4 py-2 text-sm text-muted-foreground">{page + 1} / {Math.ceil(total / limit)}</span>
          <button onClick={() => setPage(page + 1)} disabled={(page + 1) * limit >= total} className="px-4 py-2 border rounded disabled:opacity-50">다음</button>
        </div>
      )}
    </div>
  );
}
