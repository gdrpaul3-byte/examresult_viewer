# 시험 답안 Viewer

## 운영 방법

1. 새 시험 Markdown 파일을 프로젝트 루트에 추가합니다.
2. 파일 상단에 YAML front matter를 넣습니다.
3. `node scripts/build-exams.mjs`를 실행해 `data/exams.js`를 갱신합니다.
4. `index.html`을 열거나 정적 파일 전체를 배포합니다.

## 테스트

```bash
node --test tests/*.test.mjs
```
