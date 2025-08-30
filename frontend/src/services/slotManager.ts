// 슬롯 관리 시스템 - 정차 슬롯의 동적 할당 및 최적화

import { ParkingSlot, SlotStatus, SlotReservation, SlotEvent, SlotAllocationConfig } from '@/types/slot';
import { Vehicle, Coordinate } from '@/types/vehicle';

export class SlotManager {
  private slots: Map<string, ParkingSlot> = new Map();
  private reservations: Map<string, SlotReservation> = new Map();
  private events: SlotEvent[] = [];
  private config: SlotAllocationConfig;

  constructor() {
    // 기본 할당 설정
    this.config = {
      algorithm: 'predictive',
      maxWalkingDistance: 300, // 300m
      trafficFlowWeight: 0.4,
      utilizationWeight: 0.3,
      emergencyReserveRatio: 0.15, // 15% 비상 예비
      dynamicAdjustment: true
    };
  }

  // 슬롯 등록
  public registerSlot(slot: ParkingSlot): void {
    this.slots.set(slot.id, slot);
    this.addEvent({
      slotId: slot.id,
      type: 'created',
      timestamp: new Date(),
      automated: false
    });
  }

  // 슬롯 제거
  public removeSlot(slotId: string): void {
    this.slots.delete(slotId);
    // 관련 예약도 제거
    for (const [reservationId, reservation] of this.reservations) {
      if (reservation.slotId === slotId) {
        this.reservations.delete(reservationId);
      }
    }
  }

  // 슬롯 상태 업데이트
  public updateSlotStatus(slotId: string, status: SlotStatus, reason?: string): boolean {
    const slot = this.slots.get(slotId);
    if (!slot) return false;

    const oldStatus = slot.status;
    slot.status = status;

    // 상태 변화 이벤트 생성
    this.addEvent({
      slotId,
      type: this.getEventTypeFromStatus(status),
      timestamp: new Date(),
      reason,
      automated: false
    });

    // 점유 상태 업데이트
    if (status === 'occupied') {
      slot.occupiedCount = Math.min(slot.capacity, slot.occupiedCount + 1);
      slot.lastUsed = new Date();
    } else if (oldStatus === 'occupied' && status === 'available') {
      slot.occupiedCount = Math.max(0, slot.occupiedCount - 1);
    }

    // 이용률 업데이트
    slot.utilizationRate = (slot.occupiedCount / slot.capacity) * 100;

    return true;
  }

  // 최적의 슬롯 찾기
  public findOptimalSlot(vehiclePosition: Coordinate, preferences?: {
    maxDistance?: number;
    preferredType?: 'dynamic' | 'static';
    urgency?: 'low' | 'normal' | 'high';
  }): ParkingSlot | null {
    
    const availableSlots = Array.from(this.slots.values()).filter(slot => 
      slot.status === 'available' && slot.occupiedCount < slot.capacity
    );

    if (availableSlots.length === 0) return null;

    // 거리 제한 적용
    const maxDistance = preferences?.maxDistance || this.config.maxWalkingDistance;
    const nearbySlots = availableSlots.filter(slot => 
      this.calculateDistance(vehiclePosition, slot.position) <= maxDistance
    );

    if (nearbySlots.length === 0) {
      // 근처에 슬롯이 없으면 가장 가까운 슬롯 반환
      return this.findNearestSlot(vehiclePosition, availableSlots);
    }

    // 알고리즘에 따른 최적 슬롯 선택
    switch (this.config.algorithm) {
      case 'nearest':
        return this.findNearestSlot(vehiclePosition, nearbySlots);
      
      case 'balanced':
        return this.findBalancedSlot(vehiclePosition, nearbySlots);
      
      case 'predictive':
        return this.findPredictiveSlot(vehiclePosition, nearbySlots, preferences);
      
      default:
        return this.findNearestSlot(vehiclePosition, nearbySlots);
    }
  }

