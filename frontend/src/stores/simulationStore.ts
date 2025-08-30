import { create } from 'zustand';
import { SimulationState, SimulationSpeed, SimulationEvent, SimulationStats } from '@/types/simulation';
import { Vehicle, VehicleStats } from '@/types/vehicle';
import { ParkingSlot, SlotStats } from '@/types/slot';

interface SimulationStore extends SimulationState {
  // Actions
  toggleSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  setSpeed: (speed: SimulationSpeed) => void;
  skipTime: (hours: number) => void;
  updateCurrentTime: (time: Date) => void;
  updateVehicles: (vehicles: Vehicle[]) => void;
  updateSlots: (slots: ParkingSlot[]) => void;
  addEvent: (event: Omit<SimulationEvent, 'id'>) => void;
  acknowledgeEvent: (eventId: string) => void;
  clearEvents: () => void;
  updateStats: () => void;
  resetSimulation: () => void;
}

// 초기 통계 데이터
const initialStats: SimulationStats = {
  vehicleStats: {
    total: 50,
    active: 0,
    idle: 50,
    parked: 0,
    moving: 0,
    picking: 0,
    dropping: 0,
    averageBattery: 85,
    averageSpeed: 0,
    totalDistance: 0,
    totalTrips: 0,
  },
  slotStats: {
    total: 120,
    available: 120,
    occupied: 0,
    reserved: 0,
    disabled: 0,
    utilizationRate: 0,
    averageOccupancyTime: 0,
    peakHours: {
      morning: 0,
      afternoon: 0,
      evening: 0,
    },
  },
  averageWaitTime: 0,
  trafficFlowIndex: 100,
  co2Reduction: 0,
  fuelSaved: 0,
  costSavings: 0,
  hourlyData: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    vehicleCount: 0,
    slotUtilization: 0,
    trafficDensity: 30 + Math.sin(hour / 24 * Math.PI * 2) * 20, // 시간대별 기본 교통량
    co2Emissions: 0,
    incidents: 0,
  })),
  totalEvents: 0,
  criticalEvents: 0,
  resolvedEvents: 0,
};

// 시뮬레이션 시작 시간 (현재 시간)
const getStartTime = () => {
  return new Date(); // 현재 시간으로 시작
};

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  // Initial state
  currentTime: getStartTime(),
  speed: 1,
  isRunning: true, // 자동 시작
  isPaused: false,
  vehicles: [],
  slots: [],
  events: [],
  stats: initialStats,
  config: {
    totalVehicles: 50,
    batteryThreshold: 20,
    maintenanceInterval: 30,
    dynamicSlotRatio: 0.7,
    maxSlotCapacity: 5,
    slotAllocationRadius: 500,
    timeCompression: 60,
    weatherEffects: true,
    trafficPatterns: true,
    emergencyScenarios: false,
    dataLoggingInterval: 5,
    eventLoggingLevel: 'normal',
  },

  // Actions
  toggleSimulation: () => {
    const { isRunning } = get();
    if (isRunning) {
      set({ isRunning: false, isPaused: true });
    } else {
      set({ isRunning: true, isPaused: false });
    }
  },

  pauseSimulation: () => {
    set({ isRunning: false, isPaused: true });
  },

  resumeSimulation: () => {
    set({ isRunning: true, isPaused: false });
  },

  setSpeed: (speed: SimulationSpeed) => {
    set({ speed });
  },

  skipTime: (hours: number) => {
    const { currentTime } = get();
    const newTime = new Date(currentTime);
    newTime.setHours(newTime.getHours() + hours);
    set({ currentTime: newTime });
  },

  updateCurrentTime: (time: Date) => {
    set({ currentTime: new Date(time) });
  },

  updateVehicles: (vehicles: Vehicle[]) => {
    set({ vehicles });
    get().updateStats();
  },

  updateSlots: (slots: ParkingSlot[]) => {
    set({ slots });
    get().updateStats();
  },

  addEvent: (event: Omit<SimulationEvent, 'id'>) => {
    const newEvent: SimulationEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      acknowledged: false,
      autoResolved: event.severity === 'info',
    };

    set(state => ({
      events: [newEvent, ...state.events].slice(0, 100), // 최근 100개만 유지
    }));
  },

  acknowledgeEvent: (eventId: string) => {
    set(state => ({
      events: state.events.map(event =>
        event.id === eventId ? { ...event, acknowledged: true } : event
      ),
    }));
  },

  clearEvents: () => {
    set({ events: [] });
  },

  updateStats: () => {
    const { vehicles, slots, events } = get();

    // 차량 통계 업데이트
    const vehicleStats: VehicleStats = {
      total: vehicles.length,
      active: vehicles.filter(v => v.status === 'moving' || v.status === 'picking' || v.status === 'dropping').length,
      idle: vehicles.filter(v => v.status === 'idle').length,
      parked: vehicles.filter(v => v.status === 'parked').length,
      moving: vehicles.filter(v => v.status === 'moving').length,
      picking: vehicles.filter(v => v.status === 'picking').length,
      dropping: vehicles.filter(v => v.status === 'dropping').length,
      averageBattery: vehicles.length > 0 ? vehicles.reduce((sum, v) => sum + v.battery, 0) / vehicles.length : 0,
      averageSpeed: vehicles.length > 0 ? vehicles.reduce((sum, v) => sum + v.speed, 0) / vehicles.length : 0,
      totalDistance: vehicles.reduce((sum, v) => sum + v.totalDistance, 0),
      totalTrips: vehicles.reduce((sum, v) => sum + v.tripCount, 0),
    };

    // 슬롯 통계 업데이트
    const slotStats: SlotStats = {
      total: slots.length,
      available: slots.filter(s => s.status === 'available').length,
      occupied: slots.filter(s => s.status === 'occupied').length,
      reserved: slots.filter(s => s.status === 'reserved').length,
      disabled: slots.filter(s => s.status === 'disabled').length,
      utilizationRate: slots.length > 0 ? 
        (slots.filter(s => s.status === 'occupied' || s.status === 'reserved').length / slots.length) * 100 : 0,
      averageOccupancyTime: 25, // 임시값
      peakHours: {
        morning: 45,
        afternoon: 30,
        evening: 60,
      },
    };

    // 전체 통계 업데이트
    const stats: SimulationStats = {
      vehicleStats,
      slotStats,
      averageWaitTime: 8.5, // 임시값
      trafficFlowIndex: Math.max(20, 100 - slotStats.utilizationRate * 0.5),
      co2Reduction: vehicleStats.totalTrips * 2.3, // kg
      fuelSaved: vehicleStats.totalTrips * 1.2, // 리터
      costSavings: vehicleStats.totalTrips * 3500, // 원
      hourlyData: get().stats.hourlyData, // 기존 데이터 유지
      totalEvents: events.length,
      criticalEvents: events.filter(e => e.severity === 'critical').length,
      resolvedEvents: events.filter(e => e.acknowledged || e.autoResolved).length,
    };

    set({ stats });
  },

  resetSimulation: () => {
    set({
      currentTime: getStartTime(),
      speed: 1,
      isRunning: false,
      isPaused: false,
      vehicles: [],
      slots: [],
      events: [],
      stats: initialStats,
    });
  },
}));