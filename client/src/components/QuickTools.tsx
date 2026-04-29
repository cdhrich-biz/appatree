import { Film, Flashlight, Camera, Search } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { useCameraTorch } from '@/hooks/useCameraTorch';

export default function QuickTools() {
  const [, navigate] = useLocation();
  const torch = useCameraTorch();

  const handleTorchClick = async () => {
    await torch.toggle();
    if (torch.error && !torch.isOn) {
      toast.error(torch.error);
    }
  };

  return (
    <section className="mb-8" aria-labelledby="quicktools-heading">
      <h2 id="quicktools-heading" className="text-senior-heading mb-3">빠른 도구</h2>

      <button
        onClick={() => navigate('/video')}
        className="w-full flex items-center gap-4 rounded-3xl p-5 mb-3 border-2 border-[color:var(--app-border)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          minHeight: 120,
        }}
        aria-label="영상 보기 열기"
      >
        <span
          className="flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff' }}
          aria-hidden
        >
          <Film size={40} strokeWidth={2.2} />
        </span>
        <div className="flex-1 text-left">
          <p className="text-senior-button text-green-800">영상 보기</p>
          <p className="text-senior-body text-gray-600 mt-1">
            뉴스 · 건강 · 트로트 · 요리
          </p>
        </div>
      </button>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={handleTorchClick}
          className="tile-senior"
          style={
            torch.isOn
              ? { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }
              : undefined
          }
          aria-label={torch.isOn ? '후레쉬 끄기' : '후레쉬 켜기'}
          aria-pressed={torch.isOn}
        >
          <Flashlight
            size={44}
            strokeWidth={2.2}
            className={torch.isOn ? 'text-amber-600' : 'text-gray-800'}
            fill={torch.isOn ? 'currentColor' : 'none'}
          />
          <span className="text-senior-button">
            {torch.isOn ? '켜짐' : '후레쉬'}
          </span>
        </button>

        <button
          onClick={() => navigate('/camera')}
          className="tile-senior"
          aria-label="사진 촬영 열기"
        >
          <Camera size={44} strokeWidth={2.2} className="text-gray-800" />
          <span className="text-senior-button">사진</span>
        </button>

        <button
          onClick={() => navigate('/magnifier')}
          className="tile-senior"
          aria-label="돋보기 열기"
        >
          <Search size={44} strokeWidth={2.2} className="text-gray-800" />
          <span className="text-senior-button">돋보기</span>
        </button>
      </div>
    </section>
  );
}
