import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import AppShell from '@/components/AppShell';

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <AppShell title="페이지를 찾을 수 없습니다" showBack hideBottomNav>
      <div className="text-center py-12">
        <div className="mx-auto w-32 h-32 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <AlertCircle size={72} className="text-red-500" />
        </div>
        <p className="text-senior-title text-gray-800 mb-3">404</p>
        <p className="text-senior-heading text-gray-700 mb-3">
          주소가 잘못되었어요
        </p>
        <p className="text-senior-body text-gray-600 mb-10">
          찾으시는 화면이 없거나 이동했을 수 있어요.
          <br />
          아래 버튼으로 돌아가 주세요.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
          <button
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else navigate('/');
            }}
            className="btn-secondary"
            aria-label="이전 화면으로 돌아가기"
          >
            <ArrowLeft size={24} />
            <span>뒤로 가기</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
            aria-label="홈으로 돌아가기"
          >
            <Home size={24} />
            <span>홈으로</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
