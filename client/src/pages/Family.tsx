import { useMemo } from "react";
import { UserRound, HelpingHand, UserPlus, LinkIcon, UserMinus } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { useRemoteSession } from "@/contexts/RemoteSessionContext";
import RequireAuth from "@/components/remote/RequireAuth";

export default function Family() {
  return (
    <RequireAuth title="가족">
      <FamilyContent />
    </RequireAuth>
  );
}

function FamilyContent() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { registerChildSession, myUserId } = useRemoteSession();
  const relationsQuery = trpc.remote.listRelations.useQuery();
  const requestMutation = trpc.remote.requestSession.useMutation();
  const revokeMutation = trpc.remote.revokeRelation.useMutation({
    onSuccess: () => utils.remote.listRelations.invalidate(),
  });

  const parents = useMemo(() => {
    const rows = relationsQuery.data ?? [];
    return rows.filter((r) => r.role === "child");
  }, [relationsQuery.data]);

  const children = useMemo(() => {
    const rows = relationsQuery.data ?? [];
    return rows.filter((r) => r.role === "parent");
  }, [relationsQuery.data]);

  const handleStartSession = async (parentUserId: number, parentName: string | null) => {
    if (!myUserId) {
      toast.error("로그인 정보를 확인할 수 없어요");
      return;
    }
    try {
      const res = await requestMutation.mutateAsync({ parentUserId });
      registerChildSession({
        sessionKey: res.session.sessionKey,
        parentUserId,
        childUserId: myUserId,
        counterpartName: parentName,
      });
      toast.success(`${parentName ?? "부모님"}께 연결을 요청했어요`);
      navigate(`/remote/${res.session.sessionKey}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "연결 요청에 실패했어요";
      toast.error(msg);
    }
  };

  const handleRevoke = async (relationId: number, name: string | null) => {
    if (!confirm(`${name ?? "이 가족"}과의 연결을 해제할까요?`)) return;
    await revokeMutation.mutateAsync({ relationId });
    toast.success("연결이 해제되었어요");
  };

  return (
    <AppShell title="가족" showBack>
      {/* 부모님 섹션 — 도움을 드리는 대상 */}
      <section className="card-senior mb-4">
        <div className="flex items-center gap-3 mb-4">
          <HelpingHand size={28} className="text-green-700" />
          <h2 className="text-senior-heading">부모님 도와드리기</h2>
        </div>

        {relationsQuery.isLoading ? (
          <p className="text-senior-body text-gray-500">불러오는 중...</p>
        ) : parents.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-senior-body text-gray-600 mb-4">
              아직 연결된 부모님이 없어요.
            </p>
            <button
              onClick={() => navigate("/family/accept")}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <LinkIcon size={22} />
              <span>초대 번호로 연결하기</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {parents.map((rel) => (
              <div
                key={rel.id}
                className="flex items-center gap-4 rounded-2xl p-4 border-2 border-green-200 bg-green-50"
              >
                <span
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-white text-green-700"
                  aria-hidden
                >
                  <UserRound size={28} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-senior-button text-green-900 truncate">
                    {rel.nickname || rel.counterpart?.name || "부모님"}
                  </p>
                  {rel.counterpart?.email && (
                    <p className="text-sm text-gray-600 truncate">{rel.counterpart.email}</p>
                  )}
                </div>
                <button
                  onClick={() => handleStartSession(rel.parentUserId, rel.counterpart?.name ?? null)}
                  disabled={requestMutation.isPending}
                  className="btn-primary px-4 py-3 text-senior-button"
                  aria-label={`${rel.counterpart?.name ?? "부모님"} 도와드리기 시작`}
                >
                  도와드리기
                </button>
              </div>
            ))}
            <button
              onClick={() => navigate("/family/accept")}
              className="w-full flex items-center justify-center gap-2 rounded-2xl p-4 border-2 border-dashed border-gray-300 text-senior-button text-gray-600 hover:bg-gray-50"
            >
              <UserPlus size={22} />
              <span>다른 부모님 추가</span>
            </button>
          </div>
        )}
      </section>

      {/* 자녀 섹션 — 도움을 받는 관계 (부모 입장에서 표시) */}
      {children.length > 0 && (
        <section className="card-senior mb-4">
          <div className="flex items-center gap-3 mb-4">
            <UserRound size={28} className="text-green-700" />
            <h2 className="text-senior-heading">도움을 주는 가족</h2>
          </div>
          <div className="space-y-3">
            {children.map((rel) => (
              <div key={rel.id} className="flex items-center gap-4 rounded-2xl p-4 border-2 border-gray-200">
                <span
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-700"
                  aria-hidden
                >
                  <UserRound size={28} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-senior-button truncate">
                    {rel.nickname || rel.counterpart?.name || "가족"}
                  </p>
                  {rel.counterpart?.email && (
                    <p className="text-sm text-gray-600 truncate">{rel.counterpart.email}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRevoke(rel.id, rel.counterpart?.name ?? null)}
                  disabled={revokeMutation.isPending}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-senior-body"
                  aria-label="연결 해제"
                >
                  <UserMinus size={20} />
                  <span>해제</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="card-senior">
        <h3 className="text-senior-button mb-3">어떻게 쓰나요?</h3>
        <ol className="space-y-2 text-senior-body text-gray-700 list-decimal list-inside">
          <li>부모님 앱에서 "도움 요청" 버튼으로 초대 번호를 만들어요</li>
          <li>여기서 "초대 번호로 연결하기"를 눌러 번호를 입력해요</li>
          <li>연결이 완료되면 "도와드리기"로 원격 지원을 시작해요</li>
        </ol>
      </div>
    </AppShell>
  );
}
