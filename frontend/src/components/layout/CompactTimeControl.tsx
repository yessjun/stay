// 컴팩트 시간 제어 컴포넌트 - 드롭다운 방식의 미니 시간 제어

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClockIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  PlayIcon,
  PauseIcon,
  ArrowRightIcon as ForwardIcon 
} from '@heroicons/react/24/outline';

interface CompactTimeControlProps {
  currentTime: Date;
  speed: 1 | 2 | 5 | 10 | 30;
  isRunning: boolean;
  onSpeedChange: (speed: 1 | 2 | 5 | 10 | 30) => void;
  onTimeSkip: (hours: number) => void;
  onToggleSimulation: () => void;
}

const CompactTimeControl: React.FC<CompactTimeControlProps> = ({
  currentTime,
  speed,
  isRunning,
  onSpeedChange,
  onTimeSkip,
  onToggleSimulation
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const speedOptions = [1, 2, 5, 10, 30] as const;
  const skipOptions = [1, 3, 6];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getTimeIcon = (date: Date) => {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return '🌅';
    if (hour >= 12 && hour < 18) return '☀️';
    if (hour >= 18 && hour < 22) return '🌆';
    return '🌙';
  };

  // 외부 클릭시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 메인 시간 표시 버튼 */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
          isSkipping 
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
        }`}
      >
        <span className="text-sm">{getTimeIcon(currentTime)}</span>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-mono font-medium text-gray-900">
            {formatTime(currentTime)}
          </span>
          {isSkipping && (
            <div className="flex items-center">
              <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full mr-1"></div>
              <span className="text-xs text-blue-600 font-medium">빨리감기</span>
            </div>
          )}
          {!isSkipping && isRunning && speed > 1 && (
            <span className="text-xs text-blue-600 font-medium">
              x{speed}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUpIcon className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronDownIcon className="w-3 h-3 text-gray-500" />
        )}
      </motion.button>

      {/* 드롭다운 메뉴 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
          >
            <div className="p-4">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">시뮬레이션 제어</span>
                </div>
                
                {/* 시작/일시정지 버튼 */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onToggleSimulation();
                    setIsOpen(false); // 토글 후 드롭다운 닫기
                  }}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-md font-medium transition-all duration-200 text-sm ${
                    isRunning
                      ? 'bg-alert-orange text-white hover:bg-orange-600'
                      : 'bg-smart-green text-white hover:bg-green-600'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <PauseIcon className="h-3 w-3" />
                      <span>일시정지</span>
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-3 w-3" />
                      <span>시작</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* 현재 시간 정보 */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getTimeIcon(currentTime)}</span>
                    <div>
                      <div className="text-lg font-mono font-bold text-gray-900">
                        {formatTime(currentTime)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {currentTime.toLocaleDateString('ko-KR', { 
                          month: 'short', 
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    isRunning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {isRunning ? `실행중 (x${speed})` : '정지됨'}
                  </div>
                </div>
              </div>

              {/* 속도 제어 */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <PlayIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">시뮬레이션 속도</span>
                </div>
                
                <div className="grid grid-cols-5 gap-1 bg-gray-50 rounded-lg p-1">
                  {speedOptions.map((speedOption) => (
                    <motion.button
                      key={speedOption}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onSpeedChange(speedOption)}
                      className={`px-2 py-2 rounded-md text-sm font-medium transition-all ${
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
                
                {!isRunning && (
                  <p className="text-xs text-gray-500 mt-1">
                    시뮬레이션을 시작해야 속도를 조절할 수 있습니다
                  </p>
                )}
              </div>

              {/* 시간 점프 */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <ForwardIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">시간 점프</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {skipOptions.map((hours) => (
                    <motion.button
                      key={hours}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        setIsSkipping(true);
                        try {
                          await onTimeSkip(hours);
                        } finally {
                          setIsSkipping(false);
                          setIsOpen(false); // 시간 점프 후 드롭다운 닫기
                        }
                      }}
                      disabled={isSkipping}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                        isSkipping 
                          ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                      }`}
                    >
                      {isSkipping ? (
                        <div className="flex items-center">
                          <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full mr-1"></div>
                          <span>빨리감기</span>
                        </div>
                      ) : (
                        `+${hours}시간`
                      )}
                    </motion.button>
                  ))}
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  {isSkipping 
                    ? '시뮬레이션을 빠르게 실행하여 시간을 이동 중입니다...' 
                    : '실제 시뮬레이션을 실행하며 시간을 빠르게 이동합니다'
                  }
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompactTimeControl;