# 생긴다는데 — 전남·광주 통합, 말들의 수집

전남·광주가 합쳐지면 "___가 생긴다는데." 그 말들에 대한 나름의 답을 익명으로 모아,
2026년 10월 1일 라운드테이블에서 함께 읽기 위한 사이트.

## 구조

| 구성 | 위치 | 역할 |
|---|---|---|
| 수집 폼 | `index.html` | 빈칸 채우기 + 나름의 답 + 지역(선택) |
| 워드클라우드 | `cloud.html` | 모인 말들 시각화. 단어 클릭 → 답변 목록. 90초마다 자동 갱신 |
| 제출 통로 | `worker/` | Cloudflare Worker. 폼 POST → GitHub API로 `data/`에 커밋. IP 미저장 |
| DB | `data/YYYYMM/*.json` | 제출 1건 = 파일 1개. `hidden: true`로 바꾸면 집계에서 제외 |
| 집계 | `.github/workflows/aggregate.yml` | data/ 변경 시 `public/responses.json`·`responses.csv` 자동 생성 |

시트 전환: `public/responses.csv`를 받아 엑셀·구글시트에서 바로 열면 된다 (UTF-8 BOM 포함).

## 로컬 개발

```bash
node scripts/dev-server.js        # http://localhost:8791 (폼 제출까지 로컬로 동작)
node scripts/mockdata.js 40       # 목데이터 생성
node scripts/aggregate.js         # 수동 집계
node scripts/test.js              # 집계 파이프라인 테스트
```

## 배포 절차

### 1. GitHub 저장소 + Pages

```bash
gh repo create saengginda --public --source=. --push
```

저장소 → Settings → Pages → Branch: `main` / `/ (root)` 저장.
사이트 주소: `https://<아이디>.github.io/saengginda/`

### 2. 수집용 토큰 발급 (본인이 직접)

GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token
- Repository access: **Only select repositories** → `saengginda`
- Permissions: **Contents → Read and write** (그 외 전부 No access)
- 만료: 라운드테이블 이후 날짜 (예: 2026-10-15)

### 3. Cloudflare Worker

`worker/wrangler.toml`의 `GITHUB_REPO`를 본인 저장소로 수정한 뒤:

```bash
cd worker
npx wrangler login                 # 브라우저에서 승인
npx wrangler secret put GITHUB_TOKEN   # 2에서 만든 토큰 붙여넣기
npx wrangler deploy
```

배포되면 `https://saengginda.<계정>.workers.dev` 주소가 나온다.

### 4. 프론트와 연결

- `assets/config.js`의 `submitUrl`을 `"https://saengginda.<계정>.workers.dev/submit"`으로 수정
- `worker/wrangler.toml`의 `ALLOWED_ORIGIN`을 `"https://<아이디>.github.io"`로 좁히고 재배포
- 커밋·푸시하면 끝

## 운영

- **부적절한 제출 감추기**: 해당 `data/**/*.json`에서 `"hidden": false` → `true`로 수정해 커밋.
  다음 집계부터 사이트·CSV에서 빠진다 (원본 파일은 저장소에 남음).
- **행사 당일**: `cloud.html`을 스크린에 띄워 두면 90초마다 새 제출이 반영된다.
- **수집 종료**: Worker를 지우거나(`npx wrangler delete`) 토큰을 revoke하면 제출이 막힌다.

## 익명성

이름·연락처를 받지 않고, Worker는 IP를 어디에도 기록하지 않는다(속도 제한은 메모리에서만).
저장소가 공개인 한 `data/`의 제출 원문도 공개된다 — 애초에 익명 공개 수집을 전제로 설계했다.
