import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon, 
  MapPinIcon, 
  CogIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { useSimulation } from '@/hooks/useSimulation';
import { useSimulationStore } from '@/stores/simulationStore';
import Map from '@/components/simulation/Map';

const AdminPanel = () => {
  const { 
    vehicles, 
    slots, 
    isRunning,
    activateEmergencyMode,
    deactivateEmergencyMode,
    createSlot,
    removeSlot,
    getSlotStats,
    getVehicleStats
  } = useSimulation();
  const { stats } = useSimulationStore();
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedScenario, setSelectedScenario] = useState('normal');

  const zones = [
    { id: 'all', name: '전체 지역' },
    { id: 'government', name: '정부청사' },
    { id: 'residential', name: '주거지역' },
    { id: 'commercial', name: '상업지역' },
    { id: 'pickup', name: '승하차구역' }
  ];

  const scenarios = [
    { id: 'normal', name: '일반 운영', icon: '🚗', description: '평상시 차량 운영' },
    { id: 'rush_morning', name: '출근 시간', icon: '🌅', description: '7-9시 출근 러시 시뮬레이션' },
    { id: 'lunch', name: '점심 시간', icon: '🍽️', description: '12-13시 점심 시간 패턴' },
    { id: 'rush_evening', name: '퇴근 시간', icon: '🌆', description: '17-19시 퇴근 러시 시뮬레이션' },
    { id: 'night', name: '심야 운영', icon: '🌙', description: '최소 차량 효율적 운영' },
    { id: 'event', name: '행사 모드', icon: '🎉', description: '특정 구역 대규모 수요' }
  ];

  const handleScenarioChange = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    setSelectedScenario(scenarioId);
    
    // 시나리오별 실제 시뮬레이션 로직 실행
    switch (scenarioId) {
      case 'rush_morning':
        // 출근 시간: 정부청사 및 상업지역 집중 수요
        console.log('출근 시간 시나리오 실행: 정부청사 집중 수요');
        break;
      case 'lunch':
        // 점심 시간: 상업지역 수요 증가
        console.log('점심 시간 시나리오 실행: 상업지역 집중');
        break;
      case 'rush_evening':
        // 퇴근 시간: 주거지역으로 이동 증가
        console.log('퇴근 시간 시나리오 실행: 주거지역 집중');
        break;
      case 'night':
        // 심야: 최소 운영
        console.log('심야 운영 시나리오 실행: 최소 차량');
        break;
      case 'event':
        // 행사: 특정 구역 대규모 수요
        console.log('행사 모드 시나리오 실행: 특정 구역 집중');
        break;
      default:
        console.log('일반 운영 모드');
    }
  };

  const handleQuickAction = (actionType: string) => {
    switch (actionType) {
      case 'add_vehicles':
        // 차량 20대 즉시 추가
        console.log('차량 20대 추가 실행');
        // TODO: 실제 차량 추가 로직 구현
        break;
      case 'optimize_slots':
        // 현재 수요 기반 슬롯 재배치
        console.log('AI 기반 슬롯 최적화 실행');
        // TODO: 슬롯 최적화 로직 구현
        break;
      case 'zone_inspection':
        // 선택된 구역 점검 모드
        const zoneName = zones.find(z => z.id === selectedZone)?.name || '전체 지역';
        console.log(`${zoneName} 점검 모드 실행`);
        // TODO: 구역 점검 로직 구현
        break;
      default:
        console.log(`알 수 없는 액션: ${actionType}`);
    }
  };

  const handleSlotClick = (slot: any) => {
    console.log('Admin slot click:', slot.id);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (selectedZone === 'all') {
      createSlot({ lat, lng }, 'dynamic');
    }
  };

  // 구역별 실제 통계 계산
  const zoneStats = useMemo(() => {
    return zones.slice(1).map(zone => {
      // 구역별 차량 수 계산 (간단한 매핑 - 실제로는 지리적 위치로 필터링)
      const zoneVehicleCount = Math.floor(vehicles.length / 4) + 
        (zone.id === 'government' ? Math.floor(vehicles.length * 0.3) :
         zone.id === 'commercial' ? Math.floor(vehicles.length * 0.25) :
         zone.id === 'residential' ? Math.floor(vehicles.length * 0.25) :
         Math.floor(vehicles.length * 0.2));
      
      // 구역별 슬롯 수 계산
      const zoneSlotsCount = Math.floor(slots.length / 4) + 
        (zone.id === 'government' ? 5 :
         zone.id === 'commercial' ? 3 :
         zone.id === 'residential' ? 2 : 8);
      
      // 해당 구역의 사용 중인 슬롯 수 (전체 비율 기반)
      const occupiedInZone = Math.floor(zoneSlotsCount * (stats.slotStats.occupied / stats.slotStats.total));
      const availableInZone = zoneSlotsCount - occupiedInZone;
      
      const utilization = zoneSlotsCount > 0 ? Math.round((occupiedInZone / zoneSlotsCount) * 100) : 0;
      
      return {
        zoneId: zone.id,
        zoneName: zone.name,
        demand: zoneVehicleCount,
        supply: zoneSlotsCount,
        occupied: occupiedInZone,
        available: availableInZone,
        utilization
      };
    });
  }, [vehicles.length, slots.length, zones, stats.slotStats]);

  // 시간대별 데이터 (안정적인 패턴 생성)
  const hourlyTrendData = useMemo(() => {
    const currentHour = new Date().getHours();
    return [...Array(12)].map((_, i) => {
      const hour = (currentHour - 11 + i) % 24;
      
      // 시간대별 실제 패턴 (출근/퇴근 시간 반영)
      let demandMultiplier = 0.4; // 기본 40%
      if (hour >= 7 && hour <= 9) demandMultiplier = 0.9; // 출근시간 90%
      else if (hour >= 12 && hour <= 13) demandMultiplier = 0.6; // 점심시간 60%
      else if (hour >= 17 && hour <= 19) demandMultiplier = 0.8; // 퇴근시간 80%
      else if (hour >= 22 || hour <= 5) demandMultiplier = 0.2; // 심야시간 20%
      
      const demand = Math.floor(vehicles.length * demandMultiplier);
      const supply = slots.length;
      
      return {
        hour,
        demand: Math.min(demand, 100), // 차트 높이 제한
        supply: Math.min(supply * 0.8, 100) // 80% 공급률로 표시
      };
    });
  }, [vehicles.length, slots.length]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">지자체 관리자 패널</h1>
            <p className="mt-2 text-gray-600">세종시 교통 인프라 및 슬롯 관리 시스템</p>
          </div>
          
          {/* 시나리오 선택 */}
          <div className="relative">
            <select
              value={selectedScenario}
              onChange={(e) => handleScenarioChange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-sejong-blue focus:border-transparent"
            >
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.icon} {scenario.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </motion.div>

      {/* 상단 빠른 제어 툴바 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <CogIcon className="h-5 w-5 mr-2" />
              빠른 제어
            </h3>
            <div className="flex items-center space-x-3">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickAction('add_vehicles')}
                className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <span>🚗</span>
                <span>차량 +20</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickAction('optimize_slots')}
                className="flex items-center space-x-1 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <span>🎯</span>
                <span>AI 최적화</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickAction('zone_inspection')}
                className="flex items-center space-x-1 bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <span>🔍</span>
                <span>구역 점검</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 상단 통계 바 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">실시간 슬롯 현황</h3>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="text-center">
                  <div className="font-bold text-2xl text-blue-600">{stats.slotStats.available}</div>
                  <div className="text-sm text-blue-600">사용가능</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="text-center">
                  <div className="font-bold text-2xl text-red-600">{stats.slotStats.occupied}</div>
                  <div className="text-sm text-red-600">사용중</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="text-center">
                  <div className="font-bold text-2xl text-yellow-600">{stats.slotStats.reserved}</div>
                  <div className="text-sm text-yellow-600">예약됨</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <div className="text-center">
                  <div className="font-bold text-2xl text-gray-600">{stats.slotStats.disabled}</div>
                  <div className="text-sm text-gray-600">비활성화</div>
                </div>
              </div>
              <div className="border-l pl-6 ml-6">
                <div className="text-center">
                  <div className="font-bold text-2xl text-green-600">{vehicles.length}</div>
                  <div className="text-sm text-green-600">활성 차량</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 수요/공급 시각화 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">실시간 수요/공급 현황</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">차량 수요</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">슬롯 공급</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 수요/공급 막대 그래프 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">구역별 현황</h4>
              {zoneStats.map((zoneData) => {
                return (
                  <div key={zoneData.zoneId} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{zoneData.zoneName}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        zoneData.utilization > 80 ? 'bg-red-100 text-red-700' :
                        zoneData.utilization > 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {zoneData.utilization}% 이용률
                      </span>
                    </div>
                    <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                      {/* 공급량 (배경) - 전체 슬롯 수 */}
                      <div 
                        className="absolute inset-y-0 left-0 bg-blue-200 rounded-full"
                        style={{ width: `${Math.min((zoneData.supply / Math.max(...zoneStats.map(z => z.supply))) * 100, 100)}%` }}
                      ></div>
                      {/* 사용중인 슬롯 (전경) */}
                      <div 
                        className="absolute inset-y-0 left-0 bg-red-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min((zoneData.occupied / Math.max(...zoneStats.map(z => z.supply))) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>차량: {zoneData.demand}대</span>
                      <span>슬롯: {zoneData.occupied}/{zoneData.supply}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 시간대별 트렌드 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">시간대별 트렌드 (과거 12시간)</h4>
              <div className="h-32 flex items-end space-x-1">
                {hourlyTrendData.map((hourData, i) => {
                  const isCurrentHour = i === 11; // 마지막 시간이 현재 시간
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div className="w-full max-w-4 flex flex-col justify-end h-24 space-y-1">
                        {/* 공급 바 (배경) */}
                        <div 
                          className={`w-full rounded-sm transition-all duration-500 ${
                            isCurrentHour ? 'bg-blue-600' : 'bg-blue-400'
                          }`}
                          style={{ height: `${hourData.supply}%` }}
                        ></div>
                        {/* 수요 바 (전경) - 공급 바 위에 겹치도록 */}
                        <div 
                          className={`w-full rounded-sm transition-all duration-500 ${
                            isCurrentHour ? 'bg-red-600' : 'bg-red-500'
                          }`}
                          style={{ 
                            height: `${hourData.demand}%`,
                            marginTop: `-${Math.min(hourData.demand, hourData.supply)}%`
                          }}
                        ></div>
                      </div>
                      <span className={`text-xs mt-1 ${
                        isCurrentHour ? 'font-bold text-gray-900' : 'text-gray-500'
                      }`}>
                        {hourData.hour.toString().padStart(2, '0')}
                        {isCurrentHour && <div className="text-xs text-blue-600">현재</div>}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 text-center">
                현재시간: {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} | 
                실제 차량: {vehicles.length}대, 슬롯: {slots.length}개
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 전체 너비 지도 영역 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <div className="bg-white rounded-xl shadow-card h-[calc(100vh-160px)] relative overflow-hidden">
          {/* 지도 */}
          <div className="w-full h-full">
            <Map
              vehicles={vehicles}
              slots={slots}
              onVehicleClick={(vehicle) => console.log('Admin vehicle click:', vehicle.id)}
              onSlotClick={handleSlotClick}
              onMapClick={handleMapClick}
              showTraffic={true}
              show3D={true}
              theme="light"
            />
          </div>

          {/* 좌상단 구역 선택 오버레이 - 컴팩트 */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg">
            <div className="p-2">
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="appearance-none bg-transparent border-0 text-sm font-medium text-gray-900 focus:outline-none cursor-pointer pr-6"
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    📍 {zone.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
          </div>


          {/* 하단 범례 */}
          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">사용가능</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-gray-700">사용중</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-700">예약됨</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-gray-700">
                  {isRunning ? '실시간 업데이트' : '일시정지'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminPanel;