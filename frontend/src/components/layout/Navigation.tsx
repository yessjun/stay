import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  CogIcon, 
  PresentationChartBarIcon
} from '@heroicons/react/24/outline';
import { useSimulationStore } from '@/stores/simulationStore';
import { useSimulation } from '@/hooks/useSimulation';
import CompactTimeControl from './CompactTimeControl';

const Navigation = () => {
  const location = useLocation();
  const { isRunning, toggleSimulation } = useSimulationStore();
  const { currentTime, speed, changeSpeed, skipToTime } = useSimulation();

  const navItems = [
    {
      path: '/',
      label: '시뮬레이션 대시보드',
      icon: ChartBarIcon,
      description: '실시간 차량 및 슬롯 모니터링'
    },
    {
      path: '/admin',
      label: '지자체 관리자',
      icon: CogIcon,
      description: '슬롯 관리 및 시스템 제어'
    },
    {
      path: '/impact',
      label: '기대효과',
      icon: PresentationChartBarIcon,
      description: '스마트시티 솔루션 효과'
    }
  ];

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      {/* 메인 네비게이션 바 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 및 제목 */}
          <div className="flex items-center space-x-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-sejong-blue to-smart-green rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">STAY</h1>
                <p className="text-xs text-gray-500">세종시 스마트 모빌리티</p>
              </div>
            </motion.div>
          </div>

          {/* 네비게이션 메뉴 */}
          <div className="flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative group"
                >
                  <motion.div
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-sejong-blue text-white shadow-lg'
                        : 'text-gray-600 hover:text-sejong-blue hover:bg-blue-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </motion.div>
                  
                  {/* 툴팁 */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {item.description}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* 시뮬레이션 제어 영역 */}
          <div className="flex items-center space-x-3">
            {/* 컴팩트 시간 제어 (드롭다운에 시작/정지 포함) */}
            <CompactTimeControl
              currentTime={currentTime}
              speed={speed}
              isRunning={isRunning}
              onSpeedChange={changeSpeed}
              onTimeSkip={skipToTime}
              onToggleSimulation={toggleSimulation}
            />
            
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-gray-600">
                {isRunning ? '실행 중' : '정지됨'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;