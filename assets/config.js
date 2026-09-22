// 배포 후 Cloudflare Worker 주소로 바꿔 주세요.
// 예: "https://saengginda.<계정>.workers.dev/submit"
// 비워 두면 같은 주소의 /submit 으로 보냅니다 (로컬 개발 서버용).
window.SAENGGINDA_CONFIG = {
  submitUrl: "https://api.yourgwangju.life/submit",
  // DNS 전파기 예비 경로. api 도메인이 안 풀리는 사용자를 위한 재시도용
  fallbackSubmitUrl: "https://saengginda.junchol-kim-so.workers.dev/submit",
  dataUrl: "public/responses.json",
  adminDataUrl: "public/admin.json",
  repo: "JuncholKimSo/saengginda",   // 관리 페이지의 숨김/해제 커밋 대상
  branch: "main",
};
