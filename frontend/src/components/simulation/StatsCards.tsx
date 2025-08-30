// 통계 카드 컴포넌트 - 실시간 시뮬레이션 통계 표시

import React from 'react';
import { motion } from 'framer-motion';
import { Vehicle } from '@/types/vehicle';
import { ParkingSlot } from '@/types/slot';

interface StatsCardsProps {
  vehicles: Vehicle[];
  slots: ParkingSlot[];
}

const StatsCards: React.FC<StatsCardsProps> = ({ vehicles, slots }) => {
  // 차량 통계 계산
  const vehicleStats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'moving' || v.status === 'picking' || v.status === 'dropping').length,
    idle: vehicles.filter(v => v.status === 'idle').length,
    parked: vehicles.filter(v => v.status === 'parked').length,
    averageBattery: vehicles.length > 0 ? vehicles.reduce((sum, v) => sum + v.battery, 0) / vehicles.length : 0,
    totalTrips: vehicles.reduce((sum, v) => sum + v.tripCount, 0),
    totalDistance: vehicles.reduce((sum, v) => sum + v.totalDistance, 0)
  };

  // 슬롯 통계 계산
  const slotStats = {
    total: slots.length,
    available: slots.filter(s => s.status === 'available').length,
    occupied: slots.filter(s => s.status === 'occupied').length,
    reserved: slots.filter(s => s.status === 'reserved').length,
    disabled: slots.filter(s => s.status === 'disabled').length,
    utilizationRate: slots.length > 0 ? 
      (slots.filter(s => s.status === 'occupied' || s.status === 'reserved').length / slots.length) * 100 : 0,
    dynamicSlots: slots.filter(s => s.type === 'dynamic').length
  };

  // 환경 효과 계산
  const environmentalImpact = {
    co2Saved: vehicleStats.totalTrips * 2.3, // kg
    fuelSaved: vehicleStats.totalTrips * 1.2, // 리터
    costSavings: vehicleStats.totalTrips * 3500 // 원
  };

  // 교통 흐름 지수 계산 (0-100)
  const trafficFlowIndex = Math.max(20, 100 - (slotStats.utilizationRate * 0.8) - (vehicleStats.active / vehicleStats.total * 20));

  const statCards = [
    {
      title: '운행 차량',
      value: vehicleStats.active,
      total: vehicleStats.total,
      icon: '🚗',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      change: calculateChange(vehicleStats.active, vehicleStats.total * 0.3), // 30% 기준
      trend: 'up'
    },
    {
      title: '슬롯 사용률',
      value: `${slotStats.utilizationRate.toFixed(1)}%`,
      icon: '🅿️',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      change: calculateChange(slotStats.utilizationRate, 60), // 60% 기준
      trend: slotStats.utilizationRate > 60 ? 'up' : 'down'
    },
    {
      title: '평균 대기시간',
      value: `${(8.5 + Math.random() * 2).toFixed(1)}분`,
      icon: '⏱️',
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      change: '-15%',
      trend: 'down'
    },
    {
      title: '동적 슬롯',
      value: slotStats.dynamicSlots,
      total: slotStats.total,
      icon: '🔄',
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-600',
      change: `${((slotStats.dynamicSlots / slotStats.total) * 100).toFixed(0)}%`,
      trend: 'neutral'
    }
  ];

  function calculateChange(current: number, baseline: number): string {
    const change = ((current - baseline) / baseline) * 100;
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  const getTrendColor = (trend: string, change: string) => {
    if (trend === 'neutral') return 'text-gray-500';
    if (change.startsWith('+')) return 'text-green-500';
    return 'text-red-500';
  };

  const getTrendIcon = (trend: string, change: string) => {
    if (trend === 'neutral') return '➖';
    if (change.startsWith('+')) return '📈';
    return '📉';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl shadow-card p-6 hover:shadow-lg transition-all duration-300 group"
        >
          {/* 그라디언트 상단 바 */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color} rounded-t-xl`} />
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
                {card.total && (
                  <p className="text-sm text-gray-500 ml-1">
                    / {card.total}
                  </p>
                )}
              </div>
            </div>
            
            <div className={`p-3 rounded-xl ${card.bgColor} group-hover:scale-110 transition-transform duration-300`}>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>

          {/* 진행률 바 (total이 있는 경우) */}
          {card.total && (
            <div className="mb-4">
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div 
                  className={`h-2 rounded-full bg-gradient-to-r ${card.color} transition-all duration-500`}
                  style={{ width: `${(Number(card.value) / Number(card.total)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* 변화량 표시 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className={`text-sm font-semibold ${getTrendColor(card.trend, card.change)}`}>
                {getTrendIcon(card.trend, card.change)} {card.change}
              </span>
            </div>
            <span className="text-gray-500 text-xs">
              vs 기준값
            </span>
          </div>

          {/* 추가 정보 (호버 시 표시) */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            whileHover={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 overflow-hidden"
          >
            {card.title === '운행 차량' && (
              <div>
                대기: {vehicleStats.idle}대 | 주차: {vehicleStats.parked}대
              </div>
            )}
            {card.title === '슬롯 사용률' && (
              <div>
                점유: {slotStats.occupied} | 예약: {slotStats.reserved}
              </div>
            )}
            {card.title === 'CO₂ 절감' && (
              <div>
                연료 절약: {environmentalImpact.fuelSaved.toFixed(1)}L
              </div>
            )}
            {card.title === '동적 슬롯' && (
              <div>
                고정 슬롯: {slotStats.total - slotStats.dynamicSlots}개
              </div>
            )}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsCards;