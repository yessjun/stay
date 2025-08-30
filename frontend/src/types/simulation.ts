// 시뮬레이션 관련 타입 정의

import { Vehicle, VehicleEvent, VehicleStats } from './vehicle';
import { ParkingSlot, SlotEvent, SlotStats } from './slot';

export type SimulationSpeed = 1 | 2 | 5 | 10;

export interface SimulationState {
  currentTime: Date;
  speed: SimulationSpeed;
  isRunning: boolean;
  isPaused: boolean;
  vehicles: Vehicle[];
  slots: ParkingSlot[];
  events: SimulationEvent[];
  stats: SimulationStats;
  config: SimulationConfig;
}

export interface SimulationStats {
  // 차량 관련 통계
  vehicleStats: VehicleStats;
  
  // 슬롯 관련 통계
  slotStats: SlotStats;
  
  // 효율성 지표
  averageWaitTime: number; // 분
  trafficFlowIndex: number; // 0-100
  co2Reduction: number; // kg
  fuelSaved: number; // 리터
  costSavings: number; // 원
  
  // 시간대별 데이터
  hourlyData: HourlyData[];
  
  // 이벤트 통계
  totalEvents: number;
  criticalEvents: number;
  resolvedEvents: number;
}

export interface HourlyData {
  hour: number;
  vehicleCount: number;
  slotUtilization: number;
  trafficDensity: number;
  co2Emissions: number;
  incidents: number;
}

export interface SimulationConfig {
  // 차량 설정
  totalVehicles: number;
  batteryThreshold: number; // 배터리 부족 임계점
  maintenanceInterval: number; // 정비 주기 (일)
  
  // 슬롯 설정
  dynamicSlotRatio: number; // 동적 슬롯 비율
  maxSlotCapacity: number;
  slotAllocationRadius: number; // 미터
  
  // 시뮬레이션 설정
  timeCompression: number; // 시간 압축 비율
  weatherEffects: boolean;
  trafficPatterns: boolean;
  emergencyScenarios: boolean;
  
  // 데이터 수집 설정
  dataLoggingInterval: number; // 초
  eventLoggingLevel: 'minimal' | 'normal' | 'detailed';
}

export type SimulationEventType = 
  | 'vehicle_event'
  | 'slot_event' 
  | 'traffic_incident'
  | 'weather_change'
  | 'emergency_alert'
  | 'system_alert'
  | 'user_action';

export interface SimulationEvent {
  id: string;
  type: SimulationEventType;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  location?: { lat: number; lng: number };
  data?: any; // 추가 이벤트 데이터
  acknowledged: boolean;
  autoResolved: boolean;
}

// 교통 패턴
export interface TrafficPattern {
  hour: number;
  density: number; // 0-100
  flow: number; // vehicles/hour
  incidents: number;
  weatherImpact: number; // 날씨 영향도
}

// 시나리오 설정
export interface Scenario {
  id: string;
  name: string;
  description: string;
  duration: number; // 분
  events: ScenarioEvent[];
  conditions: {
    weather: string;
    traffic: 'light' | 'moderate' | 'heavy';
    events: string[];
  };
}

export interface ScenarioEvent {
  timestamp: number; // 시나리오 시작 후 경과 분
  type: 'accident' | 'weather' | 'event' | 'maintenance';
  location: { lat: number; lng: number };
  impact: {
    duration: number; // 분
    affectedRadius: number; // 미터
    trafficReduction: number; // 퍼센트
  };
  description: string;
}

// 예측 데이터
export interface PredictionData {
  timestamp: Date;
  predictions: {
    vehicleDemand: number[];
    slotUtilization: number[];
    trafficFlow: number[];
    co2Impact: number[];
  };
  confidence: number; // 0-100
  factors: string[];
}