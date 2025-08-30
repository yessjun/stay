import { useState, useEffect, useCallback } from 'react';

interface CongestionLevel {
  level: 'low' | 'medium' | 'high' | 'extreme';
  multiplier: number; // 차량 수 배수
  speedFactor: number; // 속도 조정 비율
  description: string;
  color: string;
}

interface TimePattern {
  hour: number;
  congestion: CongestionLevel;
}

export const useTimeBasedCongestion = (currentTime: Date) => {
  const currentHour = currentTime.getHours();
  
  // 세종시 교통 패턴 정의
  const trafficPatterns: TimePattern[] = [
    { hour: 0, congestion: { level: 'low', multiplier: 0.3, speedFactor: 1.2, description: '심야시간', color: '#10B981' } },
    { hour: 1, congestion: { level: 'low', multiplier: 0.2, speedFactor: 1.3, description: '심야시간', color: '#10B981' } },
    { hour: 2, congestion: { level: 'low', multiplier: 0.2, speedFactor: 1.3, description: '심야시간', color: '#10B981' } },
    { hour: 3, congestion: { level: 'low', multiplier: 0.2, speedFactor: 1.3, description: '심야시간', color: '#10B981' } },
    { hour: 4, congestion: { level: 'low', multiplier: 0.3, speedFactor: 1.2, description: '새벽시간', color: '#10B981' } },
    { hour: 5, congestion: { level: 'low', multiplier: 0.4, speedFactor: 1.1, description: '새벽시간', color: '#10B981' } },
    { hour: 6, congestion: { level: 'medium', multiplier: 0.7, speedFactor: 0.9, description: '출근 준비', color: '#F59E0B' } },
    { hour: 7, congestion: { level: 'high', multiplier: 1.2, speedFactor: 0.7, description: '출근 러시아워', color: '#EF4444' } },
    { hour: 8, congestion: { level: 'extreme', multiplier: 1.5, speedFactor: 0.5, description: '출근 피크', color: '#DC2626' } },
    { hour: 9, congestion: { level: 'high', multiplier: 1.1, speedFactor: 0.8, description: '출근 후반', color: '#EF4444' } },
    { hour: 10, congestion: { level: 'medium', multiplier: 0.8, speedFactor: 1.0, description: '오전 업무시간', color: '#F59E0B' } },
    { hour: 11, congestion: { level: 'medium', multiplier: 0.9, speedFactor: 0.95, description: '점심 전', color: '#F59E0B' } },
    { hour: 12, congestion: { level: 'high', multiplier: 1.1, speedFactor: 0.8, description: '점심시간', color: '#EF4444' } },
    { hour: 13, congestion: { level: 'medium', multiplier: 0.9, speedFactor: 0.9, description: '점심시간', color: '#F59E0B' } },
    { hour: 14, congestion: { level: 'medium', multiplier: 0.8, speedFactor: 1.0, description: '오후 업무시간', color: '#F59E0B' } },
    { hour: 15, congestion: { level: 'medium', multiplier: 0.8, speedFactor: 1.0, description: '오후 업무시간', color: '#F59E0B' } },
    { hour: 16, congestion: { level: 'medium', multiplier: 0.9, speedFactor: 0.9, description: '퇴근 준비', color: '#F59E0B' } },
    { hour: 17, congestion: { level: 'high', multiplier: 1.2, speedFactor: 0.7, description: '퇴근 러시아워', color: '#EF4444' } },
    { hour: 18, congestion: { level: 'extreme', multiplier: 1.4, speedFactor: 0.6, description: '퇴근 피크', color: '#DC2626' } },
    { hour: 19, congestion: { level: 'high', multiplier: 1.1, speedFactor: 0.8, description: '퇴근 후반', color: '#EF4444' } },
    { hour: 20, congestion: { level: 'medium', multiplier: 0.8, speedFactor: 0.9, description: '저녁시간', color: '#F59E0B' } },
    { hour: 21, congestion: { level: 'medium', multiplier: 0.7, speedFactor: 1.0, description: '저녁시간', color: '#F59E0B' } },
    { hour: 22, congestion: { level: 'low', multiplier: 0.6, speedFactor: 1.1, description: '야간시간', color: '#10B981' } },
    { hour: 23, congestion: { level: 'low', multiplier: 0.5, speedFactor: 1.2, description: '야간시간', color: '#10B981' } },
  ];

  // 현재 시간의 혼잡도 정보 조회
  const getCurrentCongestion = useCallback((): CongestionLevel => {
    const pattern = trafficPatterns.find(p => p.hour === currentHour);
    return pattern?.congestion || trafficPatterns[0].congestion;
  }, [currentHour, trafficPatterns]);

  // 다음 시간의 혼잡도 정보 조회 (예측)
  const getNextCongestion = useCallback((): CongestionLevel => {
    const nextHour = (currentHour + 1) % 24;
    const pattern = trafficPatterns.find(p => p.hour === nextHour);
    return pattern?.congestion || trafficPatterns[0].congestion;
  }, [currentHour, trafficPatterns]);

  // 시간대별 차량 수 계산
  const calculateVehicleCount = useCallback((baseCount: number): number => {
    const congestion = getCurrentCongestion();
    return Math.round(baseCount * congestion.multiplier);
  }, [getCurrentCongestion]);

  // 시간대별 속도 조정
  const adjustSpeedForCongestion = useCallback((baseSpeed: number): number => {
    const congestion = getCurrentCongestion();
    return baseSpeed * congestion.speedFactor;
  }, [getCurrentCongestion]);


  // 시간대별 주차 수요 예측
  const getParkingDemand = useCallback((): number => {
    const congestion = getCurrentCongestion();
    // 혼잡도가 높을수록 주차 수요도 높음
    switch (congestion.level) {
      case 'extreme': return 0.9;
      case 'high': return 0.75;
      case 'medium': return 0.5;
      case 'low': return 0.3;
      default: return 0.5;
    }
  }, [getCurrentCongestion]);

  // 24시간 교통 패턴 차트 데이터
  const getTrafficChart = useCallback(() => {
    return trafficPatterns.map(pattern => ({
      hour: pattern.hour,
      congestion: pattern.congestion.multiplier,
      level: pattern.congestion.level,
      description: pattern.congestion.description,
      color: pattern.congestion.color
    }));
  }, [trafficPatterns]);

  return {
    currentHour,
    currentTime,
    currentCongestion: getCurrentCongestion(),
    nextCongestion: getNextCongestion(),
    calculateVehicleCount,
    adjustSpeedForCongestion,
    getParkingDemand,
    getTrafficChart,
    
    // 유틸리티 함수들
    isRushHour: () => {
      const congestion = getCurrentCongestion();
      return congestion.level === 'high' || congestion.level === 'extreme';
    },
    
    getRushHourInfo: () => {
      const morningRush = { start: 7, end: 9, type: '출근' };
      const eveningRush = { start: 17, end: 19, type: '퇴근' };
      const lunchRush = { start: 12, end: 13, type: '점심' };
      
      if (currentHour >= morningRush.start && currentHour <= morningRush.end) {
        return morningRush;
      } else if (currentHour >= eveningRush.start && currentHour <= eveningRush.end) {
        return eveningRush;
      } else if (currentHour >= lunchRush.start && currentHour <= lunchRush.end) {
        return lunchRush;
      }
      return null;
    }
  };
};