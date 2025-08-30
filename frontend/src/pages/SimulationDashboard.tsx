import React from 'react';
import { motion } from 'framer-motion';
import { useSimulation } from '@/hooks/useSimulation';
import { useSimulationStore } from '@/stores/simulationStore';
import StatsCards from '@/components/simulation/StatsCards';

const SimulationDashboard = () => {
  const { 
    currentTime, 
    speed, 
    isRunning, 
    vehicles,
    slots
  } = useSimulation();
  const { stats } = useSimulationStore();

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

      {/* 임시 플레이스홀더 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-card p-8 text-center"
      >
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">새로운 대시보드 준비 중</h2>
          <p className="text-gray-600 mb-4">
            시뮬레이션 대시보드의 새로운 UI를 준비하고 있습니다.
          </p>
          <p className="text-sm text-gray-500">
            지자체 관리자 페이지에서 상세한 지도 및 슬롯 관리 기능을 확인하실 수 있습니다.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SimulationDashboard;