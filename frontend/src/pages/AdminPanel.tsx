import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon, 
  MapPinIcon, 
  ClockIcon,
  BellIcon,
  ChartBarIcon,
  CogIcon
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
  const [emergencyMode, setEmergencyMode] = useState(false);

  const zones = [
    { id: 'all', name: '전체 지역' },
    { id: 'government', name: '정부청사' },
    { id: 'residential', name: '주거지역' },
    { id: 'commercial', name: '상업지역' },
    { id: 'brt', name: 'BRT 구간' }
  ];

  const handleEmergencyToggle = () => {
    if (emergencyMode) {
      deactivateEmergencyMode();
    } else {
      activateEmergencyMode();
    }
    setEmergencyMode(!emergencyMode);
  };

  const handleSlotAction = (action: string) => {
    console.log(`관리자 액션: ${action}`);
    // 실제 액션 처리 로직은 여기에 추가
  };

  const handleSlotClick = (slot: any) => {
    console.log('Admin slot click:', slot.id);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (selectedZone === 'all') {
      createSlot({ lat, lng }, 'dynamic');
    }
  };

  const mockTrafficData = [
    { zone: '정부청사', vehicles: 24, utilization: 78, alerts: 2 },
    { zone: '주거지역', vehicles: 18, utilization: 65, alerts: 0 },
    { zone: '상업지역', vehicles: 15, utilization: 45, alerts: 1 },
    { zone: 'BRT구간', vehicles: 12, utilization: 89, alerts: 3 },
  ];

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
          
          {/* 긴급 상황 토글 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleEmergencyToggle}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              emergencyMode
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <ExclamationTriangleIcon className="h-5 w-5" />
            <span>{emergencyMode ? '긴급 모드 해제' : '긴급 모드'}</span>
          </motion.button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 좌측 제어 패널 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 space-y-6"
        >
          {/* 지역 선택 */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPinIcon className="h-5 w-5 mr-2" />
              관리 구역
            </h3>
            <div className="space-y-2">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZone(zone.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedZone === zone.id
                      ? 'bg-sejong-blue text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {zone.name}
                </button>
              ))}
            </div>
          </div>

          {/* 빠른 액션 */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CogIcon className="h-5 w-5 mr-2" />
              빠른 제어
            </h3>
            <div className="space-y-3">
              <button 
                onClick={() => handleSlotAction('모든 슬롯 활성화')}
                className="w-full btn-success text-sm py-2"
              >
                전체 슬롯 활성화
              </button>
              <button 
                onClick={() => handleSlotAction('동적 슬롯 최적화')}
                className="w-full btn-primary text-sm py-2"
              >
                스마트 재배치
              </button>
              <button 
                onClick={() => handleSlotAction('유지보수 모드')}
                className="w-full btn-warning text-sm py-2"
              >
                유지보수 모드
              </button>
            </div>
          </div>

          {/* 시스템 상태 */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">시스템 상태</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">서버 상태</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">정상</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">데이터베이스</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">연결됨</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">API 서비스</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-sm text-yellow-600">부하 중</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 우측 메인 콘텐츠 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 space-y-6"
        >
          {/* 지역별 현황 테이블 */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <ChartBarIcon className="h-6 w-6 mr-2" />
                지역별 교통 현황
              </h3>
              <div className="text-sm text-gray-500">
                실시간 업데이트 • {new Date().toLocaleTimeString('ko-KR')}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">구역</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">활성 차량</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">슬롯 이용률</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">알림</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockTrafficData.map((row, index) => (
                    <motion.tr
                      key={row.zone}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{row.zone}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <span className="text-gray-900">{row.vehicles}</span>
                          <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                row.utilization > 80 ? 'bg-red-500' : 
                                row.utilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${row.utilization}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-700">{row.utilization}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.alerts > 0 ? (
                          <div className="flex items-center text-red-600">
                            <BellIcon className="h-4 w-4 mr-1" />
                            <span className="text-sm">{row.alerts}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-sejong-blue hover:text-blue-700 text-sm font-medium">
                          관리
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 슬롯 관리 인터페이스 */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">동적 슬롯 관리</h3>
            
            {/* 지도 플레이스홀더 */}
            <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center mb-6">
              <div className="text-center">
                <div className="text-4xl mb-4">🗺️</div>
                <p className="text-gray-600">드래그&드롭으로 슬롯 관리</p>
                <p className="text-sm text-gray-500 mt-2">클릭하여 새 슬롯 생성</p>
              </div>
            </div>

            {/* 슬롯 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.slotStats.available}</div>
                <div className="text-sm text-blue-600">사용 가능</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.slotStats.occupied}</div>
                <div className="text-sm text-green-600">사용 중</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.slotStats.reserved}</div>
                <div className="text-sm text-yellow-600">예약됨</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.slotStats.disabled}</div>
                <div className="text-sm text-gray-600">비활성화</div>
              </div>
            </div>
          </div>

          {/* 실시간 알림 */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <BellIcon className="h-6 w-6 mr-2" />
              실시간 알림
            </h3>
            
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {isRunning ? (
                <>
                  <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900">
                        한솔동 구역 슬롯 이용률 85% 초과
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        {new Date().toLocaleTimeString('ko-KR')}
                      </p>
                    </div>
                    <button className="text-yellow-600 hover:text-yellow-700 text-sm">
                      확인
                    </button>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                    <ClockIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        정부청사 구역 새로운 슬롯 자동 할당
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        3분 전
                      </p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 text-sm">
                      확인
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">시뮬레이션을 시작하여 실시간 알림을 받아보세요</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPanel;