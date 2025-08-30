import { useState, useEffect, useCallback, useRef } from 'react';
import { Vehicle } from '@/types/vehicle';

interface VehicleState {
  id: string;
  x: number;
  y: number;
  lane: number;
  speed: number;
  targetSpeed: number;
  direction: 'forward' | 'backward';
  status: 'moving' | 'idle' | 'parked' | 'charging';
  isChangingLane: boolean;
  targetLane: number;
  lastUpdate: number;
}

interface SimulationBounds {
  width: number;
  height: number;
  lanes: number;
  laneWidth: number;
  roadStart: number;
  roadEnd: number;
}

export const useVehicleSimulation = (
  vehicles: Vehicle[],
  bounds: SimulationBounds,
  isRunning: boolean = true,
  simulationSpeed: number = 1
) => {
  const [vehicleStates, setVehicleStates] = useState<Map<string, VehicleState>>(new Map());
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());

  // 차량 상태 초기화
  const initializeVehicleStates = useCallback(() => {
    const newStates = new Map<string, VehicleState>();
    
    vehicles.forEach((vehicle, index) => {
      const lane = index % bounds.lanes;
      const startX = bounds.roadStart + (index * 80) % (bounds.roadEnd - bounds.roadStart - 100);
      
      newStates.set(vehicle.id, {
        id: vehicle.id,
        x: startX,
        y: 80 + (lane * bounds.laneWidth) + (bounds.laneWidth / 2), // 메인 도로 중앙에 배치
        lane: lane,
        speed: 30 + Math.random() * 20, // 30-50 km/h
        targetSpeed: 40 + Math.random() * 20,
        direction: Math.random() > 0.5 ? 'forward' : 'backward',
        status: vehicle.status,
        isChangingLane: false,
        targetLane: lane,
        lastUpdate: Date.now()
      });
    });
    
    setVehicleStates(newStates);
  }, [vehicles, bounds]);

  // 차선 변경 로직
  const shouldChangeLane = (state: VehicleState, allStates: Map<string, VehicleState>): boolean => {
    if (state.isChangingLane) return false;
    if (Math.random() > 0.001) return false; // 0.1% 확률로 차선 변경 고려
    
    const currentLane = state.lane;
    const availableLanes = [];
    
    // 위 차선으로 변경 가능한지 확인
    if (currentLane > 0) {
      const targetY = 80 + ((currentLane - 1) * bounds.laneWidth) + (bounds.laneWidth / 2);
      const hasSpace = !Array.from(allStates.values()).some(otherState => 
        otherState.id !== state.id && 
        Math.abs(otherState.y - targetY) < bounds.laneWidth * 0.8 &&
        Math.abs(otherState.x - state.x) < 60
      );
      if (hasSpace) availableLanes.push(currentLane - 1);
    }
    
    // 아래 차선으로 변경 가능한지 확인
    if (currentLane < bounds.lanes - 1) {
      const targetY = 80 + ((currentLane + 1) * bounds.laneWidth) + (bounds.laneWidth / 2);
      const hasSpace = !Array.from(allStates.values()).some(otherState => 
        otherState.id !== state.id && 
        Math.abs(otherState.y - targetY) < bounds.laneWidth * 0.8 &&
        Math.abs(otherState.x - state.x) < 60
      );
      if (hasSpace) availableLanes.push(currentLane + 1);
    }
    
    return availableLanes.length > 0;
  };

  // 차량 간 거리 체크
  const checkVehicleDistance = (state: VehicleState, allStates: Map<string, VehicleState>): number => {
    let minDistance = Infinity;
    
    Array.from(allStates.values()).forEach(otherState => {
      if (otherState.id === state.id) return;
      if (Math.abs(otherState.y - state.y) > bounds.laneWidth * 0.5) return;
      
      const distance = Math.abs(otherState.x - state.x);
      if (distance < minDistance) {
        minDistance = distance;
      }
    });
    
    return minDistance;
  };

  // 속도 조절 로직
  const calculateTargetSpeed = (state: VehicleState, allStates: Map<string, VehicleState>): number => {
    const baseSpeed = 40 + Math.random() * 20; // 40-60 km/h
    const minDistance = checkVehicleDistance(state, allStates);
    
    // 앞차와의 거리에 따른 속도 조절
    if (minDistance < 40) {
      return Math.max(10, baseSpeed * 0.3); // 급격히 감속
    } else if (minDistance < 80) {
      return baseSpeed * 0.7; // 약간 감속
    } else {
      return baseSpeed; // 정상 속도
    }
  };

  // 차량 상태 업데이트
  const updateVehicleStates = useCallback(() => {
    const now = Date.now();
    const realDeltaTime = (now - lastUpdateRef.current) / 1000; // 실제 경과 시간
    const deltaTime = realDeltaTime * simulationSpeed; // 시뮬레이션 속도 반영
    lastUpdateRef.current = now;

    setVehicleStates(prevStates => {
      const newStates = new Map(prevStates);
      
      Array.from(newStates.values()).forEach(state => {
        // 목표 속도 계산
        const targetSpeed = calculateTargetSpeed(state, newStates);
        
        // 속도 점진적 변경 (가속/감속)
        const speedDiff = targetSpeed - state.speed;
        const maxAcceleration = 5; // 5 km/h per second (더 부드러운 가속)
        const acceleration = Math.sign(speedDiff) * Math.min(Math.abs(speedDiff), maxAcceleration * deltaTime);
        const newSpeed = Math.max(5, state.speed + acceleration);
        
        // 위치 업데이트
        const pixelsPerSecond = (newSpeed / 3.6) * 2; // km/h를 픽셀/초로 변환 (스케일 조정)
        const deltaX = pixelsPerSecond * deltaTime * (state.direction === 'forward' ? 1 : -1);
        let newX = state.x + deltaX;
        
        // 도로 경계 체크 및 방향 전환
        if (newX > bounds.roadEnd - 20) {
          newX = bounds.roadEnd - 20;
          state.direction = 'backward';
        } else if (newX < bounds.roadStart + 20) {
          newX = bounds.roadStart + 20;
          state.direction = 'forward';
        }
        
        // 차선 변경 처리
        let newY = state.y;
        let newLane = state.lane;
        let isChangingLane = state.isChangingLane;
        let targetLane = state.targetLane;
        
        if (state.isChangingLane) {
          const targetY = 80 + (state.targetLane * bounds.laneWidth) + (bounds.laneWidth / 2);
          const yDiff = targetY - state.y;
          const laneChangeSpeed = 30 * deltaTime; // 픽셀/초
          
          if (Math.abs(yDiff) < 2) {
            newY = targetY;
            newLane = state.targetLane;
            isChangingLane = false;
          } else {
            newY = state.y + Math.sign(yDiff) * laneChangeSpeed;
          }
        } else if (shouldChangeLane(state, newStates)) {
          // 새로운 차선 변경 시작
          const currentLane = state.lane;
          const possibleLanes = [];
          
          if (currentLane > 0) possibleLanes.push(currentLane - 1);
          if (currentLane < bounds.lanes - 1) possibleLanes.push(currentLane + 1);
          
          if (possibleLanes.length > 0) {
            targetLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
            isChangingLane = true;
          }
        }
        
        // 상태 업데이트
        newStates.set(state.id, {
          ...state,
          x: newX,
          y: newY,
          lane: newLane,
          speed: newSpeed,
          targetSpeed: targetSpeed,
          isChangingLane,
          targetLane,
          lastUpdate: now
        });
      });
      
      return newStates;
    });
  }, [bounds, simulationSpeed]);

  // 애니메이션 루프 - 더 낮은 업데이트 주기로 변경
  useEffect(() => {
    if (!isRunning) return;
    
    const updateInterval = setInterval(() => {
      updateVehicleStates();
    }, 100); // 100ms마다 업데이트 (10fps)
    
    return () => {
      clearInterval(updateInterval);
    };
  }, [isRunning, updateVehicleStates]);

  // 차량 데이터가 변경될 때 초기화
  useEffect(() => {
    initializeVehicleStates();
  }, [initializeVehicleStates]);

  // 차량 위치 조회 함수
  const getVehiclePosition = useCallback((vehicleId: string) => {
    const state = vehicleStates.get(vehicleId);
    if (!state) return null;
    
    return {
      x: state.x,
      y: state.y,
      speed: state.speed,
      lane: state.lane,
      isChangingLane: state.isChangingLane,
      direction: state.direction
    };
  }, [vehicleStates]);

  return {
    vehicleStates: Array.from(vehicleStates.values()),
    getVehiclePosition,
    initializeVehicleStates
  };
};