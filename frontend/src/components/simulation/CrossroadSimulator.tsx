import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Vehicle } from '@/types/vehicle';
import { ParkingSlot } from '@/types/slot';
import { TrafficSignalSystem } from './systems/TrafficSignalSystem';
import { VehicleAISystem } from './systems/VehicleAISystem';
import { ParkingOrchestrator } from './systems/ParkingOrchestrator';
import { CongestionAnalyzer } from './systems/CongestionAnalyzer';
import { DynamicParkingManager } from './systems/DynamicParkingManager';

interface CrossroadSimulatorProps {
  currentTime: Date;
  speed: number;
  isRunning: boolean;
  vehicles: Vehicle[];
  slots: ParkingSlot[];
  onVehicleClick?: (vehicle: Vehicle) => void;
  onSlotClick?: (slot: ParkingSlot) => void;
  className?: string;
}

// 시뮬레이션 차량 타입
interface SimVehicle {
  id: string;
  x: number;
  y: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  angle: number;
  direction: 'N' | 'S' | 'E' | 'W';
  lane: number;
  isParked: boolean;
  parkingSlotId?: string;
  waitingForSignal: boolean;
  turningDirection?: 'left' | 'right' | 'straight';
  distanceToFront: number;
  color: string;
  waitCounter?: number;  // 대기 카운터
  toRemove?: boolean;    // 제거 플래그
  intersectionWaitTime?: number;  // 교차로 대기 시간
  priority?: number;  // 우선순위 (교착 상태 해결용)
}

// 신호등 타입
interface Signal {
  id: string;
  direction: 'N' | 'S' | 'E' | 'W';
  state: 'red' | 'yellow' | 'green';
  leftTurnState: 'red' | 'yellow' | 'green';
  timer: number;
  x: number;
  y: number;
}

// 정차공간 타입
interface ParkingSpot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'N' | 'S' | 'E' | 'W';
  occupied: boolean;
  vehicleId?: string;
  priority?: number;
}

