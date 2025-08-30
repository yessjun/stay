// 세종시 실제 도로망 데이터 - 차량이 도로를 따라 이동하도록 하는 네트워크

import { Coordinate } from '@/types/vehicle';

export interface RoadSegment {
  id: string;
  name: string;
  type: 'highway' | 'main' | 'sub' | 'local';
  points: Coordinate[];
}

// 세종시 주요 간선도로 (실제 도로 기반)
export const MAIN_ROADS: Record<string, RoadSegment> = {
  // 한누리대로 (동서 주간선도로, BRT 운행 도로)
  hannuriDaero: {
    id: 'hannuri',
    name: '한누리대로',
    type: 'highway',
    points: [
      { lat: 36.4798, lng: 127.2500 },
      { lat: 36.4799, lng: 127.2600 },
      { lat: 36.4800, lng: 127.2650 }, // 달빛로 교차
      { lat: 36.4801, lng: 127.2700 },
      { lat: 36.4802, lng: 127.2750 },
      { lat: 36.4804, lng: 127.2800 },
      { lat: 36.4806, lng: 127.2850 },
      { lat: 36.4808, lng: 127.2890 }, // 시청 교차
      { lat: 36.4810, lng: 127.2950 },
      { lat: 36.4812, lng: 127.3000 },
      { lat: 36.4814, lng: 127.3100 },
      { lat: 36.4816, lng: 127.3200 },
    ]
  },

  // 도움로 (남북 간선도로)
  doumRo: {
    id: 'doum',
    name: '도움로',
    type: 'main',
    points: [
      { lat: 36.4600, lng: 127.2888 },
      { lat: 36.4650, lng: 127.2889 },
      { lat: 36.4700, lng: 127.2890 },
      { lat: 36.4750, lng: 127.2891 },
      { lat: 36.4800, lng: 127.2892 }, // 한누리대로 교차
      { lat: 36.4850, lng: 127.2893 },
      { lat: 36.4900, lng: 127.2894 },
      { lat: 36.4950, lng: 127.2895 },
      { lat: 36.5000, lng: 127.2896 },
      { lat: 36.5050, lng: 127.2897 },
      { lat: 36.5100, lng: 127.2898 },
    ]
  },

  // 달빛로 (남북 간선도로)
  dalbitRo: {
    id: 'dalbit',
    name: '달빛로',
    type: 'main',
    points: [
      { lat: 36.4600, lng: 127.2648 },
      { lat: 36.4650, lng: 127.2649 },
      { lat: 36.4700, lng: 127.2650 },
      { lat: 36.4750, lng: 127.2651 },
      { lat: 36.4800, lng: 127.2652 }, // 한누리대로 교차
      { lat: 36.4850, lng: 127.2653 },
      { lat: 36.4900, lng: 127.2654 },
      { lat: 36.4950, lng: 127.2655 },
      { lat: 36.5000, lng: 127.2656 },
      { lat: 36.5050, lng: 127.2657 },
      { lat: 36.5100, lng: 127.2658 },
    ]
  },

  // 어진로 (남북 보조간선도로)
  eojinRo: {
    id: 'eojin',
    name: '어진로',
    type: 'sub',
    points: [
      { lat: 36.4650, lng: 127.2748 },
      { lat: 36.4700, lng: 127.2749 },
      { lat: 36.4750, lng: 127.2750 },
      { lat: 36.4800, lng: 127.2751 },
      { lat: 36.4850, lng: 127.2752 },
      { lat: 36.4900, lng: 127.2753 },
      { lat: 36.4950, lng: 127.2754 },
      { lat: 36.5000, lng: 127.2755 },
    ]
  },

  // 정부청사 순환도로
  governmentLoop: {
    id: 'gov-loop',
    name: '정부청사로',
    type: 'main',
    points: [
      { lat: 36.5040, lng: 127.2650 },
      { lat: 36.5040, lng: 127.2700 },
      { lat: 36.5040, lng: 127.2750 },
      { lat: 36.5010, lng: 127.2750 },
      { lat: 36.4980, lng: 127.2750 },
      { lat: 36.4980, lng: 127.2700 },
      { lat: 36.4980, lng: 127.2650 },
      { lat: 36.5010, lng: 127.2650 },
      { lat: 36.5040, lng: 127.2650 }, // 순환 완료
    ]
  },

  // BRT 전용차로 (한누리대로 기반)
  brtLine: {
    id: 'brt',
    name: 'BRT 전용차로',
    type: 'highway',
    points: [
      { lat: 36.4800, lng: 127.2600 }, // 달빛로역
      { lat: 36.4801, lng: 127.2650 }, // 한솔동주민센터
      { lat: 36.4804, lng: 127.2750 }, // 세종시청역
      { lat: 36.4808, lng: 127.2890 }, // 시청
      { lat: 36.4812, lng: 127.3000 }, // 정부청사역
    ]
  }
};

// 격자형 보조도로망 (세종시 계획도시 특성)
export const GRID_ROADS = {
  // 동서 방향 도로 (위도선) - 200m 간격
  horizontal: [
    36.4600, 36.4620, 36.4640, 36.4660, 36.4680, 36.4700,
    36.4720, 36.4740, 36.4760, 36.4780, 36.4800, 36.4820,
    36.4840, 36.4860, 36.4880, 36.4900, 36.4920, 36.4940,
    36.4960, 36.4980, 36.5000, 36.5020, 36.5040, 36.5060,
    36.5080, 36.5100, 36.5120
  ],

  // 남북 방향 도로 (경도선) - 200m 간격
  vertical: [
    127.2500, 127.2520, 127.2540, 127.2560, 127.2580, 127.2600,
    127.2620, 127.2640, 127.2660, 127.2680, 127.2700, 127.2720,
    127.2740, 127.2760, 127.2780, 127.2800, 127.2820, 127.2840,
    127.2860, 127.2880, 127.2900, 127.2920, 127.2940, 127.2960,
    127.2980, 127.3000, 127.3020, 127.3040, 127.3060, 127.3080,
    127.3100, 127.3120, 127.3140, 127.3160, 127.3180, 127.3200
  ]
};

// 도로 네트워크 클래스
export class RoadNetwork {
  private intersections: Map<string, Coordinate> = new Map();
  private connections: Map<string, string[]> = new Map();
  private roadTypes: Map<string, string> = new Map();

  constructor() {
    this.buildNetwork();
  }

  private buildNetwork(): void {
    // 격자형 교차점 생성
    GRID_ROADS.horizontal.forEach((lat, latIdx) => {
      GRID_ROADS.vertical.forEach((lng, lngIdx) => {
        const key = this.getNodeKey(lat, lng);
        this.intersections.set(key, { lat, lng });
        
        // 도로 유형 결정
        let roadType = 'local';
        
        // 주요 간선도로 확인
        if (Math.abs(lat - 36.4800) < 0.002) roadType = 'highway'; // 한누리대로
        else if (Math.abs(lng - 127.2890) < 0.002) roadType = 'main'; // 도움로
        else if (Math.abs(lng - 127.2650) < 0.002) roadType = 'main'; // 달빛로
        else if (Math.abs(lng - 127.2750) < 0.002) roadType = 'sub'; // 어진로
        
        this.roadTypes.set(key, roadType);
        
        // 인접 교차점 연결 설정
        const connections: string[] = [];
        
        // 동쪽 연결
        if (lngIdx < GRID_ROADS.vertical.length - 1) {
          connections.push(this.getNodeKey(lat, GRID_ROADS.vertical[lngIdx + 1]));
        }
        
        // 서쪽 연결
        if (lngIdx > 0) {
          connections.push(this.getNodeKey(lat, GRID_ROADS.vertical[lngIdx - 1]));
        }
        
        // 북쪽 연결
        if (latIdx < GRID_ROADS.horizontal.length - 1) {
          connections.push(this.getNodeKey(GRID_ROADS.horizontal[latIdx + 1], lng));
        }
        
        // 남쪽 연결
        if (latIdx > 0) {
          connections.push(this.getNodeKey(GRID_ROADS.horizontal[latIdx - 1], lng));
        }
        
        this.connections.set(key, connections);
      });
    });

    console.log(`🛣️ 도로망 구축 완료: ${this.intersections.size}개 교차점, ${this.connections.size}개 연결`);
  }

