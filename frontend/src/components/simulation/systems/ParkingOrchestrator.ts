// 정차공간 동적 오케스트레이션 AI
import { ParkingSlot } from '@/types/slot';

export interface ParkingSlotAI extends ParkingSlot {
  autoManaged: boolean;
  congestionThreshold: number;
  lastOccupied?: Date;
  averageOccupancyTime: number;
  riskScore: number; // 0-100, 높을수록 위험
  nearSchoolZone: boolean;
  nearEmergencyRoute: boolean;
}

interface HistoricalData {
  hour: number;
  avgCongestion: number;
  avgOccupancy: number;
  incidents: number;
}

export class ParkingOrchestrator {
  private slots: Map<string, ParkingSlotAI>;
  private historicalData: HistoricalData[];
  private autoMode: boolean = true;
  private emergencyMode: boolean = false;
  private congestionThreshold: number = 70; // 70% 이상 혼잡 시 슬롯 해제
  
  constructor() {
    this.slots = new Map();
    this.historicalData = this.generateHistoricalData();
  }
  
  // 과거 데이터 생성 (시뮬레이션용)
  private generateHistoricalData(): HistoricalData[] {
    return Array.from({ length: 24 }).map((_, hour) => {
      let avgCongestion = 30;
      let avgOccupancy = 40;
      
      // 러시아워 패턴
      if ((hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20)) {
        avgCongestion = 80;
        avgOccupancy = 20;
      }
      // 점심시간
      else if (hour >= 12 && hour <= 13) {
        avgCongestion = 60;
        avgOccupancy = 50;
      }
      // 심야시간
      else if (hour >= 0 && hour <= 5) {
        avgCongestion = 10;
        avgOccupancy = 70;
      }
      
      return {
        hour,
        avgCongestion,
        avgOccupancy,
        incidents: Math.floor(Math.random() * 3)
      };
    });
  }
  
  // 슬롯 등록
  public registerSlot(slot: ParkingSlot, autoManaged: boolean = true): void {
    const aiSlot: ParkingSlotAI = {
      ...slot,
      autoManaged,
      congestionThreshold: this.congestionThreshold,
      averageOccupancyTime: 15, // 평균 15분
      riskScore: this.calculateRiskScore(slot.position),
      nearSchoolZone: this.checkNearSchoolZone(slot.position),
      nearEmergencyRoute: this.checkNearEmergencyRoute(slot.position)
    };
    
    this.slots.set(slot.id, aiSlot);
  }
  
  // 위험도 계산
  private calculateRiskScore(position: { lat: number; lng: number }): number {
    let score = 0;
    
    // 교차로 근처 (+30)
    if (this.isNearIntersection(position)) score += 30;
    
    // 커브 구간 (+20)
    if (this.isOnCurve(position)) score += 20;
    
    // 시야 불량 구간 (+15)
    if (this.hasLowVisibility(position)) score += 15;
    
    // 사고 다발 구역 (+25)
    if (this.isAccidentProne(position)) score += 25;
    
    return Math.min(100, score);
  }
  
  // 학교 구역 확인
  private checkNearSchoolZone(position: { lat: number; lng: number }): boolean {
    // 실제로는 GIS 데이터 활용
    return Math.random() < 0.1; // 10% 확률로 학교 근처
  }
  
  // 긴급 경로 확인
  private checkNearEmergencyRoute(position: { lat: number; lng: number }): boolean {
    // 실제로는 응급실, 소방서 경로 데이터 활용
    return Math.random() < 0.15; // 15% 확률로 긴급 경로
  }
  
  // 교차로 근처 확인
  private isNearIntersection(position: { lat: number; lng: number }): boolean {
    // 실제 교차로 좌표와 비교
    return Math.random() < 0.2;
  }
  
  // 커브 구간 확인
  private isOnCurve(position: { lat: number; lng: number }): boolean {
    return Math.random() < 0.1;
  }
  
  // 시야 불량 확인
  private hasLowVisibility(position: { lat: number; lng: number }): boolean {
    return Math.random() < 0.05;
  }
  
  // 사고 다발 구역 확인
  private isAccidentProne(position: { lat: number; lng: number }): boolean {
    return Math.random() < 0.08;
  }
  
  // AI 자동 할당 결정
  public shouldAllocateSlot(
    slotId: string,
    currentCongestion: number,
    currentTime: Date
  ): boolean {
    const slot = this.slots.get(slotId);
    if (!slot || !slot.autoManaged) return false;
    
    // 긴급 모드에서는 모든 슬롯 해제
    if (this.emergencyMode) return false;
    
    // 학교 구역은 등하교 시간 제외
    if (slot.nearSchoolZone) {
      const hour = currentTime.getHours();
      if ((hour >= 8 && hour <= 9) || (hour >= 14 && hour <= 16)) {
        return false;
      }
    }
    
    // 긴급 경로는 항상 비워둠
    if (slot.nearEmergencyRoute) return false;
    
    // 위험도가 높은 곳은 혼잡도가 낮을 때만
    if (slot.riskScore > 70 && currentCongestion > 30) return false;
    
    // 현재 혼잡도 확인
    if (currentCongestion > slot.congestionThreshold) return false;
    
    // 예측 혼잡도 확인
    const predictedCongestion = this.predictCongestion(currentTime);
    if (predictedCongestion > slot.congestionThreshold) return false;
    
    return true;
  }
  
