# Serenity.
## 프로젝트 제목 및 설명
### 팀원 정보
1. 1305 김도진
2. 1315 차한별
### 프로젝트 이름
- Serenity
### 프로젝트 주제 선정 이유
- Cloud 서비스의 UI/UX가 기본적으로 불친절하며, 첫 이용자에게 너무나 많은 정보를 요구함.
- 따라서, UI/UX를 보다 유저 친화적이게 수정하고, 직관적으로 관리 가능토록 제작함을 목표로 함.

## 프로젝트 구조
```text
project/
├── README.md
├── ai_response.md
├── commit_guideLine.md
├── docker-compose.yml
├── idea.md
├── mysql
│   ├── TODO.md
│   ├── ec2.vuerd.json
│   └── init.sql
└── web
    ├── TODO.md
    ├── api
    │   ├── dockerfile
    │   ├── main.py
    │   └── requirements.txt
    └── src
        ├── common.css
        ├── default.conf
        ├── dockerfile
        ├── en
        ├── images
        ├── index.html
        ├── index.js
        ├── kr
        └── loginstyle.css
```

## 주요 기능
1. **유저 친화적인 가상 서버 대시보드 (User-Friendly Cloud Dashboard)**
   - 현재 작동 중인 클라우드 인스턴스 개수, 총 할당 메모리(RAM) 용량, 실시간 시간당 누적 비용($) 요약 카드 제공.
   - 직관적인 인스턴스 목록 테이블 모니터링: IP 주소, 스펙 정보, 실시간 가동 상태 등을 시각적 요소와 연동하여 한눈에 확인 가능.

2. **가상 인스턴스 라이프사이클 제어 (Dynamic Lifecycle Management)**
   - 백엔드(FastAPI) 및 데이터베이스와의 실시간 동기화를 통해 가상 인스턴스의 시작(Start), 중지(Stop), 영구 종료(Terminate) 작업을 대시보드 내 버튼 하나로 실시간 제어.

3. **신규 인스턴스 원클릭 배포 (One-Click VM Deployment)**
   - 직관적인 모달(Modal) 팝업 제공으로 복잡한 옵션 없이 이름과 서버 스펙 설정만으로 신규 가상 서버 배포.
   - 인스턴스 생성 시 백엔드 단에서 가용 사설 IP 대역(192.168.75.*) 무작위 자동 할당 기능 구현.

4. **추천 서버 티어 및 동적 요금제 그리드 (Specs & Pricing Grid)**
   - 유저의 목적에 따른 맞춤형 추천 요금제 티어(Entry, Standard, GPU) 및 인기 배지(Popular) 시각화 제공.
   - 데이터베이스로부터 전체 가용한 서버 스펙 목록(Intel® Xeon®, AMD EPYC™, NVIDIA® Tesla® GPU 등)을 반응형 2열 그리드 미니 카드 형태로 실시간 조회 및 요금 계산 가능.

5. **완벽한 다국어(영어/한국어) 지원 (Global Localization)**
   - 사이트 내 모든 기능 및 데이터베이스 쿼리 결과에 대해 한국어(kr) 및 영어(en) 환경에 최적화된 마이그레이션 적용.
   - 상단 글로벌 네비게이션을 통해 실시간 언어 전환 가능 및 언어별 디자인 시스템(한국어: IBM Plex Sans KR / 영어: Titillium Web) 폰트 정합성 완비.

READMD.md 파일 필수 내용

1. 프로젝트 제목 및 설명
 - 팀원 정보
 - 프로젝트 이름
 - 프로젝트 주제 선정 이유 등

2. 프로젝트 구조 설명 (폴더 구조 설명_아래는 예시)
project/
├── web
├── mysql
├── docker-compose.yml
├── README.md
└── .gitignore

1. 기능
 - 주요 기능 목록

2. 기여 방법
 - 팀별로 기여한 분야
 - 깃허브 커밋 내역 캡처(Github - Code 탭 -> Commits 버튼)

3. 어려웠던 점 및 해결 방법
 - 트러블 슈팅 내용
   (PR 과정에서 생긴 일, 도커 실행 안 된 이유 등)

이 외에 다른 내용을 넣고 싶다면 넣어도 됩니다.
