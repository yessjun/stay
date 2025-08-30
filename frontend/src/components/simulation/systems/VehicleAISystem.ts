// 차량 AI 시스템 - 경로 탐색, 신호 준수, 충돌 회피
import { Vehicle, Coordinate } from '@/types/vehicle';

export interface VehicleAI {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  acceleration: { x: number; y: number };
  destination: Coordinate;
  currentLane: number;
  targetLane: number;
  currentRoad: 'main' | 'cross' | 'intersection';
  route: RouteSegment[];
  behavior: 'normal' | 'aggressive' | 'cautious';
  steeringAngle: number;
  speed: number;
  maxSpeed: number;
  isChangingLane: boolean;
  isTurning: boolean;
  waitingAtSignal: boolean;
}

interface RouteSegment {
  road: string;
  lane: number;
  action: 'straight' | 'left' | 'right' | 'stop';
  distance: number;
}

export class VehicleAISystem {
  private vehicles: Map<string, VehicleAI>;
  private safeDistance: number = 30; // 안전 거리 (픽셀)
  private reactionTime: number = 0.5; // 반응 시간 (초)
  
  constructor() {
    this.vehicles = new Map();
  }
  
  // 차량 등록
  public registerVehicle(vehicle: Vehicle, startPosition: { x: number; y: number }): void {
    const ai: VehicleAI = {
      id: vehicle.id,
      position: startPosition,
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      destination: { lat: 0, lng: 0 }, // 임시 목적지
      currentLane: Math.floor(Math.random() * 8),
      targetLane: Math.floor(Math.random() * 8),
      currentRoad: 'main',
      route: this.generateRandomRoute(),
      behavior: this.assignBehavior(),
      steeringAngle: 0,
      speed: 0,
      maxSpeed: this.getMaxSpeed(vehicle),
      isChangingLane: false,
      isTurning: false,
      waitingAtSignal: false
    };
    
    this.vehicles.set(vehicle.id, ai);
  }
  
  // 행동 패턴 할당
  private assignBehavior(): 'normal' | 'aggressive' | 'cautious' {
    const rand = Math.random();
    if (rand < 0.2) return 'aggressive';
    if (rand < 0.8) return 'normal';
    return 'cautious';
  }
  
  // 최대 속도 설정
  private getMaxSpeed(vehicle: Vehicle): number {
    // 상태에 따른 최대 속도 (km/h -> 픽셀/초)
    if (vehicle.status === 'parked') return 0;
    if (vehicle.battery < 20) return 30;
    return 60;
  }
  
  // 랜덤 경로 생성
  private generateRandomRoute(): RouteSegment[] {
    const actions = ['straight', 'left', 'right'] as const;
    return Array.from({ length: 5 }).map(() => ({
      road: Math.random() > 0.5 ? 'main' : 'cross',
      lane: Math.floor(Math.random() * 4),
      action: actions[Math.floor(Math.random() * actions.length)],
      distance: 100 + Math.random() * 200
    }));
  }
  
  // 차량 업데이트
  public updateVehicle(vehicleId: string, deltaTime: number, trafficSignalState: string): void {
    const ai = this.vehicles.get(vehicleId);
    if (!ai) return;
    
    // 1. 주변 차량 감지
    const nearbyVehicles = this.detectNearbyVehicles(ai);
    
    // 2. 신호등 확인
    const shouldStop = this.checkTrafficSignal(ai, trafficSignalState);
    
    // 3. 가속도 계산
    this.calculateAcceleration(ai, nearbyVehicles, shouldStop);
    
    // 4. 속도 업데이트
    this.updateVelocity(ai, deltaTime);
    
    // 5. 위치 업데이트
    this.updatePosition(ai, deltaTime);
    
    // 6. 차선 변경 처리
    if (ai.isChangingLane) {
      this.handleLaneChange(ai, deltaTime);
    }
    
    // 7. 회전 처리
    if (ai.isTurning) {
      this.handleTurn(ai, deltaTime);
    }
  }
  
  // 주변 차량 감지
  private detectNearbyVehicles(ai: VehicleAI): VehicleAI[] {
    const nearby: VehicleAI[] = [];
    
    this.vehicles.forEach((other, id) => {
      if (id === ai.id) return;
      
      const distance = this.calculateDistance(ai.position, other.position);
      if (distance < this.safeDistance * 3) {
        nearby.push(other);
      }
    });
    
    return nearby;
  }
  
