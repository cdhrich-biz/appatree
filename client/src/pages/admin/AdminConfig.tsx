import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface ConfigValues {
  [key: string]: string;
}

export default function AdminConfig() {
  const configQuery = trpc.admin.config.list.useQuery();
  const updateMutation = trpc.admin.config.update.useMutation({
    onSuccess: () => { toast.success('설정이 저장되었습니다'); configQuery.refetch(); },
  });

  const [values, setValues] = useState<ConfigValues>({});

  useEffect(() => {
    if (configQuery.data) {
      const map: ConfigValues = {};
      configQuery.data.forEach((c) => { map[c.configKey] = c.configValue; });
      setValues(map);
    }
  }, [configQuery.data]);

  const getValue = (key: string, fallback: string) => values[key] ?? fallback;
  const setValue = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const saveValue = (key: string, description?: string) => updateMutation.mutate({ key, value: values[key] ?? '', description });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">앱 설정</h1>

      {/* AI Settings */}
      <Card>
        <CardHeader><CardTitle>AI 설정</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>시스템 프롬프트</Label>
            <Textarea
              rows={6}
              value={getValue('ai.systemPrompt', '')}
              onChange={(e) => setValue('ai.systemPrompt', e.target.value)}
              placeholder="AI 채팅 시스템 프롬프트를 입력하세요..."
            />
            <Button size="sm" className="mt-2" onClick={() => saveValue('ai.systemPrompt', 'AI 채팅 시스템 프롬프트')}>저장</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>온도 (Temperature)</Label>
              <Input type="number" step="0.1" min="0" max="2" value={getValue('ai.temperature', '0.7')} onChange={(e) => setValue('ai.temperature', e.target.value)} />
              <Button size="sm" className="mt-2" onClick={() => saveValue('ai.temperature', 'LLM 온도')}>저장</Button>
            </div>
            <div>
              <Label>최대 토큰 수</Label>
              <Input type="number" value={getValue('ai.maxTokens', '2048')} onChange={(e) => setValue('ai.maxTokens', e.target.value)} />
              <Button size="sm" className="mt-2" onClick={() => saveValue('ai.maxTokens', '최대 응답 토큰')}>저장</Button>
            </div>
          </div>
          <div>
            <Label>인사말 메시지</Label>
            <Textarea rows={2} value={getValue('ai.greetingMessage', '')} onChange={(e) => setValue('ai.greetingMessage', e.target.value)} placeholder="AI 채팅 초기 인사말" />
            <Button size="sm" className="mt-2" onClick={() => saveValue('ai.greetingMessage', '채팅 초기 인사말')}>저장</Button>
          </div>
        </CardContent>
      </Card>

      {/* YouTube Settings */}
      <Card>
        <CardHeader><CardTitle>YouTube 설정</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>안전 검색 레벨</Label>
              <Select value={getValue('youtube.safeSearch', 'strict')} onValueChange={(v) => { setValue('youtube.safeSearch', v); updateMutation.mutate({ key: 'youtube.safeSearch', value: v, description: '안전 검색 레벨' }); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">엄격 (Strict)</SelectItem>
                  <SelectItem value="moderate">보통 (Moderate)</SelectItem>
                  <SelectItem value="none">없음 (None)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>검색 언어</Label>
              <Input value={getValue('youtube.relevanceLanguage', 'ko')} onChange={(e) => setValue('youtube.relevanceLanguage', e.target.value)} />
              <Button size="sm" className="mt-2" onClick={() => saveValue('youtube.relevanceLanguage', '검색 언어')}>저장</Button>
            </div>
            <div>
              <Label>기본 결과 수</Label>
              <Input type="number" value={getValue('youtube.defaultMaxResults', '10')} onChange={(e) => setValue('youtube.defaultMaxResults', e.target.value)} />
              <Button size="sm" className="mt-2" onClick={() => saveValue('youtube.defaultMaxResults', '기본 결과 수')}>저장</Button>
            </div>
            <div>
              <Label>오디오북 검색 접미사</Label>
              <Input value={getValue('youtube.audiobookSuffix', '오디오북')} onChange={(e) => setValue('youtube.audiobookSuffix', e.target.value)} />
              <Button size="sm" className="mt-2" onClick={() => saveValue('youtube.audiobookSuffix', '검색어 자동 접미사')}>저장</Button>
            </div>
          </div>
          <div>
            <Label>차단 채널 (쉼표 구분)</Label>
            <Input value={getValue('youtube.blockedChannels', '[]')} onChange={(e) => setValue('youtube.blockedChannels', e.target.value)} placeholder='["채널ID1","채널ID2"]' />
            <Button size="sm" className="mt-2" onClick={() => saveValue('youtube.blockedChannels', '차단 채널 목록 (JSON 배열)')}>저장</Button>
          </div>
          <div>
            <Label>차단 키워드 (JSON 배열)</Label>
            <Input value={getValue('youtube.blockedKeywords', '[]')} onChange={(e) => setValue('youtube.blockedKeywords', e.target.value)} placeholder='["키워드1","키워드2"]' />
            <Button size="sm" className="mt-2" onClick={() => saveValue('youtube.blockedKeywords', '차단 키워드 목록 (JSON 배열)')}>저장</Button>
          </div>
        </CardContent>
      </Card>

      {/* Voice Settings */}
      <Card>
        <CardHeader><CardTitle>음성 인식 설정</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>STT 제공자</Label>
              <Select value={getValue('stt.provider', 'webSpeech')} onValueChange={(v) => { setValue('stt.provider', v); updateMutation.mutate({ key: 'stt.provider', value: v, description: 'STT 제공자' }); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="webSpeech">Web Speech API (브라우저)</SelectItem>
                  <SelectItem value="whisper">Whisper (서버)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>기본 언어</Label>
              <Input value={getValue('stt.language', 'ko-KR')} onChange={(e) => setValue('stt.language', e.target.value)} />
              <Button size="sm" className="mt-2" onClick={() => saveValue('stt.language', '기본 STT 언어')}>저장</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card>
        <CardHeader><CardTitle>앱 설정</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>유지보수 모드</Label>
            <Switch
              checked={getValue('app.maintenanceMode', 'false') === 'true'}
              onCheckedChange={(checked) => {
                setValue('app.maintenanceMode', String(checked));
                updateMutation.mutate({ key: 'app.maintenanceMode', value: String(checked), description: '유지보수 모드' });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
