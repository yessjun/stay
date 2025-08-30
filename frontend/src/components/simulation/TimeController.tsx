// 시간 제어 컴포넌트 - 시뮬레이션 시간 및 속도 제어

import React from 'react';
import { motion } from 'framer-motion';
import { ClockIcon, ArrowRightIcon as ForwardIcon, PlayIcon } from '@heroicons/react/24/outline';

interface TimeControllerProps {
  currentTime: Date;
  speed: 1 | 2 | 5 | 10;
  isRunning: boolean;
  onSpeedChange: (speed: 1 | 2 | 5 | 10) => void;
  onTimeSkip: (hours: number) => void;
}

const TimeController: React.FC<TimeControllerProps> = ({
  currentTime,
  speed,
  isRunning,
  onSpeedChange,
  onTimeSkip
}) => {
  const speedOptions = [1, 2, 5, 10] as const;
  const skipOptions = [
    { hours: 1, label: '+1시간' },
    { hours: 3, label: '+3시간' },
    { hours: 6, label: '+6시간' },
    { hours: 12, label: '+12시간' }
  ];

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
      weekday: 'short',
    });
  };

  const getTimeOfDayInfo = (date: Date) => {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return { period: '오전', icon: '🌅', color: 'text-yellow-600' };
    if (hour >= 12 && hour < 18) return { period: '오후', icon: '☀️', color: 'text-orange-600' };
    if (hour >= 18 && hour < 22) return { period: '저녁', icon: '🌆', color: 'text-purple-600' };
    return { period: '심야', icon: '🌙', color: 'text-blue-600' };
  };

  const timeInfo = getTimeOfDayInfo(currentTime);

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center mb-4">
        <ClockIcon className="h-6 w-6 text-sejong-blue mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">시간 제어</h3>
      </div>

      {/* 현재 시간 표시 */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <span className="text-2xl mr-2">{timeInfo.icon}</span>
            <span className={`text-sm font-medium ${timeInfo.color}`}>
              {timeInfo.period}
            </span>
          </div>
          <div className={`flex items-center text-xs px-2 py-1 rounded-full ${
            isRunning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-1 ${isRunning ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            {isRunning ? '실행중' : '정지됨'}
          </div>
        </div>
        
        <div className="text-3xl font-mono font-bold text-gray-900 mb-1">
          {formatTime(currentTime)}
        </div>
        <div className="text-sm text-gray-600">
          {formatDate(currentTime)}
        </div>
      </div>

      {/* 속도 제어 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">시뮬레이션 속도</label>
          <div className="flex items-center">
            <PlayIcon className="w-4 h-4 text-gray-500 mr-1" />
            <span className="text-sm text-gray-500">x{speed}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {speedOptions.map((speedOption) => (
            <motion.button
              key={speedOption}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSpeedChange(speedOption)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                speed === speedOption
                  ? 'bg-sejong-blue text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={!isRunning}
            >
              x{speedOption}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 시간 스킵 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">빠른 시간 이동</label>
          <ForwardIcon className="w-4 h-4 text-gray-500" />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {skipOptions.map(({ hours, label }) => (
            <motion.button
              key={hours}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTimeSkip(hours)}
              className="py-2 px-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              {label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 시간대별 정보 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600 mb-2">시간대 정보</div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">출근 시간대</span>
            <span className="font-medium">07:00 - 09:00</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">점심 시간대</span>
            <span className="font-medium">12:00 - 13:00</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">퇴근 시간대</span>
            <span className="font-medium">17:00 - 19:00</span>
          </div>
        </div>
      </div>

      {/* 경고 메시지 */}
      {!isRunning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          <div className="text-sm text-yellow-800">
            ⚠️ 시뮬레이션이 일시정지 상태입니다. 상단의 시작 버튼을 눌러 시뮬레이션을 시작하세요.
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TimeController;