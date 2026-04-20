-- Row-Level Security for remote-assistance tables.
-- 이 프로젝트는 tRPC가 Supabase service_role로 DB에 접근하므로 RLS는 자동 bypass 된다.
-- 여기서는 anon/authenticated 역할이 우연히 노출되더라도 가족·세션·감사 데이터가
-- 보호되도록 RLS만 활성화한다(정책 없음 = 기본 deny). 기존 카테고리/큐레이션 테이블의
-- anon_select_* 패턴을 따르지 않는 이유는 이 데이터가 공개 대상이 아니기 때문이다.
-- 실제 권한 체크는 server/remoteRouter.ts 안에서 parent_user_id/child_user_id 조건으로 이루어진다.

ALTER TABLE family_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE remote_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE remote_actions ENABLE ROW LEVEL SECURITY;
