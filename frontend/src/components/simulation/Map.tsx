// Mapbox 지도 컴포넌트 - 세종시 기반 실시간 시뮬레이션 지도

import React, { useEffect, useRef, useState } from 'react';
import { Map as MapboxMap, NavigationControl, ScaleControl } from 'react-map-gl';
import type { MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { SEJONG_CENTER } from '@/constants/sejongLocations';
import VehicleMarker from './VehicleMarker';
import SlotMarker from './SlotMarker';
import { Vehicle } from '@/types/vehicle';
import { ParkingSlot } from '@/types/slot';

// Mapbox 토큰 - 실제 프로덕션에서는 환경변수에서 가져와야 함
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.test-demo-token';

interface MapProps {
  vehicles: Vehicle[];
  slots: ParkingSlot[];
  onSlotClick?: (slot: ParkingSlot) => void;
  onVehicleClick?: (vehicle: Vehicle) => void;
  onMapClick?: (lat: number, lng: number) => void;
  showTraffic?: boolean;
  show3D?: boolean;
  theme?: 'light' | 'dark';
}

const Map: React.FC<MapProps> = ({
  vehicles = [],
  slots = [],
  onSlotClick,
  onVehicleClick,
  onMapClick,
  showTraffic = false,
  show3D = true,
  theme = 'light'
}) => {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    longitude: SEJONG_CENTER.lng,
    latitude: SEJONG_CENTER.lat,
    zoom: 13,
    pitch: show3D ? 45 : 0,
    bearing: 0
  });

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState(getMapStyle(theme));
  const [mapError, setMapError] = useState(false);

  // 지도 스타일 결정
  function getMapStyle(currentTheme: 'light' | 'dark') {
    return currentTheme === 'dark' 
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/light-v11';
  }

  // 테마 변경 감지
  useEffect(() => {
    setMapStyle(getMapStyle(theme));
  }, [theme]);

  // 데모 모드 또는 타임아웃 처리
  useEffect(() => {
    // 데모 토큰이거나 유효하지 않은 토큰일 때 3초 후 로딩 완료 처리
    if (MAPBOX_TOKEN.includes('test') || MAPBOX_TOKEN.includes('your_mapbox_token')) {
      const timer = setTimeout(() => {
        setIsMapLoaded(true);
        setMapError(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // 일반적인 경우에도 10초 타임아웃 설정
    const fallbackTimer = setTimeout(() => {
      if (!isMapLoaded) {
        setIsMapLoaded(true);
        setMapError(true);
      }
    }, 10000);
    
    return () => clearTimeout(fallbackTimer);
  }, [MAPBOX_TOKEN, isMapLoaded]);

  // 3D 설정 변경
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.getMap().easeTo({
        pitch: show3D ? 45 : 0,
        duration: 1000
      });
    }
  }, [show3D]);

  // 지도 로드 완료 시 3D 건물 추가
  const handleMapLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    setIsMapLoaded(true);

    // 3D 건물 레이어 추가
    if (show3D) {
      map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': theme === 'dark' ? '#444' : '#ddd',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.8
        }
      });
    }

    // 교통량 표시
    if (showTraffic) {
      map.addLayer({
        id: 'traffic',
        type: 'line',
        source: {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1'
        },
        'source-layer': 'traffic',
        paint: {
          'line-width': 3,
          'line-color': [
            'case',
            ['==', ['get', 'congestion'], 'low'], '#4CAF50',
            ['==', ['get', 'congestion'], 'moderate'], '#FF9800',
            ['==', ['get', 'congestion'], 'heavy'], '#F44336',
            ['==', ['get', 'congestion'], 'severe'], '#9C27B0',
            '#2196F3'
          ]
        }
      });
    }

    // 세종시 경계선 강조 (선택사항)
    addSejongBoundary(map);
  };

  // 세종시 경계선 추가
  const addSejongBoundary = (map: any) => {
    // 세종시 대략적 경계선 (실제로는 GeoJSON 파일 사용 권장)
    const sejongBounds = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [127.23, 36.46],
          [127.31, 36.46],
          [127.31, 36.52],
          [127.23, 36.52],
          [127.23, 36.46]
        ]]
      }
    };

    map.addSource('sejong-boundary', {
      type: 'geojson',
      data: sejongBounds
    });

    map.addLayer({
      id: 'sejong-boundary',
      type: 'line',
      source: 'sejong-boundary',
      paint: {
        'line-color': '#0066CC',
        'line-width': 2,
        'line-dasharray': [2, 2],
        'line-opacity': 0.6
      }
    });
  };

  // 지도 클릭 처리
  const handleMapClick = (event: any) => {
    const { lng, lat } = event.lngLat;
    onMapClick?.(lat, lng);
  };

  // 차량을 중심으로 지도 이동
  const focusOnVehicle = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle && mapRef.current) {
      mapRef.current.getMap().flyTo({
        center: [vehicle.position.lng, vehicle.position.lat],
        zoom: 16,
        duration: 2000
      });
    }
  };

  // 슬롯을 중심으로 지도 이동
  const focusOnSlot = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (slot && mapRef.current) {
      mapRef.current.getMap().flyTo({
        center: [slot.position.lng, slot.position.lat],
        zoom: 17,
        duration: 2000
      });
    }
  };

  // 전체 지역 보기
  const showOverview = () => {
    if (mapRef.current) {
      mapRef.current.getMap().flyTo({
        center: [SEJONG_CENTER.lng, SEJONG_CENTER.lat],
        zoom: 13,
        pitch: show3D ? 45 : 0,
        bearing: 0,
        duration: 2000
      });
    }
  };

  return (
    <div className="relative w-full h-full p-4">
      <div className="w-full h-full rounded-lg overflow-hidden">
      <MapboxMap
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onLoad={handleMapLoad}
        onClick={handleMapClick}
        attributionControl={false}
        logoPosition="bottom-right"
      >
        {/* 네비게이션 컨트롤 */}
        <NavigationControl position="top-right" />
        
        {/* 스케일 컨트롤 */}
        <ScaleControl position="bottom-left" />

        {/* 차량 마커들 */}
        {isMapLoaded && !mapError && vehicles.map(vehicle => (
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            mapRef={mapRef.current}
            onClick={() => onVehicleClick?.(vehicle)}
          />
        ))}

        {/* 슬롯 마커들 */}
        {isMapLoaded && !mapError && slots.map(slot => (
          <SlotMarker
            key={slot.id}
            slot={slot}
            mapRef={mapRef.current}
            onClick={() => onSlotClick?.(slot)}
          />
        ))}
      </MapboxMap>
      </div>

      {/* 지도 컨트롤 오버레이 */}
      <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <div className="flex flex-col space-y-2">
          <button
            onClick={showOverview}
            className="px-3 py-1 bg-sejong-blue text-white text-sm rounded hover:bg-blue-700 transition-colors"
            title="전체 보기"
          >
            🏙️ 전체
          </button>
          
          <div className="flex items-center space-x-1 text-xs text-gray-600">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
              <span>운행중</span>
            </div>
            <div className="w-px h-3 bg-gray-300 mx-1"></div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              <span>사용가능</span>
            </div>
          </div>
        </div>
      </div>

      {/* 실시간 통계 오버레이 */}
      <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-sm space-y-1">
          <div className="font-semibold text-gray-800">실시간 현황</div>
          <div className="flex space-x-4 text-xs text-gray-600">
            <span>차량: {vehicles.length}대</span>
            <span>슬롯: {slots.length}개</span>
          </div>
          <div className="flex space-x-4 text-xs">
            <span className="text-blue-600">
              운행: {vehicles.filter(v => v.status === 'moving').length}
            </span>
            <span className="text-green-600">
              사용가능: {slots.filter(s => s.status === 'available').length}
            </span>
          </div>
        </div>
      </div>

      {/* 로딩 상태 */}
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-sejong-blue border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600">지도 로딩 중...</p>
          </div>
        </div>
      )}

      {/* 데모 모드 또는 지도 에러 */}
      {(mapError || MAPBOX_TOKEN.includes('test') || MAPBOX_TOKEN.includes('your_mapbox_token')) && isMapLoaded && (
        <div className="absolute inset-8 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex flex-col items-center justify-center p-6">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-800 px-6 py-4 rounded-xl shadow-lg max-w-lg text-center mb-6">
            <div className="text-4xl mb-3">🗺️</div>
            <div className="font-semibold mb-2">세종시 시뮬레이션 지도</div>
            <div className="text-sm text-gray-600 mb-4">
              실제 Mapbox 지도 대신 데모 모드로 실행 중입니다.<br/>
              시뮬레이션 데이터는 정상적으로 생성되고 있습니다.
            </div>
            
            {/* 실시간 시뮬레이션 상태 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center justify-center mb-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="font-medium">활성 차량</span>
                </div>
                <div className="text-xl font-bold text-blue-600">{vehicles.filter(v => v.status === 'moving').length}</div>
                <div className="text-xs text-gray-500">총 {vehicles.length}대</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center justify-center mb-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="font-medium">사용가능 슬롯</span>
                </div>
                <div className="text-xl font-bold text-green-600">{slots.filter(s => s.status === 'available').length}</div>
                <div className="text-xs text-gray-500">총 {slots.length}개</div>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
              실제 지도: .env 파일에 VITE_MAPBOX_TOKEN 설정 필요
            </div>
          </div>
          
          {/* 세종시 주요 구역 표시 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 max-w-lg">
            <div className="text-sm font-medium text-gray-700 mb-2 text-center">📍 주요 시뮬레이션 구역</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                정부청사 (5개 청사)
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                주거지역 (6개 동)
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                승하차구역 (6개 픽업존)
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                상업지역 (5개 시설)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 지도 범례 */}
      <div className="absolute top-8 right-24 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg text-xs">
        <div className="font-semibold mb-2 text-gray-800">범례</div>
        
        <div className="space-y-1">
          <div className="font-medium text-gray-700 mb-1">차량 상태</div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>이동 중</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
            <span>대기 중</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            <span>승하차 중</span>
          </div>
        </div>
        
        <div className="mt-3 space-y-1">
          <div className="font-medium text-gray-700 mb-1">슬롯 상태</div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span>사용 가능</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span>사용 중</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
            <span>예약됨</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;