const CrossroadSimulator: React.FC<CrossroadSimulatorProps> = ({
  currentTime,
  speed,
  isRunning,
  vehicles,
  slots,
  onVehicleClick,
  onSlotClick,
  className = ''
}) => {
  // 레이아웃 상수
  const LAYOUT = {
    width: 1600,  // 너비 확대
    height: 1000,
    mainRoad: {
      x: 700,  // 중앙 위치 조정
      width: 200,
      lanes: 8,
      laneWidth: 25
    },
    crossRoad: {
      y: 200,
      height: 100,
      lanes: 4,
      laneWidth: 25
    },
    intersection: {
      x: 700,  // 중앙 위치 조정
      y: 200,
      width: 200,
      height: 100
    }
  };

  // 상태
  const [simVehicles, setSimVehicles] = useState<SimVehicle[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [congestionLevel, setCongestionLevel] = useState(0);

  // 시스템 참조
  const trafficSystemRef = useRef<TrafficSignalSystem>();
  const vehicleAIRef = useRef<VehicleAISystem>();
  const parkingOrchestratorRef = useRef<ParkingOrchestrator>();
  const congestionAnalyzerRef = useRef<CongestionAnalyzer>();
  const parkingManagerRef = useRef<DynamicParkingManager>();
  const lastUpdateRef = useRef<number>(Date.now());
  const vehicleCounterRef = useRef<number>(100); // 100부터 시작하여 중복 방지

  // 초기화
  useEffect(() => {
    // 시스템 초기화
    trafficSystemRef.current = new TrafficSignalSystem();
    vehicleAIRef.current = new VehicleAISystem();
    parkingOrchestratorRef.current = new ParkingOrchestrator();
    congestionAnalyzerRef.current = new CongestionAnalyzer();
    parkingManagerRef.current = new DynamicParkingManager();

    // 신호등 초기화 (교차로 각 모서리에 균일하게 배치)
    const initialSignals: Signal[] = [
      { id: 'N', direction: 'N', state: 'green', leftTurnState: 'red', timer: 20, x: 660, y: 100 },  // 북쪽 신호 (왼쪽 위)
      { id: 'S', direction: 'S', state: 'green', leftTurnState: 'red', timer: 20, x: 915, y: 315 },  // 남쪽 신호 (오른쪽 아래)
      { id: 'E', direction: 'E', state: 'red', leftTurnState: 'red', timer: 20, x: 915, y: 100 },     // 동쪽 신호 (오른쪽 위)
      { id: 'W', direction: 'W', state: 'red', leftTurnState: 'red', timer: 20, x: 660, y: 315 }      // 서쪽 신호 (왼쪽 아래)
    ];
    setSignals(initialSignals);

    // 정차공간 초기화 (비어있는 상태로 시작 - 동적 할당)
    setParkingSpots([]);

    // 초기 차량 생성 (간격을 두고 배치)
    const initialVehicles: SimVehicle[] = [];
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    
    // 메인 도로 차량 (70%)
    for (let i = 0; i < 10; i++) { // 초기 차량 수 감소
      const direction = i % 2 === 0 ? 'N' : 'S';
      let x, y, angle, lane;
      
      if (direction === 'N') {
        // 북쪽으로 향하는 차량 (남쪽에서 시작, 우측 차선)
        const lanes = [4, 5, 6, 7]; // 모든 우측 차선 사용 가능
        lane = lanes[i % lanes.length];
        x = LAYOUT.mainRoad.x + lane * LAYOUT.mainRoad.laneWidth + 12;
        y = LAYOUT.height - 100 - (i * 150); // 간격 증가
        angle = 0;
      } else {
        // 남쪽으로 향하는 차량 (북쪽에서 시작, 우측 차선)
        const lanes = [0, 1, 2, 3]; // 모든 우측 차선 사용 가능
        lane = lanes[i % lanes.length];
        x = LAYOUT.mainRoad.x + lane * LAYOUT.mainRoad.laneWidth + 12;
        y = 100 + (i * 150); // 간격 증가
        angle = 180;
      }
      
      initialVehicles.push({
        id: `v${i}`,
        x,
        y,
        speed: 30 + Math.random() * 20,
        maxSpeed: 60 + Math.random() * 20,
        acceleration: 0,
        angle,
        direction,
        lane,
        isParked: false,
        waitingForSignal: false,
        turningDirection: Math.random() < 0.8 ? 'straight' : Math.random() < 0.5 ? 'left' : 'right',
        distanceToFront: 100,
        color: colors[i % colors.length]
      });
    }
    
    // 교차 도로 차량 (30%)
    for (let i = 10; i < 15; i++) { // 수정된 인덱스
      const direction = i % 2 === 0 ? 'E' : 'W';
      let x, y, angle, lane;
      
      if (direction === 'E') {
        // 동쪽으로 향하는 차량 (우측통행 - 아래쪽 2개 차선 사용)
        lane = 2 + ((i - 10) % 2);
        x = 100 + ((i - 10) * 200); // 간격 증가
        y = LAYOUT.crossRoad.y + lane * LAYOUT.crossRoad.laneWidth + 12;
        angle = 90;
      } else {
        // 서쪽으로 향하는 차량 (우측통행 - 위쪽 2개 차선 사용)
        lane = (i - 10) % 2;
        x = LAYOUT.width - 100 - ((i - 10) * 200); // 간격 증가
        y = LAYOUT.crossRoad.y + lane * LAYOUT.crossRoad.laneWidth + 12;
        angle = 270;
      }
      
      initialVehicles.push({
        id: `v${i}`,
        x,
        y,
        speed: 20 + Math.random() * 20,
        maxSpeed: 50 + Math.random() * 20,
        acceleration: 0,
        angle,
        direction,
        lane,
        isParked: false,
        waitingForSignal: false,
        turningDirection: Math.random() < 0.7 ? 'straight' : Math.random() < 0.5 ? 'left' : 'right',
        distanceToFront: 100,
        color: colors[i % colors.length]
      });
    }
    
    setSimVehicles(initialVehicles);
  }, []);

  // 신호 업데이트 (시간 배속 반영)
  useEffect(() => {
    if (!trafficSystemRef.current) return;
    
    const interval = setInterval(() => {
      if (isRunning) {
        // 시간 배속에 따라 업데이트 속도 조절
        trafficSystemRef.current!.update(speed * 0.05);
        const updatedSignals = trafficSystemRef.current!.getAllSignals();
        
        setSignals(prev => prev.map(signal => {
          const updated = updatedSignals.find(s => s.id === signal.id);
          if (updated) {
            return {
              ...signal,
              state: updated.state,
              leftTurnState: updated.leftTurnState || 'red',
              timer: Math.round(updated.timer)
            };
          }
          return signal;
        }));
      }
    }, 50); // 50ms마다 업데이트
    
    return () => clearInterval(interval);
  }, [isRunning, speed]);

  // 차량 업데이트를 위한 ref 사용
  const isRunningRef = useRef(isRunning);
  const speedRef = useRef(speed);
  const signalsRef = useRef(signals);
  
  // ref 업데이트
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);
  
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  
  useEffect(() => {
    signalsRef.current = signals;
  }, [signals]);
  
  // 차량 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRunningRef.current) return; // ref 사용
      
      const deltaTime = 0.1; // 100ms 고정
      
      setSimVehicles(prev => {
        // 새 차량 추가 (확률적으로)
        let newVehicles = [...prev];
        
        if (Math.random() < 0.05 && newVehicles.length < 80) { // 최대 차량 수 80으로 증가, 생성 확률도 증가
          // 70% 확률로 메인 도로, 30% 확률로 교차 도로
          const isMainRoad = Math.random() < 0.7;
          const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
          let direction: 'N' | 'S' | 'E' | 'W';
          let x, y, angle, lane;
          
          if (isMainRoad) {
            // 메인 도로 (남북)
            direction = Math.random() < 0.5 ? 'N' : 'S';
            
            if (direction === 'N') {
              // 북쪽으로 가는 차량 (남쪽에서 시작) - 모든 우측 차선 사용
              const laneOptions = [4, 5, 6, 7]; // 모든 차선 사용 가능
              lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
              x = LAYOUT.mainRoad.x + lane * LAYOUT.mainRoad.laneWidth + 12;
              y = LAYOUT.height + 50 + Math.random() * 100; // 시작 위치 다양화
              angle = 0;
            } else {
              // 남쪽으로 가는 차량 (북쪽에서 시작) - 모든 우측 차선 사용
              const laneOptions = [0, 1, 2, 3]; // 모든 차선 사용 가능
              lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
              x = LAYOUT.mainRoad.x + lane * LAYOUT.mainRoad.laneWidth + 12;
              y = -50 - Math.random() * 100; // 시작 위치 다양화
              angle = 180;
            }
          } else {
            // 교차 도로 (동서)
            direction = Math.random() < 0.5 ? 'E' : 'W';
            
            if (direction === 'E') {
              // 동쪽으로 가는 차량 (서쪽에서 시작) - 우측통행: 아래쪽 2개 차선
              const laneOptions = [2, 3];
              lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
              x = -50 - Math.random() * 100; // 시작 위치 다양화
              y = LAYOUT.crossRoad.y + lane * LAYOUT.crossRoad.laneWidth + 12;
              angle = 90;
            } else {
              // 서쪽으로 가는 차량 (동쪽에서 시작) - 우측통행: 위쪽 2개 차선
              const laneOptions = [0, 1];
              lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
              x = LAYOUT.width + 50 + Math.random() * 100; // 시작 위치 다양화
              y = LAYOUT.crossRoad.y + lane * LAYOUT.crossRoad.laneWidth + 12;
              angle = 270;
            }
          }
          
          // 새 차량 생성 위치에 충분한 공간이 있는지 확인
          let canSpawn = true;
          const minSpawnDistance = 80; // 최소 생성 거리
          
          for (const existing of newVehicles) {
            const dx = existing.x - x;
            const dy = existing.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 같은 차선이거나 인접 차선에 있는 차량과의 거리 확인
            if (distance < minSpawnDistance) {
              // 방향도 고려
              const angleDiff = Math.abs(existing.angle - angle);
              if (angleDiff < 45 || angleDiff > 315) {
                canSpawn = false;
                break;
              }
            }
          }
          
          const newId = `v${vehicleCounterRef.current++}`;
          // ID 중복 체크 및 안전 거리 확인
          if (canSpawn && !newVehicles.find(v => v.id === newId)) {
            newVehicles.push({
              id: newId,
              x,
              y,
              speed: isMainRoad ? 30 : 20, // 초기 속도를 낮춤
              maxSpeed: isMainRoad ? (60 + Math.random() * 20) : (50 + Math.random() * 20),
              acceleration: 0,
              angle,
              direction,
              lane,
              isParked: false,
              waitingForSignal: false,
              turningDirection: Math.random() < 0.6 ? 'straight' : Math.random() < 0.5 ? 'left' : 'right',
              distanceToFront: 100,
              color: colors[Math.floor(Math.random() * colors.length)]
            });
          }
        }
        
        // 차량 업데이트
        return newVehicles.map(vehicle => {
          const updated = { ...vehicle };
          
          // 주차된 차량은 움직이지 않음
          if (updated.isParked) return updated;
          
          // 정지선 위치 계산 (교차로 진입 전)
          let stopLineDistance = Infinity;
          let beforeStopLine = false;
          let passedStopLine = false;
          
          if (updated.direction === 'N') {
            const stopLineY = LAYOUT.intersection.y + LAYOUT.intersection.height + 15;
            stopLineDistance = updated.y - stopLineY;
            beforeStopLine = updated.y > stopLineY && updated.y < stopLineY + 80; // 정지선 전
            passedStopLine = updated.y < stopLineY; // 정지선 통과
          } else if (updated.direction === 'S') {
            const stopLineY = LAYOUT.intersection.y - 15;
            stopLineDistance = stopLineY - updated.y;
            beforeStopLine = updated.y < stopLineY && updated.y > stopLineY - 80;
            passedStopLine = updated.y > stopLineY;
          } else if (updated.direction === 'E') {
            const stopLineX = LAYOUT.intersection.x - 15;
            stopLineDistance = stopLineX - updated.x;
            beforeStopLine = updated.x < stopLineX && updated.x > stopLineX - 80;
            passedStopLine = updated.x > stopLineX;
          } else if (updated.direction === 'W') {
            const stopLineX = LAYOUT.intersection.x + LAYOUT.intersection.width + 15;
            stopLineDistance = updated.x - stopLineX;
            beforeStopLine = updated.x > stopLineX && updated.x < stopLineX + 80;
            passedStopLine = updated.x < stopLineX;
          }
          
          // 교차로 꼬리물기 방지 - 교차로 내 정체 확인
          let intersectionBlocked = false;
          if (beforeStopLine && !passedStopLine) {
            // 교차로 내 같은 방향 차량들의 정체 확인
            let blockedVehiclesCount = 0;
            newVehicles.forEach(other => {
              if (other.id === vehicle.id) return;
              
              // 교차로 내부 차량 확인
              const otherInIntersection = 
                other.x > LAYOUT.intersection.x - 20 &&
                other.x < LAYOUT.intersection.x + LAYOUT.intersection.width + 20 &&
                other.y > LAYOUT.intersection.y - 20 &&
                other.y < LAYOUT.intersection.y + LAYOUT.intersection.height + 20;
              
              // 교차로 내에서 정지한 차량 수 카운트
              if (otherInIntersection && other.speed < 5) {
                blockedVehiclesCount++;
              }
            });
            
            // 교차로 내 정체 차량이 3대 이상이면 진입 금지
            if (blockedVehiclesCount >= 3) {
              intersectionBlocked = true;
            }
          }
          
          // 신호 확인 및 정지 처리 - 정지선을 통과하지 않은 경우에만
          if (beforeStopLine && !passedStopLine) {
            const signal = signalsRef.current.find(s => s.direction === updated.direction);
            
            // 교차로가 막혀있으면 신호와 관계없이 정지
            if (intersectionBlocked) {
              updated.waitingForSignal = true;
              if (stopLineDistance < 20) {
                updated.speed = 0;
              }
            } else if (signal) {
              // 좌회전 차량
              if (updated.turningDirection === 'left') {
                if (signal.leftTurnState === 'red' || (signal.leftTurnState === 'yellow' && stopLineDistance > 30)) {
                  updated.waitingForSignal = true;
                  if (stopLineDistance < 15) {
                    updated.speed = 0;
                  }
                } else {
                  updated.waitingForSignal = false;
                }
              }
              // 직진 및 우회전 차량
              else {
                if (signal.state === 'red' || (signal.state === 'yellow' && stopLineDistance > 30)) {
                  updated.waitingForSignal = true;
                  if (stopLineDistance < 15) {
                    updated.speed = 0;
                  }
                } else {
                  updated.waitingForSignal = false;
                }
              }
            } else {
              updated.waitingForSignal = false;
            }
          } else {
            // 정지선을 통과했거나 정지선에서 멀리 있으면 신호 무시
            updated.waitingForSignal = false;
          }
          
          // 교차로 내부인지 확인 (회전용)
          const inIntersection = 
            updated.x > LAYOUT.intersection.x && 
            updated.x < LAYOUT.intersection.x + LAYOUT.intersection.width &&
            updated.y > LAYOUT.intersection.y && 
            updated.y < LAYOUT.intersection.y + LAYOUT.intersection.height;
          
          // 충돌 방지 시스템 - 더 정밀한 거리 계산
          updated.distanceToFront = 1000;
          let frontVehicle: typeof vehicle | null = null;
          let closestSideDistance = 1000;
          
          newVehicles.forEach(other => {
            if (other.id === vehicle.id || other.isParked) return;
            
            const dx = other.x - vehicle.x;
            const dy = other.y - vehicle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 정확한 차선 위치 계산
            const laneWidth = 25;
            const vehicleLength = 20;
            const vehicleWidth = 10;
            
            // 같은 방향으로 이동하는 차량인지 확인
            const angleDiff = Math.abs(other.angle - vehicle.angle);
            const sameDirection = angleDiff < 30 || angleDiff > 330;
            
            // 차선 위치 비교 (더 정밀하게)
            let lateralDistance = 0;
            let longitudinalDistance = 0;
            
            if (vehicle.direction === 'N' || vehicle.direction === 'S') {
              lateralDistance = Math.abs(dx);
              longitudinalDistance = Math.abs(dy);
            } else {
              lateralDistance = Math.abs(dy);
              longitudinalDistance = Math.abs(dx);
            }
            
            const sameLane = lateralDistance < laneWidth * 0.8;
            const adjacentLane = lateralDistance < laneWidth * 1.8;
            
            // 앞차 감지 (같은 차선)
            if (sameLane && sameDirection) {
              let isInFront = false;
              
              if (vehicle.direction === 'N') {
                isInFront = other.y < vehicle.y && other.y > vehicle.y - 150;
              } else if (vehicle.direction === 'S') {
                isInFront = other.y > vehicle.y && other.y < vehicle.y + 150;
              } else if (vehicle.direction === 'E') {
                isInFront = other.x > vehicle.x && other.x < vehicle.x + 150;
              } else if (vehicle.direction === 'W') {
                isInFront = other.x < vehicle.x && other.x > vehicle.x - 150;
              }
              
              if (isInFront && distance < updated.distanceToFront) {
                updated.distanceToFront = distance;
                frontVehicle = other;
              }
            }
            
            // 인접 차선 차량 감지 (차선 변경 시 충돌 방지)
            if (adjacentLane && !sameLane && distance < 50) {
              closestSideDistance = Math.min(closestSideDistance, distance);
            }
          });
          
          // 적응형 안전거리 계산
          const reactionTime = 1.0; // 반응 시간 (초)
          const vehicleLength = 20;
          const minSafeDistance = 25 + vehicleLength; // 최소 안전거리 (차량 길이 포함)
          const dynamicSafeDistance = Math.max(
            minSafeDistance,
            updated.speed * reactionTime + vehicleLength * 2
          );
          
          // 속도 조절 로직 개선
          if (updated.waitingForSignal) {
            // 신호 대기 - 완전 정지
            updated.acceleration = -80;
            updated.speed = Math.max(0, updated.speed + updated.acceleration * deltaTime);
          } else if (updated.distanceToFront < minSafeDistance) {
            // 충돌 위험 - 긴급 제동
            updated.acceleration = -100;
            updated.speed = Math.max(0, updated.speed + updated.acceleration * deltaTime);
            
            // 너무 가까우면 완전 정지
            if (updated.distanceToFront < vehicleLength * 1.5) {
              updated.speed = 0;
            }
          } else if (updated.distanceToFront < dynamicSafeDistance) {
            // 안전거리 미달 - 앞차에 맞춰 속도 조절
            if (frontVehicle) {
              const relativeSpeed = updated.speed - frontVehicle.speed;
              const timeToCollision = updated.distanceToFront / Math.max(1, relativeSpeed);
              
              if (timeToCollision < reactionTime * 2) {
                // 충돌 임박 - 강한 제동
                updated.acceleration = -40 - relativeSpeed * 2;
              } else {
                // 부드러운 속도 매칭
                const targetSpeed = frontVehicle.speed * 0.95;
                const speedError = updated.speed - targetSpeed;
                updated.acceleration = -speedError * 3;
              }
              
              updated.speed = Math.max(0, Math.min(frontVehicle.speed, updated.speed + updated.acceleration * deltaTime));
            } else {
              // 앞차 정보 없음 - 안전 감속
              updated.acceleration = -15;
              updated.speed = Math.max(20, updated.speed + updated.acceleration * deltaTime);
            }
          } else if (updated.distanceToFront < dynamicSafeDistance * 2) {
            // 적정 거리 - 속도 조절
            if (frontVehicle && frontVehicle.speed < updated.speed) {
              // 앞차가 느림 - 점진적 감속
              updated.acceleration = -5;
              updated.speed = Math.max(frontVehicle.speed, updated.speed + updated.acceleration * deltaTime);
            } else {
              // 속도 유지 또는 약간 가속
              updated.acceleration = 5;
              updated.speed = Math.min(updated.maxSpeed * 0.8, updated.speed + updated.acceleration * deltaTime);
            }
          } else {
            // 충분한 거리 - 목표 속도까지 가속
            const targetSpeed = updated.maxSpeed;
            const speedError = targetSpeed - updated.speed;
            updated.acceleration = Math.min(20, speedError * 2);
            updated.speed = Math.min(targetSpeed, updated.speed + updated.acceleration * deltaTime);
          }
          
          // 인접 차선 차량과의 안전 확보
          if (closestSideDistance < 30) {
            // 옆 차량이 너무 가까움 - 속도 감소
            updated.speed = Math.min(updated.speed, 30);
          }
          
          // 위치 업데이트 전 예상 위치 계산
          const displacement = updated.speed * deltaTime * speedRef.current * 0.3;
          let newX = updated.x;
          let newY = updated.y;
          
          // 예상 위치 계산
          if (updated.direction === 'N') {
            newY = updated.y - displacement;
          } else if (updated.direction === 'S') {
            newY = updated.y + displacement;
          } else if (updated.direction === 'E') {
            newX = updated.x + displacement;
          } else if (updated.direction === 'W') {
            newX = updated.x - displacement;
          }
          
          // 예상 위치에서 충돌 검사
          let willCollide = false;
          newVehicles.forEach(other => {
            if (other.id === vehicle.id || other.isParked) return;
            
            const dx = other.x - newX;
            const dy = other.y - newY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 충돌 임계값 (차량 크기 고려)
            if (distance < 25) {
              willCollide = true;
            }
          });
          
          // 충돌 예상 시 정지
          if (willCollide) {
            updated.speed = 0;
            updated.acceleration = 0;
          } else {
            // 안전하면 위치 업데이트
            updated.x = newX;
            updated.y = newY;
          }
          
          // 교차로 내 대기 시간 추적 및 교착 상태 감지
          if (inIntersection) {
            // 교차로 대기 시간 증가
            if (!updated.intersectionWaitTime) {
              updated.intersectionWaitTime = 0;
            }
            
            // 속도가 매우 낮으면 대기 중으로 간주
            if (updated.speed < 5) {
              updated.intersectionWaitTime += deltaTime;
            } else {
              updated.intersectionWaitTime = 0;
            }
            
            // 교착 상태 감지 (교차로에서 2초 이상 정체)
            if (updated.intersectionWaitTime > 2) {
              // 우선순위 할당 (방향과 대기 시간 기반)
              if (!updated.priority) {
                // 북->남, 남->북이 우선 (주도로)
                if (updated.direction === 'N' || updated.direction === 'S') {
                  updated.priority = 100 + updated.intersectionWaitTime;
                } else {
                  updated.priority = 50 + updated.intersectionWaitTime;
                }
              }
              
              // 교착 상태 해결 로직
              let shouldYield = false;
              newVehicles.forEach(other => {
                if (other.id === vehicle.id || other.isParked) return;
                
                // 다른 차량도 교차로 내에 있는지 확인
                const otherInIntersection = 
                  other.x > LAYOUT.intersection.x &&
                  other.x < LAYOUT.intersection.x + LAYOUT.intersection.width &&
                  other.y > LAYOUT.intersection.y &&
                  other.y < LAYOUT.intersection.y + LAYOUT.intersection.height;
                
                if (otherInIntersection) {
                  const dx = other.x - updated.x;
                  const dy = other.y - updated.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  
                  // 너무 가까운 차량이 있고
                  if (distance < 50) {
                    // 상대 차량도 정체 상태이면
                    if (other.intersectionWaitTime && other.intersectionWaitTime > 1) {
                      // 우선순위 비교
                      const otherPriority = other.priority || 0;
                      if (otherPriority > (updated.priority || 0)) {
                        shouldYield = true;
                      }
                    }
                  }
                }
              });
              
              // 양보해야 하는 경우 후진 또는 대기
              if (shouldYield) {
                // 약간 후진하여 공간 확보
                const backDistance = 5 * deltaTime;
                if (updated.direction === 'N') {
                  updated.y += backDistance;
                } else if (updated.direction === 'S') {
                  updated.y -= backDistance;
                } else if (updated.direction === 'E') {
                  updated.x -= backDistance;
                } else if (updated.direction === 'W') {
                  updated.x += backDistance;
                }
                updated.speed = 0;
              } else if (updated.intersectionWaitTime > 5) {
                // 5초 이상 대기 시 강제 진행
                updated.speed = Math.min(30, updated.maxSpeed * 0.5);
                updated.priority = 1000; // 최고 우선순위
              }
            }
          } else {
            // 교차로 밖에서는 대기 시간 초기화
            updated.intersectionWaitTime = 0;
            updated.priority = undefined;
          }
          
          // 교차로에서 회전 처리
          if (inIntersection && updated.turningDirection !== 'straight' && !updated.waitingForSignal) {
            const intersectionCenterX = LAYOUT.intersection.x + 100;
            const intersectionCenterY = LAYOUT.intersection.y + 50;
            
            // 교차로 내 다른 차량과의 거리 확인
            let canTurn = true;
            newVehicles.forEach(other => {
              if (other.id === vehicle.id || other.isParked) return;
              
              // 교차로 내 차량인지 확인
              const otherInIntersection = 
                other.x > LAYOUT.intersection.x &&
                other.x < LAYOUT.intersection.x + LAYOUT.intersection.width &&
                other.y > LAYOUT.intersection.y &&
                other.y < LAYOUT.intersection.y + LAYOUT.intersection.height;
              
              if (otherInIntersection) {
                const dx = other.x - updated.x;
                const dy = other.y - updated.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // 교차로 내에서는 더 큰 안전거리 필요 (교착 상태 고려)
                if (distance < 40) {
                  // 상대 차량도 오래 대기 중이면 조금 더 여유 있게 판단
                  if (other.intersectionWaitTime && other.intersectionWaitTime > 2) {
                    if (distance < 30) {
                      canTurn = false;
                    }
                  } else {
                    canTurn = false;
                  }
                }
              }
            });
            
            // 안전하지 않으면 속도 감소 (교착 상태 방지)
            if (!canTurn) {
              // 대기 시간이 길면 천천히라도 진행
              if (updated.intersectionWaitTime && updated.intersectionWaitTime > 3) {
                updated.speed = Math.max(10, updated.speed * 0.7);
              } else {
                updated.speed = Math.max(5, updated.speed * 0.5);
              }
            }
            
            // 회전 처리 (올바른 차선에서만 회전 가능)
            let canMakeTurn = false;
            
            // 좌회전은 가장 왼쪽 차선에서만
            if (updated.turningDirection === 'left') {
              if (updated.direction === 'N' && updated.lane === 4) canMakeTurn = true; // 북쪽 방향 최좌측
              else if (updated.direction === 'S' && updated.lane === 3) canMakeTurn = true; // 남쪽 방향 최좌측
              else if (updated.direction === 'E' && updated.lane === 2) canMakeTurn = true; // 동쪽 방향 최좌측
              else if (updated.direction === 'W' && updated.lane === 1) canMakeTurn = true; // 서쪽 방향 최좌측
            }
            // 우회전은 가장 오른쪽 차선에서만
            else if (updated.turningDirection === 'right') {
              if (updated.direction === 'N' && updated.lane === 7) canMakeTurn = true; // 북쪽 방향 최우측
              else if (updated.direction === 'S' && updated.lane === 0) canMakeTurn = true; // 남쪽 방향 최우측
              else if (updated.direction === 'E' && updated.lane === 3) canMakeTurn = true; // 동쪽 방향 최우측
              else if (updated.direction === 'W' && updated.lane === 0) canMakeTurn = true; // 서쪽 방향 최우측
            }
            
            // 회전 가능한 차선에서만 회전 처리
            if (updated.turningDirection === 'left' && canMakeTurn && (canTurn || updated.speed < 20)) {
              if (updated.direction === 'N' && updated.y < intersectionCenterY) {
                // 북쪽에서 왼쪽으로 (0 -> 270)
                updated.angle = (updated.angle - 2 + 360) % 360;
                if (updated.angle <= 272 && updated.angle >= 268) {
                  updated.angle = 270;
                  updated.direction = 'W';
                  updated.turningDirection = 'straight'; // 회전 완료
                  // 서쪽 방향 우측통행 차선으로 진입 (차선 0 또는 1)
                  updated.lane = 1;
                  updated.x = intersectionCenterX - 50;
                  updated.y = LAYOUT.crossRoad.y + updated.lane * LAYOUT.crossRoad.laneWidth + 12;
                }
              } else if (updated.direction === 'S' && updated.y > intersectionCenterY) {
                // 남쪽에서 왼쪽으로 (180 -> 90)
                updated.angle = (updated.angle - 2 + 360) % 360;
                if (updated.angle <= 92 && updated.angle >= 88) {
                  updated.angle = 90;
                  updated.direction = 'E';
                  updated.turningDirection = 'straight';
                  // 동쪽 방향 우측통행 차선으로 진입 (차선 2 또는 3)
                  updated.lane = 2;
                  updated.x = intersectionCenterX + 50;
                  updated.y = LAYOUT.crossRoad.y + updated.lane * LAYOUT.crossRoad.laneWidth + 12;
                }
              } else if (updated.direction === 'E' && updated.x > intersectionCenterX) {
                // 동쪽에서 왼쪽으로 (90 -> 0)
                updated.angle = (updated.angle - 2 + 360) % 360;
                if (updated.angle <= 2 || updated.angle >= 358) {
                  updated.angle = 0;
                  updated.direction = 'N';
                  updated.turningDirection = 'straight';
                  // 북쪽 방향 우측통행 차선으로 진입 (차선 4, 5, 6)
                  updated.lane = 5;
                  updated.x = LAYOUT.mainRoad.x + updated.lane * LAYOUT.mainRoad.laneWidth + 12;
                  updated.y = intersectionCenterY - 50;
                }
              } else if (updated.direction === 'W' && updated.x < intersectionCenterX) {
                // 서쪽에서 왼쪽으로 (270 -> 180)
                updated.angle = (updated.angle - 2 + 360) % 360;
                if (updated.angle <= 182 && updated.angle >= 178) {
                  updated.angle = 180;
                  updated.direction = 'S';
                  updated.turningDirection = 'straight';
                  // 남쪽 방향 우측통행 차선으로 진입 (차선 1, 2, 3)
                  updated.lane = 2;
                  updated.x = LAYOUT.mainRoad.x + updated.lane * LAYOUT.mainRoad.laneWidth + 12;
                  updated.y = intersectionCenterY + 50;
                }
              }
            } else if (updated.turningDirection === 'right' && canMakeTurn && (canTurn || updated.speed < 20)) {
              if (updated.direction === 'N' && updated.y < intersectionCenterY) {
                // 북쪽에서 오른쪽으로 (0 -> 90)
                updated.angle = (updated.angle + 2) % 360;
                if (updated.angle >= 88 && updated.angle <= 92) {
                  updated.angle = 90;
                  updated.direction = 'E';
                  updated.turningDirection = 'straight';
                  // 동쪽 방향 우측통행 차선으로 진입 (차선 2 또는 3)
                  updated.lane = 3;
                  updated.x = intersectionCenterX + 50;
                  updated.y = LAYOUT.crossRoad.y + updated.lane * LAYOUT.crossRoad.laneWidth + 12;
                }
              } else if (updated.direction === 'S' && updated.y > intersectionCenterY) {
                // 남쪽에서 오른쪽으로 (180 -> 270)
                updated.angle = (updated.angle + 2) % 360;
                if (updated.angle >= 268 && updated.angle <= 272) {
                  updated.angle = 270;
                  updated.direction = 'W';
                  updated.turningDirection = 'straight';
                  // 서쪽 방향 우측통행 차선으로 진입 (차선 0 또는 1)
                  updated.lane = 0;
                  updated.x = intersectionCenterX - 50;
                  updated.y = LAYOUT.crossRoad.y + updated.lane * LAYOUT.crossRoad.laneWidth + 12;
                }
              } else if (updated.direction === 'E' && updated.x > intersectionCenterX) {
                // 동쪽에서 오른쪽으로 (90 -> 180)
                updated.angle = (updated.angle + 2) % 360;
                if (updated.angle >= 178 && updated.angle <= 182) {
                  updated.angle = 180;
                  updated.direction = 'S';
                  updated.turningDirection = 'straight';
                  // 남쪽 방향 우측통행 차선으로 진입 (차선 1, 2, 3)
                  updated.lane = 3;
                  updated.x = LAYOUT.mainRoad.x + updated.lane * LAYOUT.mainRoad.laneWidth + 12;
                  updated.y = intersectionCenterY + 50;
                }
              } else if (updated.direction === 'W' && updated.x < intersectionCenterX) {
                // 서쪽에서 오른쪽으로 (270 -> 0/360)
                updated.angle = (updated.angle + 2) % 360;
                if (updated.angle >= 358 || updated.angle <= 2) {
                  updated.angle = 0;
                  updated.direction = 'N';
                  updated.turningDirection = 'straight';
                  // 북쪽 방향 우측통행 차선으로 진입 (차선 4, 5, 6)
                  updated.lane = 6;
                  updated.x = LAYOUT.mainRoad.x + updated.lane * LAYOUT.mainRoad.laneWidth + 12;
                  updated.y = intersectionCenterY - 50;
                }
              }
            }
          }
          
          // 차선 변경 로직 (교차로 밖에서만)
          if (!inIntersection && !updated.waitingForSignal) {
            // 차선 변경 필요성 판단
            let shouldChangeLane = false;
            let targetLane = updated.lane;
            
            // 교차로 접근 시 회전을 위한 차선 변경 (우선순위 높음)
            const distanceToIntersection = Math.min(
              Math.abs(updated.y - (LAYOUT.intersection.y + LAYOUT.intersection.height)),
              Math.abs(updated.y - LAYOUT.intersection.y),
              Math.abs(updated.x - (LAYOUT.intersection.x + LAYOUT.intersection.width)),
              Math.abs(updated.x - LAYOUT.intersection.x)
            );
            
            if (distanceToIntersection < 150) {
              // 좌회전 예정인데 좌회전 차선이 아닌 경우
              if (updated.turningDirection === 'left') {
                if (updated.direction === 'N' && updated.lane !== 4) {
                  targetLane = 4;
                  shouldChangeLane = true;
                } else if (updated.direction === 'S' && updated.lane !== 3) {
                  targetLane = 3;
                  shouldChangeLane = true;
                } else if (updated.direction === 'E' && updated.lane !== 2) {
                  targetLane = 2;
                  shouldChangeLane = true;
                } else if (updated.direction === 'W' && updated.lane !== 1) {
                  targetLane = 1;
                  shouldChangeLane = true;
                }
              }
              // 우회전 예정인데 우회전 차선이 아닌 경우
              else if (updated.turningDirection === 'right') {
                if (updated.direction === 'N' && updated.lane !== 7) {
                  targetLane = 7;
                  shouldChangeLane = true;
                } else if (updated.direction === 'S' && updated.lane !== 0) {
                  targetLane = 0;
                  shouldChangeLane = true;
                } else if (updated.direction === 'E' && updated.lane !== 3) {
                  targetLane = 3;
                  shouldChangeLane = true;
                } else if (updated.direction === 'W' && updated.lane !== 0) {
                  targetLane = 0;
                  shouldChangeLane = true;
                }
              }
            }
            
            // 일반적인 차선 변경 (앞차가 너무 느리거나 가까운 경우)
            if (!shouldChangeLane && Math.random() < 0.005) {
              if (updated.distanceToFront < 60 && frontVehicle && frontVehicle.speed < updated.speed * 0.7) {
                shouldChangeLane = true;
              }
            }
            
            if (shouldChangeLane) {
              // 목표 차선이 정해지지 않았으면 가능한 차선 확인
              if (targetLane === updated.lane) {
                const possibleLanes = [];
                
                if (updated.direction === 'N') {
                  // 북쪽 방향 - 차선 4, 5, 6, 7 사용
                  if (updated.lane > 4) possibleLanes.push(updated.lane - 1);
                  if (updated.lane < 7) possibleLanes.push(updated.lane + 1);
                } else if (updated.direction === 'S') {
                  // 남쪽 방향 - 차선 0, 1, 2, 3 사용
                  if (updated.lane > 0) possibleLanes.push(updated.lane - 1);
                  if (updated.lane < 3) possibleLanes.push(updated.lane + 1);
                } else if (updated.direction === 'E') {
                  // 동쪽 방향 - 차선 2, 3 사용
                  if (updated.lane > 2) possibleLanes.push(updated.lane - 1);
                  if (updated.lane < 3) possibleLanes.push(updated.lane + 1);
                } else if (updated.direction === 'W') {
                  // 서쪽 방향 - 차선 0, 1 사용
                  if (updated.lane > 0) possibleLanes.push(updated.lane - 1);
                  if (updated.lane < 1) possibleLanes.push(updated.lane + 1);
                }
                
                if (possibleLanes.length > 0) {
                  targetLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
                }
              }
              
              // 목표 차선의 안전성 확인
              let isSafe = true;
              const checkX = updated.direction === 'N' || updated.direction === 'S' 
                ? LAYOUT.mainRoad.x + targetLane * LAYOUT.mainRoad.laneWidth + 12
                : updated.x;
              const checkY = updated.direction === 'E' || updated.direction === 'W'
                ? LAYOUT.crossRoad.y + targetLane * LAYOUT.crossRoad.laneWidth + 12
                : updated.y;
              
              newVehicles.forEach(other => {
                if (other.id === vehicle.id || other.isParked) return;
                
                const dx = Math.abs(other.x - checkX);
                const dy = Math.abs(other.y - checkY);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // 목표 차선에 너무 가까운 차량이 있으면 안전하지 않음
                if (distance < 50) {
                  isSafe = false;
                }
              });
              
              if (!isSafe) {
                // 안전하지 않으면 차선 변경 취소
                targetLane = updated.lane;
              }
              
              // 차선 변경 실행
              if (targetLane !== updated.lane) {
                const laneChangeSpeed = 2 * deltaTime;
                
                if (updated.direction === 'N' || updated.direction === 'S') {
                  const targetX = LAYOUT.mainRoad.x + targetLane * LAYOUT.mainRoad.laneWidth + 12;
                  const xDiff = targetX - updated.x;
                  
                  if (Math.abs(xDiff) > 2) {
                    updated.x += Math.sign(xDiff) * Math.min(laneChangeSpeed * 50, Math.abs(xDiff));
                  } else {
                    updated.x = targetX;
                    updated.lane = targetLane;
                  }
                } else {
                  const targetY = LAYOUT.crossRoad.y + targetLane * LAYOUT.crossRoad.laneWidth + 12;
                  const yDiff = targetY - updated.y;
                  
                  if (Math.abs(yDiff) > 2) {
                    updated.y += Math.sign(yDiff) * Math.min(laneChangeSpeed * 50, Math.abs(yDiff));
                  } else {
                    updated.y = targetY;
                    updated.lane = targetLane;
                  }
                }
              }
            }
          }
          
          // 화면 경계에서 대기 시간 추적
          if (!updated.waitCounter) {
            updated.waitCounter = 0;
          }
          
          // 화면 경계 처리 (순간이동 또는 제거)
          if (updated.direction === 'N') {
            if (updated.y < -100) {
              // 반대편으로 이동 전 안전 확인
              const newY = LAYOUT.height + 100;
              let canRespawn = true;
              
              newVehicles.forEach(other => {
                if (other.id === vehicle.id) return;
                const dy = Math.abs(other.y - newY);
                const dx = Math.abs(other.x - updated.x);
                if (dy < 60 && dx < 30) {
                  canRespawn = false;
                }
              });
              
              if (canRespawn) {
                updated.y = newY;
                updated.angle = 0; // 각도 초기화 확실히
                updated.direction = 'N'; // 방향 확실히
                updated.turningDirection = Math.random() < 0.7 ? 'straight' : Math.random() < 0.5 ? 'left' : 'right';
                updated.waitCounter = 0;
              } else {
                // 대기 카운터 증가
                updated.waitCounter++;
                
                // 3초(60프레임) 이상 대기하면 제거 표시
                if (updated.waitCounter > 60) {
                  updated.toRemove = true;
                } else {
                  updated.y = -100;
                  updated.speed = 0;
                }
              }
            }
          } else if (updated.direction === 'S') {
            if (updated.y > LAYOUT.height + 100) {
              const newY = -100;
              let canRespawn = true;
              
              newVehicles.forEach(other => {
                if (other.id === vehicle.id) return;
                const dy = Math.abs(other.y - newY);
                const dx = Math.abs(other.x - updated.x);
                if (dy < 60 && dx < 30) {
                  canRespawn = false;
                }
              });
              
              if (canRespawn) {
                updated.y = newY;
                updated.angle = 180; // 각도 초기화
                updated.direction = 'S'; // 방향 확실히
                updated.turningDirection = Math.random() < 0.7 ? 'straight' : Math.random() < 0.5 ? 'left' : 'right';
                updated.waitCounter = 0;
              } else {
                updated.waitCounter++;
                if (updated.waitCounter > 60) {
                  updated.toRemove = true;
                } else {
                  updated.y = LAYOUT.height + 100;
                  updated.speed = 0;
                }
              }
            }
          } else if (updated.direction === 'E') {
            if (updated.x > LAYOUT.width + 100) {
              const newX = -100;
              let canRespawn = true;
              
              newVehicles.forEach(other => {
                if (other.id === vehicle.id) return;
                const dx = Math.abs(other.x - newX);
                const dy = Math.abs(other.y - updated.y);
                if (dx < 60 && dy < 30) {
                  canRespawn = false;
                }
              });
              
              if (canRespawn) {
                updated.x = newX;
                updated.angle = 90; // 각도 초기화
                updated.direction = 'E'; // 방향 확실히
                updated.turningDirection = Math.random() < 0.7 ? 'straight' : Math.random() < 0.5 ? 'left' : 'right';
                updated.waitCounter = 0;
              } else {
                updated.waitCounter++;
                if (updated.waitCounter > 60) {
                  updated.toRemove = true;
                } else {
                  updated.x = LAYOUT.width + 100;
                  updated.speed = 0;
                }
              }
            }
          } else if (updated.direction === 'W') {
            if (updated.x < -100) {
              const newX = LAYOUT.width + 100;
              let canRespawn = true;
              
              newVehicles.forEach(other => {
                if (other.id === vehicle.id) return;
                const dx = Math.abs(other.x - newX);
                const dy = Math.abs(other.y - updated.y);
                if (dx < 60 && dy < 30) {
                  canRespawn = false;
                }
              });
              
              if (canRespawn) {
                updated.x = newX;
                updated.angle = 270; // 각도 초기화
                updated.direction = 'W'; // 방향 확실히
                updated.turningDirection = Math.random() < 0.7 ? 'straight' : Math.random() < 0.5 ? 'left' : 'right';
                updated.waitCounter = 0;
              } else {
                updated.waitCounter++;
                if (updated.waitCounter > 60) {
                  updated.toRemove = true;
                } else {
                  updated.x = -100;
                  updated.speed = 0;
                }
              }
            }
          }
          
          // 주차 로직 (확률적으로)
          if (Math.random() < 0.001 && !updated.isParked && parkingManagerRef.current) {
            const nearestSpot = parkingManagerRef.current.findNearestAvailableSpot(updated.x, updated.y);
            if (nearestSpot) {
              updated.x = nearestSpot.x + 7;
              updated.y = nearestSpot.y + 12;
              updated.speed = 0;
              updated.isParked = true;
              updated.parkingSlotId = nearestSpot.id;
              
              // 주차 매니저에 점유 상태 업데이트
              parkingManagerRef.current.updateOccupancy(nearestSpot.id, true, updated.id);
              
              // UI 업데이트를 위해 상태도 업데이트
              setParkingSpots(prev => prev.map(spot => 
                spot.id === nearestSpot.id 
                  ? { ...spot, occupied: true, vehicleId: updated.id }
                  : spot
              ));
            }
          }
          
          // 주차 해제 (확률적으로)
          if (updated.isParked && Math.random() < 0.005) {
            updated.isParked = false;
            updated.speed = 20;
            
            // 주차 매니저에 점유 해제 업데이트
            if (updated.parkingSlotId && parkingManagerRef.current) {
              parkingManagerRef.current.updateOccupancy(updated.parkingSlotId, false);
            }
            
            // UI 업데이트를 위해 상태도 업데이트
            setParkingSpots(prev => prev.map(spot => 
              spot.id === updated.parkingSlotId 
                ? { ...spot, occupied: false, vehicleId: undefined }
                : spot
            ));
            
            updated.parkingSlotId = undefined;
          }
          
          return updated;
        }).filter(v => 
          // 제거 표시된 차량 제거
          !v.toRemove &&
          // 화면 밖으로 너무 멀리 나간 차량 제거 (대기 중인 차량은 유지)
          (v.waitCounter && v.waitCounter > 0 ? true : (
            v.x > -200 && v.x < LAYOUT.width + 200 &&
            v.y > -200 && v.y < LAYOUT.height + 200
          ))
        );
      });
      
      // 동적 주차공간 업데이트
      if (parkingManagerRef.current) {
        const updatedSpots = parkingManagerRef.current.updateParkingSpots(simVehicles);
        setParkingSpots(updatedSpots);
      }
      
      // 혼잡도 계산
      const vehiclesInIntersection = simVehicles.filter(v => 
        Math.abs(v.x - LAYOUT.intersection.x - 100) < 100 &&
        Math.abs(v.y - LAYOUT.intersection.y - 50) < 100
      ).length;
      
      setCongestionLevel(Math.min(100, (vehiclesInIntersection / 8) * 100));
    }, 50); // 50ms마다 업데이트 (더 부드러운 움직임)
    
    return () => clearInterval(interval);
  }, []); // 의존성 배열 비우기 (한 번만 설정)

  return (
    <div className={`relative w-full h-full bg-gradient-to-b from-sky-50 to-gray-100 ${className}`}>
      <svg width="100%" height="100%" viewBox={`0 0 ${LAYOUT.width} ${LAYOUT.height}`}>
        {/* 도로 배경 */}
        <rect x={0} y={0} width={LAYOUT.width} height={LAYOUT.height} fill="#E5E7EB" />
        
        {/* 메인 도로 (세로) */}
        <rect
          x={LAYOUT.mainRoad.x}
          y={0}
          width={LAYOUT.mainRoad.width}
          height={LAYOUT.height}
          fill="#374151"
        />
        
        {/* 교차 도로 (가로) */}
        <rect
          x={0}
          y={LAYOUT.crossRoad.y}
          width={LAYOUT.width}
          height={LAYOUT.crossRoad.height}
          fill="#374151"
        />
        
        {/* 차선 표시 - 메인 도로 */}
        {Array.from({ length: LAYOUT.mainRoad.lanes - 1 }).map((_, i) => (
          <line
            key={`main-lane-${i}`}
            x1={LAYOUT.mainRoad.x + (i + 1) * LAYOUT.mainRoad.laneWidth}
            y1={0}
            x2={LAYOUT.mainRoad.x + (i + 1) * LAYOUT.mainRoad.laneWidth}
            y2={LAYOUT.height}
            stroke={i === 3 ? "#FFD700" : "white"}
            strokeWidth={i === 3 ? 3 : 2}
            strokeDasharray={i === 3 ? "none" : "10 10"}
            opacity={0.5}
          />
        ))}
        
        {/* 차선 표시 - 교차 도로 */}
        {Array.from({ length: LAYOUT.crossRoad.lanes - 1 }).map((_, i) => (
          <line
            key={`cross-lane-${i}`}
            x1={0}
            y1={LAYOUT.crossRoad.y + (i + 1) * LAYOUT.crossRoad.laneWidth}
            x2={LAYOUT.width}
            y2={LAYOUT.crossRoad.y + (i + 1) * LAYOUT.crossRoad.laneWidth}
            stroke={i === 1 ? "#FFD700" : "white"}
            strokeWidth={i === 1 ? 3 : 2}
            strokeDasharray={i === 1 ? "none" : "10 10"}
            opacity={0.5}
          />
        ))}
        
        {/* 정차공간 표시 */}
        {parkingSpots.map(spot => (
          <g key={spot.id}>
            <rect
              x={spot.x}
              y={spot.y}
              width={spot.width}
              height={spot.height}
              fill={spot.occupied ? "#DC2626" : "#10B981"}
              fillOpacity={0.3}
              stroke={spot.occupied ? "#DC2626" : "#10B981"}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <text
              x={spot.x + spot.width / 2}
              y={spot.y + spot.height / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fill={spot.occupied ? "#DC2626" : "#10B981"}
              fontWeight="bold"
            >
              {spot.occupied ? "P" : "P"}
            </text>
          </g>
        ))}
        
        {/* 신호등 */}
        {signals.map(signal => (
          <g key={signal.id}>
            
            {/* 신호등 박스 - 한국식 4색 신호등 */}
            <g transform={`translate(${signal.x}, ${signal.y})`}>
              <rect x={0} y={0} width={25} height={85} fill="#1a1a1a" rx={4} />
              
              {/* 빨간불 (최상단) */}
              <circle
                cx={12.5}
                cy={12}
                r={8}
                fill={signal.state === 'red' ? '#FF0000' : '#330000'}
                opacity={signal.state === 'red' ? 1 : 0.3}
              >
                {signal.state === 'red' && (
                  <animate
                    attributeName="r"
                    values="8;9;8"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              
              {/* 노란불 (두번째) */}
              <circle
                cx={12.5}
                cy={32}
                r={8}
                fill={signal.state === 'yellow' ? '#FFD700' : '#333300'}
                opacity={signal.state === 'yellow' ? 1 : 0.3}
              >
                {signal.state === 'yellow' && (
                  <animate
                    attributeName="opacity"
                    values="1;0.6;1"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              
              {/* 좌회전 화살표 (세번째) */}
              <circle
                cx={12.5}
                cy={52}
                r={8}
                fill="#000000"
                stroke={signal.leftTurnState === 'green' ? '#00FF00' : '#003300'}
                strokeWidth={0.5}
                opacity={signal.leftTurnState === 'green' ? 1 : 0.3}
              />
              {/* 단순한 삼각형 화살표 */}
              <polygon
                points="7,52 18,47 18,57"
                fill={signal.leftTurnState === 'green' ? '#00FF00' : '#003300'}
                opacity={signal.leftTurnState === 'green' ? 1 : 0.3}
              >
                {signal.leftTurnState === 'green' && (
                  <animate
                    attributeName="opacity"
                    values="1;0.8;1"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                )}
              </polygon>
              
              {/* 초록불 (최하단) */}
              <circle
                cx={12.5}
                cy={72}
                r={8}
                fill={signal.state === 'green' ? '#00FF00' : '#003300'}
                opacity={signal.state === 'green' ? 1 : 0.3}
              >
                {signal.state === 'green' && (
                  <animate
                    attributeName="r"
                    values="8;9;8"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              
              {/* 타이머 - 방향에 따라 위치 조정 */}
              <rect 
                x={signal.direction === 'E' || signal.direction === 'S' ? 30 : -25} 
                y={35} 
                width={20} 
                height={15} 
                fill="#000" 
                rx={2} 
              />
              <text
                x={signal.direction === 'E' || signal.direction === 'S' ? 40 : -15}
                y={45}
                textAnchor="middle"
                fill={
                  signal.leftTurnState === 'green' ? '#66FF66' :
                  signal.leftTurnState === 'yellow' ? '#FFFF66' :
                  signal.state === 'green' ? '#66FF66' :
                  signal.state === 'yellow' ? '#FFFF66' : '#FF6666'
                }
                fontSize={12}
                fontWeight="bold"
                fontFamily="monospace"
              >
                {signal.timer}
              </text>
            </g>
            
            {/* 방향 표시 - 남쪽과 서쪽은 신호등 아래에 표시 */}
            <text
              x={signal.x + 12.5}
              y={signal.direction === 'S' || signal.direction === 'W' ? signal.y + 100 : signal.y - 10}
              textAnchor="middle"
              fill="#666"
              fontSize={10}
              fontWeight="bold"
            >
              {signal.direction === 'N' ? '북' : 
               signal.direction === 'S' ? '남' :
               signal.direction === 'E' ? '동' : '서'}
            </text>
          </g>
        ))}
        
        {/* 차량 */}
        {simVehicles.map(vehicle => (
          <g
            key={vehicle.id}
            transform={`translate(${vehicle.x}, ${vehicle.y}) rotate(${vehicle.angle})`}
            onClick={() => onVehicleClick?.(vehicles[0])}
            className="cursor-pointer"
          >
            {/* 차량 본체 (세로 방향으로 변경) */}
            <rect
              x={-5}
              y={-10}
              width={10}
              height={20}
              fill={vehicle.isParked ? '#6B7280' : vehicle.color}
              stroke="#000"
              strokeWidth={1}
              rx={2}
            />
            
            {/* 앞유리 */}
            {!vehicle.isParked && (
              <rect
                x={-3}
                y={-8}
                width={6}
                height={4}
                fill="#4A5568"
                opacity={0.6}
              />
            )}
            
            {/* 전조등 (앞쪽) */}
            {!vehicle.isParked && (
              <>
                <circle cx={-3} cy={-8} r={1.5} fill="#FFFF99" opacity={0.9} />
                <circle cx={3} cy={-8} r={1.5} fill="#FFFF99" opacity={0.9} />
              </>
            )}
            
            {/* 후미등 (뒤쪽) */}
            {!vehicle.isParked && (
              <>
                <circle cx={-3} cy={8} r={1.5} fill="#FF4444" opacity={0.5} />
                <circle cx={3} cy={8} r={1.5} fill="#FF4444" opacity={0.5} />
              </>
            )}
            
            {/* 속도 표시 */}
            {vehicle.speed > 0 && (
              <text
                x={0}
                y={-15}
                textAnchor="middle"
                fill="#333"
                fontSize={8}
                fontWeight="bold"
              >
                {Math.round(vehicle.speed)}
              </text>
            )}
          </g>
        ))}
        
        {/* 정지선 - 우측통행에 맞게 진입 방향에만 표시 */}
        <g>
          {/* 북쪽으로 진행하는 차량용 정지선 (남쪽에서 진입, 우측 차선) */}
          <line
            x1={LAYOUT.mainRoad.x + LAYOUT.mainRoad.width / 2 + 2}
            y1={LAYOUT.intersection.y + LAYOUT.intersection.height + 15}
            x2={LAYOUT.mainRoad.x + LAYOUT.mainRoad.width}
            y2={LAYOUT.intersection.y + LAYOUT.intersection.height + 15}
            stroke="#9CA3AF"
            strokeWidth={4}
          />
          {/* 남쪽으로 진행하는 차량용 정지선 (북쪽에서 진입, 좌측 차선) */}
          <line
            x1={LAYOUT.mainRoad.x}
            y1={LAYOUT.intersection.y - 15}
            x2={LAYOUT.mainRoad.x + LAYOUT.mainRoad.width / 2 - 2}
            y2={LAYOUT.intersection.y - 15}
            stroke="#9CA3AF"
            strokeWidth={4}
          />
          {/* 동쪽으로 진행하는 차량용 정지선 (서쪽에서 진입, 아래쪽 차선) */}
          <line
            x1={LAYOUT.intersection.x - 15}
            y1={LAYOUT.crossRoad.y + LAYOUT.crossRoad.height / 2 + 2}
            x2={LAYOUT.intersection.x - 15}
            y2={LAYOUT.crossRoad.y + LAYOUT.crossRoad.height}
            stroke="#9CA3AF"
            strokeWidth={4}
          />
          {/* 서쪽으로 진행하는 차량용 정지선 (동쪽에서 진입, 위쪽 차선) */}
          <line
            x1={LAYOUT.intersection.x + LAYOUT.intersection.width + 15}
            y1={LAYOUT.crossRoad.y}
            x2={LAYOUT.intersection.x + LAYOUT.intersection.width + 15}
            y2={LAYOUT.crossRoad.y + LAYOUT.crossRoad.height / 2 - 2}
            stroke="#9CA3AF"
            strokeWidth={4}
          />
        </g>
      </svg>
      
      {/* 정보 패널 */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
        <div className="text-sm space-y-2">
          <div className="font-semibold text-gray-700 mb-2">실시간 교통 현황</div>
          <div className="flex justify-between">
            <span>활성 차량:</span>
            <span className="font-medium">{simVehicles.filter(v => !v.isParked).length}대</span>
          </div>
          <div className="flex justify-between">
            <span>주차 차량:</span>
            <span className="font-medium">{simVehicles.filter(v => v.isParked).length}대</span>
          </div>
          <div className="flex justify-between">
            <span>혼잡도:</span>
            <span className={`font-medium ${
              congestionLevel > 70 ? 'text-red-600' : 
              congestionLevel > 40 ? 'text-yellow-600' : 'text-green-600'
            }`}>{Math.round(congestionLevel)}%</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="font-semibold text-gray-700 mb-1">동적 주차 시스템</div>
            <div className="flex justify-between">
              <span>전체 주차공간:</span>
              <span className="font-medium">{parkingSpots.length}개</span>
            </div>
            <div className="flex justify-between">
              <span>사용 가능:</span>
              <span className="font-medium text-green-600">
                {parkingSpots.filter(s => !s.occupied).length}개
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {congestionLevel > 70 ? '🔴 혼잡: 주차공간 최소화' :
               congestionLevel > 40 ? '🟡 보통: 제한적 주차 가능' :
               '🟢 한산: 주차공간 활성화'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrossroadSimulator;