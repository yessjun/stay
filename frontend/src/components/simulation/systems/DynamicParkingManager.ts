interface ParkingSpot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'N' | 'S' | 'E' | 'W';
  occupied: boolean;
  vehicleId?: string;
  priority: number;
}

interface TrafficMetrics {
  totalVehicles: number;
  activeVehicles: number;
  parkedVehicles: number;
  congestionLevel: number;
  laneOccupancy: Map<string, number>;
}

export class DynamicParkingManager {
  private parkingSpots: Map<string, ParkingSpot> = new Map();
  private lastUpdateTime: number = 0;
  private updateInterval: number = 5000; // 5초마다 업데이트
  private maxParkingSpots: number = 30;
  
  // 레이아웃 상수
  private readonly LAYOUT = {
    mainRoad: { x: 700, width: 200, laneWidth: 25 },
    crossRoad: { y: 175, height: 150, laneWidth: 25 },
    intersection: { x: 700, y: 175, width: 200, height: 150 }
  };
  
  // 주차 가능 구역 정의
  private readonly PARKING_ZONES = [
    // 북쪽 도로 우측 (차선 7)
    { 
      id: 'north-right',
      x: this.LAYOUT.mainRoad.x + this.LAYOUT.mainRoad.width - 20,
      yStart: 50, 
      yEnd: this.LAYOUT.intersection.y - 60,
      direction: 'N' as const,
      lane: 7,
      priority: 1
    },
    // 남쪽 도로 좌측 (차선 0)
    { 
      id: 'south-left',
      x: this.LAYOUT.mainRoad.x + 5,
      yStart: this.LAYOUT.intersection.y + this.LAYOUT.intersection.height + 60,
      yEnd: 950,
      direction: 'S' as const,
      lane: 0,
      priority: 1
    },
    // 동쪽 도로 하단 (차선 5 - 최우측 차선)
    { 
      id: 'east-bottom',
      xStart: this.LAYOUT.intersection.x + this.LAYOUT.intersection.width + 60,
      xEnd: 1500,
      y: this.LAYOUT.crossRoad.y + 5 * this.LAYOUT.crossRoad.laneWidth + 5,
      direction: 'E' as const,
      lane: 5,
      priority: 2
    },
    // 서쪽 도로 상단 (차선 0 - 최우측 차선)
    { 
      id: 'west-top',
      xStart: 100,
      xEnd: this.LAYOUT.intersection.x - 60,
      y: this.LAYOUT.crossRoad.y + 5,
      direction: 'W' as const,
      lane: 0,
      priority: 2
    }
  ];
  
  constructor() {
    this.lastUpdateTime = Date.now();
  }
  
  // 교통 상황 분석
  public analyzeTraffic(vehicles: any[]): TrafficMetrics {
    const activeVehicles = vehicles.filter(v => !v.isParked);
    const parkedVehicles = vehicles.filter(v => v.isParked);
    
    // 차선별 점유율 계산
    const laneOccupancy = new Map<string, number>();
    activeVehicles.forEach(vehicle => {
      const laneKey = `${vehicle.direction}-${vehicle.lane}`;
      laneOccupancy.set(laneKey, (laneOccupancy.get(laneKey) || 0) + 1);
    });
    
    // 교차로 근처 차량 수 계산 (더 정밀한 혼잡도)
    const intersectionVehicles = activeVehicles.filter(v => {
      const nearIntersection = 
        (v.x > this.LAYOUT.intersection.x - 100 && 
         v.x < this.LAYOUT.intersection.x + this.LAYOUT.intersection.width + 100) &&
        (v.y > this.LAYOUT.intersection.y - 100 && 
         v.y < this.LAYOUT.intersection.y + this.LAYOUT.intersection.height + 100);
      return nearIntersection;
    });
    
    // 혼잡도 계산 (0-100)
    const maxVehiclesPerLane = 10;
    const totalLanes = 14; // 남북 8개, 동서 6개
    const maxCapacity = maxVehiclesPerLane * totalLanes;
    const congestionLevel = Math.min(100, (activeVehicles.length / maxCapacity) * 100);
    
    return {
      totalVehicles: vehicles.length,
      activeVehicles: activeVehicles.length,
      parkedVehicles: parkedVehicles.length,
      congestionLevel,
      laneOccupancy
    };
  }
  
  // 목표 주차공간 수 계산
  private calculateTargetSpots(metrics: TrafficMetrics): number {
    const { congestionLevel, activeVehicles } = metrics;
    
    // 혼잡도와 활성 차량 수에 따른 동적 할당
    if (congestionLevel > 70 || activeVehicles > 60) {
      return 0; // 매우 혼잡 - 모든 차선 통행용
    } else if (congestionLevel > 50 || activeVehicles > 40) {
      return 5; // 혼잡 - 최소 주차공간만
    } else if (congestionLevel > 30 || activeVehicles > 25) {
      return 15; // 보통 - 적당한 주차공간
    } else {
      return 25; // 한산 - 많은 주차공간
    }
  }
  
  // 주차공간 업데이트 (메인 함수)
  public updateParkingSpots(vehicles: any[]): ParkingSpot[] {
    const now = Date.now();
    
    // 업데이트 간격 체크
    if (now - this.lastUpdateTime < this.updateInterval) {
      return Array.from(this.parkingSpots.values());
    }
    this.lastUpdateTime = now;
    
    // 교통 상황 분석
    const metrics = this.analyzeTraffic(vehicles);
    const targetSpots = this.calculateTargetSpots(metrics);
    const currentSpots = this.parkingSpots.size;
    
    // 주차공간 조정
    if (targetSpots > currentSpots) {
      this.addParkingSpots(targetSpots - currentSpots, metrics);
    } else if (targetSpots < currentSpots) {
      this.removeParkingSpots(currentSpots - targetSpots);
    }
    
    return Array.from(this.parkingSpots.values());
  }
  
  // 주차공간 추가
  private addParkingSpots(count: number, metrics: TrafficMetrics) {
    const spotWidth = 15;
    const spotHeight = 25;
    const spacing = 35;
    
    let spotsAdded = 0;
    
    // 우선순위에 따라 구역 정렬
    const sortedZones = [...this.PARKING_ZONES].sort((a, b) => {
      // 해당 차선의 혼잡도 확인
      const aOccupancy = metrics.laneOccupancy.get(`${a.direction}-${a.lane}`) || 0;
      const bOccupancy = metrics.laneOccupancy.get(`${b.direction}-${b.lane}`) || 0;
      
      // 덜 혼잡한 차선 우선
      if (aOccupancy !== bOccupancy) return aOccupancy - bOccupancy;
      
      // 기본 우선순위
      return a.priority - b.priority;
    });
    
    for (const zone of sortedZones) {
      if (spotsAdded >= count) break;
      
      if ('yStart' in zone) {
        // 세로 도로
        const maxSpots = Math.floor((zone.yEnd - zone.yStart) / spacing);
        const existingInZone = Array.from(this.parkingSpots.values())
          .filter(spot => spot.direction === zone.direction).length;
        const spotsToAdd = Math.min(maxSpots - existingInZone, count - spotsAdded);
        
        for (let i = 0; i < spotsToAdd; i++) {
          const y = zone.yStart + (existingInZone + i) * spacing;
          const id = `parking-${zone.id}-${Date.now()}-${i}`;
          
          // 기존 주차공간과 겹치지 않는지 확인
          let canPlace = true;
          for (const existing of this.parkingSpots.values()) {
            if (Math.abs(existing.x - zone.x) < 20 && Math.abs(existing.y - y) < 30) {
              canPlace = false;
              break;
            }
          }
          
          if (canPlace) {
            this.parkingSpots.set(id, {
              id,
              x: zone.x,
              y,
              width: spotWidth,
              height: spotHeight,
              direction: zone.direction,
              occupied: false,
              priority: zone.priority
            });
            spotsAdded++;
          }
        }
      } else {
        // 가로 도로
        const maxSpots = Math.floor((zone.xEnd - zone.xStart) / spacing);
        const existingInZone = Array.from(this.parkingSpots.values())
          .filter(spot => spot.direction === zone.direction).length;
        const spotsToAdd = Math.min(maxSpots - existingInZone, count - spotsAdded);
        
        for (let i = 0; i < spotsToAdd; i++) {
          const x = zone.xStart + (existingInZone + i) * spacing;
          const id = `parking-${zone.id}-${Date.now()}-${i}`;
          
          // 기존 주차공간과 겹치지 않는지 확인
          let canPlace = true;
          for (const existing of this.parkingSpots.values()) {
            if (Math.abs(existing.y - zone.y) < 20 && Math.abs(existing.x - x) < 30) {
              canPlace = false;
              break;
            }
          }
          
          if (canPlace) {
            this.parkingSpots.set(id, {
              id,
              x,
              y: zone.y,
              width: spotHeight,
              height: spotWidth,
              direction: zone.direction,
              occupied: false,
              priority: zone.priority
            });
            spotsAdded++;
          }
        }
      }
    }
  }
  
