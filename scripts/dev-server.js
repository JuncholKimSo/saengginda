#!/usr/bin/env node
// 로컬 개발 서버: 정적 파일 서빙 + Worker 흉내(/submit → data/에 저장 후 즉시 재집계).
// 실행: node scripts/dev-server.js  (기본 포트 8791)
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8791);
const STANCES = new Set(["기대", "의문", "비판", "모름"]);
const REGIONS = new Set(["광주", "전남", "기타", "무응답"]);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

function kstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, "+09:00");
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "POST" && url.pathname === "/submit") {
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      let body;
      try { body = JSON.parse(raw); } catch { return sendJson(res, 400, { error: "잘못된 요청입니다." }); }
      const thing = String(body.thing || "").trim().replace(/\s+/g, " ");
      const stance = String(body.stance || "");
      const answer = String(body.answer || "").trim();
      const region = REGIONS.has(String(body.region)) ? String(body.region) : "무응답";
      if (!thing || thing.length > 40) return sendJson(res, 400, { error: "빈칸은 1~40자로 채워 주세요." });
      if (!STANCES.has(stance)) return sendJson(res, 400, { error: "마음을 하나 골라 주세요." });
      if (!answer || answer.length > 2000) return sendJson(res, 400, { error: "답은 1~2000자로 적어 주세요." });

      const id = require("crypto").randomUUID();
      const created_at = kstNow();
      const entry = { id, created_at, thing, stance, answer, region, hidden: false };
      const dir = path.join(ROOT, "data", created_at.slice(0, 7).replace("-", ""));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, `${created_at.slice(0, 10)}_${id}.json`),
        JSON.stringify(entry, null, 1), "utf8"
      );
      execFileSync(process.execPath, [path.join(ROOT, "scripts", "aggregate.js")]);
      console.log(`제출: ${thing} (${stance})`);
      sendJson(res, 200, { ok: true, id });
    });
    return;
  }

  // 정적 파일
  let file = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const full = path.join(ROOT, file);
  if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404); return res.end("not found");
  }
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(full)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(fs.readFileSync(full));
});

server.listen(PORT, () => console.log(`dev server: http://localhost:${PORT}`));