  private getNodeKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  }

  // 가장 가까운 교차점 찾기
  public findNearestIntersection(position: Coordinate): Coordinate {
    let minDistance = Infinity;
    let nearest: Coordinate = position;
    
    this.intersections.forEach((intersection) => {
      const distance = this.calculateDistance(position, intersection);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = intersection;
      }
    });
    
    return nearest;
  }

  // 도로를 따른 경로 찾기 (맨해튼 거리 기반)
  public findPath(start: Coordinate, end: Coordinate): Coordinate[] {
    const path: Coordinate[] = [start];
    
    const startNode = this.findNearestIntersection(start);
    const endNode = this.findNearestIntersection(end);
    
    // 시작점이 교차점과 다르면 교차점으로 이동
    if (this.calculateDistance(start, startNode) > 0.0001) {
      path.push(startNode);
    }
    
    // 맨해튼 경로 생성 (격자형 도시에 최적화)
    let current = startNode;
    
    // 1단계: 동서 이동 우선
    if (Math.abs(endNode.lng - current.lng) > 0.0001) {
      const targetLng = endNode.lng;
      const step = current.lng < targetLng ? 0.0020 : -0.0020; // 약 200m 격자
      
      while (Math.abs(current.lng - targetLng) > 0.0001) {
        const nextLng = current.lng + step;
        // 목표 경도를 넘어가지 않도록 조정
        const actualNextLng = step > 0 ? 
          Math.min(nextLng, targetLng) : 
          Math.max(nextLng, targetLng);
        
        current = { lat: current.lat, lng: actualNextLng };
        path.push({ ...current });
        
        if (Math.abs(current.lng - targetLng) < 0.0001) break;
      }
    }
    
    // 2단계: 남북 이동
    if (Math.abs(endNode.lat - current.lat) > 0.0001) {
      const targetLat = endNode.lat;
      const step = current.lat < targetLat ? 0.0020 : -0.0020; // 약 200m 격자
      
      while (Math.abs(current.lat - targetLat) > 0.0001) {
        const nextLat = current.lat + step;
        // 목표 위도를 넘어가지 않도록 조정
        const actualNextLat = step > 0 ? 
          Math.min(nextLat, targetLat) : 
          Math.max(nextLat, targetLat);
        
        current = { lat: actualNextLat, lng: current.lng };
        path.push({ ...current });
        
        if (Math.abs(current.lat - targetLat) < 0.0001) break;
      }
    }
    
    // 최종 목적지가 교차점과 다르면 목적지 추가
    if (this.calculateDistance(end, endNode) > 0.0001) {
      path.push(end);
    }
    
    // 중복 제거 및 최적화
    return this.optimizePath(path);
  }

  private optimizePath(path: Coordinate[]): Coordinate[] {
    if (path.length <= 2) return path;
    
    const optimized: Coordinate[] = [path[0]];
    
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const current = path[i];
      const next = path[i + 1];
      
      // 직선상에 있는 점들은 제거 (동일한 위도 또는 경도)
      const isSameLatLine = Math.abs(prev.lat - current.lat) < 0.0001 && 
                           Math.abs(current.lat - next.lat) < 0.0001;
      const isSameLngLine = Math.abs(prev.lng - current.lng) < 0.0001 && 
                           Math.abs(current.lng - next.lng) < 0.0001;
      
      if (!isSameLatLine && !isSameLngLine) {
        optimized.push(current);
      }
    }
    
    optimized.push(path[path.length - 1]);
    return optimized;
  }

  private calculateDistance(p1: Coordinate, p2: Coordinate): number {
    const dlat = p2.lat - p1.lat;
    const dlng = p2.lng - p1.lng;
    return Math.sqrt(dlat * dlat + dlng * dlng);
  }

  // 도로 유형별 속도 제한
  public getSpeedLimit(position: Coordinate): number {
    const nearestNode = this.findNearestIntersection(position);
    const key = this.getNodeKey(nearestNode.lat, nearestNode.lng);
    const roadType = this.roadTypes.get(key) || 'local';
    
    switch (roadType) {
      case 'highway': return 60; // 한누리대로 등 주간선
      case 'main': return 50;    // 도움로, 달빛로 등
      case 'sub': return 40;     // 보조간선도로
      default: return 30;        // 지역도로
    }
  }

  // 디버깅용 - 경로 정보 출력
  public logPathInfo(path: Coordinate[]): void {
    console.log('🗺️ 생성된 경로:', {
      waypoints: path.length,
      start: path[0],
      end: path[path.length - 1],
      distance: this.calculatePathDistance(path).toFixed(2) + 'km'
    });
  }

  private calculatePathDistance(path: Coordinate[]): number {
    let totalDistance = 0;
    for (let i = 1; i < path.length; i++) {
      totalDistance += this.calculateDistance(path[i - 1], path[i]);
    }
    return totalDistance * 111; // 대략적인 km 변환
  }
}

// 싱글톤 인스턴스
export const roadNetwork = new RoadNetwork();