  // 주차공간 제거
  private removeParkingSpots(count: number) {
    const spots = Array.from(this.parkingSpots.values());
    
    // 비어있는 공간부터 우선 제거
    const emptySpots = spots.filter(s => !s.occupied)
      .sort((a, b) => b.priority - a.priority); // 낮은 우선순위부터 제거
    
    let removed = 0;
    for (const spot of emptySpots) {
      if (removed >= count) break;
      this.parkingSpots.delete(spot.id);
      removed++;
    }
  }
  
  // 주차공간 점유 상태 업데이트
  public updateOccupancy(spotId: string, occupied: boolean, vehicleId?: string) {
    const spot = this.parkingSpots.get(spotId);
    if (spot) {
      spot.occupied = occupied;
      spot.vehicleId = occupied ? vehicleId : undefined;
    }
  }
  
  // 가장 가까운 빈 주차공간 찾기 (방향 고려)
  public findNearestAvailableSpotInDirection(x: number, y: number, direction: 'N' | 'S' | 'E' | 'W'): ParkingSpot | null {
    let nearest: ParkingSpot | null = null;
    let minDistance = Infinity;
    
    for (const spot of this.parkingSpots.values()) {
      if (!spot.occupied) {
        // 방향에 따라 진행 방향 앞쪽에 있는 주차 스팟만 고려
        let isInFront = false;
        
        switch (direction) {
          case 'N': // 북쪽으로 가는 차량은 현재 y보다 작은 y값 (위쪽)의 스팟만
            isInFront = spot.y < y - 50; // 최소 50px 앞쪽
            break;
          case 'S': // 남쪽으로 가는 차량은 현재 y보다 큰 y값 (아래쪽)의 스팟만
            isInFront = spot.y > y + 50;
            break;
          case 'E': // 동쪽으로 가는 차량은 현재 x보다 큰 x값 (오른쪽)의 스팟만
            isInFront = spot.x > x + 50;
            break;
          case 'W': // 서쪽으로 가는 차량은 현재 x보다 작은 x값 (왼쪽)의 스팟만
            isInFront = spot.x < x - 50;
            break;
        }
        
        if (isInFront) {
          const distance = Math.sqrt(
            Math.pow(spot.x - x, 2) + Math.pow(spot.y - y, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearest = spot;
          }
        }
      }
    }
    
    return minDistance < 200 ? nearest : null;
  }

  // 기존 메서드 (호환성 유지)
  public findNearestAvailableSpot(x: number, y: number): ParkingSpot | null {
    let nearest: ParkingSpot | null = null;
    let minDistance = Infinity;
    
    for (const spot of this.parkingSpots.values()) {
      if (!spot.occupied) {
        const distance = Math.sqrt(
          Math.pow(spot.x - x, 2) + Math.pow(spot.y - y, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearest = spot;
        }
      }
    }
    
    return minDistance < 200 ? nearest : null;
  }
  
  // 모든 주차공간 반환
  public getAllSpots(): ParkingSpot[] {
    return Array.from(this.parkingSpots.values());
  }
  
  // 통계 정보 반환
  public getStatistics() {
    const spots = Array.from(this.parkingSpots.values());
    return {
      total: spots.length,
      occupied: spots.filter(s => s.occupied).length,
      available: spots.filter(s => !s.occupied).length,
      occupancyRate: spots.length > 0 
        ? (spots.filter(s => s.occupied).length / spots.length) * 100 
        : 0
    };
  }
  
  // 주차공간 초기화
  public reset() {
    this.parkingSpots.clear();
    this.lastUpdateTime = Date.now();
  }
}