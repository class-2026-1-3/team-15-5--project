# 코드 리뷰 - Serenity 프로젝트

발표용 데모 사이트 기준으로 검토. 심각도는 **[치명]**, **[경고]**, **[개선]** 세 단계로 분류.

---

## 1. 보안

### [치명] 하드코딩된 DB 비밀번호 (`web/api/main.py:24`)
```python
password='password',
```
루트 계정 비밀번호가 소스코드에 그대로 노출되어 있음. `.env` 파일을 `.gitignore`에 등록해 두고도 실제로는 환경변수를 사용하지 않고 있음. `os.getenv("DB_PASSWORD", "password")` 형태로 최소한 환경변수로 분리해야 함.

### [치명] docker-compose.yml에도 평문 비밀번호 노출 (`docker-compose.yml:11`)
```yaml
MYSQL_ROOT_PASSWORD: password
```
`.env` 파일을 따로 만들어 `${MYSQL_ROOT_PASSWORD}` 방식으로 참조해야 함.

### [치명] 세션 토큰이 사실상 없음 (`web/src/index.js:58`, `web/src/kr/instance.js:3-8`)
```js
sessionStorage.setItem('token', 'dummy-token-' + result.user_id);
// ...
const parts = token.split('-');
return parseInt(parts[parts.length - 1], 10);
```
토큰에서 `user_id`를 직접 파싱해서 API 요청에 사용. 클라이언트에서 `token` 값을 `dummy-token-999`로 조작하면 다른 유저의 인스턴스를 마음대로 조회/제어 가능. 발표 데모에서 누군가 개발자 도구를 열어보면 즉시 드러나는 구조임.

### [경고] 인스턴스 상태 변경 API에 인증 없음 (`web/api/main.py:125-137`)
```python
@app.post("/instances/{instance_id}/status")
def update_instance_status(instance_id: int, data: UpdateStatusRequest):
```
`instance_id`만 알면 인증 없이 누구든 모든 인스턴스의 상태를 변경 가능. 최소한 `user_id` 검증이 필요.

### [경고] CORS 전체 허용 (`web/api/main.py:13`)
```python
allow_origins=["*"],
allow_credentials=True,
```
`allow_origins=["*"]`와 `allow_credentials=True`를 동시에 사용하는 것은 CORS 스펙상 금지된 조합. 실제 브라우저에서 오류가 발생할 수 있음.

### [경고] init.sql에 실제 유저 계정 및 해시 비밀번호 포함 (`mysql/init.sql:55-58`)
```sql
INSERT INTO user ... VALUES ('admin', '8c6976e5b5410415...', ...),
('satellite4245', '2d13fc8d186f85ad...', ...),
('shit', '03ac674216f3e15c...', ...),
```
실제 사용자 이름과 비밀번호 해시가 깃 히스토리에 영구적으로 남음. `shit`이라는 사용자명은 발표 환경에서 부적절.

---

## 2. Docker 구성

### [치명] API 서버가 uvicorn으로 직접 실행됨 (`web/api/dockerfile:11`)
```dockerfile
CMD ["python", "main.py"]
```
`main.py` 하단에서 `reload=True` 옵션으로 uvicorn을 실행. `reload=True`는 개발용 옵션으로 운영/발표 환경에서는 제거해야 함. Dockerfile CMD도 `uvicorn main:app --host 0.0.0.0 --port 6974`로 직접 지정하는 것이 적절.

### [치명] frontend 컨테이너에 볼륨 마운트가 이미지 내용을 덮어씀 (`docker-compose.yml:41`)
```yaml
volumes:
  - ./web/src:/usr/share/nginx/html
```
Dockerfile에서 `COPY . /usr/share/nginx/html`로 이미지에 파일을 복사하지만, compose에서 같은 경로를 볼륨으로 마운트하면 이미지 내용이 덮어써짐. 동작은 하지만 Dockerfile의 COPY 단계가 무의미해짐. 의도를 명확히 해야 함 (볼륨 마운트 방식 OR 이미지 빌드 방식 중 하나 선택).

### [경고] DB 헬스체크 없이 의존성 선언 (`docker-compose.yml:29`)
```yaml
depends_on:
  - db
```
`depends_on`은 컨테이너 시작 순서만 보장하며 MySQL이 실제로 준비될 때까지 대기하지 않음. API 서버가 MySQL 초기화 전에 접속을 시도해 실패할 수 있음. `healthcheck`를 추가해야 함.

### [경고] `ec2.vuerd.json`이 .gitignore에 있으나 git에 추적됨
`.gitignore`에 `ec2.vuerd.json`이 등록되어 있지만 `mysql/` 디렉토리 안에 파일이 존재. 이미 트래킹된 경우 `git rm --cached`로 제거해야 함.

---

## 3. 백엔드 코드 (`web/api/main.py`)

### [경고] GET 요청에 Request Body 사용 (`main.py:53-65`)
```python
@app.get("/spec")
def specs(data: SpecRequest):
```
HTTP GET 메서드에 Pydantic 모델을 body로 받는 것은 HTTP 스펙에 반하며, 많은 클라이언트/프록시에서 GET body를 무시함. Query parameter로 변경해야 함 (`/spec?id=1&pr_name=...`). 실제로 이 엔드포인트는 프론트엔드에서 사용되지 않는 것으로 보임.

