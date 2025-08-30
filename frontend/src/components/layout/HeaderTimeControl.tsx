// 헤더 시간 제어 컴포넌트 - 컴팩트한 수평형 디자인

import React from 'react';
import { motion } from 'framer-motion';
import { ClockIcon, ArrowRightIcon as ForwardIcon, PlayIcon } from '@heroicons/react/24/outline';

interface HeaderTimeControlProps {
  currentTime: Date;
  speed: 1 | 2 | 5 | 10;
  isRunning: boolean;
  onSpeedChange: (speed: 1 | 2 | 5 | 10) => void;
  onTimeSkip: (hours: number) => void;
}

const HeaderTimeControl: React.FC<HeaderTimeControlProps> = ({
  currentTime,
  speed,
  isRunning,
  onSpeedChange,
  onTimeSkip
}) => {
  const speedOptions = [1, 2, 5, 10] as const;
  const skipOptions = [1, 3, 6];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getTimeOfDay = (date: Date) => {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return { icon: '🌅', period: '오전' };
    if (hour >= 12 && hour < 18) return { icon: '☀️', period: '오후' };
    if (hour >= 18 && hour < 22) return { icon: '🌆', period: '저녁' };
    return { icon: '🌙', period: '심야' };
  };

  const timeInfo = getTimeOfDay(currentTime);

  return (
    <div className="flex items-center justify-between py-3">
      {/* 좌측: 현재 시간 */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">시뮬레이션 시간</span>
        </div>
        
        <div className="flex items-center space-x-3 bg-white rounded-lg px-4 py-2 shadow-sm border">
          <span className="text-xl">{timeInfo.icon}</span>
          <div>
            <div className="text-lg font-mono font-bold text-gray-900">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-gray-500">
              {timeInfo.period} • {currentTime.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* 중앙: 속도 제어 */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 text-sm text-gray-600">
          <PlayIcon className="w-4 h-4" />
          <span>속도</span>
        </div>
        
        <div className="flex items-center space-x-1 bg-white rounded-lg p-1 shadow-sm border">
          {speedOptions.map((speedOption) => (
            <motion.button
              key={speedOption}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSpeedChange(speedOption)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                speed === speedOption
                  ? 'bg-sejong-blue text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={!isRunning}
            >
              x{speedOption}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 우측: 빠른 시간 이동 */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 text-sm text-gray-600">
          <ForwardIcon className="w-4 h-4" />
          <span>시간 점프</span>
        </div>
        
        <div className="flex items-center space-x-1">
          {skipOptions.map((hours) => (
            <motion.button
              key={hours}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTimeSkip(hours)}
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
            >
              +{hours}h
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeaderTimeControl;