// 실시간 시뮬레이션 훅 - 시뮬레이션 엔진과 UI 연결

import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/stores/simulationStore';
import { SimulationEngine } from '@/services/simulationEngine';
import { VehicleManager } from '@/services/vehicleManager';
import { SlotManager } from '@/services/slotManager';

// 전역 인스턴스 (싱글톤 패턴)
let simulationEngine: SimulationEngine | null = null;
let vehicleManager: VehicleManager | null = null;
let slotManager: SlotManager | null = null;

export const useSimulation = () => {
  const {
    isRunning,
    speed,
    currentTime,
    vehicles,
    slots,
    updateVehicles,
    updateSlots,
    updateCurrentTime,
    addEvent,
    updateStats,
    setSpeed: setStoreSpeed,
    skipTime
  } = useSimulationStore();

  const engineRef = useRef<SimulationEngine | null>(null);
  const vehicleManagerRef = useRef<VehicleManager | null>(null);
  const slotManagerRef = useRef<SlotManager | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 시뮬레이션 초기화
  const initializeSimulation = useCallback(() => {
    console.log('🔧 시뮬레이션 초기화 시작');
    if (!simulationEngine) {
      console.log('📦 새로운 시뮬레이션 엔진 생성');
      simulationEngine = new SimulationEngine();
      vehicleManager = new VehicleManager();
      slotManager = new SlotManager();

      // 초기 데이터 생성
      const { vehicles: initialVehicles, slots: initialSlots } = simulationEngine.initialize();
      console.log('✅ 초기 데이터 생성 완료:', {
        vehicles: initialVehicles.length,
        slots: initialSlots.length
      });
      
      // 매니저에 데이터 등록
      initialVehicles.forEach(vehicle => vehicleManager!.registerVehicle(vehicle));
      initialSlots.forEach(slot => slotManager!.registerSlot(slot));

      // 스토어 업데이트
      updateVehicles(initialVehicles);
      updateSlots(initialSlots);
      updateStats();

      // 초기화 이벤트
      addEvent({
        type: 'system_alert',
        timestamp: new Date(),
        severity: 'info',
        title: '시뮬레이션 초기화 완료',
        description: `차량 ${initialVehicles.length}대, 슬롯 ${initialSlots.length}개가 준비되었습니다.`
      });
    } else {
      console.log('♻️ 기존 시뮬레이션 엔진 재사용');
    }

    engineRef.current = simulationEngine;
    vehicleManagerRef.current = vehicleManager;
    slotManagerRef.current = slotManager;
    console.log('🎯 시뮬레이션 참조 설정 완료');
  }, [updateVehicles, updateSlots, updateStats, addEvent]);

  // 시뮬레이션 시작
  const startSimulation = useCallback(() => {
    console.log('🚀 시뮬레이션 시작 시도');
    if (!engineRef.current) {
      console.error('❌ SimulationEngine이 초기화되지 않음');
      return;
    }

    console.log('✅ SimulationEngine 준비됨, 시뮬레이션 시작');
    // 업데이트 콜백 설정
    const updateCallback = (data: any) => {
      console.log('📊 시뮬레이션 업데이트:', {
        vehicleCount: data.vehicles.length,
        slotCount: data.slots.length,
        eventCount: data.events?.length || 0,
        currentTime: data.currentTime
      });
      
      updateVehicles(data.vehicles);
      updateSlots(data.slots);
      
      // 시간 업데이트
      if (data.currentTime) {
        updateCurrentTime(data.currentTime);
      }
      
      // 이벤트 추가
      data.events?.forEach((event: any) => {
        addEvent(event);
      });

      // 통계 업데이트
      updateStats();

      // 동적 슬롯 할당 (매 10초마다)
      if (slotManagerRef.current && Math.random() < 0.1) {
        const currentHour = new Date().getHours();
        const trafficDemand = getTrafficDemand(currentHour);
        slotManagerRef.current.allocateDynamicSlots(trafficDemand, currentHour);
      }
    };

    engineRef.current.start(updateCallback);
  }, [updateVehicles, updateSlots, updateCurrentTime, addEvent, updateStats]);

  // 시뮬레이션 중지
  const stopSimulation = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  // 속도 변경
  const changeSpeed = useCallback((newSpeed: 1 | 2 | 5 | 10 | 30) => {
    if (engineRef.current) {
      engineRef.current.setSpeed(newSpeed);
    }
    setStoreSpeed(newSpeed);
    
    addEvent({
      type: 'user_action',
      timestamp: new Date(),
      severity: 'info',
      title: '시뮬레이션 속도 변경',
      description: `시뮬레이션 속도가 x${newSpeed}로 변경되었습니다.`
    });
  }, [setStoreSpeed, addEvent]);

  // 시간 스킵 - 실제 시뮬레이션을 빠르게 실행
  const skipToTime = useCallback(async (hours: number) => {
    if (!engineRef.current) {
      console.error('❌ SimulationEngine이 초기화되지 않음');
      return;
    }

    // 빨리감기 시작 이벤트
    addEvent({
      type: 'user_action',
      timestamp: new Date(),
      severity: 'info',
      title: '시간 빨리감기 시작',
      description: `시뮬레이션을 ${hours}시간 빨리감기 중입니다...`
    });

    try {
      // 빨리감기 실행
      await engineRef.current.fastForward(hours, (currentTime, progress) => {
        // 진행 상황 업데이트
        updateCurrentTime(currentTime);
        console.log(`⏩ 빨리감기 진행: ${Math.round(progress)}% - ${currentTime.toLocaleTimeString()}`);
      });

      // 빨리감기 완료 후 최종 상태 업데이트
      if (vehicleManagerRef.current && slotManagerRef.current) {
        updateVehicles(vehicleManagerRef.current.getAllVehicles());
        updateSlots(slotManagerRef.current.getAllSlots());
      }
      
      updateStats();

      // 완료 이벤트
      addEvent({
        type: 'user_action',
        timestamp: new Date(),
        severity: 'info',
        title: '시간 빨리감기 완료',
        description: `${hours}시간 빨리감기가 완료되었습니다.`
      });

    } catch (error) {
      console.error('빨리감기 오류:', error);
      addEvent({
        type: 'system_alert',
        timestamp: new Date(),
        severity: 'error',
        title: '빨리감기 오류',
        description: '시간 빨리감기 중 오류가 발생했습니다.'
      });
    }
  }, [engineRef, vehicleManagerRef, slotManagerRef, updateCurrentTime, updateVehicles, updateSlots, updateStats, addEvent]);

  // 긴급 모드 활성화
  const activateEmergencyMode = useCallback(() => {
    if (!slotManagerRef.current || !vehicleManagerRef.current) return;

    // 모든 동적 슬롯 해제
    const affectedSlots = slotManagerRef.current.activateEmergencyMode();
    
    // 해당 지역 차량 대피
    const evacuatedVehicles = vehicleManagerRef.current.evacuateArea(
      { lat: 36.4800, lng: 127.2890 }, // 세종시 중심
      2 // 2km 반경
    );

    addEvent({
      type: 'emergency_alert',
      timestamp: new Date(),
      severity: 'critical',
      title: '긴급 모드 활성화',
      description: `${affectedSlots.length}개 슬롯 해제, ${evacuatedVehicles.length}대 차량 대피 완료`
    });

    // 업데이트된 데이터 반영
    updateVehicles(vehicleManagerRef.current.getAllVehicles());
    updateSlots(slotManagerRef.current.getAllSlots());
    updateStats();
  }, [updateVehicles, updateSlots, updateStats, addEvent]);

  // 긴급 모드 해제
  const deactivateEmergencyMode = useCallback(() => {
    if (!slotManagerRef.current) return;

    const reactivatedSlots = slotManagerRef.current.deactivateEmergencyMode();

    addEvent({
      type: 'system_alert',
      timestamp: new Date(),
      severity: 'info',
      title: '긴급 모드 해제',
      description: `${reactivatedSlots.length}개 슬롯이 다시 활성화되었습니다.`
    });

    updateSlots(slotManagerRef.current.getAllSlots());
    updateStats();
  }, [updateSlots, updateStats, addEvent]);

  // 슬롯 수동 생성
  const createSlot = useCallback((position: { lat: number; lng: number }, type: 'dynamic' | 'static' = 'dynamic') => {
    if (!slotManagerRef.current) return;

    const newSlot = {
      id: `manual-slot-${Date.now()}`,
      position,
      status: 'available' as const,
      type,
      priority: 5,
      capacity: Math.floor(Math.random() * 3) + 2,
      occupiedCount: 0,
      roadSection: '사용자 생성 구역',
      direction: 'north' as const,
      utilizationRate: 0,
      createdAt: new Date()
    };

    slotManagerRef.current.registerSlot(newSlot);
    updateSlots(slotManagerRef.current.getAllSlots());
    updateStats();

    addEvent({
      type: 'user_action',
      timestamp: new Date(),
      severity: 'info',
      title: '슬롯 생성',
      description: `새로운 ${type} 슬롯이 생성되었습니다.`
    });
  }, [updateSlots, updateStats, addEvent]);

  // 슬롯 제거
  const removeSlot = useCallback((slotId: string) => {
    if (!slotManagerRef.current) return;

    slotManagerRef.current.removeSlot(slotId);
    updateSlots(slotManagerRef.current.getAllSlots());
    updateStats();

    addEvent({
      type: 'user_action',
      timestamp: new Date(),
      severity: 'info',
      title: '슬롯 제거',
      description: `슬롯 ${slotId}가 제거되었습니다.`
    });
  }, [updateSlots, updateStats, addEvent]);

  // 차량 통계 조회
  const getVehicleStats = useCallback(() => {
    return vehicleManagerRef.current?.generateVehicleStats() || {};
  }, []);

  // 슬롯 통계 조회
  const getSlotStats = useCallback(() => {
    return slotManagerRef.current?.generateSlotStats() || {};
  }, []);

  // 슬롯 효율성 분석
  const analyzeSlotEfficiency = useCallback(() => {
    return slotManagerRef.current?.analyzeSlotEfficiency() || new Map();
  }, []);

  // 초기화 effect
  useEffect(() => {
    initializeSimulation();
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      stopSimulation();
    };
  }, [initializeSimulation, stopSimulation]);

  // 시뮬레이션 상태 변화 감지
  useEffect(() => {
    console.log('🔄 시뮬레이션 상태 변화:', { isRunning });
    if (isRunning) {
      startSimulation();
    } else {
      stopSimulation();
    }
  }, [isRunning, startSimulation, stopSimulation]);

  // 속도 변화 감지
  useEffect(() => {
    if (engineRef.current && isRunning) {
      engineRef.current.setSpeed(speed);
    }
  }, [speed, isRunning]);

  return {
    // 상태
    isRunning,
    speed,
    currentTime,
    vehicles,
    slots,
    
    // 제어 함수
    changeSpeed,
    skipToTime,
    activateEmergencyMode,
    deactivateEmergencyMode,
    createSlot,
    removeSlot,
    
    // 통계 함수
    getVehicleStats,
    getSlotStats,
    analyzeSlotEfficiency,
    
    // 매니저 인스턴스 (필요시 직접 접근)
    vehicleManager: vehicleManagerRef.current,
    slotManager: slotManagerRef.current,
    simulationEngine: engineRef.current
  };
};

// 헬퍼 함수
function getTrafficDemand(hour: number): number {
  // 시간대별 교통 수요 계산 (0-1)
  if (hour >= 7 && hour <= 9) return 0.9; // 출근시간
  if (hour >= 12 && hour <= 13) return 0.6; // 점심시간
  if (hour >= 17 && hour <= 19) return 0.8; // 퇴근시간
  if (hour >= 22 || hour <= 5) return 0.2; // 심야시간
  return 0.4; // 평상시간
}