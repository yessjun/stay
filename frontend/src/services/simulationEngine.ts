// 시뮬레이션 엔진 - 차량과 슬롯의 실시간 시뮬레이션 관리

import { Vehicle, VehicleStatus, Coordinate } from '@/types/vehicle';
import { ParkingSlot, SlotStatus } from '@/types/slot';
import { SimulationEvent } from '@/types/simulation';
import { 
  SEJONG_CENTER, 
  GOVERNMENT_COMPLEX, 
  RESIDENTIAL_AREAS, 
  PICKUP_ZONES, 
  COMMERCIAL_AREAS,
  ALL_LOCATIONS,
  TRAFFIC_PATTERNS 
} from '@/constants/sejongLocations';
import { roadNetwork } from '@/constants/sejongRoadNetwork';

export class SimulationEngine {
  private vehicles: Vehicle[] = [];
  private slots: ParkingSlot[] = [];
  private currentTime: Date = new Date();
  private isRunning: boolean = false;
  private speed: number = 1;
  private intervalId: NodeJS.Timeout | null = null;
  private updateCallback: ((data: { vehicles: Vehicle[], slots: ParkingSlot[], events: SimulationEvent[], currentTime: Date }) => void) | null = null;

  // 시뮬레이션 초기화
  public initialize(): { vehicles: Vehicle[], slots: ParkingSlot[] } {
    this.generateVehicles(50);
    this.generateSlots(120);
    return {
      vehicles: this.vehicles,
      slots: this.slots
    };
  }

  // 차량 생성
  private generateVehicles(count: number): void {
    this.vehicles = [];
    
    for (let i = 1; i <= count; i++) {
      const location = this.getRandomLocation();
      
      const vehicle: Vehicle = {
        id: `vehicle-${i}`,
        position: location,
        status: Math.random() > 0.7 ? 'moving' : 'idle',
        battery: 70 + Math.random() * 30, // 70-100%
        speed: 0,
        totalDistance: Math.random() * 500, // 0-500km
        tripCount: Math.floor(Math.random() * 50),
        efficiency: 80 + Math.random() * 20, // 80-100%
        lastUpdate: new Date()
      };

      // 움직이는 차량에는 목적지 설정
      if (vehicle.status === 'moving') {
        vehicle.destination = this.getRandomLocation();
        vehicle.speed = 20 + Math.random() * 40; // 20-60 km/h
        vehicle.route = this.calculateRoute(vehicle.position, vehicle.destination);
        
        // 경로 생성 로그 (디버깅)
        if (Math.random() < 0.1) {
          const distance = this.calculateDistance(vehicle.position, vehicle.destination) * 111; // km 변환
          console.log(`🚗 차량 ${vehicle.id} 경로 생성:`, {
            from: { lat: vehicle.position.lat.toFixed(4), lng: vehicle.position.lng.toFixed(4) },
            to: { lat: vehicle.destination.lat.toFixed(4), lng: vehicle.destination.lng.toFixed(4) },
            distance: distance.toFixed(1) + 'km',
            waypoints: vehicle.route?.length
          });
        }
      }

      this.vehicles.push(vehicle);
    }
  }

  // 슬롯 생성
  private generateSlots(count: number): void {
    this.slots = [];
    
    // 정부청사 주변 슬롯 (30%)
    for (let i = 0; i < count * 0.3; i++) {
      const baseLocation = GOVERNMENT_COMPLEX[i % GOVERNMENT_COMPLEX.length];
      const slot = this.createSlot(`slot-gov-${i}`, this.addRandomOffset(baseLocation), 'static');
      this.slots.push(slot);
    }

    // 주거지역 슬롯 (40%)
    for (let i = 0; i < count * 0.4; i++) {
      const baseLocation = RESIDENTIAL_AREAS[i % RESIDENTIAL_AREAS.length];
      const slot = this.createSlot(`slot-res-${i}`, this.addRandomOffset(baseLocation), 'dynamic');
      this.slots.push(slot);
    }

    // 승하차구역 및 상업지역 슬롯 (30%)
    const remaining = count - this.slots.length;
    for (let i = 0; i < remaining; i++) {
      const baseLocation = [...PICKUP_ZONES, ...COMMERCIAL_AREAS][i % (PICKUP_ZONES.length + COMMERCIAL_AREAS.length)];
      const slot = this.createSlot(`slot-pickup-${i}`, this.addRandomOffset(baseLocation), 
        'dynamic'); // 승하차구역은 모두 동적 할당
      this.slots.push(slot);
    }
  }

