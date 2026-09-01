#!/usr/bin/env node
// 집계 파이프라인 검증. 실행: node scripts/test.js
// 임시 제출 파일을 만들어 aggregate 를 돌리고, JSON/CSV 산출물을 확인한 뒤 정리한다.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
const TMP_DIR = path.join(ROOT, "data", "999999");

function write(name, obj) {
  fs.writeFileSync(path.join(TMP_DIR, name), JSON.stringify(obj), "utf8");
}

fs.mkdirSync(TMP_DIR, { recursive: true });
try {
  write("t1.json", { id: "t1", created_at: "2099-01-01T10:00:00+09:00", thing: "일자리가", region: "광주", answer: '쉼표, "따옴표"와\n줄바꿈 포함' });
  write("t2.json", { id: "t2", created_at: "2099-01-01T11:00:00+09:00", thing: "  군공항   이전이 ", verb: "바뀐다", region: "무응답", answer: "답2" });
  write("t3.json", { id: "t3", created_at: "2099-01-01T12:00:00+09:00", thing: "숨김건", region: "전남", answer: "보이면 안 됨", hidden: true });
  write("t4.json", { id: "t4", created_at: "2099-01-01T13:00:00+09:00", thing: "종이", region: "기타", answer: "조사 아님" });

  execFileSync(process.execPath, [path.join(ROOT, "scripts", "aggregate.js")], { stdio: "inherit" });

  const json = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "responses.json"), "utf8"));
  const byId = Object.fromEntries(json.entries.map((e) => [e.id, e]));

  assert.ok(byId.t1 && byId.t2 && byId.t4, "정상 건 3건 포함");
  assert.ok(!byId.t3, "hidden 건 제외");
  assert.strictEqual(byId.t1.thing_normalized, "일자리", "조사 '가' 제거");
  assert.strictEqual(byId.t2.thing_normalized, "군공항 이전", "공백 정리 + 조사 제거");
  assert.strictEqual(byId.t4.thing_normalized, "종이", "짧은 단어의 끝글자는 보존");
  assert.strictEqual(byId.t2.verb, "바뀐다", "verb 보존");
  assert.strictEqual(byId.t1.verb, "생긴다", "verb 기본값");

  const csv = fs.readFileSync(path.join(ROOT, "public", "responses.csv"), "utf8");
  assert.ok(csv.charCodeAt(0) === 0xfeff, "CSV에 UTF-8 BOM 포함");
  assert.ok(csv.includes('"쉼표, ""따옴표""와\n줄바꿈 포함"'), "CSV 이스케이프");
  assert.ok(!csv.includes("숨김건"), "CSV에서도 hidden 제외");

  console.log("테스트 통과 ✓");
} finally {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  execFileSync(process.execPath, [path.join(ROOT, "scripts", "aggregate.js")]);
}
