import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSimulation } from '@/hooks/useSimulation';
import { useSimulationStore } from '@/stores/simulationStore';
import Map from '@/components/simulation/Map';
import TimeController from '@/components/simulation/TimeController';
import StatsCards from '@/components/simulation/StatsCards';

const SimulationDashboard = () => {
  const { 
    currentTime, 
    speed, 
    isRunning, 
    vehicles,
    slots,
    changeSpeed,
    skipToTime
  } = useSimulation();
  const { stats } = useSimulationStore();

  // 차량 클릭 핸들러
  const handleVehicleClick = (vehicle: any) => {
    console.log('Vehicle clicked:', vehicle.id);
  };

  // 슬롯 클릭 핸들러
  const handleSlotClick = (slot: any) => {
    console.log('Slot clicked:', slot.id);
  };

  // 지도 클릭 핸들러 (새 슬롯 생성 등)
  const handleMapClick = (lat: number, lng: number) => {
    console.log('Map clicked:', lat, lng);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const statCards = [
    {
      title: '운행 차량',
      value: stats.vehicleStats.active,
      total: stats.vehicleStats.total,
      icon: '🚗',
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: '슬롯 사용률',
      value: `${stats.slotStats.utilizationRate.toFixed(1)}%`,
      icon: '🅿️',
      color: 'bg-green-500',
      change: '+5.2%'
    },
    {
      title: '평균 대기시간',
      value: `${stats.averageWaitTime}분`,
      icon: '⏱️',
      color: 'bg-yellow-500',
      change: '-15%'
    },
    {
      title: 'CO₂ 절감',
      value: `${stats.co2Reduction.toFixed(1)}kg`,
      icon: '🌱',
      color: 'bg-green-600',
      change: '+28%'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 섹션 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">시뮬레이션 대시보드</h1>
            <p className="mt-2 text-gray-600">세종시 자율주행 공유차량 실시간 모니터링</p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-sejong-blue">
              {formatTime(currentTime)}
            </div>
            <div className="text-sm text-gray-500">
              {formatDate(currentTime)} (x{speed})
            </div>
          </div>
        </div>
      </motion.div>

      {/* 통계 카드 */}
      <StatsCards vehicles={vehicles} slots={slots} />

      {/* 메인 콘텐츠 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 지도 영역 (2/3) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl shadow-card p-4 h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">실시간 지도</h2>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">
                  {isRunning ? '실시간 업데이트' : '일시정지'}
                </span>
              </div>
            </div>
            
            {/* 실제 지도 */}
            <div className="w-full h-[420px] rounded-lg overflow-hidden">
              <Map
                vehicles={vehicles}
                slots={slots}
                onVehicleClick={handleVehicleClick}
                onSlotClick={handleSlotClick}
                onMapClick={handleMapClick}
                showTraffic={true}
                show3D={true}
                theme="light"
              />
            </div>
          </div>
        </motion.div>

        {/* 사이드 패널 (1/3) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* 시간 제어 */}
          <TimeController
            currentTime={currentTime}
            speed={speed}
            isRunning={isRunning}
            onSpeedChange={changeSpeed}
            onTimeSkip={skipToTime}
          />

          {/* 최근 이벤트 */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 이벤트</h3>
            <div className="space-y-3">
              {isRunning ? (
                <>
                  <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-green-900">시스템 정상 운영</p>
                      <p className="text-xs text-green-600">{formatTime(currentTime)}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">차량 #{Math.floor(Math.random() * 50) + 1} 배치 완료</p>
                      <p className="text-xs text-blue-600">정부청사 인근</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">시뮬레이션을 시작하여</p>
                  <p className="text-sm">실시간 이벤트를 확인하세요</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SimulationDashboard;