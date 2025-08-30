// 차량 마커 컴포넌트 - 지도 상의 차량 표시 및 애니메이션

import React, { useState } from 'react';
import { Marker } from 'react-map-gl';
import type { MapRef } from 'react-map-gl';
import { motion } from 'framer-motion';
import { Vehicle } from '@/types/vehicle';
import { BoltIcon as BatteryIcon, UserIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import CustomPopup from './CustomPopup';

interface VehicleMarkerProps {
  vehicle: Vehicle;
  mapRef: MapRef | null;
  onClick?: () => void;
}

const VehicleMarker: React.FC<VehicleMarkerProps> = ({ vehicle, mapRef, onClick }) => {
  const [showPopup, setShowPopup] = useState(false);

  // 차량 상태에 따른 색상 및 아이콘 결정
  const getVehicleStyle = (status: Vehicle['status']) => {
    switch (status) {
      case 'moving':
        return {
          color: '#3B82F6', // blue-500
          icon: '🚗',
          pulse: true,
          label: '이동중'
        };
      case 'idle':
        return {
          color: '#6B7280', // gray-500
          icon: '🚙',
          pulse: false,
          label: '대기중'
        };
      case 'picking':
        return {
          color: '#F59E0B', // yellow-500
          icon: '🚖',
          pulse: true,
          label: '승차중'
        };
      case 'dropping':
        return {
          color: '#EF4444', // red-500
          icon: '🚕',
          pulse: true,
          label: '하차중'
        };
      case 'parked':
        return {
          color: '#10B981', // green-500
          icon: '🅿️',
          pulse: false,
          label: '주차중'
        };
      default:
        return {
          color: '#6B7280',
          icon: '🚗',
          pulse: false,
          label: '알수없음'
        };
    }
  };

  const vehicleStyle = getVehicleStyle(vehicle.status);

  // 배터리 레벨에 따른 색상
  const getBatteryColor = (battery: number) => {
    if (battery > 60) return '#10B981'; // green
    if (battery > 30) return '#F59E0B'; // yellow
    if (battery > 10) return '#EF4444'; // red
    return '#7C2D12'; // red-900
  };

  // 효율성에 따른 등급
  const getEfficiencyGrade = (efficiency: number) => {
    if (efficiency >= 90) return 'A+';
    if (efficiency >= 80) return 'A';
    if (efficiency >= 70) return 'B';
    if (efficiency >= 60) return 'C';
    return 'D';
  };

  const formatDistance = (distance: number) => {
    return distance > 0 ? `${distance.toFixed(1)}km` : '0km';
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}초 전`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    return `${hours}시간 전`;
  };

  return (
    <>
      <Marker
        longitude={vehicle.position.lng}
        latitude={vehicle.position.lat}
        anchor="center"
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setShowPopup(true);
          onClick?.();
        }}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: 1,
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          className="relative cursor-pointer"
        >
          {/* 차량 아이콘 */}
          <div
            className={`relative w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white transition-all duration-300 ${
              vehicleStyle.pulse ? 'animate-pulse' : ''
            }`}
            style={{ backgroundColor: vehicleStyle.color }}
          >
            <span className="text-sm">{vehicleStyle.icon}</span>
            
            {/* 승객 표시 */}
            {vehicle.passenger && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                <UserIcon className="w-2 h-2 text-white" />
              </div>
            )}
            
            {/* 배터리 부족 경고 */}
            {vehicle.battery < 20 && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-xs text-white">!</span>
              </div>
            )}
          </div>

          {/* 움직임 표시 (이동 중일 때) */}
          {vehicle.status === 'moving' && vehicle.destination && (
            <motion.div
              className="absolute -top-6 left-1/2 transform -translate-x-1/2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <div className="flex items-center bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                <MapPinIcon className="w-3 h-3 mr-1" />
                목적지 이동중
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-500"></div>
            </motion.div>
          )}
        </motion.div>
      </Marker>

      {/* 커스텀 팝업 */}
      <CustomPopup
        position={vehicle.position}
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        mapRef={mapRef}
        maxWidth="280px"
        className="vehicle-popup"
      >
        <div className="p-3 min-w-64">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm mr-2"
                style={{ backgroundColor: vehicleStyle.color }}
              >
                {vehicleStyle.icon}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{vehicle.id}</div>
                <div className="text-xs text-gray-500">{vehicleStyle.label}</div>
              </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              vehicle.status === 'moving' ? 'bg-blue-100 text-blue-700' :
              vehicle.status === 'idle' ? 'bg-gray-100 text-gray-700' :
              'bg-orange-100 text-orange-700'
            }`}>
              {vehicleStyle.label}
            </div>
          </div>

          {/* 상세 정보 */}
          <div className="space-y-2">
            {/* 배터리 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600">
                <BatteryIcon className="w-4 h-4 mr-1" />
                배터리
              </div>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${vehicle.battery}%`,
                      backgroundColor: getBatteryColor(vehicle.battery)
                    }}
                  />
                </div>
                <span className="text-sm font-medium">{Math.round(vehicle.battery)}%</span>
              </div>
            </div>

            {/* 속도 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">속도</span>
              <span className="text-sm font-medium">{Math.round(vehicle.speed)} km/h</span>
            </div>

            {/* 총 주행거리 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">총 거리</span>
              <span className="text-sm font-medium">{formatDistance(vehicle.totalDistance)}</span>
            </div>

            {/* 여행 횟수 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">완료 여행</span>
              <span className="text-sm font-medium">{vehicle.tripCount}회</span>
            </div>

            {/* 효율성 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">효율성</span>
              <span className={`text-sm font-bold px-2 py-1 rounded ${
                vehicle.efficiency >= 80 ? 'bg-green-100 text-green-700' :
                vehicle.efficiency >= 60 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {getEfficiencyGrade(vehicle.efficiency)}
              </span>
            </div>
          </div>

          {/* 승객 정보 */}
          {vehicle.passenger && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center text-sm text-orange-600">
                <UserIcon className="w-4 h-4 mr-1" />
                승객 탑승 중
              </div>
            </div>
          )}

          {/* 목적지 정보 */}
          {vehicle.destination && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center text-sm text-blue-600 mb-1">
                <MapPinIcon className="w-4 h-4 mr-1" />
                목적지
              </div>
              <div className="text-xs text-gray-500 ml-5">
                위도: {vehicle.destination.lat.toFixed(4)}<br/>
                경도: {vehicle.destination.lng.toFixed(4)}
              </div>
            </div>
          )}

          {/* 마지막 업데이트 */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center">
                <ClockIcon className="w-3 h-3 mr-1" />
                마지막 업데이트
              </div>
              <span>{formatLastUpdate(vehicle.lastUpdate)}</span>
            </div>
          </div>
        </div>
      </CustomPopup>
    </>
  );
};

export default VehicleMarker;