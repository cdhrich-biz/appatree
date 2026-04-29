import { Flashlight, Camera, Search } from 'lucide-react';
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
