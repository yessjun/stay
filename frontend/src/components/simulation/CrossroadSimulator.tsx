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
  isChangingLane?: boolean;  // 차선 변경 중 상태
  targetLane?: number;  // 목표 차선
  isParkingTransition?: boolean;  // 주차 전환 중
  targetParkingSpot?: ParkingSpot;  // 목표 주차 공간
  isTurning?: boolean;  // 회전 중 상태
  turnStage?: number;  // 회전 단계 (0: 진입, 1: 각도 변경 후 진행)
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
      y: 175,  // 위치 조정 (높이가 늘어나므로)
      height: 150,  // 6차선을 위해 높이 증가
      lanes: 6,  // 4차선 → 6차선
      laneWidth: 25
    },
    intersection: {
      x: 700,  // 중앙 위치 조정
      y: 175,  // 교차로 위치도 조정
      width: 200,
      height: 150  // 교차로 높이도 증가
    }
  };

  // 상태
  const [simVehicles, setSimVehicles] = useState<SimVehicle[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [congestionLevel, setCongestionLevel] = useState(0);

  // 시연용 상태
  const [demoMode, setDemoMode] = useState(false);
  const [manualCongestion, setManualCongestion] = useState(0);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [schoolZoneMode, setSchoolZoneMode] = useState(false);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<{id: number, message: string, type: 'success'|'warning'|'error'}[]>([]);
  
  // 데이터 시각화용 상태
  const [trafficHistory, setTrafficHistory] = useState<number[]>(Array(20).fill(0));
  const [efficiencyScore, setEfficiencyScore] = useState(85);
  const [predictionData, setPredictionData] = useState<number[]>(Array(10).fill(30));
  
  // 시연 가이드 상태
  const [currentDemoStep, setCurrentDemoStep] = useState(0);
  const demoSteps = [
    { 
      title: "기본 동적 할당", 
      description: "시연 모드를 활성화하여 AI 오케스트레이션을 시작하세요",
      action: "시연 모드 토글 클릭"
    },
    { 
      title: "혼잡도 조절 테스트", 
      description: "슬라이더를 조작하여 AI의 즉각적 반응을 확인하세요",
      action: "혼잡도를 70% 이상으로 올려보세요"
    },
    { 
      title: "긴급 상황 시연", 
      description: "긴급차량 출동 시 모든 슬롯이 해제되는지 확인하세요",
      action: "긴급차량 출동 버튼 클릭"
    },
    { 
      title: "위험구역 보호", 
      description: "위험구역에서 주차 제한이 적용되는지 확인하세요",
      action: "위험구역 보호모드 버튼 클릭"
    },
    { 
      title: "지자체 강제 해지", 
      description: "관리자 권한으로 특정 슬롯을 즉시 해제할 수 있습니다",
      action: "지자체 강제 해지 버튼 클릭"
    }
  ];

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
      { id: 'N', direction: 'N', state: 'green', leftTurnState: 'red', timer: 20, x: 660, y: 75 },  // 북쪽 신호 (왼쪽 위)
      { id: 'S', direction: 'S', state: 'green', leftTurnState: 'red', timer: 20, x: 915, y: 340 },  // 남쪽 신호 (오른쪽 아래)
      { id: 'E', direction: 'E', state: 'red', leftTurnState: 'red', timer: 20, x: 915, y: 75 },     // 동쪽 신호 (오른쪽 위)
      { id: 'W', direction: 'W', state: 'red', leftTurnState: 'red', timer: 20, x: 660, y: 340 }      // 서쪽 신호 (왼쪽 아래)
    ];
    setSignals(initialSignals);

    // 정차공간 초기화 (비어있는 상태로 시작 - 동적 할당)
    setParkingSpots([]);

    // 초기 차량 생성 (도로 끝에서 시작)
    const initialVehicles: SimVehicle[] = [];
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    
    // 메인 도로 차량 (남북 방향)
    for (let i = 0; i < 8; i++) {
      const direction = i % 2 === 0 ? 'N' : 'S';
      let x, y, angle, lane;
      
      if (direction === 'N') {
        // 북쪽으로 향하는 차량 (도로 끝에서 시작)
        const lanes = [4, 5, 6, 7];
        lane = lanes[Math.floor(i/2) % lanes.length];
        x = LAYOUT.mainRoad.x + lane * LAYOUT.mainRoad.laneWidth + 12;
        y = LAYOUT.height - 50 - (Math.floor(i/2) * 100); // 도로 끝에서 시작
        angle = 0;
      } else {
        // 남쪽으로 향하는 차량 (도로 끝에서 시작)
        const lanes = [0, 1, 2, 3];
        lane = lanes[Math.floor(i/2) % lanes.length];
        x = LAYOUT.mainRoad.x + lane * LAYOUT.mainRoad.laneWidth + 12;
        y = 50 + (Math.floor(i/2) * 100); // 도로 끝에서 시작
        angle = 180;
      }
      
      initialVehicles.push({
        id: `v${i}`,
        x,
        y,
        speed: 0, // 정지 상태에서 시작
        maxSpeed: 80 + Math.random() * 20,
        acceleration: 0,
        angle,
        direction,
        lane,
        isParked: false,
        waitingForSignal: false,
        turningDirection: Math.random() < 0.65 ? 'straight' : Math.random() < 0.6 ? 'left' : 'right',
        distanceToFront: 100,
        color: colors[i % colors.length]
      });
    }
    
    // 교차 도로 차량 (동서 방향)
    for (let i = 8; i < 14; i++) {
      const direction = (i - 8) % 2 === 0 ? 'E' : 'W';
      let x, y, angle, lane;
      
      if (direction === 'E') {
        // 동쪽으로 향하는 차량 (도로 끝에서 시작)
        lane = 3 + (Math.floor((i - 8)/2) % 3);
        x = 50 + (Math.floor((i - 8)/2) * 100); // 도로 끝에서 시작
        y = LAYOUT.crossRoad.y + lane * LAYOUT.crossRoad.laneWidth + 12;
        angle = 90;
      } else {
        // 서쪽으로 향하는 차량 (도로 끝에서 시작)
        lane = Math.floor((i - 8)/2) % 3;
        x = LAYOUT.width - 50 - (Math.floor((i - 8)/2) * 100); // 도로 끝에서 시작
        y = LAYOUT.crossRoad.y + lane * LAYOUT.crossRoad.laneWidth + 12;
        angle = 270;
      }
      
      initialVehicles.push({
        id: `v${i}`,
        x,
        y,
        speed: 0, // 정지 상태에서 시작
        maxSpeed: 70 + Math.random() * 20,
        acceleration: 0,
        angle,
        direction,
        lane,
        isParked: false,
        waitingForSignal: false,
        turningDirection: Math.random() < 0.65 ? 'straight' : Math.random() < 0.6 ? 'left' : 'right',
        distanceToFront: 100,
        color: colors[i % colors.length]
      });
    }
    
    setSimVehicles(initialVehicles);
  }, []);

  // 시연 제어 함수들
  const addAiLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAiLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]); // 최근 10개만 유지
  };

  const addNotification = (message: string, type: 'success'|'warning'|'error') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    // 5초 후 자동 제거
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleEmergencyMode = () => {
    if (!emergencyMode) {
      setEmergencyMode(true);
      addAiLog("🚨 긴급차량 출동 감지 → 모든 주차슬롯 즉시 해제");
      addNotification("긴급차량 출동! 모든 주차슬롯이 해제되었습니다.", "error");
      
      // 시연 단계 진행
      if (currentDemoStep === 2) {
        setCurrentDemoStep(3);
        addNotification("긴급상황 시연 완료! 다음 단계를 진행하세요.", "success");
      }
      
      // 모든 주차슬롯 해제
      setParkingSpots([]);
      
      // 주차된 차량들을 모두 운행 상태로 변경
      setSimVehicles(prev => prev.map(v => 
        v.isParked ? { ...v, isParked: false, speed: 40, targetParkingSpot: undefined } : v
      ));
      
      // 5초 후 자동 해제
      setTimeout(() => {
        setEmergencyMode(false);
        addAiLog("✅ 긴급상황 종료 → 정상 운영 모드 복귀");
        addNotification("긴급상황이 종료되었습니다. 정상 운영을 재개합니다.", "success");
      }, 5000);
    }
  };

  const handleSchoolZoneMode = () => {
    setSchoolZoneMode(!schoolZoneMode);
    if (!schoolZoneMode) {
      addAiLog("🏫 위험구역 감지 → 해당 구역 주차슬롯 배정 제한");
      addNotification("위험구역 보호모드가 활성화되었습니다.", "warning");
      
      // 시연 단계 진행
      if (currentDemoStep === 3) {
        setCurrentDemoStep(4);
        addNotification("위험구역 보호 시연 완료! 마지막 단계를 진행하세요.", "success");
      }
    } else {
      addAiLog("✅ 위험구역 해제 → 모든 구역 주차슬롯 배정 가능");
      addNotification("위험구역 보호모드가 비활성화되었습니다.", "success");
    }
  };

  const handleForceReleaseSlot = () => {
    if (parkingSpots.length > 0) {
      const occupiedSpots = parkingSpots.filter(s => s.occupied);
      if (occupiedSpots.length > 0) {
        const randomSpot = occupiedSpots[Math.floor(Math.random() * occupiedSpots.length)];
        
        // 해당 슬롯의 차량을 운행 상태로 변경
        setSimVehicles(prev => prev.map(v => 
          v.parkingSlotId === randomSpot.id 
            ? { ...v, isParked: false, speed: 40, targetParkingSpot: undefined, parkingSlotId: undefined }
            : v
        ));
        
        // 슬롯 해제
        setParkingSpots(prev => prev.map(s => 
          s.id === randomSpot.id 
            ? { ...s, occupied: false, vehicleId: undefined }
            : s
        ));
        
        addAiLog("🏛️ 지자체 강제 해지 명령 → 주차슬롯 즉시 해제");
        addNotification("지자체 명령에 따라 주차슬롯이 강제 해제되었습니다.", "warning");
        
        // 시연 단계 진행 완료
        if (currentDemoStep === 4) {
          addNotification("🎉 모든 시연 단계가 완료되었습니다!", "success");
          addAiLog("✅ 시연 완료 → STAY AI 오케스트레이션 모든 기능 확인 완료");
        }
      } else {
        addNotification("해제할 주차된 차량이 없습니다.", "warning");
      }
    } else {
      addNotification("주차슬롯이 없습니다.", "warning");
    }
  };

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
              // 동쪽으로 가는 차량 (서쪽에서 시작) - 우측통행: 아래쪽 3개 차선
              const laneOptions = [3, 4, 5];
              lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
              x = -50 - Math.random() * 100; // 시작 위치 다양화
              y = LAYOUT.crossRoad.y + lane * LAYOUT.crossRoad.laneWidth + 12;
              angle = 90;
            } else {
              // 서쪽으로 가는 차량 (동쪽에서 시작) - 우측통행: 위쪽 3개 차선
              const laneOptions = [0, 1, 2];
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
              speed: isMainRoad ? 50 : 40, // 초기 속도 증가
              maxSpeed: isMainRoad ? (80 + Math.random() * 20) : (70 + Math.random() * 20),
              acceleration: 0,
              angle,
              direction,
              lane,
              isParked: false,
              waitingForSignal: false,
              turningDirection: Math.random() < 0.65 ? 'straight' : Math.random() < 0.6 ? 'left' : 'right',
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
                // 좌회전 전용 신호가 있는 경우
                if (signal.leftTurnState === 'green') {
                  updated.waitingForSignal = false;
                }
                // 직진 신호만 있는 경우 (비보호 좌회전 - 대향차량에 양보)
                else if (signal.state === 'green' && signal.leftTurnState === 'red') {
                  // 대향 직진 차량 확인
                  let canTurnLeft = true;
                  const oppositeDirection = 
                    updated.direction === 'N' ? 'S' :
                    updated.direction === 'S' ? 'N' :
                    updated.direction === 'E' ? 'W' : 'E';
                  
                  // 대향 차량 중 직진 차량 확인
                  for (const other of newVehicles) {
                    if (other.id === vehicle.id) continue;
                    
                    // 대향 방향에서 교차로 접근 중인 직진 차량
                    if (other.direction === oppositeDirection && 
                        other.turningDirection === 'straight') {
                      // 교차로에 가까운 대향 차량이 있으면 양보
                      let oppositeDistance = Infinity;
                      if (oppositeDirection === 'N' || oppositeDirection === 'S') {
                        oppositeDistance = Math.abs(other.y - 
                          (oppositeDirection === 'N' ? 
                            LAYOUT.intersection.y + LAYOUT.intersection.height : 
                            LAYOUT.intersection.y));
                      } else {
                        oppositeDistance = Math.abs(other.x - 
                          (oppositeDirection === 'E' ? 
                            LAYOUT.intersection.x : 
                            LAYOUT.intersection.x + LAYOUT.intersection.width));
                      }
                      
                      // 대향 차량이 100 이내에 있으면 양보
                      if (oppositeDistance < 100) {
                        canTurnLeft = false;
                        break;
                      }
                    }
                  }
                  
                  if (canTurnLeft) {
                    updated.waitingForSignal = false;
                  } else {
                    updated.waitingForSignal = true;
                    if (stopLineDistance < 15) {
                      updated.speed = Math.min(5, updated.speed);
                    }
                  }
                }
                // 적색 신호
                else {
                  updated.waitingForSignal = true;
                  if (stopLineDistance < 15) {
                    updated.speed = 0;
                  }
                }
              }
              // 우회전 차량 - 신호와 무관하게 진행 가능 (한국 도로 규칙)
              else if (updated.turningDirection === 'right') {
                // 교차로 내 차량 확인
                let canProceed = true;
                const intersectionVehicles = newVehicles.filter(other => {
                  if (other.id === vehicle.id) return false;
                  return other.x > LAYOUT.intersection.x - 20 &&
                         other.x < LAYOUT.intersection.x + LAYOUT.intersection.width + 20 &&
                         other.y > LAYOUT.intersection.y - 20 &&
                         other.y < LAYOUT.intersection.y + LAYOUT.intersection.height + 20;
                });
                
                // 교차로가 너무 혼잡하면 대기
                if (intersectionVehicles.length > 5) {
                  canProceed = false;
                }
                
                // 직진 차량에게 양보
                for (const other of intersectionVehicles) {
                  if (other.turningDirection === 'straight' && other.speed > 10) {
                    const conflictAngle = Math.abs(other.angle - updated.angle);
                    if (conflictAngle > 45 && conflictAngle < 135) {
                      canProceed = false;
                      break;
                    }
                  }
                }
                
                if (canProceed) {
                  updated.waitingForSignal = false;
                } else {
                  updated.waitingForSignal = true;
                  if (stopLineDistance < 15) {
                    updated.speed = Math.min(10, updated.speed);
                  }
                }
              }
              // 직진 차량
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
          
          // 교차로 내부인지 확인 (회전용) - 회전 중인 차량은 영역 확대
          const intersectionMargin = updated.isTurning ? 30 : 0; // 회전 중일 때 여유 공간
          const inIntersection = 
            updated.x > LAYOUT.intersection.x - intersectionMargin && 
            updated.x < LAYOUT.intersection.x + LAYOUT.intersection.width + intersectionMargin &&
            updated.y > LAYOUT.intersection.y - intersectionMargin && 
            updated.y < LAYOUT.intersection.y + LAYOUT.intersection.height + intersectionMargin;
          
          // 충돌 방지 시스템 - 더 정밀한 거리 계산
          updated.distanceToFront = 1000;
          let frontVehicle: typeof vehicle | null = null;
          let closestSideDistance = 1000;
          let blockedByParkedVehicle = false;
          let tooCloseVehicle = false; // 너무 가까운 차량 감지
          
          newVehicles.forEach(other => {
            if (other.id === vehicle.id) return;
            
            const dx = other.x - updated.x;
            const dy = other.y - updated.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 교차로나 회전 중일 때 충돌 방지
            if ((inIntersection || updated.isTurning) && distance < 30) {
              tooCloseVehicle = true;
            }
            
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
                
                // 앞차가 주차 중이거나 주차 전환 중인지 확인
                if (other.isParked || other.isParkingTransition) {
                  blockedByParkedVehicle = true;
                }
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
          const minSafeDistance = 35 + vehicleLength; // 최소 안전거리 증가
          const dynamicSafeDistance = Math.max(
            minSafeDistance,
            updated.speed * reactionTime + vehicleLength * 2.5
          );
          
          // 주차 중인 차량이 차선을 막고 있으면 차선 변경 시도
          if (blockedByParkedVehicle && !updated.isChangingLane && !inIntersection) {
            // 안전한 차선 변경 가능 여부 확인
            let canChangeLane = false;
            let targetLane = updated.lane;
            
            if (updated.direction === 'N' || updated.direction === 'S') {
              // 메인 도로에서 차선 변경
              const possibleLanes = [];
              if (updated.direction === 'N') {
                if (updated.lane > 4) possibleLanes.push(updated.lane - 1);
                if (updated.lane < 7) possibleLanes.push(updated.lane + 1);
              } else {
                if (updated.lane > 0) possibleLanes.push(updated.lane - 1);
                if (updated.lane < 3) possibleLanes.push(updated.lane + 1);
              }
              
              // 각 가능한 차선의 안전성 확인
              for (const newLane of possibleLanes) {
                let isSafe = true;
                const checkX = LAYOUT.mainRoad.x + newLane * LAYOUT.mainRoad.laneWidth + 12;
                
                for (const other of newVehicles) {
                  if (other.id === vehicle.id) continue;
                  const dx = Math.abs(other.x - checkX);
                  const dy = Math.abs(other.y - updated.y);
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  
                  if (distance < 60) {
                    isSafe = false;
                    break;
                  }
                }
                
                if (isSafe) {
                  canChangeLane = true;
                  targetLane = newLane;
                  break;
                }
              }
            } else {
              // 교차 도로에서 차선 변경
              const possibleLanes = [];
              if (updated.direction === 'E') {
                if (updated.lane > 3) possibleLanes.push(updated.lane - 1);
                if (updated.lane < 5) possibleLanes.push(updated.lane + 1);
              } else {
                if (updated.lane > 0) possibleLanes.push(updated.lane - 1);
                if (updated.lane < 2) possibleLanes.push(updated.lane + 1);
              }
              
              for (const newLane of possibleLanes) {
                let isSafe = true;
                const checkY = LAYOUT.crossRoad.y + newLane * LAYOUT.crossRoad.laneWidth + 12;
                
                for (const other of newVehicles) {
                  if (other.id === vehicle.id) continue;
                  const dx = Math.abs(other.x - updated.x);
                  const dy = Math.abs(other.y - checkY);
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  
                  if (distance < 60) {
                    isSafe = false;
                    break;
                  }
                }
                
                if (isSafe) {
                  canChangeLane = true;
                  targetLane = newLane;
                  break;
                }
              }
            }
            
            if (canChangeLane) {
              updated.isChangingLane = true;
              updated.targetLane = targetLane;
            }
          }
          
          // 속도 조절 로직 개선
          if (tooCloseVehicle) {
            // 충돌 위험 - 즉시 정지
            updated.speed = 0;
            updated.acceleration = 0;
          } else if (updated.isParkingTransition) {
            // 주차 전환 중에는 천천히 이동
            updated.speed = Math.max(10, updated.speed * 0.95);
          } else if (updated.waitingForSignal) {
            // 신호 대기 - 완전 정지
            updated.acceleration = -80;
            updated.speed = Math.max(0, updated.speed + updated.acceleration * deltaTime);
          } else if (updated.distanceToFront < minSafeDistance) {
            // 충돌 위험 - 긴급 제동
            updated.acceleration = -120; // 더 강한 제동
            updated.speed = Math.max(0, updated.speed + updated.acceleration * deltaTime);
            
            // 너무 가까우면 완전 정지
            if (updated.distanceToFront < vehicleLength * 2) {
              updated.speed = 0;
              updated.acceleration = 0;
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
          
          // 인접 차선 차량과의 안전 확보 (차선 변경 교착 상태 방지)
          if (closestSideDistance < 30) {
            // 차선 변경 중인 경우 우선순위 기반 처리
            if (updated.isChangingLane) {
              // ID 기반 우선순위 (간단한 규칙: ID 숫자가 작은 차량이 우선)
              const myPriority = parseInt(updated.id.replace(/\D/g, ''));
              let shouldYield = false;
              
              // 인접 차선의 차량 중 차선 변경 중인 차량 확인
              newVehicles.forEach(other => {
                if (other.id === vehicle.id || other.isParked) return;
                
                const dx = Math.abs(other.x - updated.x);
                const dy = Math.abs(other.y - updated.y);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 35 && other.isChangingLane) {
                  const otherPriority = parseInt(other.id.replace(/\D/g, ''));
                  // 상대 차량의 우선순위가 높으면 양보
                  if (otherPriority < myPriority) {
                    shouldYield = true;
                  }
                }
              });
              
              if (shouldYield) {
                // 양보: 차선 변경 취소하고 원래 차선 유지
                updated.isChangingLane = false;
                updated.targetLane = updated.lane;
                updated.speed = Math.min(updated.speed, 35);
              } else {
                // 계속 진행: 속도 유지하며 차선 변경
                updated.speed = Math.max(20, updated.speed);
              }
            } else {
              // 차선 변경 중이 아니면 단순 속도 감소
              updated.speed = Math.min(updated.speed, 40);
            }
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
            if (updated.speed < 10) {
              updated.intersectionWaitTime += deltaTime;
            } else {
              updated.intersectionWaitTime = Math.max(0, updated.intersectionWaitTime - deltaTime);
            }
            
            // 교착 상태 감지 (교차로에서 1.5초 이상 정체)
            if (updated.intersectionWaitTime > 1.5) {
              // 우선순위 할당 (진행 방향과 대기 시간 기반)
              if (!updated.priority) {
                // 직진 > 우회전 > 좌회전 순으로 우선순위
                let basePriority = 0;
                if (updated.turningDirection === 'straight') basePriority = 200;
                else if (updated.turningDirection === 'right') basePriority = 150;
                else if (updated.turningDirection === 'left') basePriority = 100;
                
                // 주도로(남북) 우선
                if (updated.direction === 'N' || updated.direction === 'S') {
                  basePriority += 50;
                }
                
                updated.priority = basePriority + updated.intersectionWaitTime * 10;
              }
              
              // 교착 상태 해결 로직
              let shouldProceed = true;
              let closestBlockingVehicle = null;
              let minBlockingDistance = Infinity;
              
              newVehicles.forEach(other => {
                if (other.id === vehicle.id || other.isParked) return;
                
                // 다른 차량도 교차로 내에 있는지 확인
                const otherInIntersection = 
                  other.x > LAYOUT.intersection.x - 10 &&
                  other.x < LAYOUT.intersection.x + LAYOUT.intersection.width + 10 &&
                  other.y > LAYOUT.intersection.y - 10 &&
                  other.y < LAYOUT.intersection.y + LAYOUT.intersection.height + 10;
                
                if (otherInIntersection) {
                  const dx = other.x - updated.x;
                  const dy = other.y - updated.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  
                  // 진행 경로상 충돌 가능성 체크
                  if (distance < 45) {
                    // 진행 방향 고려
                    let willConflict = false;
                    
                    // 직진 차량의 경우
                    if (updated.turningDirection === 'straight') {
                      if (updated.direction === 'N' && dy < 0 && Math.abs(dx) < 30) willConflict = true;
                      else if (updated.direction === 'S' && dy > 0 && Math.abs(dx) < 30) willConflict = true;
                      else if (updated.direction === 'E' && dx > 0 && Math.abs(dy) < 30) willConflict = true;
                      else if (updated.direction === 'W' && dx < 0 && Math.abs(dy) < 30) willConflict = true;
                    }
                    
                    if (willConflict || distance < 35) {
                      // 우선순위 비교
                      const myPriority = updated.priority || 0;
                      const otherPriority = other.priority || 0;
                      
                      // 상대방이 우선순위가 높으면 양보
                      if (otherPriority > myPriority + 10) {
                        shouldProceed = false;
                        if (distance < minBlockingDistance) {
                          minBlockingDistance = distance;
                          closestBlockingVehicle = other;
                        }
                      }
                    }
                  }
                }
              });
              
              // 진행 결정
              if (!shouldProceed && closestBlockingVehicle) {
                // 대기 또는 후진
                if (updated.intersectionWaitTime > 3) {
                  // 3초 이상 대기시 살짝 후진
                  const backDistance = 3 * deltaTime;
                  if (updated.direction === 'N') updated.y = Math.min(updated.y + backDistance, LAYOUT.intersection.y - 20);
                  else if (updated.direction === 'S') updated.y = Math.max(updated.y - backDistance, LAYOUT.intersection.y + LAYOUT.intersection.height + 20);
                  else if (updated.direction === 'E') updated.x = Math.max(updated.x - backDistance, LAYOUT.intersection.x + LAYOUT.intersection.width + 20);
                  else if (updated.direction === 'W') updated.x = Math.min(updated.x + backDistance, LAYOUT.intersection.x - 20);
                }
                updated.speed = 0;
              } else if (updated.intersectionWaitTime > 4) {
                // 4초 이상 대기 시 천천히 강제 진행
                updated.speed = Math.min(20, updated.maxSpeed * 0.4);
                updated.priority = 500 + updated.intersectionWaitTime * 20;
              } else {
                // 정상 진행 가능
                updated.speed = Math.min(updated.speed + updated.acceleration * deltaTime, 40);
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
            
            // 좌회전은 왼쪽 차선에서 가능
            if (updated.turningDirection === 'left') {
              if (updated.direction === 'N' && (updated.lane === 4 || updated.lane === 5)) canMakeTurn = true; // 북쪽 방향 왼쪽 2개 차선
              else if (updated.direction === 'S' && (updated.lane === 2 || updated.lane === 3)) canMakeTurn = true; // 남쪽 방향 왼쪽 2개 차선
              else if (updated.direction === 'E' && (updated.lane === 3)) canMakeTurn = true; // 동쪽 방향 가장 왼쪽 차선
              else if (updated.direction === 'W' && (updated.lane === 2)) canMakeTurn = true; // 서쪽 방향 가장 왼쪽 차선
            }
            // 우회전은 오른쪽 차선에서 가능
            else if (updated.turningDirection === 'right') {
              if (updated.direction === 'N' && (updated.lane === 6 || updated.lane === 7)) canMakeTurn = true; // 북쪽 방향 오른쪽 2개 차선
              else if (updated.direction === 'S' && (updated.lane === 0 || updated.lane === 1)) canMakeTurn = true; // 남쪽 방향 오른쪽 2개 차선
              else if (updated.direction === 'E' && (updated.lane === 5)) canMakeTurn = true; // 동쪽 방향 가장 오른쪽 차선
              else if (updated.direction === 'W' && (updated.lane === 0)) canMakeTurn = true; // 서쪽 방향 가장 오른쪽 차선
            }
            
            // 단순한 직각 회전 처리
            if (updated.turningDirection === 'left' && canMakeTurn && (canTurn || updated.speed < 20)) {
              
              if (updated.direction === 'N' && updated.y < intersectionCenterY + 10) {
                // 북쪽에서 서쪽으로 좌회전
                if (!updated.isTurning) {
                  updated.isTurning = true;
                  updated.turnStage = 0;
                }
                
                // 2단계 회전: 직진 후 각도 변경
                if (updated.turnStage === 0) {
                  // 계속 직진 (충돌 회피)
                  if (updated.y < intersectionCenterY - 20 && !tooCloseVehicle) {
                    updated.turnStage = 1;
                    updated.angle = 270; // 각도 변경
                    updated.direction = 'W';
                  }
                } else if (updated.turnStage === 1) {
                  // 서쪽으로 진행
                  if (updated.x < intersectionCenterX - 20) {
                    // 회전 완료
                    updated.turningDirection = 'straight';
                    updated.isTurning = false;
                    updated.turnStage = undefined;
                    updated.lane = 0; // 서쪽 방향 가장 오른쪽 차선
                    updated.y = LAYOUT.crossRoad.y + updated.lane * LAYOUT.crossRoad.laneWidth + 12;
                  }
                }
              } else if (updated.direction === 'S' && updated.y > intersectionCenterY - 10) {
                // 남쪽에서 동쪽으로 좌회전
                if (!updated.isTurning) {
                  updated.isTurning = true;
                  updated.turnStage = 0;
                }
                
                if (updated.turnStage === 0) {
                  if (updated.y > intersectionCenterY + 20 && !tooCloseVehicle) {
                    updated.turnStage = 1;
                    updated.angle = 90;
                    updated.direction = 'E';
                  }
                } else if (updated.turnStage === 1) {
                  if (updated.x > intersectionCenterX + 20) {
                    updated.turningDirection = 'straight';
                    updated.isTurning = false;
                    updated.turnStage = undefined;
                    updated.lane = 3; // 동쪽 방향 가장 오른쪽 차선
                    updated.y = LAYOUT.crossRoad.y + updated.lane * LAYOUT.crossRoad.laneWidth + 12;
                  }
                }
              } else if (updated.direction === 'E' && updated.x > intersectionCenterX - 10) {
                // 동쪽에서 북쪽으로 좌회전
                if (!updated.isTurning) {
                  updated.isTurning = true;
                  updated.turnStage = 0;
                }
                
                if (updated.turnStage === 0) {
                  if (updated.x > intersectionCenterX + 20 && !tooCloseVehicle) {
                    updated.turnStage = 1;
                    updated.angle = 0;
                    updated.direction = 'N';
                  }
                } else if (updated.turnStage === 1) {
                  if (updated.y < intersectionCenterY - 20) {
                    updated.turningDirection = 'straight';
                    updated.isTurning = false;
                    updated.turnStage = undefined;
                    updated.lane = 4; // 북쪽 방향 가장 오른쪽 차선
                    updated.x = LAYOUT.mainRoad.x + updated.lane * LAYOUT.mainRoad.laneWidth + 12;
                  }
                }
              } else if (updated.direction === 'W' && updated.x < intersectionCenterX + 10) {
                // 서쪽에서 남쪽으로 좌회전
                if (!updated.isTurning) {
                  updated.isTurning = true;
                  updated.turnStage = 0;
                }
                
                if (updated.turnStage === 0) {
                  if (updated.x < intersectionCenterX - 20 && !tooCloseVehicle) {
                    updated.turnStage = 1;
                    updated.angle = 180;
                    updated.direction = 'S';
                  }
                } else if (updated.turnStage === 1) {
                  if (updated.y > intersectionCenterY + 20) {
                    updated.turningDirection = 'straight';
                    updated.isTurning = false;
                    updated.turnStage = undefined;
                    updated.lane = 0; // 남쪽 방향 가장 오른쪽 차선
                    updated.x = LAYOUT.mainRoad.x + updated.lane * LAYOUT.mainRoad.laneWidth + 12;
                  }
                }
              }
            } else if (updated.turningDirection === 'right' && canMakeTurn && (canTurn || updated.speed < 20)) {
              if (updated.direction === 'N' && updated.y < intersectionCenterY - 30) {
                // 북쪽에서 동쪽으로 우회전
                if (!updated.isTurning) {
                  updated.isTurning = true;
                  updated.turnStage = 0;
                }
                
                if (updated.turnStage === 0) {
                  if (updated.y < intersectionCenterY - 40 && !tooCloseVehicle) {
                    updated.turnStage = 1;
                    updated.angle = 90;
                    updated.direction = 'E';
                  }
                } else if (updated.turnStage === 1) {
                  if (updated.x > intersectionCenterX + 20) {
                    updated.turningDirection = 'straight';
                    updated.isTurning = false;
                    updated.turnStage = undefined;
                    updated.lane = 3; // 동쪽 방향 가장 오른쪽 차선
                    updated.y = LAYOUT.crossRoad.y + updated.lane * LAYOUT.crossRoad.laneWidth + 12;
                  }
                }
              } else if (updated.direction === 'S' && updated.y > intersectionCenterY + 30) {
                // 남쪽에서 서쪽으로 우회전
                if (!updated.isTurning) {
                  updated.isTurning = true;
                  updated.turnStage = 0;
                }
                
                if (updated.turnStage === 0) {
                  if (updated.y > intersectionCenterY + 40 && !tooCloseVehicle) {
                    updated.turnStage = 1;
                    updated.angle = 270;
                    updated.direction = 'W';
                  }
                } else if (updated.turnStage === 1) {
                  if (updated.x < intersectionCenterX - 20) {
                    updated.turningDirection = 'straight';
                    updated.isTurning = false;
                    updated.turnStage = undefined;
                    updated.lane = 0; // 서쪽 방향 가장 오른쪽 차선
                    updated.y = LAYOUT.crossRoad.y + updated.lane * LAYOUT.crossRoad.laneWidth + 12;
                  }
                }
              } else if (updated.direction === 'E' && updated.x > intersectionCenterX + 30) {
                // 동쪽에서 남쪽으로 우회전
                if (!updated.isTurning) {
                  updated.isTurning = true;
                  updated.turnStage = 0;
                }
                
                if (updated.turnStage === 0) {
                  if (updated.x > intersectionCenterX + 40 && !tooCloseVehicle) {
                    updated.turnStage = 1;
                    updated.angle = 180;
                    updated.direction = 'S';
                  }
                } else if (updated.turnStage === 1) {
                  if (updated.y > intersectionCenterY + 20) {
                    updated.turningDirection = 'straight';
                    updated.isTurning = false;
                    updated.turnStage = undefined;
                    updated.lane = 0; // 남쪽 방향 가장 오른쪽 차선
                    updated.x = LAYOUT.mainRoad.x + updated.lane * LAYOUT.mainRoad.laneWidth + 12;
                  }
                }
              } else if (updated.direction === 'W' && updated.x < intersectionCenterX - 30) {
                // 서쪽에서 북쪽으로 우회전
                if (!updated.isTurning) {
                  updated.isTurning = true;
                  updated.turnStage = 0;
                }
                
                if (updated.turnStage === 0) {
                  if (updated.x < intersectionCenterX - 40 && !tooCloseVehicle) {
                    updated.turnStage = 1;
                    updated.angle = 0;
                    updated.direction = 'N';
                  }
                } else if (updated.turnStage === 1) {
                  if (updated.y < intersectionCenterY - 20) {
                    updated.turningDirection = 'straight';
                    updated.isTurning = false;
                    updated.turnStage = undefined;
                    updated.lane = 4; // 북쪽 방향 가장 오른쪽 차선
                    updated.x = LAYOUT.mainRoad.x + updated.lane * LAYOUT.mainRoad.laneWidth + 12;
                  }
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
            
            // 회전을 위한 차선 변경 거리 증가 (150 -> 250)
            if (distanceToIntersection < 250) {
              // 좌회전 예정인데 좌회전 차선이 아닌 경우
              if (updated.turningDirection === 'left') {
                if (updated.direction === 'N' && updated.lane !== 4) {
                  targetLane = 4;
                  shouldChangeLane = true;
                } else if (updated.direction === 'S' && updated.lane !== 3) {
                  targetLane = 3;
                  shouldChangeLane = true;
                } else if (updated.direction === 'E' && updated.lane !== 3) {
                  targetLane = 3;
                  shouldChangeLane = true;
                } else if (updated.direction === 'W' && updated.lane !== 2) {
                  targetLane = 2;
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
                } else if (updated.direction === 'E' && updated.lane !== 5) {
                  targetLane = 5;
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
                  // 동쪽 방향 - 차선 3, 4, 5 사용 (아래쪽 3개 차선)
                  if (updated.lane > 3) possibleLanes.push(updated.lane - 1);
                  if (updated.lane < 5) possibleLanes.push(updated.lane + 1);
                } else if (updated.direction === 'W') {
                  // 서쪽 방향 - 차선 0, 1, 2 사용 (위쪽 3개 차선)
                  if (updated.lane > 0) possibleLanes.push(updated.lane - 1);
                  if (updated.lane < 2) possibleLanes.push(updated.lane + 1);
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
                // 회전을 위한 차선 변경인지 확인
                const isForTurning = 
                  (updated.turningDirection === 'left' || updated.turningDirection === 'right') && 
                  distanceToIntersection < 250;
                
                // 회전을 위한 차선 변경은 더 빠르게
                const laneChangeSpeed = isForTurning ? 4 * deltaTime : 2 * deltaTime;
                
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
          
          // 주차 로직 (확률적으로) - 방향 고려하여 앞쪽 주차 스팟만 선택
          if (Math.random() < 0.001 && !updated.isParked && !updated.isParkingTransition && parkingManagerRef.current) {
            const nearestSpot = parkingManagerRef.current.findNearestAvailableSpotInDirection(
              updated.x, 
              updated.y, 
              updated.direction as 'N' | 'S' | 'E' | 'W'
            );
            if (nearestSpot) {
              // 주차 공간과의 거리 확인
              const dx = nearestSpot.x + 7 - updated.x;
              const dy = nearestSpot.y + 12 - updated.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              // 가까운 거리면 차선 변경하여 진입
              if (distance < 150) {
                updated.isParkingTransition = true;
                updated.targetParkingSpot = nearestSpot;
                updated.parkingSlotId = nearestSpot.id;
                
                // 주차 매니저에 점유 상태 업데이트
                parkingManagerRef.current.updateOccupancy(nearestSpot.id, true, updated.id);
                
                // UI 업데이트를 위해 상태도 업데이트
                setParkingSpots(prev => prev.map(spot => 
                  spot.id === nearestSpot.id 
                    ? { ...spot, occupied: true, vehicleId: updated.id }
                    : spot
                ));
                
                // AI 로그 추가
                addAiLog(`🚗 차량 ${updated.id} → 진행방향 앞쪽 주차스팟 배정`);
              }
            }
          }
          
          // 주차 전환 상태 처리 - 더 자연스러운 이동
          if (updated.isParkingTransition && updated.targetParkingSpot) {
            const targetX = updated.targetParkingSpot.x + 7;
            const targetY = updated.targetParkingSpot.y + 12;
            const dx = targetX - updated.x;
            const dy = targetY - updated.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
              // 현재 이동 방향에 따라 단계적으로 이동
              const direction = updated.direction;
              let moveX = 0, moveY = 0;
              const parkingSpeed = 20; // 주차 시 속도 제한
              
              // 방향에 따라 먼저 해당 방향으로 계속 이동한 후 주차 위치로 횡이동
              if (direction === 'N' || direction === 'S') {
                // 세로 방향 차량: 먼저 세로로 이동 후 가로로 이동
                if (Math.abs(dy) > 5) {
                  moveY = Math.sign(dy) * Math.min(parkingSpeed * deltaTime, Math.abs(dy));
                } else if (Math.abs(dx) > 5) {
                  moveX = Math.sign(dx) * Math.min(parkingSpeed * deltaTime, Math.abs(dx));
                }
              } else {
                // 가로 방향 차량: 먼저 가로로 이동 후 세로로 이동
                if (Math.abs(dx) > 5) {
                  moveX = Math.sign(dx) * Math.min(parkingSpeed * deltaTime, Math.abs(dx));
                } else if (Math.abs(dy) > 5) {
                  moveY = Math.sign(dy) * Math.min(parkingSpeed * deltaTime, Math.abs(dy));
                }
              }
              
              updated.x += moveX;
              updated.y += moveY;
              updated.speed = Math.max(5, updated.speed * 0.95); // 점진적 감속
              
              // 주차 중에는 각도 유지
            } else {
              // 주차 완료
              updated.x = targetX;
              updated.y = targetY;
              updated.speed = 0;
              updated.isParked = true;
              updated.isParkingTransition = false;
              updated.targetParkingSpot = undefined;
              
              // AI 로그 추가
              addAiLog(`✅ 차량 ${updated.id} → 주차 완료`);
            }
          }
          
          // 주차 해제 (확률적으로)
          if (updated.isParked && Math.random() < 0.005) {
            updated.isParked = false;
            updated.isParkingTransition = false;
            updated.targetParkingSpot = undefined;
            updated.speed = 40; // 주차 해제 시 속도도 증가 (20 -> 40)
            
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
      
      const calculatedCongestion = Math.min(100, (vehiclesInIntersection / 8) * 100);
      // 시연 모드일 때 수동 혼잡도 사용, 아니면 계산된 혼잡도 사용
      const finalCongestion = demoMode ? manualCongestion : calculatedCongestion;
      setCongestionLevel(finalCongestion);
      
      // 교통 히스토리 업데이트 (매 초마다)
      if (Date.now() % 1000 < 100) {
        setTrafficHistory(prev => [...prev.slice(1), finalCongestion]);
        
        // 효율성 점수 계산 (주차 공간 활용도 + 교통 흐름)
        const parkingUtilization = parkingSpots.length > 0 
          ? (parkingSpots.filter(s => s.occupied).length / parkingSpots.length) * 100 
          : 0;
        const trafficFlow = 100 - finalCongestion;
        const newEfficiency = Math.round((parkingUtilization * 0.3 + trafficFlow * 0.7));
        setEfficiencyScore(newEfficiency);
        
        // 예측 데이터 업데이트 (가상의 예측 알고리즘)
        const basePrediction = finalCongestion;
        const newPredictions = Array(10).fill(0).map((_, i) => {
          const randomVariation = (Math.random() - 0.5) * 20;
          const timeDecay = Math.max(0, basePrediction + randomVariation - i * 2);
          return Math.min(100, Math.max(0, timeDecay));
        });
        setPredictionData(newPredictions);
      }
      
      // AI 로그 추가 (혼잡도 변화 감지)
      if (demoMode && Math.abs(manualCongestion - calculatedCongestion) > 10) {
        if (manualCongestion > 70) {
          addAiLog(`📈 높은 혼잡도 감지 (${manualCongestion}%) → 주차슬롯 최소화 모드`);
        } else if (manualCongestion < 30) {
          addAiLog(`📉 낮은 혼잡도 감지 (${manualCongestion}%) → 주차슬롯 확장 모드`);
        }
      }
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
        
        {/* 차선 표시 - 교차 도로 (6차선) */}
        {Array.from({ length: LAYOUT.crossRoad.lanes - 1 }).map((_, i) => (
          <line
            key={`cross-lane-${i}`}
            x1={0}
            y1={LAYOUT.crossRoad.y + (i + 1) * LAYOUT.crossRoad.laneWidth}
            x2={LAYOUT.width}
            y2={LAYOUT.crossRoad.y + (i + 1) * LAYOUT.crossRoad.laneWidth}
            stroke={i === 2 ? "#FFD700" : "white"}
            strokeWidth={i === 2 ? 3 : 2}
            strokeDasharray={i === 2 ? "none" : "10 10"}
            opacity={0.5}
          />
        ))}
        
        {/* 정차공간 표시는 제거 - 차량이 직접 차선에서 정차 */}
        
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
                fill={signal.leftTurnState === 'green' ? '#00FF00' : 
                      signal.leftTurnState === 'yellow' ? '#FFD700' : '#000000'}
                stroke={signal.leftTurnState === 'green' ? '#00FF00' : 
                        signal.leftTurnState === 'yellow' ? '#FFD700' : '#003300'}
                strokeWidth={signal.leftTurnState !== 'red' ? 1 : 0.5}
                opacity={signal.leftTurnState !== 'red' ? 1 : 0.3}
              />
              {/* 좌회전 화살표 표시 (개선된 디자인) */}
              <g transform="translate(12.5, 52)">
                {/* 화살표 몸통 */}
                <rect
                  x="-1"
                  y="-3"
                  width="5"
                  height="2"
                  fill={signal.leftTurnState === 'green' ? '#000000' : 
                        signal.leftTurnState === 'yellow' ? '#333300' : '#002200'}
                  opacity={signal.leftTurnState !== 'red' ? 1 : 0.3}
                />
                {/* 화살표 머리 (좌회전) */}
                <polygon
                  points="-6,-1 -1,-6 -1,4"
                  fill={signal.leftTurnState === 'green' ? '#000000' : 
                        signal.leftTurnState === 'yellow' ? '#333300' : '#002200'}
                  opacity={signal.leftTurnState !== 'red' ? 1 : 0.3}
                />
              </g>
              {signal.leftTurnState === 'green' && (
                <circle cx={12.5} cy={52} r={8} fill="none">
                  <animate
                    attributeName="stroke"
                    values="#00FF00;#66FF66;#00FF00"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="stroke-width"
                    values="0;2;0"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              {signal.leftTurnState === 'yellow' && (
                <circle cx={12.5} cy={52} r={8} fill="none">
                  <animate
                    attributeName="opacity"
                    values="1;0.6;1"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              
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
                  (signal.leftTurnState === 'green' || signal.leftTurnState === 'yellow') ? 
                    (signal.leftTurnState === 'green' ? '#66FF66' : '#FFFF66') :
                  (signal.state === 'green' ? '#66FF66' :
                   signal.state === 'yellow' ? '#FFFF66' : '#FF6666')
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
          {/* 동쪽으로 진행하는 차량용 정지선 (서쪽에서 진입, 아래쪽 3개 차선) */}
          <line
            x1={LAYOUT.intersection.x - 15}
            y1={LAYOUT.crossRoad.y + LAYOUT.crossRoad.height / 2 + 2}
            x2={LAYOUT.intersection.x - 15}
            y2={LAYOUT.crossRoad.y + LAYOUT.crossRoad.height}
            stroke="#9CA3AF"
            strokeWidth={4}
          />
          {/* 서쪽으로 진행하는 차량용 정지선 (동쪽에서 진입, 위쪽 3개 차선) */}
          <line
            x1={LAYOUT.intersection.x + LAYOUT.intersection.width + 15}
            y1={LAYOUT.crossRoad.y}
            x2={LAYOUT.intersection.x + LAYOUT.intersection.width + 15}
            y2={LAYOUT.crossRoad.y + LAYOUT.crossRoad.height / 2 - 2}
            stroke="#9CA3AF"
            strokeWidth={4}
          />
        </g>
        
        {/* 주차 구역 렌더링 - 구역별 색상 및 우선순위 표시 */}
        {parkingSpots.map(spot => {
          // 구역별 색상 결정
          let zoneColor = "#10B981"; // 기본 초록
          let strokeColor = "#374151";
          let zoneType = "일반";
          
          // 위험구역 모드일 때 특정 구역을 위험 구역으로 표시
          if (schoolZoneMode && (spot.x < 400 || spot.y < 100)) {
            zoneColor = spot.occupied ? "#DC2626" : "#FCD34D"; // 위험구역: 노랑/빨강
            strokeColor = "#B45309";
            zoneType = "위험구역";
          }
          // 긴급 모드일 때 모든 구역을 긴급 해제 표시
          else if (emergencyMode) {
            zoneColor = "#6B7280"; // 회색 (비활성)
            strokeColor = "#EF4444";
            zoneType = "긴급해제";
          }
          // 저위험 우선 구역 (메인 도로 근처)
          else if (Math.abs(spot.x - LAYOUT.mainRoad.x - 100) < 100) {
            zoneColor = spot.occupied ? "#EF4444" : "#34D399"; // 우선 구역: 밝은 초록
            strokeColor = "#059669";
            zoneType = "우선";
          }
          // 일반 구역
          else {
            zoneColor = spot.occupied ? "#EF4444" : "#10B981"; // 일반: 초록
            strokeColor = "#374151";
          }

          return (
            <g key={spot.id}>
              {/* 주차 구역 */}
              <rect
                x={spot.x}
                y={spot.y}
                width={spot.width}
                height={spot.height}
                fill={zoneColor}
                stroke={strokeColor}
                strokeWidth={zoneType === "우선" ? 2 : 1}
                opacity={emergencyMode ? 0.3 : 0.7}
                rx={2}
              />
              
              {/* 우선순위 표시 */}
              {zoneType === "우선" && !spot.occupied && (
                <circle
                  cx={spot.x + spot.width/2}
                  cy={spot.y + spot.height/2}
                  r={3}
                  fill="#FFD700"
                  opacity={0.9}
                />
              )}
              
              {/* 위험구역 표시 */}
              {zoneType === "위험구역" && (
                <text
                  x={spot.x + spot.width/2}
                  y={spot.y + spot.height/2}
                  textAnchor="middle"
                  dy="2"
                  fontSize="8"
                  fill="#B45309"
                  fontWeight="bold"
                >
                  ⚠️
                </text>
              )}
              
              {/* 긴급 해제 애니메이션 */}
              {emergencyMode && (
                <rect
                  x={spot.x}
                  y={spot.y}
                  width={spot.width}
                  height={spot.height}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2"
                  opacity="0.8"
                  rx={2}
                >
                  <animate
                    attributeName="stroke-opacity"
                    values="0.8;0.2;0.8"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </rect>
              )}
            </g>
          );
        })}
      </svg>
      


      {/* AI 분석 상태 패널 (우측 상단 확장) */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 w-96">
        <div className="text-sm space-y-3">
          <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span className="text-lg">📊</span>
            실시간 교통 현황
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-lg font-bold text-blue-600">{simVehicles.filter(v => !v.isParked).length}</div>
              <div className="text-xs text-gray-600">활성 차량</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">{simVehicles.filter(v => v.isParked).length}</div>
              <div className="text-xs text-gray-600">주차 차량</div>
            </div>
          </div>

          <div className="p-2 bg-gray-50 rounded">
            <div className="flex items-center justify-between mb-1">
              <span>혼잡도</span>
              <span className={`font-bold text-lg ${
                congestionLevel > 70 ? 'text-red-600' : 
                congestionLevel > 40 ? 'text-yellow-600' : 'text-green-600'
              }`}>{Math.round(congestionLevel)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  congestionLevel > 70 ? 'bg-red-500' :
                  congestionLevel > 40 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${congestionLevel}%` }}
              />
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="text-lg">🎯</span>
              동적 주차 시스템
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-blue-50 p-2 rounded">
                <div className="font-medium">전체: {parkingSpots.length}개</div>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <div className="font-medium text-green-600">가용: {parkingSpots.filter(s => !s.occupied).length}개</div>
              </div>
            </div>
            
            <div className="text-xs text-center mt-2 p-2 rounded" style={{
              backgroundColor: congestionLevel > 70 ? '#FEE2E2' : congestionLevel > 40 ? '#FEF3C7' : '#D1FAE5',
              color: congestionLevel > 70 ? '#DC2626' : congestionLevel > 40 ? '#D97706' : '#059669'
            }}>
              {congestionLevel > 70 ? '🔴 혼잡: 주차공간 최소화' :
               congestionLevel > 40 ? '🟡 보통: 제한적 주차 가능' :
               '🟢 한산: 주차공간 활성화'}
            </div>
          </div>

          {/* AI 판단 로그 */}
          {aiLogs.length > 0 && (
            <div className="border-t pt-3">
              <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="text-lg">🧠</span>
                AI 분석 로그
              </div>
              <div className="bg-gray-900 text-green-400 p-2 rounded text-xs font-mono max-h-32 overflow-y-auto">
                {aiLogs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 알림 시스템 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 space-y-2 pointer-events-none">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`px-4 py-2 rounded-lg shadow-lg text-white font-medium animate-bounce pointer-events-auto ${
              notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'warning' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* AI 데이터 시각화 대시보드 (좌측 상단) */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 w-96">
        <div className="text-sm space-y-4">
          <div className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-lg">📈</span>
            AI 오케스트레이션 분석
          </div>

          {/* 효율성 지수 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700">시스템 효율성</span>
              <span className={`text-2xl font-bold ${
                efficiencyScore > 80 ? 'text-green-600' :
                efficiencyScore > 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>{efficiencyScore}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  efficiencyScore > 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                  efficiencyScore > 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                  'bg-gradient-to-r from-red-400 to-red-600'
                }`}
                style={{ width: `${efficiencyScore}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">
              주차 활용도 + 교통 흐름 종합 평가
            </div>
          </div>

          {/* 실시간 교통 흐름 그래프 */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="font-medium text-gray-700 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              실시간 혼잡도 추이
            </div>
            <div className="h-16 flex items-end justify-between gap-1">
              {trafficHistory.map((value, index) => (
                <div
                  key={index}
                  className={`w-3 rounded-t transition-all duration-300 ${
                    value > 70 ? 'bg-red-500' :
                    value > 40 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ 
                    height: `${Math.max(2, (value / 100) * 60)}px`,
                    opacity: index === trafficHistory.length - 1 ? 1 : 0.3 + (index / trafficHistory.length) * 0.7
                  }}
                />
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex justify-between">
              <span>20초 전</span>
              <span>현재</span>
            </div>
          </div>

          {/* 혼잡 예측 */}
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="font-medium text-gray-700 mb-2 flex items-center gap-1">
              🔮 혼잡도 예측 (다음 10분)
            </div>
            <div className="h-12 flex items-end justify-between gap-1">
              {predictionData.map((value, index) => (
                <div
                  key={index}
                  className="w-2 bg-gradient-to-t from-purple-400 to-purple-600 rounded-t opacity-70"
                  style={{ 
                    height: `${Math.max(1, (value / 100) * 45)}px`,
                    opacity: 0.9 - (index * 0.08)
                  }}
                />
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex justify-between">
              <span>+1분</span>
              <span>+10분</span>
            </div>
          </div>

          {/* 실시간 메트릭 */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-blue-50 p-2 rounded text-center">
              <div className="font-bold text-blue-600 text-lg">{Math.round(congestionLevel)}%</div>
              <div className="text-gray-600">현재 혼잡도</div>
            </div>
            <div className="bg-green-50 p-2 rounded text-center">
              <div className="font-bold text-green-600 text-lg">{parkingSpots.length}</div>
              <div className="text-gray-600">활성 슬롯</div>
            </div>
            <div className="bg-purple-50 p-2 rounded text-center">
              <div className="font-bold text-purple-600 text-lg">
                {parkingSpots.length > 0 ? Math.round((parkingSpots.filter(s => s.occupied).length / parkingSpots.length) * 100) : 0}%
              </div>
              <div className="text-gray-600">슬롯 점유율</div>
            </div>
          </div>

        </div>
      </div>


    </div>
  );
};

export default CrossroadSimulator;