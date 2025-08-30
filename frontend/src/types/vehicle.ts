// 차량 관련 타입 정의

export interface Coordinate {
  lat: number;
  lng: number;
}

export type VehicleStatus = 'idle' | 'moving' | 'parked' | 'picking' | 'dropping';

export interface Vehicle {
  id: string;
  position: Coordinate;
  status: VehicleStatus;
  destination?: Coordinate;
  passenger?: boolean;
  battery: number; // 0-100
  speed: number; // km/h
  route?: Coordinate[];
  lastUpdate: Date;
  totalDistance: number; // km
  tripCount: number;
  efficiency: number; // 0-100
}

export interface VehicleStats {
  total: number;
  active: number;
  idle: number;
  parked: number;
  moving: number;
  picking: number;
  dropping: number;
  averageBattery: number;
  averageSpeed: number;
  totalDistance: number;
  totalTrips: number;
}

// 차량 이동 경로 타입
export interface Route {
  id: string;
  vehicleId: string;
  startPoint: Coordinate;
  endPoint: Coordinate;
  waypoints: Coordinate[];
  estimatedDuration: number; // 분
  actualDuration?: number; // 분
  distance: number; // km
  startTime: Date;
  endTime?: Date;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
}

// 차량 성능 지표
export interface VehiclePerformance {
  vehicleId: string;
  efficiency: number; // 연비/전비 효율
  utilizationRate: number; // 이용률
  maintenanceScore: number; // 정비 상태
  customerRating: number; // 고객 평점
  co2Saved: number; // kg
}

export interface VehicleEvent {
  id: string;
  vehicleId: string;
  type: 'trip_start' | 'trip_end' | 'maintenance' | 'battery_low' | 'breakdown' | 'collision';
  timestamp: Date;
  location: Coordinate;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolved: boolean;
}