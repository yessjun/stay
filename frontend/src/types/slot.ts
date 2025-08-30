// 정차 슬롯 관련 타입 정의

import { Coordinate } from './vehicle';

export type SlotStatus = 'available' | 'occupied' | 'reserved' | 'disabled' | 'maintenance';
export type SlotType = 'dynamic' | 'static' | 'emergency';

export interface ParkingSlot {
  id: string;
  position: Coordinate;
  status: SlotStatus;
  type: SlotType;
  vehicleId?: string;
  timeWindow?: {
    start: Date;
    end: Date;
  };
  priority: number; // 1-10, 높을수록 우선순위 높음
  capacity: number; // 동시 정차 가능 차량 수
  occupiedCount: number;
  roadSection: string; // 도로 구간명
  direction: 'north' | 'south' | 'east' | 'west';
  restrictions?: {
    vehicleTypes: string[];
    timeRestrictions: string[];
    weatherRestrictions: string[];
  };
  createdAt: Date;
  lastUsed?: Date;
  utilizationRate: number; // 이용률 %
}

export interface SlotReservation {
  id: string;
  slotId: string;
  vehicleId: string;
  startTime: Date;
  estimatedDuration: number; // 분
  actualEndTime?: Date;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  priority: number;
}

export interface SlotStats {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  disabled: number;
  utilizationRate: number;
  averageOccupancyTime: number; // 분
  peakHours: {
    morning: number;
    afternoon: number;
    evening: number;
  };
}

// 슬롯 할당 알고리즘 설정
export interface SlotAllocationConfig {
  algorithm: 'nearest' | 'balanced' | 'predictive';
  maxWalkingDistance: number; // 미터
  trafficFlowWeight: number; // 0-1
  utilizationWeight: number; // 0-1
  emergencyReserveRatio: number; // 0-1
  dynamicAdjustment: boolean;
}

// 슬롯 효율성 분석
export interface SlotEfficiency {
  slotId: string;
  location: string;
  utilizationRate: number;
  avgOccupancyTime: number;
  peakUsageHours: number[];
  userSatisfaction: number;
  trafficImpact: number; // -100 to 100
  revenueGenerated: number;
  maintenanceCost: number;
  roi: number; // Return on Investment
}

// 슬롯 이벤트
export interface SlotEvent {
  id: string;
  slotId: string;
  type: 'occupied' | 'vacated' | 'reserved' | 'cancelled' | 'maintenance_start' | 'maintenance_end' | 'created' | 'disabled';
  timestamp: Date;
  vehicleId?: string;
  duration?: number; // 분
  reason?: string;
  automated: boolean; // 자동 처리 여부
}