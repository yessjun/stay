# STAY - 공유 자율주행 차량 오케스트레이션 플랫폼

<div align="center">
  <img src="frontend/public/logo.svg" width="80" height="80" alt="STAY Logo">
  
  **세종시 스마트시티를 위한 공유 자율주행 차량의 대기 슬롯 동적 오케스트레이션 플랫폼**
  
  *제12회 대한민국 SW융합 해커톤 대회*
</div>

## 🎯 프로젝트 개요

STAY는 세종시의 교통 체증을 해결하기 위해 개발된 혁신적인 스마트시티 솔루션입니다. 공유 자율주행 차량의 대기 슬롯을 동적으로 관리하여 교통 흐름을 최적화하고 도시 효율성을 향상시킵니다.

### 🌟 주요 특징

- **실시간 시뮬레이션**: 50대 차량과 120개 슬롯의 실시간 모니터링
- **동적 슬롯 할당**: AI 기반 지능형 슬롯 배치 및 관리
- **대화형 대시보드**: 직관적인 웹 기반 관리 인터페이스
- **ROI 계산**: 투자수익률 실시간 분석
- **스마트시티 연계**: 포트홀 탐지, 교통 최적화 등 확장 기능

## 🏛️ 시스템 아키텍처

### 📱 3대 핵심 페이지

1. **시뮬레이션 대시보드** (`/`)
   - 실시간 차량 및 슬롯 모니터링
   - 세종시 지도 기반 시각화
   - 시간 제어 (1x ~ 10x 속도)
   - 실시간 통계 및 이벤트

2. **지자체 관리자 패널** (`/admin`)
   - 동적 슬롯 생성/제거
   - 긴급 모드 활성화
   - 지역별 교통 현황 관리
   - 시스템 상태 모니터링

3. **기대효과 및 활용분야** (`/impact`)
   - 도입 전후 비교 분석
   - ROI 계산기 (대화형)
   - 포트홀 탐지 데모
   - 스마트시티 연계 솔루션

## 🚀 설치 및 실행

### 사전 요구사항

- Docker & Docker Compose
- (선택) Mapbox API 토큰

### 실행 방법

1. **프로젝트 클론**
   ```bash
   git clone <repository-url>
   cd stay
   ```

2. **환경 변수 설정**
   ```bash
   cp frontend/.env.example frontend/.env
   # .env 파일에서 VITE_MAPBOX_TOKEN 설정 (선택사항)
   ```

3. **Docker 컨테이너 실행**
   ```bash
   docker compose up --build
   ```

4. **브라우저에서 접속**
   ```
   http://localhost:3000
   ```

### 📝 Mapbox 토큰 설정 (선택사항)

실제 지도를 보려면 [Mapbox](https://account.mapbox.com/)에서 무료 토큰을 발급받아 `.env` 파일에 설정하세요:

```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

토큰이 없어도 시뮬레이션 데이터는 정상적으로 표시됩니다.

## 💻 기술 스택

### Frontend
- **React 18** + **TypeScript** - 모던 웹 개발
- **Vite** - 고속 빌드 도구  
- **Tailwind CSS** - 유틸리티 우선 스타일링
- **Framer Motion** - 부드러운 애니메이션
- **React Map GL** - Mapbox 지도 통합
- **Zustand** - 경량 상태 관리
- **Heroicons** - 아이콘 라이브러리

### DevOps
- **Docker** - 컨테이너화
- **Docker Compose** - 개발 환경 구성

## 📊 시뮬레이션 데이터

### 차량 시뮬레이션
- **50대** 자율주행 공유차량
- 실시간 위치, 배터리, 상태 추적
- 시간대별 교통 패턴 반영

### 슬롯 관리  
- **120개** 동적/정적 정차 슬롯
- 세종시 주요 지역 기반 배치
- 실시간 이용률 및 효율성 분석

### 데이터 특징
- 세종시 실제 지리 정보 기반
- 정부청사, 주거지역, BRT 구간 포함
- 출퇴근 시간대 트래픽 패턴 시뮬레이션

## 🌍 예상 효과

- **교통 흐름 개선**: 평균 대기시간 34% 감소
- **환경 효과**: 일일 CO₂ 280kg 저감
- **비용 절감**: 월간 운영비 590만원 절감  
- **시민 만족도**: 89% 달성

## 📁 프로젝트 구조

```
stay/
├── frontend/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/      # React 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── services/       # 시뮬레이션 엔진
│   │   ├── stores/         # 상태 관리
│   │   ├── types/          # TypeScript 타입
│   │   └── utils/          # 유틸리티
│   ├── public/             # 정적 파일
│   └── package.json        # 의존성 관리
├── docker-compose.yml       # Docker 구성
└── README.md               # 프로젝트 문서
```

## 👥 팀 STAY

제12회 대한민국 SW융합 해커톤 대회 참가팀

---

<div align="center">
  <strong>🏆 세종시 스마트시티의 미래를 함께 만들어갑니다</strong>
</div>