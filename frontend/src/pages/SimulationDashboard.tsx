import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulation } from '@/hooks/useSimulation';
import { useSimulationStore } from '@/stores/simulationStore';
import { Vehicle, Coordinate } from '@/types/vehicle';
import { ParkingSlot } from '@/types/slot';
import CrossroadSimulator from '@/components/simulation/CrossroadSimulator';
import { SEJONG_CENTER } from '@/constants/sejongLocations';

const SimulationDashboard = () => {
  const { 
    currentTime, 
    speed, 
    isRunning, 
    vehicles,
    slots
  } = useSimulation();
  const { stats } = useSimulationStore();
  
  const mapRef = useRef<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light');

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

  // 차량 클릭 핸들러
  const handleVehicleClick = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setSelectedSlot(null);
    console.log('Vehicle clicked:', vehicle.id);
  }, []);

  // 슬롯 클릭 핸들러
  const handleSlotClick = useCallback((slot: ParkingSlot) => {
    setSelectedSlot(slot);
    setSelectedVehicle(null);
    console.log('Slot clicked:', slot.id);
  }, []);

  // 지도 클릭 핸들러
  const handleMapClick = useCallback((coordinate: Coordinate) => {
    setSelectedVehicle(null);
    setSelectedSlot(null);
    console.log('Map clicked at:', coordinate);
  }, []);

  // 정보 패널 닫기
  const handleCloseInfoPanel = useCallback(() => {
    setSelectedVehicle(null);
    setSelectedSlot(null);
  }, []);

  // 차량 정보 렌더링
  const renderVehicleInfo = (vehicle: Vehicle) => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div className={`w-4 h-4 rounded-full ${
          vehicle.status === 'moving' ? 'bg-blue-500' :
          vehicle.status === 'idle' ? 'bg-gray-500' :
          vehicle.status === 'parked' ? 'bg-green-500' :
          'bg-orange-500'
        }`}></div>
        <span className="font-medium">{vehicle.id}</span>
        <span className="text-sm text-gray-500 capitalize">{vehicle.status}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-600">배터리</span>
          <div className="font-semibold">{Math.round(vehicle.battery)}%</div>
        </div>
        <div>
          <span className="text-gray-600">속도</span>
          <div className="font-semibold">{Math.round(vehicle.speed)} km/h</div>
        </div>
        <div>
          <span className="text-gray-600">총 거리</span>
          <div className="font-semibold">{vehicle.totalDistance.toFixed(1)} km</div>
        </div>
        <div>
          <span className="text-gray-600">완료 여행</span>
          <div className="font-semibold">{vehicle.tripCount}회</div>
        </div>
      </div>
      
      {vehicle.passenger && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-sm">
          <span className="text-orange-600 font-medium">👤 승객 탑승 중</span>
        </div>
      )}
      
      <div className="flex space-x-2">
        <button
          onClick={() => console.log('Focus on vehicle:', vehicle.id)}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
        >
          차량 포커스
        </button>
        <button
          onClick={() => console.log('Track vehicle:', vehicle.id)}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
        >
          추적하기
        </button>
      </div>
    </div>
  );

  // 슬롯 정보 렌더링
  const renderSlotInfo = (slot: ParkingSlot) => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div className={`w-4 h-4 rounded ${
          slot.status === 'available' ? 'bg-green-500' :
          slot.status === 'occupied' ? 'bg-red-500' :
          slot.status === 'reserved' ? 'bg-yellow-500' :
          slot.status === 'disabled' ? 'bg-gray-500' :
          'bg-purple-500'
        }`}></div>
        <span className="font-medium">{slot.id}</span>
        <span className="text-sm text-gray-500 capitalize">{slot.status}</span>
      </div>
      
      <div className="text-sm text-gray-600 mb-2">{slot.roadSection}</div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-600">타입</span>
          <div className="font-semibold capitalize">{slot.type}</div>
        </div>
        <div>
          <span className="text-gray-600">방향</span>
          <div className="font-semibold capitalize">{slot.direction}</div>
        </div>
        <div>
          <span className="text-gray-600">용량</span>
          <div className="font-semibold">{slot.occupiedCount}/{slot.capacity}</div>
        </div>
        <div>
          <span className="text-gray-600">우선순위</span>
          <div className="font-semibold">{slot.priority}/10</div>
        </div>
      </div>
      
      <div>
        <span className="text-gray-600 text-sm">이용률</span>
        <div className="flex items-center space-x-2 mt-1">
          <div className="flex-1 h-2 bg-gray-200 rounded-full">
            <div 
              className={`h-2 rounded-full ${
                slot.utilizationRate > 80 ? 'bg-red-500' :
                slot.utilizationRate > 60 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${slot.utilizationRate}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium">{slot.utilizationRate.toFixed(1)}%</span>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => console.log('Focus on slot:', slot.id)}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
        >
          슬롯 포커스
        </button>
        {slot.status === 'available' && (
          <button
            onClick={() => console.log('Reserve slot:', slot.id)}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
          >
            예약하기
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
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


        {/* 메인 지도 영역 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-card overflow-hidden relative"
          style={{ height: 'calc(100vh - 200px)' }}
        >

          {/* 교차로 시뮬레이션 뷰 */}
          <CrossroadSimulator
            vehicles={vehicles}
            slots={slots}
            currentTime={currentTime}
            speed={speed}
            isRunning={isRunning}
            onVehicleClick={handleVehicleClick}
            onSlotClick={handleSlotClick}
            className="w-full h-full"
          />
        </motion.div>
        
        {/* 선택된 객체 정보 패널 */}
        <AnimatePresence>
          {(selectedVehicle || selectedSlot) && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed top-20 right-4 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedVehicle ? '차량 정보' : '슬롯 정보'}
                  </h3>
                  <button
                    onClick={handleCloseInfoPanel}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                {selectedVehicle && renderVehicleInfo(selectedVehicle)}
                {selectedSlot && renderSlotInfo(selectedSlot)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SimulationDashboard;