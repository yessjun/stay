// 슬롯 마커 컴포넌트 - 지도 상의 정차 슬롯 표시 및 인터랙션

import React, { useState } from 'react';
import { Marker } from 'react-map-gl';
import type { MapRef } from 'react-map-gl';
import { motion } from 'framer-motion';
import { ParkingSlot } from '@/types/slot';
import { 
  MapPinIcon, 
  ClockIcon, 
  CalendarIcon, 
  StarIcon,
  ExclamationTriangleIcon,
  WrenchIcon as WrenchScrewdriverIcon,
  CheckIcon as CheckCircleIcon
} from '@heroicons/react/24/outline';
import CustomPopup from './CustomPopup';

interface SlotMarkerProps {
  slot: ParkingSlot;
  mapRef: MapRef | null;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

const SlotMarker: React.FC<SlotMarkerProps> = ({ slot, mapRef, onClick, onDoubleClick }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 슬롯 상태에 따른 색상 및 아이콘 결정
  const getSlotStyle = (status: ParkingSlot['status']) => {
    switch (status) {
      case 'available':
        return {
          color: '#10B981', // green-500
          icon: '🅿️',
          borderColor: '#059669', // green-600
          label: '사용가능',
          bgOpacity: 0.9
        };
      case 'occupied':
        return {
          color: '#EF4444', // red-500
          icon: '🚗',
          borderColor: '#DC2626', // red-600
          label: '사용중',
          bgOpacity: 0.9
        };
      case 'reserved':
        return {
          color: '#F59E0B', // yellow-500
          icon: '📅',
          borderColor: '#D97706', // yellow-600
          label: '예약됨',
          bgOpacity: 0.9
        };
      case 'disabled':
        return {
          color: '#6B7280', // gray-500
          icon: '🚫',
          borderColor: '#4B5563', // gray-600
          label: '비활성화',
          bgOpacity: 0.6
        };
      case 'maintenance':
        return {
          color: '#8B5CF6', // violet-500
          icon: '🔧',
          borderColor: '#7C3AED', // violet-600
          label: '정비중',
          bgOpacity: 0.8
        };
      default:
        return {
          color: '#6B7280',
          icon: '❓',
          borderColor: '#4B5563',
          label: '알수없음',
          bgOpacity: 0.7
        };
    }
  };

  const slotStyle = getSlotStyle(slot.status);

  // 타입에 따른 모양
  const getSlotShape = (type: ParkingSlot['type']) => {
    return type === 'dynamic' ? 'rounded' : 'square';
  };

  // 우선순위에 따른 크기
  const getSlotSize = (priority: number) => {
    if (priority >= 8) return 'w-10 h-10';
    if (priority >= 5) return 'w-8 h-8';
    return 'w-6 h-6';
  };

  // 이용률에 따른 테두리 스타일
  const getBorderStyle = (utilizationRate: number) => {
    if (utilizationRate > 80) return 'border-4';
    if (utilizationRate > 50) return 'border-3';
    return 'border-2';
  };

  const formatDate = (date?: Date) => {
    if (!date) return '없음';
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type: ParkingSlot['type']) => {
    return type === 'dynamic' ? '동적 슬롯' : '고정 슬롯';
  };

  const getDirectionIcon = (direction: ParkingSlot['direction']) => {
    switch (direction) {
      case 'north': return '⬆️';
      case 'south': return '⬇️';
      case 'east': return '➡️';
      case 'west': return '⬅️';
      default: return '🧭';
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate > 80) return 'text-red-600';
    if (rate > 60) return 'text-yellow-600';
    if (rate > 40) return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <>
      <Marker
        longitude={slot.position.lng}
        latitude={slot.position.lat}
        anchor="center"
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setShowPopup(true);
          onClick?.();
        }}
        onDoubleClick={(e) => {
          e.originalEvent.stopPropagation();
          onDoubleClick?.();
        }}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: slotStyle.bgOpacity,
          }}
          whileHover={{ 
            scale: 1.3,
            transition: { duration: 0.2 }
          }}
          whileTap={{ scale: 0.9 }}
          className="relative cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* 슬롯 아이콘 */}
          <div
            className={`
              ${getSlotSize(slot.priority)} 
              ${getSlotShape(slot.type) === 'rounded' ? 'rounded-full' : 'rounded-lg'} 
              ${getBorderStyle(slot.utilizationRate)}
              flex items-center justify-center text-white font-bold shadow-lg transition-all duration-300
            `}
            style={{ 
              backgroundColor: slotStyle.color,
              borderColor: slotStyle.borderColor
            }}
          >
            <span className="text-xs">{slotStyle.icon}</span>
          </div>

          {/* 용량 표시 */}
          <div 
            className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border-2 flex items-center justify-center text-xs font-bold"
            style={{ borderColor: slotStyle.borderColor }}
          >
            <span style={{ color: slotStyle.color }}>
              {slot.occupiedCount}/{slot.capacity}
            </span>
          </div>

          {/* 우선순위 별표 (높은 우선순위만) */}
          {slot.priority >= 8 && (
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
              <StarIcon className="w-2 h-2 text-yellow-800" />
            </div>
          )}

          {/* 경고 표시 (이용률 높음) */}
          {slot.utilizationRate > 90 && slot.status === 'available' && (
            <motion.div 
              className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <ExclamationTriangleIcon className="w-2 h-2 text-white" />
            </motion.div>
          )}

          {/* 호버 시 정보 */}
          {isHovered && (
            <motion.div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
            >
              {slot.roadSection} • {slotStyle.label}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
            </motion.div>
          )}
        </motion.div>
      </Marker>

      {/* 커스텀 팝업 */}
      <CustomPopup
        position={slot.position}
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        mapRef={mapRef}
        maxWidth="300px"
        className="slot-popup"
      >
          <div className="p-4 min-w-72">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg mr-3 border-2"
                  style={{ 
                    backgroundColor: slotStyle.color,
                    borderColor: slotStyle.borderColor
                  }}
                >
                  {slotStyle.icon}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{slot.id}</div>
                  <div className="text-sm text-gray-500">{slot.roadSection}</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                slot.status === 'available' ? 'bg-green-100 text-green-700' :
                slot.status === 'occupied' ? 'bg-red-100 text-red-700' :
                slot.status === 'reserved' ? 'bg-yellow-100 text-yellow-700' :
                slot.status === 'disabled' ? 'bg-gray-100 text-gray-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {slotStyle.label}
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">타입</div>
                  <div className="flex items-center text-sm font-medium">
                    {slot.type === 'dynamic' ? '🔄' : '📍'}
                    <span className="ml-1">{getTypeLabel(slot.type)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">방향</div>
                  <div className="flex items-center text-sm font-medium">
                    {getDirectionIcon(slot.direction)}
                    <span className="ml-1 capitalize">{slot.direction}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">우선순위</div>
                  <div className="flex items-center">
                    {[...Array(10)].map((_, i) => (
                      <StarIcon 
                        key={i}
                        className={`w-3 h-3 ${
                          i < slot.priority ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium">{slot.priority}/10</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">용량</div>
                  <div className="text-lg font-bold">
                    <span className="text-blue-600">{slot.occupiedCount}</span>
                    <span className="text-gray-400"> / </span>
                    <span className="text-gray-700">{slot.capacity}</span>
                  </div>
                </div>
              </div>

              {/* 이용률 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">이용률</span>
                  <span className={`text-sm font-bold ${getUtilizationColor(slot.utilizationRate)}`}>
                    {slot.utilizationRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full">
                  <div 
                    className="h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${slot.utilizationRate}%`,
                      backgroundColor: slot.utilizationRate > 80 ? '#EF4444' : 
                                     slot.utilizationRate > 60 ? '#F59E0B' : '#10B981'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 시간 정보 */}
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  생성일
                </div>
                <span className="text-sm">{formatDate(slot.createdAt)}</span>
              </div>
              
              {slot.lastUsed && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    마지막 사용
                  </div>
                  <span className="text-sm">{formatDate(slot.lastUsed)}</span>
                </div>
              )}

              {slot.timeWindow && (
                <div className="bg-blue-50 rounded-lg p-3 mt-3">
                  <div className="text-sm font-medium text-blue-800 mb-1">운영 시간</div>
                  <div className="text-sm text-blue-600">
                    {slot.timeWindow.start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    {' ~ '}
                    {slot.timeWindow.end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>

            {/* 제약사항 */}
            {slot.restrictions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-800 mb-2">제약사항</div>
                <div className="space-y-1 text-xs text-gray-600">
                  {slot.restrictions.vehicleTypes?.length > 0 && (
                    <div>차량 타입: {slot.restrictions.vehicleTypes.join(', ')}</div>
                  )}
                  {slot.restrictions.timeRestrictions?.length > 0 && (
                    <div>시간 제한: {slot.restrictions.timeRestrictions.join(', ')}</div>
                  )}
                  {slot.restrictions.weatherRestrictions?.length > 0 && (
                    <div>날씨 제한: {slot.restrictions.weatherRestrictions.join(', ')}</div>
                  )}
                </div>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
              {slot.status === 'available' && (
                <button className="flex-1 bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600 transition-colors">
                  예약하기
                </button>
              )}
              
              {slot.status === 'disabled' && slot.type === 'dynamic' && (
                <button className="flex-1 bg-green-500 text-white py-2 px-3 rounded text-sm hover:bg-green-600 transition-colors">
                  <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                  활성화
                </button>
              )}
              
              {(slot.status === 'available' || slot.status === 'occupied') && (
                <button className="flex-1 bg-orange-500 text-white py-2 px-3 rounded text-sm hover:bg-orange-600 transition-colors">
                  <WrenchScrewdriverIcon className="w-4 h-4 inline mr-1" />
                  정비모드
                </button>
              )}
            </div>

            {/* 좌표 정보 */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  <MapPinIcon className="w-3 h-3 mr-1" />
                  좌표
                </div>
                <span>
                  {slot.position.lat.toFixed(6)}, {slot.position.lng.toFixed(6)}
                </span>
              </div>
            </div>
          </div>
        </CustomPopup>
    </>
  );
};

export default SlotMarker;