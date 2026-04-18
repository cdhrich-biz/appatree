import { useRef, useState } from 'react';
import { Camera as CameraIcon, Download, RotateCcw } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { toast } from 'sonner';

export default function Camera() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('photo.jpg');

  const openCamera = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    setFileName(`appatree-${Date.now()}.jpg`);
  };

  const handleRetake = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    if (inputRef.current) inputRef.current.value = '';
    openCamera();
  };

  const handleSave = () => {
    if (!photoUrl) return;
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = fileName;
    link.click();
    toast.success('사진을 저장했습니다');
  };

  return (
    <AppShell title="사진" subtitle="크게 찍고 저장하기" showBack hideBottomNav>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden
      />

      {photoUrl ? (
        <>
          <div className="rounded-3xl overflow-hidden border-2 border-[color:var(--app-border)] mb-5 bg-black">
            <img
              src={photoUrl}
              alt="촬영한 사진"
              className="w-full h-auto max-h-[60vh] object-contain"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleRetake} className="btn-secondary" aria-label="다시 찍기">
              <RotateCcw size={24} />
              <span>다시 찍기</span>
            </button>
            <button onClick={handleSave} className="btn-primary" aria-label="사진 저장">
              <Download size={24} />
              <span>저장하기</span>
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-32 h-32 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CameraIcon size={64} className="text-green-700" />
          </div>
          <p className="text-senior-heading mb-2">카메라로 찍기</p>
          <p className="text-senior-body text-gray-600 mb-8">
            아래 버튼을 누르면 카메라가 열립니다
          </p>
          <button onClick={openCamera} className="btn-primary w-full">
            <CameraIcon size={26} />
            <span>카메라 열기</span>
          </button>
        </div>
      )}
    </AppShell>
  );
}
