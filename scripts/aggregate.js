#!/usr/bin/env node
// data/ 아래의 제출 JSON들을 모아 집계한다. 의존성 없음 (node scripts/aggregate.js 로 실행).
//   public/responses.json  공개용 (hidden 제외) — 클라우드 페이지가 읽음
//   public/responses.csv   공개용 (hidden 제외) — 시트 전환용, UTF-8 BOM
//   public/admin.json      관리용 (hidden 포함, 원본 파일 경로 포함) — admin.html 이 읽음
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public");

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...collectFiles(full));
    else if (name.endsWith(".json")) out.push(full);
  }
  return out;
}

function normalizeThing(thing) {
  let t = String(thing || "").trim().replace(/\s+/g, " ");
  // '도·을·를'은 철도·마을처럼 단어 끝에 흔해서 제거하지 않는다
  if (t.length >= 3 && /[이가은는]$/.test(t)) t = t.slice(0, -1);
  return t;
}

const all = [];
for (const file of collectFiles(DATA_DIR)) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!raw.id || !raw.thing || !raw.answer) {
      console.warn(`skip (필수 필드 누락): ${file}`);
      continue;
    }
    all.push({
      id: raw.id,
      created_at: raw.created_at || "",
      thing: String(raw.thing),
      thing_normalized: normalizeThing(raw.thing),
      verb: String(raw.verb || "생긴다"),
      region: String(raw.region || "무응답"),
      answer: String(raw.answer),
      hidden: raw.hidden === true,
      path: path.relative(ROOT, file).split(path.sep).join("/"),
    });
  } catch (e) {
    console.warn(`skip (JSON 파싱 실패): ${file}: ${e.message}`);
  }
}
all.sort((a, b) => a.created_at.localeCompare(b.created_at));

const entries = all.filter((e) => !e.hidden).map(({ hidden, path, ...rest }) => rest);

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

fs.writeFileSync(
  path.join(PUBLIC_DIR, "responses.json"),
  JSON.stringify({ generated_at: new Date().toISOString(), count: entries.length, entries }, null, 1),
  "utf8"
);

fs.writeFileSync(
  path.join(PUBLIC_DIR, "admin.json"),
  JSON.stringify({ generated_at: new Date().toISOString(), count: all.length, entries: all }, null, 1),
  "utf8"
);

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const header = ["id", "created_at", "thing", "thing_normalized", "verb", "region", "answer"];
const csvLines = [header.join(",")];
for (const e of entries) csvLines.push(header.map((k) => csvCell(e[k])).join(","));
// UTF-8 BOM: 엑셀·구글시트에서 한글이 바로 열리도록
fs.writeFileSync(path.join(PUBLIC_DIR, "responses.csv"), "\uFEFF" + csvLines.join("\r\n") + "\r\n", "utf8");

console.log(`집계 완료: 공개 ${entries.length}건 / 전체 ${all.length}건 → public/`);
