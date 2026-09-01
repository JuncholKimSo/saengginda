#!/usr/bin/env node
// data/ 아래의 제출 JSON들을 모아 public/responses.json 과 public/responses.csv 로 집계한다.
// hidden: true 인 건은 제외. 의존성 없음 (node scripts/aggregate.js 로 실행).
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
  if (t.length >= 3 && /[이가은는도을를]$/.test(t)) t = t.slice(0, -1);
  return t;
}

const entries = [];
for (const file of collectFiles(DATA_DIR)) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (raw.hidden === true) continue;
    if (!raw.id || !raw.thing || !raw.answer) {
      console.warn(`skip (필수 필드 누락): ${file}`);
      continue;
    }
    entries.push({
      id: raw.id,
      created_at: raw.created_at || "",
      thing: String(raw.thing),
      thing_normalized: normalizeThing(raw.thing),
      region: String(raw.region || "무응답"),
      answer: String(raw.answer),
    });
  } catch (e) {
    console.warn(`skip (JSON 파싱 실패): ${file}: ${e.message}`);
  }
}
entries.sort((a, b) => a.created_at.localeCompare(b.created_at));

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

fs.writeFileSync(
  path.join(PUBLIC_DIR, "responses.json"),
  JSON.stringify({ generated_at: new Date().toISOString(), count: entries.length, entries }, null, 1),
  "utf8"
);

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const header = ["id", "created_at", "thing", "thing_normalized", "region", "answer"];
const csvLines = [header.join(",")];
for (const e of entries) csvLines.push(header.map((k) => csvCell(e[k])).join(","));
// UTF-8 BOM: 엑셀·구글시트에서 한글이 바로 열리도록
fs.writeFileSync(path.join(PUBLIC_DIR, "responses.csv"), "\uFEFF" + csvLines.join("\r\n") + "\r\n", "utf8");

console.log(`집계 완료: ${entries.length}건 → public/responses.json, public/responses.csv`);
