import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

export default function AdminAnnouncements() {
  const listQuery = trpc.admin.announcements.list.useQuery();
  const createMutation = trpc.admin.announcements.create.useMutation({ onSuccess: () => { listQuery.refetch(); setShowForm(false); } });
  const updateMutation = trpc.admin.announcements.update.useMutation({ onSuccess: () => listQuery.refetch() });
  const deleteMutation = trpc.admin.announcements.delete.useMutation({ onSuccess: () => listQuery.refetch() });

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'urgent'>('info');

  const items = listQuery.data ?? [];

  const handleCreate = () => {
    if (!title || !content) return;
    createMutation.mutate({ title, content, type });
    setTitle(''); setContent(''); setType('info');
  };

  const typeBadge = (t: string) => {
    switch (t) {
      case 'urgent': return <Badge variant="destructive">긴급</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">주의</Badge>;
      default: return <Badge variant="secondary">정보</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">공지사항 관리</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" />추가</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>새 공지사항</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>제목</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label>내용</Label><Textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} /></div>
            <div>
              <Label>유형</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">정보</SelectItem>
                  <SelectItem value="warning">주의</SelectItem>
                  <SelectItem value="urgent">긴급</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>저장</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>취소</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
            {typeBadge(item.type)}
            <div className="flex-1">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-1">{item.content}</p>
            </div>
            <Switch checked={item.isActive} onCheckedChange={(checked) => updateMutation.mutate({ id: item.id, isActive: checked })} />
            <Button variant="ghost" size="sm" onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate({ id: item.id }); }}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
