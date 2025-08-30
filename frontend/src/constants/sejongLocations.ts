// 세종시 주요 위치 좌표 데이터

export interface Location {
  name: string;
  lat: number;
  lng: number;
  type?: string;
}

// 세종시 중심 좌표
export const SEJONG_CENTER = {
  lat: 36.4800,
  lng: 127.2890
};

// 정부세종청사 단지
export const GOVERNMENT_COMPLEX: Location[] = [
  { name: "정부세종청사 1청사", lat: 36.5040, lng: 127.2650, type: "government" },
  { name: "정부세종청사 2청사", lat: 36.5020, lng: 127.2670, type: "government" },
  { name: "정부세종청사 3청사", lat: 36.5000, lng: 127.2690, type: "government" },
  { name: "정부세종청사 4청사", lat: 36.4980, lng: 127.2710, type: "government" },
  { name: "정부세종청사 5청사", lat: 36.4960, lng: 127.2730, type: "government" },
];

// 주거지역
export const RESIDENTIAL_AREAS: Location[] = [
  { name: "한솔동", lat: 36.4790, lng: 127.2600, type: "residential" },
  { name: "나성동", lat: 36.4850, lng: 127.2750, type: "residential" },
  { name: "도담동", lat: 36.4920, lng: 127.2820, type: "residential" },
  { name: "아름동", lat: 36.5100, lng: 127.2440, type: "residential" },
  { name: "종촌동", lat: 36.5200, lng: 127.2900, type: "residential" },
  { name: "고운동", lat: 36.4650, lng: 127.2980, type: "residential" },
];

// BRT 정류장
export const BRT_STATIONS: Location[] = [
  { name: "정부세종청사북측", lat: 36.5060, lng: 127.2640, type: "brt" },
  { name: "세종시청", lat: 36.4800, lng: 127.2890, type: "brt" },
  { name: "한솔동주민센터", lat: 36.4780, lng: 127.2590, type: "brt" },
  { name: "나성동주민센터", lat: 36.4870, lng: 127.2760, type: "brt" },
  { name: "도담동주민센터", lat: 36.4940, lng: 127.2830, type: "brt" },
  { name: "아름동주민센터", lat: 36.5120, lng: 127.2450, type: "brt" },
];

// 상업지역
export const COMMERCIAL_AREAS: Location[] = [
  { name: "세종호수공원", lat: 36.5070, lng: 127.2820, type: "park" },
  { name: "롯데아울렛 세종점", lat: 36.4920, lng: 127.2640, type: "shopping" },
  { name: "세종터미널", lat: 36.4990, lng: 127.2590, type: "transport" },
  { name: "세종문화예술회관", lat: 36.4810, lng: 127.2900, type: "culture" },
  { name: "세종국립도서관", lat: 36.4770, lng: 127.2910, type: "culture" },
];

// 주요 도로망
export const MAJOR_ROADS = [
  { name: "한누리대로", coordinates: [[127.2500, 36.5200], [127.3000, 36.4600]] },
  { name: "시청대로", coordinates: [[127.2700, 36.5100], [127.2900, 36.4700]] },
  { name: "보람동로", coordinates: [[127.2400, 36.4900], [127.2800, 36.4800]] },
  { name: "달빛로", coordinates: [[127.2600, 36.5000], [127.2950, 36.4850]] },
];

// 모든 위치를 하나로 합친 배열
export const ALL_LOCATIONS: Location[] = [
  ...GOVERNMENT_COMPLEX,
  ...RESIDENTIAL_AREAS,
  ...BRT_STATIONS,
  ...COMMERCIAL_AREAS,
];

// 위치 타입별 색상 매핑
export const LOCATION_COLORS = {
  government: '#0066CC',
  residential: '#00A651',
  brt: '#FF6B35',
  shopping: '#8B5CF6',
  transport: '#F59E0B',
  culture: '#EC4899',
  park: '#10B981',
};

// 지역별 교통량 패턴 (시간대별)
export const TRAFFIC_PATTERNS = {
  government: {
    peak_morning: { start: 7, end: 9, intensity: 0.9 },
    peak_evening: { start: 17, end: 19, intensity: 0.8 },
    lunch: { start: 12, end: 13, intensity: 0.6 },
    off_peak: { intensity: 0.2 }
  },
  residential: {
    peak_morning: { start: 7, end: 9, intensity: 0.7 },
    peak_evening: { start: 17, end: 20, intensity: 0.9 },
    lunch: { start: 12, end: 13, intensity: 0.3 },
    off_peak: { intensity: 0.4 }
  },
  commercial: {
    peak_morning: { start: 10, end: 12, intensity: 0.6 },
    peak_evening: { start: 18, end: 22, intensity: 0.8 },
    lunch: { start: 12, end: 14, intensity: 0.7 },
    off_peak: { intensity: 0.3 }
  }
};