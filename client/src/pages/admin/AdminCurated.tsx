import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, Trash2 } from 'lucide-react';

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string } }; description: string };
}

export default function AdminCurated() {
  const [categorySlug, setCategorySlug] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const curatedQuery = trpc.admin.curated.list.useQuery({ categorySlug: categorySlug || undefined });
  const categoriesQuery = trpc.admin.categories.list.useQuery();
  const searchYouTubeQuery = trpc.admin.curated.searchYouTube.useQuery(
    { query: searchQuery, maxResults: 10 },
    { enabled: searchQuery.length > 0 }
  );
  const createMutation = trpc.admin.curated.create.useMutation({ onSuccess: () => curatedQuery.refetch() });
  const updateMutation = trpc.admin.curated.update.useMutation({ onSuccess: () => curatedQuery.refetch() });
  const deleteMutation = trpc.admin.curated.delete.useMutation({ onSuccess: () => curatedQuery.refetch() });

  const categories = categoriesQuery.data ?? [];
  const curatedItems = curatedQuery.data ?? [];
  const searchResults = (searchYouTubeQuery.data?.items as YouTubeSearchItem[] | undefined) ?? [];

  const handleAddCurated = (item: YouTubeSearchItem) => {
    if (!categorySlug) { alert('카테고리를 먼저 선택해주세요'); return; }
    createMutation.mutate({
      categorySlug,
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.medium?.url,
      description: item.snippet.description.slice(0, 200),
      sortOrder: curatedItems.length,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">큐레이션 콘텐츠</h1>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={!categorySlug ? 'default' : 'outline'} size="sm" onClick={() => setCategorySlug('')}>전체</Button>
        {categories.map((cat) => (
          <Button key={cat.id} variant={categorySlug === cat.slug ? 'default' : 'outline'} size="sm" onClick={() => setCategorySlug(cat.slug)}>
            {cat.icon} {cat.name}
          </Button>
        ))}
      </div>

      {/* YouTube Search Panel */}
      <Card>
        <CardHeader><CardTitle>YouTube 검색 (큐레이션 추가용)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input placeholder="검색어 입력..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Button><Search className="h-4 w-4" /></Button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {searchResults.map((item) => (
                <div key={item.id.videoId} className="flex items-center gap-3 p-2 border rounded hover:bg-muted/50">
                  <img src={item.snippet.thumbnails.medium?.url ?? ''} alt="" className="w-16 h-10 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.snippet.title}</p>
                    <p className="text-xs text-muted-foreground">{item.snippet.channelTitle}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleAddCurated(item)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Curated List */}
      <div className="space-y-2">
        {curatedItems.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
            {item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" className="w-20 h-12 rounded object-cover" />}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.channelName} · {item.categorySlug}</p>
            </div>
            <Switch checked={item.isActive} onCheckedChange={(checked) => updateMutation.mutate({ id: item.id, isActive: checked })} />
            <Button variant="ghost" size="sm" onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate({ id: item.id }); }}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
        {curatedItems.length === 0 && <p className="text-muted-foreground text-center py-8">큐레이션 콘텐츠가 없습니다.</p>}
      </div>
    </div>
  );
}