  // 슬롯 생성 헬퍼
  private createSlot(id: string, position: Coordinate, type: 'dynamic' | 'static'): ParkingSlot {
    const statuses: SlotStatus[] = ['available', 'occupied', 'reserved'];
    const weights = type === 'dynamic' ? [0.6, 0.3, 0.1] : [0.7, 0.2, 0.1];
    
    return {
      id,
      position,
      status: this.getWeightedRandom(statuses, weights),
      type,
      priority: type === 'dynamic' ? Math.floor(Math.random() * 5) + 3 : Math.floor(Math.random() * 3) + 1,
      capacity: Math.floor(Math.random() * 3) + 2, // 2-4대
      occupiedCount: 0,
      roadSection: this.getRoadSection(position),
      direction: ['north', 'south', 'east', 'west'][Math.floor(Math.random() * 4)] as any,
      utilizationRate: Math.random() * 100,
      createdAt: new Date(),
      lastUsed: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 86400000) : undefined
    };
  }

  // 시뮬레이션 시작
  public start(updateCallback: (data: { vehicles: Vehicle[], slots: ParkingSlot[], events: SimulationEvent[], currentTime: Date }) => void): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.updateCallback = updateCallback; // 콜백 저장
    
    this.intervalId = setInterval(() => {
      this.update();
      const events = this.generateEvents();
      if (this.updateCallback) {
        this.updateCallback({
          vehicles: [...this.vehicles],
          slots: [...this.slots],
          events,
          currentTime: new Date(this.currentTime)
        });
      }
    }, 1000 / this.speed); // 속도에 따라 업데이트 주기 조정 (빠른 업데이트, 1초씩 증가)
  }

  // 시뮬레이션 중지
  public stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.updateCallback = null; // 콜백 정리
  }

  // 속도 설정
  public setSpeed(speed: number): void {
    this.speed = speed;
    if (this.isRunning && this.intervalId && this.updateCallback) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false; // 재시작하기 위해 일시적으로 false로 설정
      this.start(this.updateCallback); // 저장된 콜백으로 재시작
    }
  }

  // 시뮬레이션 업데이트
  private update(): void {
    // 시간 진행 (항상 1초씩)
    this.currentTime = new Date(this.currentTime.getTime() + 1000); // 1초씩 진행

    // 차량 업데이트
    this.updateVehicles();
    
    // 슬롯 업데이트  
    this.updateSlots();
  }

  // 차량 상태 업데이트
  private updateVehicles(): void {
    const currentHour = this.currentTime.getHours();
    
    this.vehicles.forEach(vehicle => {
      // 배터리 소모
      if (vehicle.status === 'moving') {
        vehicle.battery = Math.max(0, vehicle.battery - 0.1 * Math.random());
        vehicle.totalDistance += (vehicle.speed / 60) * (this.speed / 60); // km 증가
      }

      // 상태 전환 로직
      switch (vehicle.status) {
        case 'idle':
          this.handleIdleVehicle(vehicle, currentHour);
          break;
        case 'moving':
          this.handleMovingVehicle(vehicle);
          break;
        case 'picking':
          this.handlePickingVehicle(vehicle);
          break;
        case 'dropping':
          this.handleDroppingVehicle(vehicle);
          break;
      }

      vehicle.lastUpdate = new Date();
    });
  }

  // 대기 중인 차량 처리
  private handleIdleVehicle(vehicle: Vehicle, currentHour: number): void {
    // 시간대별 호출 확률
    let callProbability = 0.02; // 기본 2%
    
    if (currentHour >= 7 && currentHour <= 9) callProbability = 0.08; // 출근시간
    else if (currentHour >= 12 && currentHour <= 13) callProbability = 0.05; // 점심시간
    else if (currentHour >= 17 && currentHour <= 19) callProbability = 0.10; // 퇴근시간
    
    if (Math.random() < callProbability) {
      vehicle.status = 'moving';
      vehicle.destination = this.getDestinationByTime(currentHour);
      vehicle.speed = 25 + Math.random() * 25;
      vehicle.route = this.calculateRoute(vehicle.position, vehicle.destination);
    }
  }

  // 이동 중인 차량 처리
  private handleMovingVehicle(vehicle: Vehicle): void {
    if (!vehicle.destination || !vehicle.route) return;

    // 목적지에 도달 확률
    if (Math.random() < 0.1) {
      // 승객을 태우러 가는 중
      if (Math.random() > 0.5) {
        vehicle.status = 'picking';
        vehicle.speed = 0;
      } else {
        // 목적지 도달
        vehicle.position = vehicle.destination;
        vehicle.status = 'idle';
        vehicle.speed = 0;
        vehicle.destination = undefined;
        vehicle.route = undefined;
        vehicle.tripCount++;
      }
    } else {
      // 목적지로 이동 중
      this.moveVehicleTowardsDestination(vehicle);
    }
  }

  // 승객 탑승 처리
  private handlePickingVehicle(vehicle: Vehicle): void {
    // 3-10초 후 승객 탑승 완료
    if (Math.random() < 0.3) {
      vehicle.status = 'moving';
      vehicle.passenger = true;
      vehicle.destination = this.getRandomLocation();
      vehicle.route = this.calculateRoute(vehicle.position, vehicle.destination);
      vehicle.speed = 20 + Math.random() * 20;
    }
  }

  // 승객 하차 처리
  private handleDroppingVehicle(vehicle: Vehicle): void {
    // 2-5초 후 하차 완료
    if (Math.random() < 0.5) {
      vehicle.status = 'idle';
      vehicle.passenger = false;
      vehicle.speed = 0;
      vehicle.destination = undefined;
      vehicle.route = undefined;
    }
  }

  // 차량을 목적지로 이동 (도로 경로 따라)
  private moveVehicleTowardsDestination(vehicle: Vehicle): void {
    if (!vehicle.destination || !vehicle.route || vehicle.route.length === 0) return;

    // 현재 목표 웨이포인트 (경로의 첫 번째 점)
    const currentTarget = vehicle.route[0];
    const distance = this.calculateDistance(vehicle.position, currentTarget);

    // 웨이포인트 도달 확인 (약 20m 이내)
    if (distance < 0.0002) {
      // 현재 웨이포인트 제거
      vehicle.route.shift();
      
      if (vehicle.route.length === 0) {
        // 최종 목적지 도착
        vehicle.position = { ...vehicle.destination };
        vehicle.status = 'idle';
        vehicle.speed = 0;
        vehicle.destination = undefined;
        vehicle.route = undefined;
        vehicle.tripCount++;
        
        // 경로 완료 로그 (디버깅)
        if (Math.random() < 0.1) {
          console.log(`🚗 차량 ${vehicle.id} 목적지 도착:`, {
            from: { lat: vehicle.position.lat.toFixed(4), lng: vehicle.position.lng.toFixed(4) },
            tripCount: vehicle.tripCount
          });
        }
      }
    } else {
      // 현재 웨이포인트를 향해 이동
      const speedKmPerSec = vehicle.speed / 3600; // km/h를 km/s로 변환
      const moveDistance = speedKmPerSec * 0.01; // 좌표계 보정 증가 (더 빠른 이동)
      const moveRatio = Math.min(moveDistance / distance, 0.3); // 최대 30% 이동 (부드러운 애니메이션)
      
      const dlat = currentTarget.lat - vehicle.position.lat;
      const dlng = currentTarget.lng - vehicle.position.lng;
      
      vehicle.position.lat += dlat * moveRatio;
      vehicle.position.lng += dlng * moveRatio;
      
      // 도로 유형에 따른 속도 조정
      const speedLimit = roadNetwork.getSpeedLimit(vehicle.position);
      vehicle.speed = Math.min(vehicle.speed, speedLimit);
    }
  }

  // 좌표간 거리 계산 헬퍼 메서드
  private calculateDistance(p1: Coordinate, p2: Coordinate): number {
    const dlat = p2.lat - p1.lat;
    const dlng = p2.lng - p1.lng;
    return Math.sqrt(dlat * dlat + dlng * dlng);
  }

  // 슬롯 상태 업데이트
  private updateSlots(): void {
    const currentHour = this.currentTime.getHours();
    
    this.slots.forEach(slot => {
      // 동적 슬롯의 시간대별 가용성 조정
      if (slot.type === 'dynamic') {
        const trafficDensity = this.getTrafficDensity(currentHour);
        
        // 교통량이 높을 때 슬롯 비활성화 확률 증가
        if (trafficDensity > 0.8 && slot.status === 'available' && Math.random() < 0.1) {
          slot.status = 'disabled';
        } else if (trafficDensity < 0.5 && slot.status === 'disabled' && Math.random() < 0.2) {
          slot.status = 'available';
        }
      }

      // 예약된 슬롯 → 점유 전환
      if (slot.status === 'reserved' && Math.random() < 0.3) {
        slot.status = 'occupied';
        slot.occupiedCount = Math.min(slot.capacity, slot.occupiedCount + 1);
        slot.lastUsed = new Date();
      }

      // 점유된 슬롯 → 사용 가능 전환
      if (slot.status === 'occupied' && Math.random() < 0.1) {
        slot.status = 'available';
        slot.occupiedCount = Math.max(0, slot.occupiedCount - 1);
      }

      // 이용률 업데이트
      slot.utilizationRate = (slot.occupiedCount / slot.capacity) * 100;
    });
  }

  // 이벤트 생성
  private generateEvents(): SimulationEvent[] {
    const events: SimulationEvent[] = [];

    // 랜덤 이벤트 생성 (5% 확률)
    if (Math.random() < 0.05) {
      const eventTypes = [
        {
          type: 'vehicle_event' as const,
          title: '차량 배터리 부족',
          description: `차량 #${Math.floor(Math.random() * 50) + 1}의 배터리가 20% 이하입니다.`,
          severity: 'warning' as const
        },
        {
          type: 'slot_event' as const,
          title: '슬롯 이용률 증가',
          description: '한솔동 구역의 슬롯 이용률이 85%를 초과했습니다.',
          severity: 'info' as const
        },
        {
          type: 'traffic_incident' as const,
          title: '교통량 증가 감지',
          description: '정부청사 구역에서 평소보다 높은 교통량이 감지되었습니다.',
          severity: 'info' as const
        }
      ];

      const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      events.push({
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...event,
        timestamp: new Date(),
        acknowledged: false,
        autoResolved: false
      });
    }

    return events;
  }

  // 헬퍼 함수들
  private getRandomLocation(): Coordinate {
    const location = ALL_LOCATIONS[Math.floor(Math.random() * ALL_LOCATIONS.length)];
    return { lat: location.lat, lng: location.lng };
  }

  private addRandomOffset(location: { lat: number; lng: number }): Coordinate {
    return {
      lat: location.lat + (Math.random() - 0.5) * 0.02, // ±0.01도 (약 1km)
      lng: location.lng + (Math.random() - 0.5) * 0.02
    };
  }

  private getWeightedRandom<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let randomNum = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      if (randomNum < weights[i]) {
        return items[i];
      }
      randomNum -= weights[i];
    }
    
    return items[items.length - 1];
  }

  private getRoadSection(position: Coordinate): string {
    // 간단한 도로 구간 결정 로직
    if (position.lat > 36.50) return '한누리대로';
    if (position.lat > 36.48) return '시청대로';
    if (position.lng > 127.28) return '달빛로';
    return '보람동로';
  }

  private getDestinationByTime(hour: number): Coordinate {
    if (hour >= 7 && hour <= 9) {
      // 출근시간: 주거지역 → 정부청사
      return { 
        lat: GOVERNMENT_COMPLEX[Math.floor(Math.random() * GOVERNMENT_COMPLEX.length)].lat,
        lng: GOVERNMENT_COMPLEX[Math.floor(Math.random() * GOVERNMENT_COMPLEX.length)].lng
      };
    } else if (hour >= 17 && hour <= 19) {
      // 퇴근시간: 정부청사 → 주거지역
      return {
        lat: RESIDENTIAL_AREAS[Math.floor(Math.random() * RESIDENTIAL_AREAS.length)].lat,
        lng: RESIDENTIAL_AREAS[Math.floor(Math.random() * RESIDENTIAL_AREAS.length)].lng
      };
    } else {
      // 그 외 시간: 랜덤
      return this.getRandomLocation();
    }
  }

  private calculateRoute(start: Coordinate, end: Coordinate): Coordinate[] {
    // 세종시 실제 도로망을 사용한 경로 계산
    const path = roadNetwork.findPath(start, end);
    
    // 디버깅용 로그
    if (Math.random() < 0.1) { // 10% 확률로 경로 정보 출력
      roadNetwork.logPathInfo(path);
    }
    
    return path;
  }

  private getTrafficDensity(hour: number): number {
    // 시간대별 교통 밀도 (0-1)
    if (hour >= 7 && hour <= 9) return 0.9; // 출근시간
    if (hour >= 12 && hour <= 13) return 0.6; // 점심시간
    if (hour >= 17 && hour <= 19) return 0.8; // 퇴근시간
    if (hour >= 22 || hour <= 5) return 0.2; // 심야시간
    return 0.4; // 평상시간
  }

  // Public getters
  public getVehicles(): Vehicle[] {
    return [...this.vehicles];
  }

  public getSlots(): ParkingSlot[] {
    return [...this.slots];
  }

  public getCurrentTime(): Date {
    return new Date(this.currentTime);
  }

  public isSimulationRunning(): boolean {
    return this.isRunning;
  }
}