  // 슬롯 예약
  public reserveSlot(slotId: string, vehicleId: string, duration: number): SlotReservation | null {
    const slot = this.slots.get(slotId);
    if (!slot || slot.status !== 'available' || slot.occupiedCount >= slot.capacity) {
      return null;
    }

    const reservation: SlotReservation = {
      id: `reservation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      slotId,
      vehicleId,
      startTime: new Date(),
      estimatedDuration: duration,
      status: 'pending',
      priority: this.calculateReservationPriority(slot, vehicleId)
    };

    this.reservations.set(reservation.id, reservation);
    slot.status = 'reserved';

    this.addEvent({
      slotId,
      type: 'reserved',
      timestamp: new Date(),
      vehicleId,
      duration,
      automated: true
    });

    return reservation;
  }

  // 예약 취소
  public cancelReservation(reservationId: string): boolean {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) return false;

    const slot = this.slots.get(reservation.slotId);
    if (slot && slot.status === 'reserved') {
      slot.status = 'available';
    }

    reservation.status = 'cancelled';
    this.reservations.delete(reservationId);

    this.addEvent({
      slotId: reservation.slotId,
      type: 'cancelled',
      timestamp: new Date(),
      vehicleId: reservation.vehicleId,
      automated: false
    });

    return true;
  }

  // 동적 슬롯 할당
  public allocateDynamicSlots(trafficDemand: number, timeOfDay: number): void {
    const dynamicSlots = Array.from(this.slots.values()).filter(slot => slot.type === 'dynamic');
    
    // 교통 수요에 따른 슬롯 할당 조정
    const demandThreshold = 0.7;
    const shouldActivateMore = trafficDemand > demandThreshold;

    dynamicSlots.forEach(slot => {
      if (shouldActivateMore && slot.status === 'disabled') {
        // 수요가 높으면 비활성화된 슬롯 활성화
        if (Math.random() < 0.3) {
          this.updateSlotStatus(slot.id, 'available', '교통 수요 증가에 따른 자동 활성화');
        }
      } else if (!shouldActivateMore && slot.status === 'available' && slot.occupiedCount === 0) {
        // 수요가 낮으면 일부 슬롯 비활성화 (교통 흐름 개선)
        if (Math.random() < 0.1 && this.canDeactivateSlot(slot)) {
          this.updateSlotStatus(slot.id, 'disabled', '교통 흐름 최적화를 위한 자동 비활성화');
        }
      }
    });
  }

  // 긴급상황 대응 - 모든 동적 슬롯 해제
  public activateEmergencyMode(): string[] {
    const affectedSlots: string[] = [];
    
    Array.from(this.slots.values()).forEach(slot => {
      if (slot.type === 'dynamic') {
        // 점유 중인 차량이 있으면 즉시 대피 요청
        if (slot.status === 'occupied') {
          this.updateSlotStatus(slot.id, 'disabled', '긴급상황 대응');
          affectedSlots.push(slot.id);
        } else {
          this.updateSlotStatus(slot.id, 'disabled', '긴급상황 대응');
          affectedSlots.push(slot.id);
        }
      }
    });

    // 모든 예약 취소
    Array.from(this.reservations.values()).forEach(reservation => {
      if (affectedSlots.includes(reservation.slotId)) {
        this.cancelReservation(reservation.id);
      }
    });

    return affectedSlots;
  }

  // 긴급상황 해제
  public deactivateEmergencyMode(): string[] {
    const reactivatedSlots: string[] = [];
    
    Array.from(this.slots.values()).forEach(slot => {
      if (slot.type === 'dynamic' && slot.status === 'disabled') {
        this.updateSlotStatus(slot.id, 'available', '긴급상황 해제');
        reactivatedSlots.push(slot.id);
      }
    });

    return reactivatedSlots;
  }

  // 슬롯 효율성 분석
  public analyzeSlotEfficiency(): Map<string, number> {
    const efficiencyMap = new Map<string, number>();
    
    Array.from(this.slots.values()).forEach(slot => {
      let efficiency = 0;
      
      // 이용률 점수 (40%)
      const utilizationScore = (slot.utilizationRate / 100) * 0.4;
      
      // 위치 점수 (30%) - 우선순위 기반
      const locationScore = (slot.priority / 10) * 0.3;
      
      // 최근 사용 빈도 점수 (20%)
      const recentUsageScore = slot.lastUsed ? 
        Math.min((Date.now() - slot.lastUsed.getTime()) / (24 * 60 * 60 * 1000), 1) * 0.2 : 0;
      
      // 용량 대비 사용률 점수 (10%)
      const capacityScore = (slot.occupiedCount / slot.capacity) * 0.1;
      
      efficiency = utilizationScore + locationScore + recentUsageScore + capacityScore;
      efficiencyMap.set(slot.id, efficiency * 100);
    });

    return efficiencyMap;
  }

  // 슬롯 통계 생성
  public generateSlotStats(): any {
    const slots = Array.from(this.slots.values());
    const reservations = Array.from(this.reservations.values());
    
    return {
      total: slots.length,
      available: slots.filter(s => s.status === 'available').length,
      occupied: slots.filter(s => s.status === 'occupied').length,
      reserved: slots.filter(s => s.status === 'reserved').length,
      disabled: slots.filter(s => s.status === 'disabled').length,
      maintenance: slots.filter(s => s.status === 'maintenance').length,
      
      dynamicSlots: slots.filter(s => s.type === 'dynamic').length,
      staticSlots: slots.filter(s => s.type === 'static').length,
      
      utilizationRate: slots.length > 0 ? 
        slots.reduce((sum, s) => sum + s.utilizationRate, 0) / slots.length : 0,
      
      averageOccupancyTime: this.calculateAverageOccupancyTime(),
      
      activeReservations: reservations.filter(r => r.status === 'active').length,
      pendingReservations: reservations.filter(r => r.status === 'pending').length,
      
      peakHours: this.calculatePeakHours(),
      
      totalCapacity: slots.reduce((sum, s) => sum + s.capacity, 0),
      currentOccupancy: slots.reduce((sum, s) => sum + s.occupiedCount, 0)
    };
  }

  // 설정 업데이트
  public updateConfig(newConfig: Partial<SlotAllocationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // 헬퍼 함수들
  private findNearestSlot(position: Coordinate, slots: ParkingSlot[]): ParkingSlot {
    return slots.reduce((nearest, current) => {
      const nearestDistance = this.calculateDistance(position, nearest.position);
      const currentDistance = this.calculateDistance(position, current.position);
      return currentDistance < nearestDistance ? current : nearest;
    });
  }

  private findBalancedSlot(position: Coordinate, slots: ParkingSlot[]): ParkingSlot {
    // 거리와 이용률을 균형있게 고려
    return slots.reduce((best, current) => {
      const bestScore = this.calculateBalancedScore(position, best);
      const currentScore = this.calculateBalancedScore(position, current);
      return currentScore > bestScore ? current : best;
    });
  }

  private findPredictiveSlot(position: Coordinate, slots: ParkingSlot[], preferences?: any): ParkingSlot {
    // 예측 알고리즘 - 향후 수요 패턴 고려
    return slots.reduce((best, current) => {
      const bestScore = this.calculatePredictiveScore(position, best, preferences);
      const currentScore = this.calculatePredictiveScore(position, current, preferences);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateBalancedScore(position: Coordinate, slot: ParkingSlot): number {
    const distance = this.calculateDistance(position, slot.position);
    const distanceScore = Math.max(0, 1 - (distance / this.config.maxWalkingDistance));
    const utilizationScore = 1 - (slot.utilizationRate / 100);
    const priorityScore = slot.priority / 10;

    return distanceScore * 0.5 + utilizationScore * 0.3 + priorityScore * 0.2;
  }

  private calculatePredictiveScore(position: Coordinate, slot: ParkingSlot, preferences?: any): number {
    const baseScore = this.calculateBalancedScore(position, slot);
    
    // 시간대별 수요 예측 추가
    const currentHour = new Date().getHours();
    const demandMultiplier = this.predictDemandMultiplier(slot, currentHour);
    
    // 긴급도 고려
    const urgencyMultiplier = preferences?.urgency === 'high' ? 1.2 : 1.0;
    
    return baseScore * demandMultiplier * urgencyMultiplier;
  }

  private predictDemandMultiplier(slot: ParkingSlot, hour: number): number {
    // 도로 구간과 시간대에 따른 수요 예측
    if (slot.roadSection.includes('정부청사')) {
      if (hour >= 8 && hour <= 9) return 1.3; // 출근시간 높은 수요
      if (hour >= 17 && hour <= 18) return 1.2; // 퇴근시간
      if (hour >= 12 && hour <= 13) return 1.1; // 점심시간
    }
    
    return 1.0; // 기본값
  }

  private calculateReservationPriority(slot: ParkingSlot, vehicleId: string): number {
    // 슬롯 우선순위 + 차량별 가중치
    return slot.priority + Math.random() * 2; // 임시 구현
  }

  private canDeactivateSlot(slot: ParkingSlot): boolean {
    // 비활성화해도 되는 조건 확인
    return slot.occupiedCount === 0 && 
           !this.hasNearbyReservations(slot.id) &&
           slot.priority < 7; // 높은 우선순위 슬롯은 유지
  }

  private hasNearbyReservations(slotId: string): boolean {
    // 근처에 예약이 있는지 확인
    const slot = this.slots.get(slotId);
    if (!slot) return false;

    const nearbySlots = Array.from(this.slots.values()).filter(s => 
      s.id !== slotId && this.calculateDistance(slot.position, s.position) < 0.1
    );

    return nearbySlots.some(s => s.status === 'reserved');
  }

  private calculateDistance(pos1: Coordinate, pos2: Coordinate): number {
    const R = 6371000; // 지구 반지름 (m)
    const dLat = this.toRadians(pos2.lat - pos1.lat);
    const dLng = this.toRadians(pos2.lng - pos1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(pos1.lat)) * Math.cos(this.toRadians(pos2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateAverageOccupancyTime(): number {
    // 평균 점유 시간 계산 (임시 구현)
    return 25; // 25분
  }

  private calculatePeakHours(): { morning: number; afternoon: number; evening: number } {
    // 시간대별 피크 사용률 계산 (임시 구현)
    return {
      morning: 45,
      afternoon: 30,
      evening: 60
    };
  }

  private getEventTypeFromStatus(status: SlotStatus): SlotEvent['type'] {
    switch (status) {
      case 'occupied': return 'occupied';
      case 'available': return 'vacated';
      case 'reserved': return 'reserved';
      case 'disabled': return 'disabled';
      case 'maintenance': return 'maintenance_start';
      default: return 'vacated';
    }
  }

  private addEvent(eventData: Omit<SlotEvent, 'id'>): void {
    const event: SlotEvent = {
      ...eventData,
      id: `slot-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.events.push(event);
    
    // 최대 1000개 이벤트만 유지
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  // Public getters
  public getAllSlots(): ParkingSlot[] {
    return Array.from(this.slots.values());
  }

  public getSlot(slotId: string): ParkingSlot | undefined {
    return this.slots.get(slotId);
  }

  public getReservations(): SlotReservation[] {
    return Array.from(this.reservations.values());
  }

  public getRecentEvents(limit: number = 50): SlotEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public getConfig(): SlotAllocationConfig {
    return { ...this.config };
  }
}