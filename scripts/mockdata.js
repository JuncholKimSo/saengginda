#!/usr/bin/env node
// 로컬 확인용 목데이터 생성. 실행: node scripts/mockdata.js [건수]
// 실제 배포 전에는 data/ 를 비울 것.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const N = Number(process.argv[2] || 40);

const THINGS = [
  ["군공항 이전", 8], ["복합쇼핑몰", 6], ["반도체 팹", 6], ["자치구의 시 전환", 4],
  ["반도체 계약 학과", 4], ["일자리", 3], ["KTX 노선", 3], ["대학병원 분원", 2],
  ["광역철도", 2], ["관광벨트", 2],
];
const REGIONS = ["광주", "전남", "기타", "무응답"];
const ANSWERS = [
  "생긴다는 말은 십 년 전에도 들었다. 이번엔 다를까.",
  "생기면 좋겠지만, 그게 우리 동네까지 올지는 모르겠다.",
  "누구에게 생기는 걸까. 시내에만 생기는 건 아닐까.",
  "통합이 되면 오히려 작은 군 단위는 더 소외될 것 같다.",
  "기대는 되는데, 재원이 어디서 나오는지 아무도 말해주지 않는다.",
  "생긴다는 약속보다, 없어지는 것들의 목록이 먼저 궁금하다.",
  "청년들이 돌아올 만한 일자리인지가 관건이다.",
  "행정구역이 합쳐진다고 생활권이 합쳐지는 건 아니다.",
];

let made = 0;
const weighted = THINGS.flatMap(([t, w]) => Array(w).fill(t));
for (let i = 0; i < N; i++) {
  const thing = weighted[Math.floor(Math.random() * weighted.length)];
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  const created_at = `2026-09-${day}T${String(9 + Math.floor(Math.random() * 12)).padStart(2, "0")}:00:00+09:00`;
  const id = crypto.randomUUID();
  const entry = {
    id, created_at, thing,
    answer: ANSWERS[Math.floor(Math.random() * ANSWERS.length)],
    region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
    hidden: false,
  };
  const dir = path.join(ROOT, "data", "202609");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `2026-09-${day}_${id}.json`), JSON.stringify(entry, null, 1), "utf8");
  made++;
}
console.log(`목데이터 ${made}건 생성 → data/202609/`);
