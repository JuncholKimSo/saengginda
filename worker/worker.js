// Cloudflare Worker: 폼 제출을 받아 GitHub 저장소 data/ 에 JSON 파일로 커밋한다.
//
// 환경변수 (wrangler.toml [vars] 또는 대시보드):
//   GITHUB_REPO     예: "juncholkimso/saengginda"
//   GITHUB_BRANCH   기본 "main"
//   ALLOWED_ORIGIN  예: "https://juncholkimso.github.io" ("*" 이면 전체 허용)
// 시크릿 (npx wrangler secret put GITHUB_TOKEN):
//   GITHUB_TOKEN    해당 저장소 Contents: Read and write 권한의 fine-grained PAT
//
// 익명성: IP·UA 등 요청 메타데이터는 저장하지 않는다. 속도 제한은 메모리에서만 처리.

const REGIONS = new Set(["광주", "전남", "기타", "무응답"]);
const VERBS = new Set(["생긴다", "바뀐다"]);

// isolate 메모리 안에서만 사는 속도 제한 (분당 5건/IP). 어디에도 기록되지 않는다.
const rateBuckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const bucket = (rateBuckets.get(ip) || []).filter((t) => now - t < 60_000);
  if (bucket.length >= 5) return true;
  bucket.push(now);
  rateBuckets.set(ip, bucket);
  if (rateBuckets.size > 5000) rateBuckets.clear();
  return false;
}

// ALLOWED_ORIGIN: 쉼표로 여러 개 지정 가능. 요청 Origin이 목록에 있으면 그 값을 돌려준다.
function corsHeaders(env, request) {
  const allowed = (env.ALLOWED_ORIGIN || "*").split(",").map((s) => s.trim());
  const origin = request.headers.get("Origin") || "";
  let allow;
  if (allowed.includes("*")) allow = "*";
  else if (allowed.includes(origin)) allow = origin;
  else allow = allowed[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(env, request, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(env, request) },
  });
}

function kstNow() {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  return kst.toISOString().replace(/\.\d{3}Z$/, "+09:00");
}

function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    if (request.method !== "POST" || url.pathname !== "/submit") {
      return json(env, request, 404, { error: "not found" });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited(ip)) return json(env, request, 429, { error: "잠시 후 다시 시도해 주세요." });

    let body;
    try { body = await request.json(); } catch { return json(env, request, 400, { error: "잘못된 요청입니다." }); }

    const thing = String(body.thing || "").trim().replace(/\s+/g, " ");
    const answer = String(body.answer || "").trim();
    const region = REGIONS.has(String(body.region)) ? String(body.region) : "무응답";
    const verb = VERBS.has(String(body.verb)) ? String(body.verb) : "생긴다";

    if (!thing || thing.length > 40) return json(env, request, 400, { error: "빈칸은 1~40자로 채워 주세요." });
    if (!answer || answer.length > 2000) return json(env, request, 400, { error: "답은 1~2000자로 적어 주세요." });

    const id = crypto.randomUUID();
    const created_at = kstNow();
    const entry = { id, created_at, thing, verb, answer, region, hidden: false };

    const yyyymm = created_at.slice(0, 7).replace("-", "");
    const path = `data/${yyyymm}/${created_at.slice(0, 10)}_${id}.json`;
    const res = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "User-Agent": "saengginda-worker",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `chore: 제출 1건 수집 (${yyyymm})`,
          branch: env.GITHUB_BRANCH || "main",
          content: toBase64Utf8(JSON.stringify(entry, null, 1)),
        }),
      }
    );

    if (!res.ok) {
      console.error("GitHub API error", res.status, await res.text());
      return json(env, request, 502, { error: "저장에 실패했습니다. 잠시 후 다시 시도해 주세요." });
    }
    return json(env, request, 200, { ok: true, id });
  },
};
