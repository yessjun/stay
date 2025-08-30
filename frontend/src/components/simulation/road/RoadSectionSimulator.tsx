import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Vehicle } from '@/types/vehicle';
import { ParkingSlot } from '@/types/slot';
import { useVehicleSimulation } from '@/hooks/useVehicleSimulation';
import { useTimeBasedCongestion } from '@/hooks/useTimeBasedCongestion';

interface RoadSectionProps {
  vehicles: Vehicle[];
  slots: ParkingSlot[];
  currentTime: Date;
  speed: number;
  isRunning: boolean;
  onVehicleClick?: (vehicle: Vehicle) => void;
  onSlotClick?: (slot: ParkingSlot) => void;
  className?: string;
}

interface RoadLayout {
  width: number;
  height: number;
  lanes: number;
  laneWidth: number;
  roadLength: number;
  parkingAreas: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    capacity: number;
  }[];
}

const RoadSectionSimulator: React.FC<RoadSectionProps> = ({
  vehicles,
  slots,
  currentTime,
  speed,
  isRunning,
  onVehicleClick,
  onSlotClick,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // 한누리대로 T자형 교차로 구간 레이아웃 정의
  const roadLayout: RoadLayout = {
    width: 1000,
    height: 400,
    lanes: 4,
    laneWidth: 35,
    roadLength: 800,
    parkingAreas: [
      { id: 'P1', x: 120, y: 15, width: 100, height: 25, capacity: 5 },
      { id: 'P2', x: 300, y: 15, width: 100, height: 25, capacity: 5 },
      { id: 'P3', x: 500, y: 15, width: 100, height: 25, capacity: 5 },
      { id: 'P4', x: 120, y: 340, width: 100, height: 25, capacity: 5 },
      { id: 'P5', x: 300, y: 340, width: 100, height: 25, capacity: 5 },
      { id: 'P6', x: 500, y: 340, width: 100, height: 25, capacity: 5 },
      { id: 'P7', x: 750, y: 180, width: 25, height: 80, capacity: 4 }, // 교차로 근처 세로 주차
    ]
  };

  // 시간대별 혼잡도 시스템 사용
  const {
    currentHour,
    currentCongestion,
    nextCongestion,
    calculateVehicleCount,
    adjustSpeedForCongestion,
    getParkingDemand,
    isRushHour,
    getRushHourInfo
  } = useTimeBasedCongestion(currentTime);

  // 시간대에 따른 차량 수 조정
  const adjustedVehicleCount = Math.min(calculateVehicleCount(vehicles.length), 15);
  const activeVehicles = vehicles.slice(0, adjustedVehicleCount);

  // 차량 시뮬레이션 훅 사용
  const { vehicleStates, getVehiclePosition } = useVehicleSimulation(
    activeVehicles,
    {
      width: roadLayout.width,
      height: roadLayout.height,
      lanes: roadLayout.lanes,
      laneWidth: roadLayout.laneWidth,
      roadStart: 50,
      roadEnd: 750
    },
    isRunning,
    speed // 시뮬레이션 속도 전달
  );

  // 교통 흐름 데이터 계산
  const calculateTrafficFlow = () => {
    const segments = 20; // 도로를 20개 구간으로 나누어 분석
    const segmentWidth = roadLayout.roadLength / segments;
    const flowData = [];

    for (let i = 0; i < segments; i++) {
      const segmentStart = 50 + i * segmentWidth; // 도로 시작점 조정
      const segmentEnd = segmentStart + segmentWidth;
      
      // 이 구간에 있는 차량들 찾기
      const vehiclesInSegment = vehicleStates.filter(vehicle => 
        vehicle.x >= segmentStart && vehicle.x <= segmentEnd
      );
      
      const avgSpeed = vehiclesInSegment.length > 0 
        ? vehiclesInSegment.reduce((sum, v) => sum + v.speed, 0) / vehiclesInSegment.length
        : 50; // 기본 속도
      
      const density = vehiclesInSegment.length / roadLayout.lanes;
      
      // 교통 흐름 점수 계산 (0-100)
      const flowScore = Math.min(100, (avgSpeed / 60) * 100 - (density * 10));
      
      flowData.push({
        x: segmentStart,
        width: segmentWidth,
        avgSpeed,
        density,
        flowScore,
        vehicleCount: vehiclesInSegment.length
      });
    }
    
    return flowData;
  };

  // 교통 흐름 히트맵 렌더링
  const renderTrafficHeatmap = () => {
    if (!showHeatmap) return null;
    
    const flowData = calculateTrafficFlow();
    
    return (
      <g opacity={0.4}>
        {roadLayout.lanes > 0 && Array.from({ length: roadLayout.lanes }).map((_, laneIndex) => {
          const laneY = 80 + laneIndex * roadLayout.laneWidth;
          
          return flowData.map((segment, segmentIndex) => {
            // 속도와 밀도에 따른 색상 계산
            const speedRatio = Math.min(segment.avgSpeed / 60, 1);
            const densityPenalty = Math.min(segment.density / 3, 1); // 차선당 3대 이상이면 페널티
            
            let hue, saturation, lightness;
            
            if (speedRatio > 0.7 && densityPenalty < 0.5) {
              // 원활 - 녹색
              hue = 120;
              saturation = 60;
              lightness = 40;
            } else if (speedRatio > 0.4 && densityPenalty < 0.8) {
              // 보통 - 노란색
              hue = 60;
              saturation = 70;
              lightness = 45;
            } else {
              // 정체 - 빨간색
              hue = 0;
              saturation = 70;
              lightness = 45;
            }
            
            return (
              <rect
                key={`heatmap-${laneIndex}-${segmentIndex}`}
                x={segment.x}
                y={laneY}
                width={segment.width}
                height={roadLayout.laneWidth}
                fill={`hsl(${hue}, ${saturation}%, ${lightness}%)`}
                opacity={0.6}
              />
            );
          });
        })}
        
        {/* 히트맵 범례 */}
        <g transform="translate(800, 20)">
          <rect x={0} y={0} width={160} height={90} fill="white" fillOpacity={0.9} stroke="#ccc" rx={5} />
          <text x={10} y={15} fontSize={11} fontWeight="bold" fill="#333">교통 흐름</text>
          
          <rect x={10} y={25} width={20} height={8} fill="hsl(120, 60%, 40%)" />
          <text x={35} y={32} fontSize={9} fill="#333">원활 (&gt;42km/h)</text>
          
          <rect x={10} y={40} width={20} height={8} fill="hsl(60, 70%, 45%)" />
          <text x={35} y={47} fontSize={9} fill="#333">보통 (24-42km/h)</text>
          
          <rect x={10} y={55} width={20} height={8} fill="hsl(0, 70%, 45%)" />
          <text x={35} y={62} fontSize={9} fill="#333">정체 (&lt;24km/h)</text>
          
          <text x={10} y={80} fontSize={8} fill="#666">밀도: 차선당 차량 수</text>
        </g>
      </g>
    );
  };

  // T자형 교차로 도로 렌더링
  const renderRoad = () => {
    const mainRoadY = 80; // 주도로 시작 Y 위치
    const intersectionX = 650; // 교차로 X 위치
    const sideRoadWidth = 70; // 측면 도로 폭
    
    return (
      <g>
        {/* 메인 도로 (수평) - 4차선 */}
        {Array.from({ length: roadLayout.lanes }).map((_, i) => {
          const y = mainRoadY + i * roadLayout.laneWidth;
          return (
            <g key={`main-lane-${i}`}>
              {/* 메인 도로 차선 */}
              <rect
                x={50}
                y={y}
                width={roadLayout.roadLength}
                height={roadLayout.laneWidth}
                fill={i % 2 === 0 ? '#404040' : '#383838'}
                stroke="#666"
                strokeWidth={0.5}
              />
              
              {/* 차선 구분선 */}
              {i > 0 && (
                <line
                  x1={50}
                  y1={y}
                  x2={50 + roadLayout.roadLength}
                  y2={y}
                  stroke="#FFD700"
                  strokeWidth={2}
                  strokeDasharray="10,10"
                />
              )}
            </g>
          );
        })}
        
        {/* 교차로에서 위쪽으로 나가는 도로 (수직) - 2차선 */}
        <g>
          {/* 좌측 차선 */}
          <rect
            x={intersectionX + roadLayout.laneWidth}
            y={50}
            width={roadLayout.laneWidth}
            height={mainRoadY - 50}
            fill="#404040"
            stroke="#666"
            strokeWidth={0.5}
          />
          
          {/* 우측 차선 */}
          <rect
            x={intersectionX + roadLayout.laneWidth * 2}
            y={50}
            width={roadLayout.laneWidth}
            height={mainRoadY - 50}
            fill="#383838"
            stroke="#666"
            strokeWidth={0.5}
          />
          
          {/* 세로 도로 중앙선 */}
          <line
            x1={intersectionX + roadLayout.laneWidth * 2}
            y1={50}
            x2={intersectionX + roadLayout.laneWidth * 2}
            y2={mainRoadY}
            stroke="#FFD700"
            strokeWidth={2}
            strokeDasharray="10,10"
          />
        </g>
        
        {/* 교차로 표시 */}
        <g>
          {/* 교차로 영역 */}
          <rect
            x={intersectionX}
            y={mainRoadY}
            width={roadLayout.laneWidth * 3}
            height={roadLayout.laneWidth * roadLayout.lanes}
            fill="#505050"
            stroke="#666"
            strokeWidth={1}
          />
          
          {/* 교차로 신호등 */}
          <circle
            cx={intersectionX + roadLayout.laneWidth * 1.5}
            cy={mainRoadY - 10}
            r={3}
            fill="#FF0000"
          />
          <circle
            cx={intersectionX + roadLayout.laneWidth * 1.5 + 8}
            cy={mainRoadY - 10}
            r={3}
            fill="#FFFF00"
          />
          <circle
            cx={intersectionX + roadLayout.laneWidth * 1.5 + 16}
            cy={mainRoadY - 10}
            r={3}
            fill="#00FF00"
          />
          
          {/* 교차로 안내선 */}
          <line
            x1={intersectionX + roadLayout.laneWidth}
            y1={mainRoadY + roadLayout.laneWidth}
            x2={intersectionX + roadLayout.laneWidth * 2}
            y2={mainRoadY + roadLayout.laneWidth * 2}
            stroke="#FFFFFF"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
          <line
            x1={intersectionX + roadLayout.laneWidth * 2}
            y1={mainRoadY + roadLayout.laneWidth}
            x2={intersectionX + roadLayout.laneWidth}
            y2={mainRoadY + roadLayout.laneWidth * 2}
            stroke="#FFFFFF"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        </g>
        
        {/* 도로 표지판 */}
        <g transform="translate(120, 60)">
          <rect x={0} y={0} width={80} height={15} fill="#0066CC" rx={3} />
          <text x={40} y={10} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">
            한누리대로
          </text>
        </g>
        
        <g transform="translate(680, 30)">
          <rect x={0} y={0} width={60} height={15} fill="#0066CC" rx={3} />
          <text x={30} y={10} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">
            도움로
          </text>
        </g>
      </g>
    );
  };

  // 정차지 렌더링
  const renderParkingAreas = () => {
    return roadLayout.parkingAreas.map(area => {
      const slotsInArea = slots.filter(slot => slot.roadSection?.includes(area.id));
      const occupiedCount = slotsInArea.filter(slot => slot.status === 'occupied').length;
      const utilizationRate = area.capacity > 0 ? (occupiedCount / area.capacity) * 100 : 0;
      
      return (
        <g key={area.id}>
          {/* 정차지 영역 */}
          <rect
            x={area.x}
            y={area.y}
            width={area.width}
            height={area.height}
            fill={utilizationRate > 80 ? '#EF4444' : utilizationRate > 50 ? '#F59E0B' : '#10B981'}
            fillOpacity={0.3}
            stroke={utilizationRate > 80 ? '#DC2626' : utilizationRate > 50 ? '#D97706' : '#059669'}
            strokeWidth={2}
            rx={5}
            onClick={() => onSlotClick?.(slotsInArea[0])}
            className="cursor-pointer hover:fill-opacity-50 transition-all"
          />
          
          {/* 정차지 라벨 */}
          <text
            x={area.x + area.width / 2}
            y={area.y + area.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#333"
            fontSize={12}
            fontWeight="bold"
          >
            {area.id} ({occupiedCount}/{area.capacity})
          </text>
          
          {/* 개별 주차 슬롯 표시 */}
          {Array.from({ length: area.capacity }).map((_, slotIndex) => {
            const slotWidth = area.width / area.capacity;
            const slotX = area.x + slotIndex * slotWidth;
            const isOccupied = slotIndex < occupiedCount;
            
            return (
              <rect
                key={slotIndex}
                x={slotX}
                y={area.y}
                width={slotWidth - 2}
                height={area.height}
                fill={isOccupied ? '#DC2626' : 'transparent'}
                stroke="#666"
                strokeWidth={1}
                opacity={0.7}
              />
            );
          })}
        </g>
      );
    });
  };

  // 차량 렌더링
  const renderVehicles = () => {
    return vehicleStates.slice(0, 12).map((vehicleState) => {
      const vehicle = activeVehicles.find(v => v.id === vehicleState.id);
      if (!vehicle) return null;

      const statusColor = {
        moving: '#3B82F6',
        idle: '#6B7280',
        parked: '#10B981',
        charging: '#F59E0B'
      }[vehicle.status] || '#3B82F6';

      // 속도에 따른 색상 조정
      const speedColor = vehicleState.speed > 40 ? '#10B981' : vehicleState.speed > 20 ? '#F59E0B' : '#EF4444';

      return (
        <g
          key={vehicleState.id}
          transform={`translate(${vehicleState.x}, ${vehicleState.y})`}
          onClick={() => onVehicleClick?.(vehicle)}
          className="cursor-pointer"
        >
          {/* 차량 본체 */}
          <rect
            x={-12}
            y={-6}
            width={24}
            height={12}
            fill={statusColor}
            stroke="#000"
            strokeWidth={1}
            rx={3}
            opacity={vehicleState.isChangingLane ? 0.8 : 1}
          />
          
          {/* 차량 방향 표시 */}
          <polygon
            points={vehicleState.direction === 'forward' ? "12,-4 16,0 12,4" : "-12,-4 -16,0 -12,4"}
            fill="#FFF"
            stroke="#000"
            strokeWidth={0.5}
          />
          
          {/* 차량 ID */}
          <text
            x={0}
            y={-10}
            textAnchor="middle"
            fill="#333"
            fontSize={8}
            fontWeight="bold"
          >
            {vehicleState.id}
          </text>
          
          {/* 속도 표시 */}
          <text
            x={0}
            y={-18}
            textAnchor="middle"
            fill={speedColor}
            fontSize={6}
            fontWeight="bold"
          >
            {Math.round(vehicleState.speed)}km/h
          </text>
          
          {/* 차선 변경 표시 */}
          {vehicleState.isChangingLane && (
            <circle
              cx={0}
              cy={0}
              r={3}
              fill="none"
              stroke="#FF6B6B"
              strokeWidth={2}
              opacity={0.6}
            />
          )}
          
          {/* 배터리 레벨 표시 */}
          <rect
            x={-10}
            y={8}
            width={20}
            height={3}
            fill="#E5E7EB"
            rx={1}
          />
          <rect
            x={-10}
            y={8}
            width={20 * (vehicle.battery / 100)}
            height={3}
            fill={vehicle.battery > 50 ? '#10B981' : vehicle.battery > 20 ? '#F59E0B' : '#EF4444'}
            rx={1}
          />
        </g>
      );
    });
  };

  return (
    <div className={`w-full h-full bg-gradient-to-b from-blue-50 to-green-50 ${className}`}>
      {/* 헤더 정보 */}
      <div className="bg-white/80 backdrop-blur-sm p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">한누리대로 1km 구간</h3>
            <p className="text-sm text-gray-600">실시간 차량 및 정차지 시뮬레이션</p>
            
            {/* 시간 및 혼잡도 정보 */}
            <div className="mt-2 flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-600">현재 시각:</span>
                <span className="font-mono font-bold text-blue-600 ml-1">
                  {currentTime.toLocaleTimeString('ko-KR', { hour12: false })}
                </span>
              </div>
              
              <div className="text-sm">
                <span className="text-gray-600">혼잡도:</span>
                <span 
                  className={`font-semibold ml-1 px-2 py-1 rounded-full text-xs ${
                    currentCongestion.level === 'extreme' ? 'bg-red-100 text-red-800' :
                    currentCongestion.level === 'high' ? 'bg-orange-100 text-orange-800' :
                    currentCongestion.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}
                >
                  {currentCongestion.description}
                </span>
              </div>
              
              {isRushHour() && (
                <div className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">
                  🚨 {getRushHourInfo()?.type} 러시아워
                </div>
              )}
            </div>
          </div>
          
          {/* 시뮬레이션 컨트롤 */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                showHeatmap 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              }`}
              title="교통 흐름 히트맵 표시/숨김"
            >
              🌡️ 히트맵
            </button>
            
            {/* 시뮬레이션 속도 표시 */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">속도:</span>
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded font-medium">
                {speed}x
              </span>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-600">
                활성 차량: <span className="font-semibold text-blue-600">{adjustedVehicleCount}대</span>
                <span className="text-xs text-gray-500 ml-1">
                  (×{currentCongestion.multiplier.toFixed(1)})
                </span>
              </div>
              <div className="text-sm text-gray-600">
                정차지: <span className="font-semibold text-green-600">{roadLayout.parkingAreas.length}개</span>
                <span className="text-xs text-gray-500 ml-1">
                  ({Math.round(getParkingDemand() * 100)}% 수요)
                </span>
              </div>
              <div className="text-sm">
                상태: <span className={`font-semibold ${isRunning ? 'text-green-600' : 'text-red-600'}`}>
                  {isRunning ? '실행 중' : '일시정지'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 통계 바 */}
        <div className="mt-4 grid grid-cols-5 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm font-medium text-blue-800">평균 속도</div>
            <div className="text-lg font-bold text-blue-600">
              {vehicleStates.length > 0 
                ? Math.round(vehicleStates.reduce((sum, v) => sum + v.speed, 0) / vehicleStates.length)
                : 0
              } km/h
            </div>
            <div className="text-xs text-blue-600">
              (기준 × {currentCongestion.speedFactor.toFixed(1)})
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm font-medium text-green-800">정차지 점유율</div>
            <div className="text-lg font-bold text-green-600">
              {Math.round((slots.filter(slot => slot.status === 'occupied').length / slots.length) * 100)}%
            </div>
            <div className="text-xs text-green-600">
              예상 수요: {Math.round(getParkingDemand() * 100)}%
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-sm font-medium text-yellow-800">차선 변경 중</div>
            <div className="text-lg font-bold text-yellow-600">
              {vehicleStates.filter(v => v.isChangingLane).length}대
            </div>
            <div className="text-xs text-yellow-600">
              전체의 {vehicleStates.length > 0 ? Math.round((vehicleStates.filter(v => v.isChangingLane).length / vehicleStates.length) * 100) : 0}%
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-sm font-medium text-purple-800">교통 밀도</div>
            <div className="text-lg font-bold text-purple-600">
              {vehicleStates.length > 0 
                ? Math.round((vehicleStates.length / roadLayout.lanes) * 10) / 10
                : 0
              } 대/차선
            </div>
            <div className="text-xs text-purple-600">
              {currentCongestion.level === 'extreme' ? '매우 혼잡' :
               currentCongestion.level === 'high' ? '혼잡' :
               currentCongestion.level === 'medium' ? '보통' : '원활'}
            </div>
          </div>
          
          <div className={`border rounded-lg p-3 ${
            nextCongestion.level === 'extreme' ? 'bg-red-50 border-red-200' :
            nextCongestion.level === 'high' ? 'bg-orange-50 border-orange-200' :
            nextCongestion.level === 'medium' ? 'bg-yellow-50 border-yellow-200' :
            'bg-green-50 border-green-200'
          }`}>
            <div className={`text-sm font-medium ${
              nextCongestion.level === 'extreme' ? 'text-red-800' :
              nextCongestion.level === 'high' ? 'text-orange-800' :
              nextCongestion.level === 'medium' ? 'text-yellow-800' :
              'text-green-800'
            }`}>다음 시간</div>
            <div className={`text-lg font-bold ${
              nextCongestion.level === 'extreme' ? 'text-red-600' :
              nextCongestion.level === 'high' ? 'text-orange-600' :
              nextCongestion.level === 'medium' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {(currentHour + 1) % 24}시
            </div>
            <div className={`text-xs ${
              nextCongestion.level === 'extreme' ? 'text-red-600' :
              nextCongestion.level === 'high' ? 'text-orange-600' :
              nextCongestion.level === 'medium' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {nextCongestion.description}
            </div>
          </div>
        </div>
      </div>
      
      {/* 도로 시뮬레이션 영역 */}
      <div className="p-4 h-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${roadLayout.width} ${roadLayout.height}`}
          className="w-full h-full border border-gray-300 rounded-lg bg-white shadow-sm"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 배경 그라데이션 */}
          <defs>
            <linearGradient id="roadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F0F9FF" />
              <stop offset="100%" stopColor="#E0F2FE" />
            </linearGradient>
          </defs>
          
          <rect
            x={0}
            y={0}
            width={roadLayout.width}
            height={roadLayout.height}
            fill="url(#roadGradient)"
          />
          
          {/* 도로 */}
          {renderRoad()}
          
          {/* 교통 흐름 히트맵 */}
          {renderTrafficHeatmap()}
          
          {/* 정차지 */}
          {renderParkingAreas()}
          
          {/* 차량 */}
          {renderVehicles()}
          
          {/* 범례 */}
          <g transform="translate(20, 20)">
            <rect x={0} y={0} width={150} height={80} fill="white" fillOpacity={0.9} stroke="#ccc" rx={5} />
            <text x={10} y={15} fontSize={12} fontWeight="bold" fill="#333">범례</text>
            
            <rect x={10} y={25} width={15} height={8} fill="#10B981" />
            <text x={30} y={32} fontSize={10} fill="#333">여유 (&lt;50%)</text>
            
            <rect x={10} y={40} width={15} height={8} fill="#F59E0B" />
            <text x={30} y={47} fontSize={10} fill="#333">보통 (50-80%)</text>
            
            <rect x={10} y={55} width={15} height={8} fill="#EF4444" />
            <text x={30} y={62} fontSize={10} fill="#333">혼잡 (&gt;80%)</text>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default RoadSectionSimulator;