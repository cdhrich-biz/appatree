import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export default function AdminCategories() {
  const categoriesQuery = trpc.admin.categories.list.useQuery();
  const createMutation = trpc.admin.categories.create.useMutation({ onSuccess: () => categoriesQuery.refetch() });
  const updateMutation = trpc.admin.categories.update.useMutation({ onSuccess: () => categoriesQuery.refetch() });
  const deleteMutation = trpc.admin.categories.delete.useMutation({ onSuccess: () => categoriesQuery.refetch() });

  const [showForm, setShowForm] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newQuery, setNewQuery] = useState('');

  const categories = categoriesQuery.data ?? [];

  const handleCreate = () => {
    if (!newSlug || !newName || !newIcon || !newQuery) return;
    createMutation.mutate({ slug: newSlug, name: newName, icon: newIcon, searchQuery: newQuery, sortOrder: categories.length });
    setShowForm(false);
    setNewSlug(''); setNewName(''); setNewIcon(''); setNewQuery('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">카테고리 관리</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" />추가</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>새 카테고리</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>슬러그 (영문)</Label><Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="novel" /></div>
              <div><Label>이름 (한국어)</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="소설" /></div>
              <div><Label>아이콘 (이모지)</Label><Input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="📖" /></div>
              <div><Label>검색 쿼리</Label><Input value={newQuery} onChange={(e) => setNewQuery(e.target.value)} placeholder="소설 오디오북" /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>저장</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>취소</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-4 p-4 border rounded-lg">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
            <span className="text-2xl">{cat.icon}</span>
            <div className="flex-1">
              <p className="font-medium">{cat.name}</p>
              <p className="text-sm text-muted-foreground">{cat.searchQuery}</p>
            </div>
            <Switch
              checked={cat.isActive}
              onCheckedChange={(checked) => updateMutation.mutate({ id: cat.id, isActive: checked })}
            />
            <Button variant="ghost" size="sm" onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate({ id: cat.id }); }}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
