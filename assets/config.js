// 배포 후 Cloudflare Worker 주소로 바꿔 주세요.
// 예: "https://saengginda.<계정>.workers.dev/submit"
// 비워 두면 같은 주소의 /submit 으로 보냅니다 (로컬 개발 서버용).
window.SAENGGINDA_CONFIG = {
  submitUrl: "",
  dataUrl: "public/responses.json",
};