  // 혼잡도 예측
  private predictCongestion(currentTime: Date): number {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    
    // 다음 30분 예측
    const nextHour = minute >= 30 ? (hour + 1) % 24 : hour;
    const historicalHour = this.historicalData.find(h => h.hour === nextHour);
    
    if (!historicalHour) return 50;
    
    // 과거 데이터 + 현재 트렌드
    const baseCongestion = historicalHour.avgCongestion;
    const trend = Math.random() * 20 - 10; // ±10% 변동
    
    return Math.max(0, Math.min(100, baseCongestion + trend));
  }
  
  // 긴급 상황 대응
  public activateEmergencyProtocol(emergencyLocation: { lat: number; lng: number }): string[] {
    this.emergencyMode = true;
    const affectedSlots: string[] = [];
    
    this.slots.forEach((slot, id) => {
      // 긴급 위치 반경 500m 내 슬롯 해제
      const distance = this.calculateDistance(slot.position, emergencyLocation);
      if (distance < 500) {
        slot.status = 'disabled';
        slot.autoManaged = false;
        affectedSlots.push(id);
      }
    });
    
    // 30초 후 자동 복구
    setTimeout(() => {
      this.deactivateEmergencyProtocol(affectedSlots);
    }, 30000);
    
    return affectedSlots;
  }
  
  // 긴급 모드 해제
  private deactivateEmergencyProtocol(affectedSlots: string[]): void {
    this.emergencyMode = false;
    
    affectedSlots.forEach(slotId => {
      const slot = this.slots.get(slotId);
      if (slot) {
        slot.status = 'available';
        slot.autoManaged = true;
      }
    });
  }
  
  // 거리 계산
  private calculateDistance(pos1: { lat: number; lng: number }, pos2: { lat: number; lng: number }): number {
    // Haversine 공식 (간단화)
    const R = 6371000; // 지구 반경 (미터)
    const lat1 = pos1.lat * Math.PI / 180;
    const lat2 = pos2.lat * Math.PI / 180;
    const deltaLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const deltaLng = (pos2.lng - pos1.lng) * Math.PI / 180;
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }
  
  // 수동 슬롯 추가
  public addManualSlot(position: { lat: number; lng: number }): ParkingSlotAI {
    const newSlot: ParkingSlotAI = {
      id: `manual-${Date.now()}`,
      position,
      status: 'available',
      type: 'static',
      priority: 5,
      capacity: 1,
      occupiedCount: 0,
      roadSection: 'manual',
      direction: 'north',
      utilizationRate: 0,
      createdAt: new Date(),
      autoManaged: false,
      congestionThreshold: 100, // 수동 슬롯은 혼잡도 무시
      averageOccupancyTime: 0,
      riskScore: this.calculateRiskScore(position),
      nearSchoolZone: false,
      nearEmergencyRoute: false
    };
    
    this.slots.set(newSlot.id, newSlot);
    return newSlot;
  }
  
  // 슬롯 제거
  public removeSlot(slotId: string): boolean {
    return this.slots.delete(slotId);
  }
  
  // 슬롯 상태 변경
  public updateSlotStatus(slotId: string, status: 'available' | 'occupied' | 'reserved' | 'disabled'): void {
    const slot = this.slots.get(slotId);
    if (slot) {
      slot.status = status;
      if (status === 'occupied') {
        slot.lastOccupied = new Date();
        slot.occupiedCount++;
      }
    }
  }
  
  // 최적 슬롯 추천
  public recommendBestSlot(vehiclePosition: { x: number; y: number }): ParkingSlotAI | null {
    let bestSlot: ParkingSlotAI | null = null;
    let bestScore = -Infinity;
    
    this.slots.forEach(slot => {
      if (slot.status !== 'available') return;
      
      // 점수 계산: 거리, 위험도, 점유율 고려
      const distance = Math.sqrt(
        Math.pow(vehiclePosition.x - slot.position.lat, 2) +
        Math.pow(vehiclePosition.y - slot.position.lng, 2)
      );
      
      const score = (100 - slot.riskScore) / (1 + distance * 0.01) * (1 - slot.utilizationRate / 100);
      
      if (score > bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    });
    
    return bestSlot;
  }
  
  // 통계 정보
  public getStatistics(): {
    totalSlots: number;
    availableSlots: number;
    occupiedSlots: number;
    autoManagedSlots: number;
    averageRiskScore: number;
    averageUtilization: number;
  } {
    const slotsArray = Array.from(this.slots.values());
    
    return {
      totalSlots: slotsArray.length,
      availableSlots: slotsArray.filter(s => s.status === 'available').length,
      occupiedSlots: slotsArray.filter(s => s.status === 'occupied').length,
      autoManagedSlots: slotsArray.filter(s => s.autoManaged).length,
      averageRiskScore: slotsArray.reduce((sum, s) => sum + s.riskScore, 0) / slotsArray.length || 0,
      averageUtilization: slotsArray.reduce((sum, s) => sum + s.utilizationRate, 0) / slotsArray.length || 0
    };
  }
  
  // 모드 전환
  public setAutoMode(enabled: boolean): void {
    this.autoMode = enabled;
    
    if (!enabled) {
      // 수동 모드로 전환 시 모든 auto 슬롯 비활성화
      this.slots.forEach(slot => {
        if (slot.autoManaged) {
          slot.autoManaged = false;
        }
      });
    }
  }
  
  // 모든 슬롯 반환
  public getAllSlots(): ParkingSlotAI[] {
    return Array.from(this.slots.values());
  }
}