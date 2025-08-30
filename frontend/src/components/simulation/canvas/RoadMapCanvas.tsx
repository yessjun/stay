// 메인 캔버스 지도 컴포넌트 - 모든 레이어 통합

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Vehicle, Coordinate } from '@/types/vehicle';
import { ParkingSlot } from '@/types/slot';
import { CoordinateTransform, ViewState, createViewState } from '@/utils/coordinateTransform';
import { SEJONG_CENTER } from '@/constants/sejongLocations';
import LayerManager, { LayerConfig } from './LayerManager';
import MapControls from './MapControls';

export interface RoadMapCanvasProps {
  vehicles: Vehicle[];
  slots: ParkingSlot[];
  width: number;
  height: number;
  initialCenter?: Coordinate;
  initialZoom?: number;
  theme?: 'light' | 'dark';
  showControls?: boolean;
  onVehicleClick?: (vehicle: Vehicle) => void;
  onSlotClick?: (slot: ParkingSlot) => void;
  onMapClick?: (coordinate: Coordinate) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface MapState {
  isLoading: boolean;
  error: string | null;
  renderStats: {
    fps: number;
    renderTime: number;
    visibleVehicles: number;
    visibleSlots: number;
  };
}

export const RoadMapCanvas: React.FC<RoadMapCanvasProps> = ({
  vehicles,
  slots,
  width,
  height,
  initialCenter = SEJONG_CENTER,
  initialZoom = 0.8,
  theme = 'light',
  showControls = true,
  onVehicleClick,
  onSlotClick,
  onMapClick,
  className,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformerRef = useRef<CoordinateTransform | null>(null);
  
  const [viewState, setViewState] = useState<ViewState>(() =>
    createViewState(initialCenter, initialZoom, width, height)
  );
  
  const [mapState, setMapState] = useState<MapState>({
    isLoading: true,
    error: null,
    renderStats: {
      fps: 0,
      renderTime: 0,
      visibleVehicles: 0,
      visibleSlots: 0,
    },
  });

  // 레이어 설정
  const layers = useMemo(() => ({
    background: {
      id: 'background',
      name: '배경',
      visible: true,
      opacity: 1,
      zIndex: 0,
      minZoom: 0,
      maxZoom: 10,
      enabled: true,
    } as LayerConfig,
    
    road: {
      id: 'road',
      name: '도로',
      visible: true,
      opacity: 1,
      zIndex: 10,
      minZoom: 0,
      maxZoom: 10,
      enabled: true,
      options: {
        showLanes: viewState.zoom > 3,
        showIntersections: viewState.zoom > 2,
        showRoadLabels: viewState.zoom > 4,
        showTrafficDirection: viewState.zoom > 5,
        detailLevel: Math.min(10, Math.max(1, Math.floor(viewState.zoom * 2))),
      },
    } as LayerConfig & { options: any },
    
    slot: {
      id: 'slot',
      name: '슬롯',
      visible: true,
      opacity: 0.9,
      zIndex: 20,
      minZoom: 1,
      maxZoom: 10,
      enabled: true,
      options: {
        showCapacity: viewState.zoom > 3,
        showUtilization: viewState.zoom > 2,
        showLabels: viewState.zoom > 5,
        showConnections: viewState.zoom > 6,
        clusterSlots: viewState.zoom < 2,
        minZoomForDetails: 4,
      },
    } as LayerConfig & { options: any },
    
    vehicle: {
      id: 'vehicle',
      name: '차량',
      visible: true,
      opacity: 1,
      zIndex: 30,
      minZoom: 0.5,
      maxZoom: 10,
      enabled: true,
      options: {
        showTrails: viewState.zoom > 2,
        showDestination: viewState.zoom > 3,
        showRoutes: viewState.zoom > 4,
        showLabels: viewState.zoom > 6,
        trailLength: Math.max(20, Math.min(100, Math.floor(viewState.zoom * 15))),
        animateMovement: true,
      },
    } as LayerConfig & { options: any },
    
    overlay: {
      id: 'overlay',
      name: '오버레이',
      visible: true,
      opacity: 1,
      zIndex: 100,
      minZoom: 0,
      maxZoom: 10,
      enabled: true,
    } as LayerConfig,
  }), [viewState.zoom]);

  // 성능 설정
  const performance = useMemo(() => ({
    enableCaching: true,
    enableCulling: true,
    targetFPS: 60,
    qualityLevel: (viewState.zoom > 4 ? 'high' : viewState.zoom > 2 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
  }), [viewState.zoom]);

  // 캔버스 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 캔버스 크기 설정
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // 트랜스포머 초기화
    if (!transformerRef.current) {
      transformerRef.current = new CoordinateTransform(viewState);
    } else {
      transformerRef.current.updateViewState(viewState);
    }

    setMapState(prev => ({ ...prev, isLoading: false }));
  }, [width, height, viewState]);

  // 뷰 상태 변경 핸들러
  const handleViewStateChange = useCallback((newViewState: ViewState) => {
    setViewState(newViewState);
    
    if (transformerRef.current) {
      transformerRef.current.updateViewState(newViewState);
    }
  }, []);

  // 렌더링 완료 콜백
  const handleRenderComplete = useCallback((renderTime: number, fps: number) => {
    const visibleVehicles = vehicles.filter(vehicle =>
      transformerRef.current?.isPointInView(vehicle.position, 100)
    ).length;

    const visibleSlots = slots.filter(slot =>
      transformerRef.current?.isPointInView(slot.position, 100)
    ).length;

    setMapState(prev => ({
      ...prev,
      renderStats: {
        fps,
        renderTime,
        visibleVehicles,
        visibleSlots,
      },
    }));
  }, [vehicles, slots]);

  // 마우스 클릭 핸들러
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !transformerRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasPos = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // 클릭된 좌표를 GPS로 변환
    const gpsCoordinate = transformerRef.current.canvasToGps(canvasPos);

    // 차량 클릭 검사 (우선순위 높음)
    const clickRadius = 20; // 픽셀
    for (const vehicle of vehicles) {
      const vehicleCanvasPos = transformerRef.current.gpsToCanvas(vehicle.position);
      const distance = Math.sqrt(
        Math.pow(canvasPos.x - vehicleCanvasPos.x, 2) +
        Math.pow(canvasPos.y - vehicleCanvasPos.y, 2)
      );

      if (distance <= clickRadius) {
        onVehicleClick?.(vehicle);
        return;
      }
    }

    // 슬롯 클릭 검사
    for (const slot of slots) {
      const slotCanvasPos = transformerRef.current.gpsToCanvas(slot.position);
      const distance = Math.sqrt(
        Math.pow(canvasPos.x - slotCanvasPos.x, 2) +
        Math.pow(canvasPos.y - slotCanvasPos.y, 2)
      );

      if (distance <= clickRadius) {
        onSlotClick?.(slot);
        return;
      }
    }

    // 일반 지도 클릭
    onMapClick?.(gpsCoordinate);
  }, [vehicles, slots, onVehicleClick, onSlotClick, onMapClick]);

  // 컨트롤 API
  const flyTo = useCallback((center: Coordinate, zoom?: number, duration?: number) => {
    if (!transformerRef.current) return;
    const currentViewState = transformerRef.current.viewState;
    const targetViewState = createViewState(
      center,
      zoom ?? currentViewState.zoom,
      currentViewState.canvasWidth,
      currentViewState.canvasHeight
    );
    transformerRef.current.updateViewState(targetViewState);
    setViewState(targetViewState);
  }, []);

  const fitBounds = useCallback((bounds: { north: number; south: number; east: number; west: number }, padding?: number) => {
    if (!transformerRef.current) return;
    const boundingBox = {
      minLat: bounds.south,
      maxLat: bounds.north,
      minLng: bounds.west,
      maxLng: bounds.east
    };
    const targetViewState = transformerRef.current.fitBounds(boundingBox, padding || 50);
    transformerRef.current.updateViewState(targetViewState);
    setViewState(targetViewState);
  }, []);

  const resetView = useCallback(() => {
    flyTo(SEJONG_CENTER, 0.8);
  }, [flyTo]);

  // 줌 컨트롤 함수들
  const zoomIn = useCallback(() => {
    if (!transformerRef.current || !canvasRef.current) return;
    const center = {
      x: canvasRef.current.width / 2,
      y: canvasRef.current.height / 2
    };
    const newViewState = transformerRef.current.adjustZoom(0.5, center);
    transformerRef.current.updateViewState(newViewState);
    setViewState(newViewState);
  }, []);

  const zoomOut = useCallback(() => {
    if (!transformerRef.current || !canvasRef.current) return;
    const center = {
      x: canvasRef.current.width / 2,
      y: canvasRef.current.height / 2
    };
    const newViewState = transformerRef.current.adjustZoom(-0.5, center);
    transformerRef.current.updateViewState(newViewState);
    setViewState(newViewState);
  }, []);

  // 레이어 토글
  const toggleLayer = useCallback((layerId: string) => {
    // 레이어 가시성 토글 로직은 부모 컴포넌트에서 관리
    console.log(`Toggle layer: ${layerId}`);
  }, []);

  // 에러 처리
  const handleError = useCallback((error: Error) => {
    console.error('Map rendering error:', error);
    setMapState(prev => ({ ...prev, error: error.message }));
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target !== document.body) return; // 입력 필드에서는 무시

      switch (event.key) {
        case 'r':
        case 'R':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            resetView();
          }
          break;
        case '1':
          toggleLayer('road');
          break;
        case '2':
          toggleLayer('vehicle');
          break;
        case '3':
          toggleLayer('slot');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [resetView, toggleLayer]);

  // RoadMapCanvas는 시각적 렌더링을 하는 컴포넌트이므로 ref 처리가 복잡합니다
  // 현재는 props를 통한 인터페이스를 우선으로 합니다

  if (mapState.error) {
    return (
      <div 
        className="flex items-center justify-center bg-red-50 border border-red-200 rounded-lg"
        style={{ width, height }}
      >
        <div className="text-center text-red-800">
          <div className="text-lg font-semibold mb-2">🚫 지도 렌더링 오류</div>
          <div className="text-sm">{mapState.error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative ${className || ''}`}
      style={style}
    >
      {/* 로딩 상태 */}
      {mapState.isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 z-50"
          style={{ width, height }}
        >
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600">지도 초기화 중...</p>
          </div>
        </div>
      )}

      {/* 메인 캔버스 */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className="cursor-grab active:cursor-grabbing"
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          display: mapState.isLoading ? 'none' : 'block'
        }}
      />

      {/* 레이어 매니저 */}
      {!mapState.isLoading && (
        <LayerManager
          canvas={canvasRef.current}
          viewState={viewState}
          vehicles={vehicles}
          slots={slots}
          layers={layers}
          theme={theme}
          performance={performance}
          onRenderComplete={handleRenderComplete}
        />
      )}

      {/* 지도 컨트롤 */}
      {showControls && !mapState.isLoading && (
        <MapControls
          canvas={canvasRef.current}
          transformer={transformerRef.current!}
          onViewStateChange={handleViewStateChange}
          bounds={{
            minZoom: 0.1,
            maxZoom: 10,
            maxBounds: {
              north: 36.55,
              south: 36.45,
              east: 127.35,
              west: 127.25,
            },
          }}
          enableKeyboard={true}
          enableMouse={true}
          enableTouch={true}
          smoothTransitions={true}
        />
      )}

      {/* 컨트롤 UI */}
      {showControls && !mapState.isLoading && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 space-y-2">
          {/* 줌 컨트롤 */}
          <div className="flex flex-col space-y-1">
            <button
              onClick={zoomIn}
              className="w-8 h-8 bg-white hover:bg-gray-50 border border-gray-300 rounded flex items-center justify-center text-lg font-bold transition-colors"
              title="확대"
            >
              +
            </button>
            <button
              onClick={zoomOut}
              className="w-8 h-8 bg-white hover:bg-gray-50 border border-gray-300 rounded flex items-center justify-center text-lg font-bold transition-colors"
              title="축소"
            >
              −
            </button>
          </div>

          {/* 리셋 버튼 */}
          <button
            onClick={resetView}
            className="w-8 h-8 bg-white hover:bg-gray-50 border border-gray-300 rounded flex items-center justify-center transition-colors"
            title="전체 보기"
          >
            🏠
          </button>

          {/* 성능 정보 (개발 모드) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-600 mt-2 p-2 bg-black/5 rounded">
              <div>FPS: {mapState.renderStats.fps}</div>
              <div>렌더: {mapState.renderStats.renderTime.toFixed(1)}ms</div>
              <div>차량: {mapState.renderStats.visibleVehicles}</div>
              <div>슬롯: {mapState.renderStats.visibleSlots}</div>
              <div>줌: {viewState.zoom.toFixed(2)}</div>
            </div>
          )}
        </div>
      )}

      {/* 범례 */}
      {!mapState.isLoading && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
          <div className="text-sm font-semibold text-gray-800 mb-2">범례</div>
          
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>이동 중 차량</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span>대기 중 차량</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>사용가능 슬롯</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>사용 중 슬롯</span>
            </div>
          </div>
          
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
            마우스 휠: 줌 | 드래그: 이동
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadMapCanvas;