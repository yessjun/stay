// 혼잡도 분석 시스템
import { VehicleAI } from './VehicleAISystem';
import { ParkingSlotAI } from './ParkingOrchestrator';

interface CongestionData {
  timestamp: Date;
  roadSection: string;
  vehicleCount: number;
  averageSpeed: number;
  congestionLevel: number; // 0-100
  predictedCongestion: number;
}

interface RoadSegment {
  id: string;
  position: { x1: number; y1: number; x2: number; y2: number };
  maxCapacity: number;
  currentVehicles: number;
  avgSpeed: number;
  congestionHistory: CongestionData[];
}

export class CongestionAnalyzer {
  private roadSegments: Map<string, RoadSegment>;
  private congestionHistory: CongestionData[];
  private updateInterval: number = 5000; // 5초마다 업데이트
  private lastUpdate: number = 0;
  
  constructor() {
    this.roadSegments = new Map();
    this.congestionHistory = [];
    this.initializeRoadSegments();
  }
  
  private initializeRoadSegments() {
    // 메인 도로 세그먼트 (8차로)
    const mainSegments = [
      { id: 'main-north', position: { x1: 500, y1: 0, x2: 700, y2: 200 }, maxCapacity: 20 },
      { id: 'main-center', position: { x1: 500, y1: 200, x2: 700, y2: 300 }, maxCapacity: 16 },
      { id: 'main-south', position: { x1: 500, y1: 300, x2: 700, y2: 1000 }, maxCapacity: 40 }
    ];
    
    // 교차 도로 세그먼트 (4차로)
    const crossSegments = [
      { id: 'cross-west', position: { x1: 0, y1: 200, x2: 500, y2: 300 }, maxCapacity: 15 },
      { id: 'cross-east', position: { x1: 700, y1: 200, x2: 1200, y2: 300 }, maxCapacity: 15 }
    ];
    
    // 교차로 세그먼트
    const intersectionSegment = {
      id: 'intersection',
      position: { x1: 500, y1: 200, x2: 700, y2: 300 },
      maxCapacity: 8
    };
    
    [...mainSegments, ...crossSegments, intersectionSegment].forEach(segment => {
      this.roadSegments.set(segment.id, {
        ...segment,
        currentVehicles: 0,
        avgSpeed: 60,
        congestionHistory: []
      });
    });
  }
  
  // 차량 위치 기반 혼잡도 분석
  public analyzeCongestion(vehicles: VehicleAI[], currentTime: Date): Map<string, number> {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) {
      return this.getCurrentCongestionMap();
    }
    
    this.lastUpdate = now;
    const congestionMap = new Map<string, number>();
    
    // 각 세그먼트별 차량 수 계산
    this.roadSegments.forEach((segment, id) => {
      segment.currentVehicles = 0;
      segment.avgSpeed = 0;
      let speedSum = 0;
      let vehicleCount = 0;
      
      vehicles.forEach(vehicle => {
        if (this.isVehicleInSegment(vehicle, segment)) {
          segment.currentVehicles++;
          speedSum += vehicle.speed;
          vehicleCount++;
        }
      });
      
      if (vehicleCount > 0) {
        segment.avgSpeed = speedSum / vehicleCount;
      }
      
      // 혼잡도 계산 (차량 수 + 평균 속도 고려)
      const occupancyRate = (segment.currentVehicles / segment.maxCapacity) * 100;
      const speedFactor = Math.max(0, 1 - segment.avgSpeed / 60); // 60km/h 기준
      const congestionLevel = Math.min(100, occupancyRate * 0.7 + speedFactor * 30);
      
      congestionMap.set(id, congestionLevel);
      
      // 히스토리 저장
      const data: CongestionData = {
        timestamp: currentTime,
        roadSection: id,
        vehicleCount: segment.currentVehicles,
        averageSpeed: segment.avgSpeed,
        congestionLevel,
        predictedCongestion: this.predictFutureCongestion(id, currentTime)
      };
      
      segment.congestionHistory.push(data);
      if (segment.congestionHistory.length > 100) {
        segment.congestionHistory.shift();
      }
      
      this.congestionHistory.push(data);
    });
    
    return congestionMap;
  }
  
  // 차량이 특정 세그먼트에 있는지 확인
  private isVehicleInSegment(vehicle: VehicleAI, segment: RoadSegment): boolean {
    const { x, y } = vehicle.position;
    const { x1, y1, x2, y2 } = segment.position;
    
    return x >= x1 && x <= x2 && y >= y1 && y <= y2;
  }
  
  // 미래 혼잡도 예측
  private predictFutureCongestion(segmentId: string, currentTime: Date): number {
    const segment = this.roadSegments.get(segmentId);
    if (!segment || segment.congestionHistory.length < 5) {
      return 50; // 기본값
    }
    
    // 최근 5개 데이터로 트렌드 분석
    const recentData = segment.congestionHistory.slice(-5);
    const avgCongestion = recentData.reduce((sum, d) => sum + d.congestionLevel, 0) / recentData.length;
    
    // 시간대별 패턴 적용
    const hour = currentTime.getHours();
    let timeFactor = 1;
    
    // 러시아워
    if ((hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20)) {
      timeFactor = 1.5;
    }
    // 점심시간
    else if (hour >= 12 && hour <= 13) {
      timeFactor = 1.2;
    }
    // 심야시간
    else if (hour >= 0 && hour <= 5) {
      timeFactor = 0.3;
    }
    
    return Math.min(100, avgCongestion * timeFactor);
  }
  
  // 현재 혼잡도 맵 반환
  private getCurrentCongestionMap(): Map<string, number> {
    const congestionMap = new Map<string, number>();
    
    this.roadSegments.forEach((segment, id) => {
      const occupancyRate = (segment.currentVehicles / segment.maxCapacity) * 100;
      const speedFactor = Math.max(0, 1 - segment.avgSpeed / 60);
      const congestionLevel = Math.min(100, occupancyRate * 0.7 + speedFactor * 30);
      congestionMap.set(id, congestionLevel);
    });
    
    return congestionMap;
  }
  
  // 구간별 상세 정보
  public getSegmentDetails(segmentId: string): RoadSegment | undefined {
    return this.roadSegments.get(segmentId);
  }
  
  // 전체 평균 혼잡도
  public getAverageCongestion(): number {
    let totalCongestion = 0;
    let count = 0;
    
    this.roadSegments.forEach(segment => {
      const occupancyRate = (segment.currentVehicles / segment.maxCapacity) * 100;
      const speedFactor = Math.max(0, 1 - segment.avgSpeed / 60);
      const congestionLevel = Math.min(100, occupancyRate * 0.7 + speedFactor * 30);
      
      totalCongestion += congestionLevel;
      count++;
    });
    
    return count > 0 ? totalCongestion / count : 0;
  }
  
  // 가장 혼잡한 구간
  public getMostCongestedSegment(): { id: string; congestion: number } | null {
    let maxCongestion = 0;
    let mostCongestedId = '';
    
    this.roadSegments.forEach((segment, id) => {
      const occupancyRate = (segment.currentVehicles / segment.maxCapacity) * 100;
      const speedFactor = Math.max(0, 1 - segment.avgSpeed / 60);
      const congestionLevel = Math.min(100, occupancyRate * 0.7 + speedFactor * 30);
      
      if (congestionLevel > maxCongestion) {
        maxCongestion = congestionLevel;
        mostCongestedId = id;
      }
    });
    
    return mostCongestedId ? { id: mostCongestedId, congestion: maxCongestion } : null;
  }
  
  // 히스토리 데이터 반환
  public getHistory(segmentId?: string, limit: number = 20): CongestionData[] {
    if (segmentId) {
      const segment = this.roadSegments.get(segmentId);
      return segment ? segment.congestionHistory.slice(-limit) : [];
    }
    
    return this.congestionHistory.slice(-limit);
  }
  
  // 혼잡도 경고 확인
  public checkCongestionAlerts(): Array<{ segmentId: string; level: 'low' | 'medium' | 'high' | 'critical' }> {
    const alerts: Array<{ segmentId: string; level: 'low' | 'medium' | 'high' | 'critical' }> = [];
    
    this.roadSegments.forEach((segment, id) => {
      const occupancyRate = (segment.currentVehicles / segment.maxCapacity) * 100;
      const speedFactor = Math.max(0, 1 - segment.avgSpeed / 60);
      const congestionLevel = Math.min(100, occupancyRate * 0.7 + speedFactor * 30);
      
      if (congestionLevel >= 90) {
        alerts.push({ segmentId: id, level: 'critical' });
      } else if (congestionLevel >= 70) {
        alerts.push({ segmentId: id, level: 'high' });
      } else if (congestionLevel >= 50) {
        alerts.push({ segmentId: id, level: 'medium' });
      } else if (congestionLevel >= 30) {
        alerts.push({ segmentId: id, level: 'low' });
      }
    });
    
    return alerts;
  }
  
  // 최적 경로 추천
  public recommendOptimalRoute(start: { x: number; y: number }, end: { x: number; y: number }): string[] {
    const route: string[] = [];
    const congestionMap = this.getCurrentCongestionMap();
    
    // 간단한 경로 추천 로직 (실제로는 A* 알고리즘 등 사용)
    const segments = Array.from(this.roadSegments.entries())
      .filter(([id, segment]) => {
        const congestion = congestionMap.get(id) || 0;
        return congestion < 70; // 혼잡도 70% 미만 구간만
      })
      .sort((a, b) => {
        const congA = congestionMap.get(a[0]) || 0;
        const congB = congestionMap.get(b[0]) || 0;
        return congA - congB;
      });
    
    segments.forEach(([id]) => {
      route.push(id);
    });
    
    return route.slice(0, 3); // 상위 3개 구간 추천
  }
  
  // 슬롯 기반 혼잡도 영향 계산
  public analyzeSlotImpact(slots: ParkingSlotAI[]): Map<string, number> {
    const impactMap = new Map<string, number>();
    
    this.roadSegments.forEach((segment, id) => {
      let occupiedSlots = 0;
      let totalSlots = 0;
      
      slots.forEach(slot => {
        const slotX = slot.position.lat;
        const slotY = slot.position.lng;
        
        if (slotX >= segment.position.x1 && slotX <= segment.position.x2 &&
            slotY >= segment.position.y1 && slotY <= segment.position.y2) {
          totalSlots++;
          if (slot.status === 'occupied') {
            occupiedSlots++;
          }
        }
      });
      
      const slotImpact = totalSlots > 0 ? (occupiedSlots / totalSlots) * 20 : 0;
      impactMap.set(id, slotImpact);
    });
    
    return impactMap;
  }
}