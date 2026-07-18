import dotenv from "dotenv";

// Vite는 클라이언트용으로 .env.local을 자동 로드하지만, 서버(Node)는 직접 로드해야 한다.
// 이 모듈은 다른 어떤 import보다 먼저 평가되어야 env.ts가 process.env를 읽기 전에
// 값이 채워진다(그래서 index.ts 최상단에서 side-effect import로 사용).
// .env.local을 먼저 로드해 .env를 덮어쓴다(dotenv는 이미 설정된 값을 덮어쓰지 않음).
// 프로덕션(Vercel 등)에서는 파일이 없어도 no-op이며 플랫폼 주입 env가 그대로 유지된다.
dotenv.config({ path: ".env.local" });
dotenv.config();