### [경고] DB 커넥션을 매 요청마다 생성/종료
모든 엔드포인트에서 `get_db_connection()`을 호출하고 finally에서 닫음. 연결 풀 없이 매 요청마다 TCP 연결을 맺고 끊는 방식으로, 트래픽이 조금만 늘어도 성능 문제 발생. 발표 데모 수준에서는 큰 문제는 아니나 구조적으로 잘못됨.

### [개선] IP 충돌 미방지 (`main.py:111`)
```python
ip_address = f"192.168.75.{random.randint(2, 254)}"
```
DB에서 기존 IP와 중복 여부를 확인하지 않음. 낮은 확률이지만 같은 IP가 두 인스턴스에 할당될 수 있음.

### [개선] requirements.txt에 버전 미고정
```
fastapi
uvicorn
pymysql
```
버전이 고정되어 있지 않아 미래 빌드 시 의존성 버전 충돌로 빌드가 깨질 수 있음.

---

## 4. 프론트엔드

### [치명] API URL이 localhost로 하드코딩 (`web/src/index.js:45`, `web/src/kr/main.js:1`)
```js
const API_BASE_URL = 'http://localhost:6974';
// ...
const response = await fetch('http://localhost:6974/login', ...);
```
컨테이너 환경에서 프론트엔드는 nginx가 서빙하고 API는 별도 컨테이너에 있음. 클라이언트 브라우저에서 `localhost:6974`로 요청하면 브라우저가 실행되는 로컬 머신의 포트로 요청이 가며, 발표 환경(서버에 배포된 경우)에서는 완전히 동작하지 않음. nginx에서 `/api/` 경로를 프록시하거나 환경에 맞는 URL을 사용해야 함.

### [경고] `index.html`에 `<html>` 태그 없음 (`web/src/index.html:1`)
```html
<!DOCTYPE html>

<head>
```
`<html lang="ko">` 태그가 빠져 있음. `kr/instance.html`도 동일. 접근성 및 SEO 문제.

### [경고] CSS `box-shadow` 값 오류 (`web/src/loginstyle.css:25`)
```css
box-shadow: 0 4 34px rgba(0, 0, 0, 0.1);
```
`0 4 34px`에서 두 번째 값 `4`에 단위(`px`)가 없어 속성 전체가 무효화됨. 그림자 효과가 실제로 적용되지 않음.

### [경고] 로그아웃 후 URL에 공백 포함 (`web/src/kr/main.js:4`)
```js
window.location.href = " /index";
```
`" /index"`에 앞쪽 공백이 있어 리다이렉션이 실패할 수 있음.

### [개선] Billing 메뉴가 미구현 상태로 노출
```html
<a class="nav-link" href="#">... Billing</a>
```
모든 페이지에서 Billing 링크가 `href="#"`으로 되어 있어 클릭해도 이동하지 않음. 발표 시 클릭되면 어색함. 미구현 항목은 비활성화(`disabled`) 처리하거나 숨기는 것이 나음.

### [개선] 다국어(en/kr) 파일 중복 관리
`en/`과 `kr/` 디렉토리에 HTML/CSS/JS가 각각 복사되어 있어 동일한 변경을 두 곳에 해야 함. 구조 자체는 나쁘지 않으나, 공통 로직(instance.js 등)이 거의 동일한 파일로 두 번 존재하는 것은 유지보수 부담.

---

## 5. README.md

### [경고] 미완성 상태로 커밋됨 (`README.md:62-88`)
파일 하단에 과제 가이드라인 원문이 그대로 남아 있음.
```
READMD.md 파일 필수 내용
1. 프로젝트 제목 및 설명
...
이 외에 다른 내용을 넣고 싶다면 넣어도 됩니다.
```
기여 방법, 깃허브 커밋 캡처, 어려웠던 점/해결 방법 등 필수 항목이 아직 채워지지 않음.

### [개선] 오타: `READMD.md` (`README.md:62`)
`READMD.md`는 `README.md`의 오타.

---

## 6. 기타

### [개선] TODO.md 항목 미완성
`mysql/TODO.md`와 `web/TODO.md` 모두 체크되지 않은 항목이 있으며, `mysql/TODO.md:3`에는 `[ ] jot댐`이라는 의미 불명의 항목이 있음. 공개 레포에서 내부 메모가 그대로 노출됨.

### [개선] Dockerfile 파일명 소문자 사용
`dockerfile`로 작성되어 있음. Docker 공식 관례는 `Dockerfile` (대문자 D). 일부 도구에서 인식하지 못할 수 있음.

### [개선] `docker-compose.yml`의 `version` 필드
```yaml
version: '3.8'
```
Docker Compose v2에서는 `version` 필드가 deprecated. 제거해도 동작에 문제 없음.

---

## 요약

| 분류 | 치명 | 경고 | 개선 |
|------|------|------|------|
| 보안 | 3 | 3 | - |
| Docker | 2 | 2 | - |
| 백엔드 | - | 2 | 2 |
| 프론트엔드 | 1 | 3 | 2 |
| 문서 | - | 1 | 1 |
| 기타 | - | - | 3 |

발표 전 최우선 수정 항목: **API URL localhost 하드코딩** (발표 환경에서 동작 불가), **Billing 미구현 메뉴 정리**, **README 가이드라인 원문 제거**, **init.sql 부적절한 사용자명 정리**.
