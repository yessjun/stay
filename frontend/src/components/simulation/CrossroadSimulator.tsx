import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Vehicle } from '@/types/vehicle';
import { ParkingSlot } from '@/types/slot';
import { TrafficSignalSystem } from './systems/TrafficSignalSystem';
import { VehicleAISystem } from './systems/VehicleAISystem';
import { ParkingOrchestrator } from './systems/ParkingOrchestrator';
import { CongestionAnalyzer } from './systems/CongestionAnalyzer';

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
  roadSide: 'main-west' | 'main-east' | 'cross-north' | 'cross-south';
  lane: number;
  occupied: boolean;
  vehicleId?: string;
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
    width: 1200,
    height: 1000,
    mainRoad: {
      x: 500,
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
      x: 500,
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
  const lastUpdateRef = useRef<number>(Date.now());
  const vehicleCounterRef = useRef<number>(100); // 100부터 시작하여 중복 방지

  // 초기화
  useEffect(() => {
    // 시스템 초기화
    trafficSystemRef.current = new TrafficSignalSystem();
    vehicleAIRef.current = new VehicleAISystem();
    parkingOrchestratorRef.current = new ParkingOrchestrator();
    congestionAnalyzerRef.current = new CongestionAnalyzer();

    // 신호등 초기화 (교차로 바깥쪽에 배치)
    const initialSignals: Signal[] = [
      { id: 'N', direction: 'N', state: 'green', leftTurnState: 'red', timer: 20, x: 440, y: 130 },  // 북쪽 신호 (왼쪽 위)
      { id: 'S', direction: 'S', state: 'green', leftTurnState: 'red', timer: 20, x: 740, y: 330 },  // 남쪽 신호 (오른쪽 아래)
      { id: 'E', direction: 'E', state: 'red', leftTurnState: 'red', timer: 20, x: 740, y: 130 },     // 동쪽 신호 (오른쪽 위)
      { id: 'W', direction: 'W', state: 'red', leftTurnState: 'red', timer: 20, x: 440, y: 330 }      // 서쪽 신호 (왼쪽 아래)
    ];
    setSignals(initialSignals);

    // 정차공간 초기화 (도로 갓길)
    const initialParkingSpots: ParkingSpot[] = [];
    
    // 메인 도로 서쪽 갓길 (최우측 차선)
    for (let i = 0; i < 8; i++) {
      initialParkingSpots.push({
        id: `main-west-${i}`,
        x: LAYOUT.mainRoad.x + 7 * LAYOUT.mainRoad.laneWidth,
        y: 350 + i * 80,
        width: LAYOUT.mainRoad.laneWidth,
        height: 60,
        roadSide: 'main-west',
        lane: 7, // 최우측 차선
        occupied: false
      });
    }
    
    // 메인 도로 동쪽 갓길 (최우측 차선)
    for (let i = 0; i < 8; i++) {
      initialParkingSpots.push({
        id: `main-east-${i}`,
        x: LAYOUT.mainRoad.x,
        y: 350 + i * 80,
        width: LAYOUT.mainRoad.laneWidth,
        height: 60,
        roadSide: 'main-east',
        lane: 0, // 최우측 차선
        occupied: false
      });
    }
    
    setParkingSpots(initialParkingSpots);

    // 초기 차량 생성 (간격을 두고 배치)
    const initialVehicles: SimVehicle[] = [];
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    
    // 메인 도로 차량 (70%)
    for (let i = 0; i < 10; i++) { // 초기 차량 수 감소
      const direction = i % 2 === 0 ? 'N' : 'S';
      let x, y, angle, lane;
      
      if (direction === 'N') {
        // 북쪽으로 향하는 차량 (남쪽에서 시작, 우측 차선)
        const lanes = [4, 5, 6];
        lane = lanes[i % lanes.length];
        x = LAYOUT.mainRoad.x + lane * LAYOUT.mainRoad.laneWidth + 12;
        y = LAYOUT.height - 100 - (i * 150); // 간격 증가
        angle = 0;
      } else {
        // 남쪽으로 향하는 차량 (북쪽에서 시작, 우측 차선)
        const lanes = [1, 2, 3];
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
        // 동쪽으로 향하는 차량
        lane = (i - 10) % 2;
        x = 100 + ((i - 10) * 200); // 간격 증가
        y = LAYOUT.crossRoad.y + lane * LAYOUT.crossRoad.laneWidth + 12;
        angle = 90;
      } else {
        // 서쪽으로 향하는 차량
        lane = 2 + ((i - 10) % 2);
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
              // 북쪽으로 가는 차량 (남쪽에서 시작) - 우측 3개 차선 사용
              const laneOptions = [4, 5, 6]; // 차선 4, 5, 6 (7번은 정차공간)
              lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
              x = LAYOUT.mainRoad.x + lane * LAYOUT.mainRoad.laneWidth + 12;
              y = LAYOUT.height + 50 + Math.random() * 100; // 시작 위치 다양화
              angle = 0;
            } else {
              // 남쪽으로 가는 차량 (북쪽에서 시작) - 좌측 3개 차선 사용
              const laneOptions = [1, 2, 3]; // 차선 1, 2, 3 (0번은 정차공간)
              lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
              x = LAYOUT.mainRoad.x + lane * LAYOUT.mainRoad.laneWidth + 12;
              y = -50 - Math.random() * 100; // 시작 위치 다양화
              angle = 180;
            }
          } else {
            // 교차 도로 (동서)
            direction = Math.random() < 0.5 ? 'E' : 'W';
            
            if (direction === 'E') {
              // 동쪽으로 가는 차량 (서쪽에서 시작) - 상단 2개 차선
              const laneOptions = [0, 1];
              lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
              x = -50 - Math.random() * 100; // 시작 위치 다양화
              y = LAYOUT.crossRoad.y + lane * LAYOUT.crossRoad.laneWidth + 12;
              angle = 90;
            } else {
              // 서쪽으로 가는 차량 (동쪽에서 시작) - 하단 2개 차선
              const laneOptions = [2, 3];
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
              turningDirection: Math.random() < 0.75 ? 'straight' : Math.random() < 0.5 ? 'left' : 'right',
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
          let atStopLine = false;
          
          if (updated.direction === 'N') {
            const stopLineY = LAYOUT.intersection.y + LAYOUT.intersection.height + 15;
            stopLineDistance = updated.y - stopLineY;
            atStopLine = updated.y > stopLineY - 10 && updated.y < stopLineY + 40;
          } else if (updated.direction === 'S') {
            const stopLineY = LAYOUT.intersection.y - 15;
            stopLineDistance = stopLineY - updated.y;
            atStopLine = updated.y < stopLineY + 10 && updated.y > stopLineY - 40;
          } else if (updated.direction === 'E') {
            const stopLineX = LAYOUT.intersection.x - 15;
            stopLineDistance = stopLineX - updated.x;
            atStopLine = updated.x < stopLineX + 10 && updated.x > stopLineX - 40;
          } else if (updated.direction === 'W') {
            const stopLineX = LAYOUT.intersection.x + LAYOUT.intersection.width + 15;
            stopLineDistance = updated.x - stopLineX;
            atStopLine = updated.x > stopLineX - 10 && updated.x < stopLineX + 40;
          }
          
          // 신호 확인 및 정지 처리
          if (atStopLine || (stopLineDistance > 0 && stopLineDistance < 80)) {
            const signal = signalsRef.current.find(s => s.direction === updated.direction);
            if (signal) {
              // 좌회전 차량
              if (updated.turningDirection === 'left') {
                if (signal.leftTurnState === 'red' || (signal.leftTurnState === 'yellow' && stopLineDistance > 30)) {
                  updated.waitingForSignal = true;
                  if (stopLineDistance > 0 && stopLineDistance < 15) {
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
                  if (stopLineDistance > 0 && stopLineDistance < 15) {
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
          
          // 위치 업데이트 (배속 적용)
          const displacement = updated.speed * deltaTime * speedRef.current * 0.3;
          
          // 교차로에서 회전 처리
          if (inIntersection && updated.turningDirection !== 'straight' && !updated.waitingForSignal) {
            const intersectionCenterX = LAYOUT.intersection.x + 100;
            const intersectionCenterY = LAYOUT.intersection.y + 50;
            
            // 회전 애니메이션
            if (updated.turningDirection === 'left') {
              if (updated.direction === 'N' && updated.y < intersectionCenterY) {
                updated.angle -= 2;
                if (updated.angle <= -90) {
                  updated.angle = 270;
                  updated.direction = 'W';
                }
              } else if (updated.direction === 'S' && updated.y > intersectionCenterY) {
                updated.angle += 2;
                if (updated.angle >= 270) {
                  updated.angle = 90;
                  updated.direction = 'E';
                }
              } else if (updated.direction === 'E' && updated.x > intersectionCenterX) {
                updated.angle -= 2;
                if (updated.angle <= 0) {
                  updated.angle = 0;
                  updated.direction = 'N';
                }
              } else if (updated.direction === 'W' && updated.x < intersectionCenterX) {
                updated.angle += 2;
                if (updated.angle >= 360) {
                  updated.angle = 180;
                  updated.direction = 'S';
                }
              }
            } else if (updated.turningDirection === 'right') {
              if (updated.direction === 'N' && updated.y < intersectionCenterY) {
                updated.angle += 2;
                if (updated.angle >= 90) {
                  updated.angle = 90;
                  updated.direction = 'E';
                }
              } else if (updated.direction === 'S' && updated.y > intersectionCenterY) {
                updated.angle -= 2;
                if (updated.angle <= 90) {
                  updated.angle = 270;
                  updated.direction = 'W';
                }
              } else if (updated.direction === 'E' && updated.x > intersectionCenterX) {
                updated.angle += 2;
                if (updated.angle >= 180) {
                  updated.angle = 180;
                  updated.direction = 'S';
                }
              } else if (updated.direction === 'W' && updated.x < intersectionCenterX) {
                updated.angle -= 2;
                if (updated.angle <= 180) {
                  updated.angle = 0;
                  updated.direction = 'N';
                }
              }
            }
          }
          
          // 직진 이동
          if (updated.direction === 'N') {
            updated.y -= displacement;
            if (updated.y < -100) {
              updated.y = LAYOUT.height + 100;
              updated.turningDirection = Math.random() < 0.7 ? 'straight' : Math.random() < 0.5 ? 'left' : 'right';
            }
          } else if (updated.direction === 'S') {
            updated.y += displacement;
            if (updated.y > LAYOUT.height + 100) {
              updated.y = -100;
              updated.turningDirection = Math.random() < 0.7 ? 'straight' : Math.random() < 0.5 ? 'left' : 'right';
            }
          } else if (updated.direction === 'E') {
            updated.x += displacement;
            if (updated.x > LAYOUT.width + 100) {
              updated.x = -100;
              updated.turningDirection = Math.random() < 0.7 ? 'straight' : Math.random() < 0.5 ? 'left' : 'right';
            }
          } else if (updated.direction === 'W') {
            updated.x -= displacement;
            if (updated.x < -100) {
              updated.x = LAYOUT.width + 100;
              updated.turningDirection = Math.random() < 0.7 ? 'straight' : Math.random() < 0.5 ? 'left' : 'right';
            }
          }
          
          // 주차 로직 (확률적으로)
          if (Math.random() < 0.001 && !updated.isParked) {
            const availableSpots = parkingSpots.filter(spot => !spot.occupied);
            if (availableSpots.length > 0) {
              // 가장 가까운 빈 자리 찾기
              let nearestSpot = availableSpots[0];
              let minDistance = Infinity;
              
              availableSpots.forEach(spot => {
                const dist = Math.sqrt(
                  Math.pow(spot.x - updated.x, 2) + 
                  Math.pow(spot.y - updated.y, 2)
                );
                if (dist < minDistance) {
                  minDistance = dist;
                  nearestSpot = spot;
                }
              });
              
              if (minDistance < 200) {
                updated.x = nearestSpot.x + 12;
                updated.y = nearestSpot.y + 30;
                updated.speed = 0;
                updated.isParked = true;
                updated.parkingSlotId = nearestSpot.id;
                
                setParkingSpots(prev => prev.map(spot => 
                  spot.id === nearestSpot.id 
                    ? { ...spot, occupied: true, vehicleId: updated.id }
                    : spot
                ));
              }
            }
          }
          
          // 주차 해제 (확률적으로)
          if (updated.isParked && Math.random() < 0.005) {
            updated.isParked = false;
            updated.speed = 20;
            
            setParkingSpots(prev => prev.map(spot => 
              spot.id === updated.parkingSlotId 
                ? { ...spot, occupied: false, vehicleId: undefined }
                : spot
            ));
            
            updated.parkingSlotId = undefined;
          }
          
          return updated;
        }).filter(v => 
          // 화면 밖으로 너무 멀리 나간 차량 제거
          v.x > -200 && v.x < LAYOUT.width + 200 &&
          v.y > -200 && v.y < LAYOUT.height + 200
        );
      });
      
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
            
            {/* 신호등 박스 */}
            <g transform={`translate(${signal.x}, ${signal.y})`}>
              <rect x={-5} y={-5} width={55} height={70} fill="#1a1a1a" rx={4} />
              
              {/* 직진 신호 */}
              <g>
                <rect x={0} y={0} width={20} height={60} fill="#222" rx={3} />
                
                {/* 빨간불 */}
                <circle
                  cx={10}
                  cy={10}
                  r={7}
                  fill={signal.state === 'red' ? '#FF0000' : '#330000'}
                  opacity={signal.state === 'red' ? 1 : 0.3}
                >
                  {signal.state === 'red' && (
                    <animate
                      attributeName="r"
                      values="7;8;7"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
                
                {/* 노란불 */}
                <circle
                  cx={10}
                  cy={30}
                  r={7}
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
                
                {/* 초록불 */}
                <circle
                  cx={10}
                  cy={50}
                  r={7}
                  fill={signal.state === 'green' ? '#00FF00' : '#003300'}
                  opacity={signal.state === 'green' ? 1 : 0.3}
                >
                  {signal.state === 'green' && (
                    <animate
                      attributeName="r"
                      values="7;8;7"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
              </g>
              
              {/* 좌회전 신호 */}
              <g transform="translate(25, 0)">
                <rect x={0} y={0} width={20} height={60} fill="#222" rx={3} />
                
                {/* 좌회전 화살표 - 빨간색 */}
                <g transform="translate(10, 10)">
                  <path
                    d="M 0 0 L -4 0 L -4 -3 L -7 0 L -4 3 L -4 0"
                    fill={signal.leftTurnState === 'red' ? '#FF0000' : '#330000'}
                    opacity={signal.leftTurnState === 'red' ? 1 : 0.3}
                  />
                </g>
                
                {/* 좌회전 화살표 - 노란색 */}
                <g transform="translate(10, 30)">
                  <path
                    d="M 0 0 L -4 0 L -4 -3 L -7 0 L -4 3 L -4 0"
                    fill={signal.leftTurnState === 'yellow' ? '#FFD700' : '#333300'}
                    opacity={signal.leftTurnState === 'yellow' ? 1 : 0.3}
                  />
                </g>
                
                {/* 좌회전 화살표 - 초록색 */}
                <g transform="translate(10, 50)">
                  <path
                    d="M 0 0 L -4 0 L -4 -3 L -7 0 L -4 3 L -4 0"
                    fill={signal.leftTurnState === 'green' ? '#00FF00' : '#003300'}
                    opacity={signal.leftTurnState === 'green' ? 1 : 0.3}
                  >
                    {signal.leftTurnState === 'green' && (
                      <animate
                        attributeName="opacity"
                        values="1;0.7;1"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                    )}
                  </path>
                </g>
              </g>
              
              {/* 타이머 */}
              <rect x={-5} y={65} width={55} height={20} fill="#000" rx={2} />
              <text
                x={22}
                y={78}
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
            
            {/* 방향 표시 */}
            <text
              x={signal.x + 10}
              y={signal.y - 10}
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
        
        {/* 정지선 */}
        <g>
          {/* 북쪽 방향 정지선 */}
          <line
            x1={LAYOUT.mainRoad.x}
            y1={LAYOUT.intersection.y + LAYOUT.intersection.height + 15}
            x2={LAYOUT.mainRoad.x + LAYOUT.mainRoad.width}
            y2={LAYOUT.intersection.y + LAYOUT.intersection.height + 15}
            stroke="white"
            strokeWidth={4}
          />
          {/* 남쪽 방향 정지선 */}
          <line
            x1={LAYOUT.mainRoad.x}
            y1={LAYOUT.intersection.y - 15}
            x2={LAYOUT.mainRoad.x + LAYOUT.mainRoad.width}
            y2={LAYOUT.intersection.y - 15}
            stroke="white"
            strokeWidth={4}
          />
          {/* 동쪽 방향 정지선 */}
          <line
            x1={LAYOUT.intersection.x - 15}
            y1={LAYOUT.crossRoad.y}
            x2={LAYOUT.intersection.x - 15}
            y2={LAYOUT.crossRoad.y + LAYOUT.crossRoad.height}
            stroke="white"
            strokeWidth={4}
          />
          {/* 서쪽 방향 정지선 */}
          <line
            x1={LAYOUT.intersection.x + LAYOUT.intersection.width + 15}
            y1={LAYOUT.crossRoad.y}
            x2={LAYOUT.intersection.x + LAYOUT.intersection.width + 15}
            y2={LAYOUT.crossRoad.y + LAYOUT.crossRoad.height}
            stroke="white"
            strokeWidth={4}
          />
        </g>
      </svg>
      
      {/* 정보 패널 */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
        <div className="text-sm space-y-2">
          <div>차량 수: {simVehicles.filter(v => !v.isParked).length}대</div>
          <div>주차 차량: {simVehicles.filter(v => v.isParked).length}대</div>
          <div>혼잡도: {Math.round(congestionLevel)}%</div>
          <div>빈 주차공간: {parkingSpots.filter(s => !s.occupied).length}개</div>
        </div>
      </div>
    </div>
  );
};

export default CrossroadSimulator;