  // 거리 계산
  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // 신호등 확인
  private checkTrafficSignal(ai: VehicleAI, signalState: string): boolean {
    // 교차로 근처인지 확인
    const nearIntersection = this.isNearIntersection(ai.position);
    
    if (nearIntersection && signalState === 'red') {
      ai.waitingAtSignal = true;
      return true;
    }
    
    ai.waitingAtSignal = false;
    return false;
  }
  
  // 교차로 근처 확인
  private isNearIntersection(position: { x: number; y: number }): boolean {
    const intersectionX = 500;
    const intersectionY = 200;
    const threshold = 50;
    
    return Math.abs(position.x - intersectionX) < threshold && 
           Math.abs(position.y - intersectionY) < threshold;
  }
  
  // 가속도 계산
  private calculateAcceleration(ai: VehicleAI, nearbyVehicles: VehicleAI[], shouldStop: boolean): void {
    // 기본 가속도
    let targetAccel = { x: 0, y: 0 };
    
    // 정지해야 하는 경우
    if (shouldStop) {
      targetAccel = this.calculateBrakingAcceleration(ai);
    }
    // 앞차가 있는 경우
    else if (nearbyVehicles.length > 0) {
      const frontVehicle = this.findFrontVehicle(ai, nearbyVehicles);
      if (frontVehicle) {
        targetAccel = this.calculateFollowingAcceleration(ai, frontVehicle);
      }
    }
    // 자유 주행
    else {
      targetAccel = this.calculateCruisingAcceleration(ai);
    }
    
    // 행동 패턴에 따른 조정
    this.adjustForBehavior(ai, targetAccel);
    
    ai.acceleration = targetAccel;
  }
  
  // 제동 가속도
  private calculateBrakingAcceleration(ai: VehicleAI): { x: number; y: number } {
    const brakingForce = -5; // m/s^2
    const direction = this.normalizeVector(ai.velocity);
    return {
      x: direction.x * brakingForce,
      y: direction.y * brakingForce
    };
  }
  
  // 추종 가속도
  private calculateFollowingAcceleration(ai: VehicleAI, frontVehicle: VehicleAI): { x: number; y: number } {
    const distance = this.calculateDistance(ai.position, frontVehicle.position);
    const relativeSpeed = ai.speed - frontVehicle.speed;
    
    // IDM (Intelligent Driver Model)
    const desiredDistance = this.safeDistance + ai.speed * this.reactionTime;
    const accel = 2 * (1 - Math.pow(ai.speed / ai.maxSpeed, 4) - Math.pow(desiredDistance / distance, 2));
    
    const direction = this.normalizeVector(ai.velocity);
    return {
      x: direction.x * accel,
      y: direction.y * accel
    };
  }
  
  // 순항 가속도
  private calculateCruisingAcceleration(ai: VehicleAI): { x: number; y: number } {
    const targetSpeed = ai.maxSpeed * 0.8; // 목표 속도
    const speedDiff = targetSpeed - ai.speed;
    const accel = Math.min(2, speedDiff * 0.5);
    
    // 현재 도로 방향에 따른 가속
    if (ai.currentRoad === 'main') {
      return { x: 0, y: accel };
    } else {
      return { x: accel, y: 0 };
    }
  }
  
  // 앞차 찾기
  private findFrontVehicle(ai: VehicleAI, nearbyVehicles: VehicleAI[]): VehicleAI | null {
    let frontVehicle: VehicleAI | null = null;
    let minDistance = Infinity;
    
    nearbyVehicles.forEach(other => {
      // 같은 차선이고 앞에 있는 차량
      if (other.currentLane === ai.currentLane) {
        const isInFront = ai.currentRoad === 'main' 
          ? other.position.y > ai.position.y
          : other.position.x > ai.position.x;
        
        if (isInFront) {
          const distance = this.calculateDistance(ai.position, other.position);
          if (distance < minDistance) {
            minDistance = distance;
            frontVehicle = other;
          }
        }
      }
    });
    
    return frontVehicle;
  }
  
  // 벡터 정규화
  private normalizeVector(vector: { x: number; y: number }): { x: number; y: number } {
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (magnitude === 0) return { x: 0, y: 0 };
    return {
      x: vector.x / magnitude,
      y: vector.y / magnitude
    };
  }
  
  // 행동 패턴 조정
  private adjustForBehavior(ai: VehicleAI, accel: { x: number; y: number }): void {
    switch (ai.behavior) {
      case 'aggressive':
        accel.x *= 1.3;
        accel.y *= 1.3;
        break;
      case 'cautious':
        accel.x *= 0.7;
        accel.y *= 0.7;
        break;
    }
  }
  
  // 속도 업데이트
  private updateVelocity(ai: VehicleAI, deltaTime: number): void {
    ai.velocity.x += ai.acceleration.x * deltaTime;
    ai.velocity.y += ai.acceleration.y * deltaTime;
    
    // 속도 제한
    ai.speed = Math.sqrt(ai.velocity.x * ai.velocity.x + ai.velocity.y * ai.velocity.y);
    if (ai.speed > ai.maxSpeed) {
      const scale = ai.maxSpeed / ai.speed;
      ai.velocity.x *= scale;
      ai.velocity.y *= scale;
      ai.speed = ai.maxSpeed;
    }
  }
  
  // 위치 업데이트
  private updatePosition(ai: VehicleAI, deltaTime: number): void {
    ai.position.x += ai.velocity.x * deltaTime;
    ai.position.y += ai.velocity.y * deltaTime;
    
    // 경계 확인
    this.checkBoundaries(ai);
  }
  
  // 경계 확인
  private checkBoundaries(ai: VehicleAI): void {
    // 도로 경계 내로 제한
    const maxX = 1200;
    const maxY = 1000;
    
    ai.position.x = Math.max(0, Math.min(maxX, ai.position.x));
    ai.position.y = Math.max(0, Math.min(maxY, ai.position.y));
  }
  
  // 차선 변경 처리
  private handleLaneChange(ai: VehicleAI, deltaTime: number): void {
    const targetLaneY = 70 + ai.targetLane * 25; // 차선 너비 25px
    const diff = targetLaneY - ai.position.y;
    
    if (Math.abs(diff) < 2) {
      ai.currentLane = ai.targetLane;
      ai.isChangingLane = false;
    } else {
      const changeSpeed = 30 * deltaTime;
      ai.position.y += Math.sign(diff) * changeSpeed;
    }
  }
  
  // 회전 처리
  private handleTurn(ai: VehicleAI, deltaTime: number): void {
    const turnRadius = 30; // 회전 반경
    const turnSpeed = Math.PI / 4 * deltaTime; // 회전 속도
    
    ai.steeringAngle += turnSpeed;
    
    if (ai.steeringAngle >= Math.PI / 2) {
      ai.isTurning = false;
      ai.steeringAngle = 0;
      
      // 도로 전환
      if (ai.currentRoad === 'main') {
        ai.currentRoad = 'cross';
      } else {
        ai.currentRoad = 'main';
      }
    }
  }
  
  // 차선 변경 시작
  public initiateLaneChange(vehicleId: string, targetLane: number): void {
    const ai = this.vehicles.get(vehicleId);
    if (!ai) return;
    
    // 안전 확인
    if (this.isLaneChangeSafe(ai, targetLane)) {
      ai.targetLane = targetLane;
      ai.isChangingLane = true;
    }
  }
  
  // 차선 변경 안전 확인
  private isLaneChangeSafe(ai: VehicleAI, targetLane: number): boolean {
    const targetLaneY = 70 + targetLane * 25;
    
    for (const [id, other] of this.vehicles) {
      if (id === ai.id) continue;
      
      if (Math.abs(other.position.y - targetLaneY) < 20) {
        const distance = Math.abs(other.position.x - ai.position.x);
        if (distance < this.safeDistance * 2) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  // 모든 차량 상태 반환
  public getAllVehicles(): VehicleAI[] {
    return Array.from(this.vehicles.values());
  }
  
  // 특정 차량 상태 반환
  public getVehicle(vehicleId: string): VehicleAI | undefined {
    return this.vehicles.get(vehicleId);
  }
}