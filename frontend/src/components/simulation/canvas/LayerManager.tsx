// 레이어 관리 시스템 - 다중 레이어 렌더링 및 최적화

import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { Vehicle } from '@/types/vehicle';
import { ParkingSlot } from '@/types/slot';
import { CanvasRenderer } from '@/utils/canvasUtils';
import { CoordinateTransform, ViewState } from '@/utils/coordinateTransform';
import RoadLayer, { RoadRenderOptions } from './RoadLayer';
import VehicleLayer, { VehicleRenderOptions } from './VehicleLayer';
import SlotLayer, { SlotRenderOptions } from './SlotLayer';

export interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
  minZoom: number;
  maxZoom: number;
  enabled: boolean;
}

export interface LayerManagerProps {
  canvas: HTMLCanvasElement | null;
  viewState: ViewState;
  vehicles: Vehicle[];
  slots: ParkingSlot[];
  layers: {
    road: LayerConfig & { options: RoadRenderOptions };
    vehicle: LayerConfig & { options: VehicleRenderOptions };
    slot: LayerConfig & { options: SlotRenderOptions };
    traffic?: LayerConfig & { data: any[] };
    background?: LayerConfig;
    overlay?: LayerConfig;
  };
  theme: 'light' | 'dark';
  performance: {
    enableCaching: boolean;
    enableCulling: boolean;
    targetFPS: number;
    qualityLevel: 'low' | 'medium' | 'high';
  };
  onRenderComplete?: (renderTime: number, fps: number) => void;
}

interface RenderCache {
  layerId: string;
  canvas: HTMLCanvasElement;
  lastRenderHash: string;
  lastRenderTime: number;
  bounds: any;
}

interface RenderStats {
  frameCount: number;
  lastFPSCheck: number;
  currentFPS: number;
  averageRenderTime: number;
  renderTimes: number[];
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  canvas,
  viewState,
  vehicles,
  slots,
  layers,
  theme,
  performance,
  onRenderComplete,
}) => {
  const renderer = useRef<CanvasRenderer | null>(null);
  const transformer = useRef<CoordinateTransform | null>(null);
  const renderCache = useRef<Map<string, RenderCache>>(new Map());
  const renderStats = useRef<RenderStats>({
    frameCount: 0,
    lastFPSCheck: Date.now(),
    currentFPS: 0,
    averageRenderTime: 0,
    renderTimes: [],
  });

  // 레이어 인스턴스들
  const roadLayer = useRef<RoadLayer | null>(null);
  const vehicleLayer = useRef<VehicleLayer | null>(null);
  const slotLayer = useRef<SlotLayer | null>(null);

  const animationFrame = useRef<number | null>(null);
  const isRenderingRef = useRef(false);

  // 렌더러 및 트랜스포머 초기화
  useEffect(() => {
    if (!canvas) return;

    renderer.current = new CanvasRenderer(canvas);
    transformer.current = new CoordinateTransform(viewState);

    // 레이어 인스턴스 생성
    roadLayer.current = new RoadLayer(renderer.current, transformer.current);
    vehicleLayer.current = new VehicleLayer(renderer.current, transformer.current);
    slotLayer.current = new SlotLayer(renderer.current, transformer.current);

    // 테마 적용
    if (theme === 'dark') {
      roadLayer.current.applyNightMode();
      slotLayer.current.applyNightMode();
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [canvas, theme]);

  // 뷰 상태 변경 시 트랜스포머 업데이트
  useEffect(() => {
    if (transformer.current) {
      transformer.current.updateViewState(viewState);
    }
  }, [viewState]);

  // 렌더링할 레이어들을 zIndex 순으로 정렬
  const sortedLayers = useMemo(() => {
    return Object.entries(layers)
      .filter(([_, layer]) => layer.visible && layer.enabled)
      .sort(([_, a], [__, b]) => a.zIndex - b.zIndex)
      .filter(([_, layer]) => {
        const currentZoom = viewState.zoom;
        return currentZoom >= layer.minZoom && currentZoom <= layer.maxZoom;
      });
  }, [layers, viewState.zoom]);

  // 렌더링 해시 생성 (캐싱용)
  const generateRenderHash = useCallback((layerId: string, data: any): string => {
    const hashData = {
      layerId,
      viewState: {
        centerLat: Math.round(viewState.centerLat * 10000) / 10000,
        centerLng: Math.round(viewState.centerLng * 10000) / 10000,
        zoom: Math.round(viewState.zoom * 100) / 100,
      },
      dataHash: Array.isArray(data) ? data.length : JSON.stringify(data).length,
      timestamp: Math.floor(Date.now() / 1000), // 1초 단위로 그룹화
    };
    
    return btoa(JSON.stringify(hashData));
  }, [viewState]);

  // 개별 레이어 렌더링
  const renderLayer = useCallback((
    layerId: string,
    renderFunction: () => void,
    data: any = null
  ): boolean => {
    if (!renderer.current || !transformer.current) return false;

    const startTime = Date.now();
    let useCache = false;

    // 캐싱 확인
    if (performance.enableCaching) {
      const renderHash = generateRenderHash(layerId, data);
      const cached = renderCache.current.get(layerId);
      
      if (cached && cached.lastRenderHash === renderHash) {
        // 캐시된 결과 사용
        renderer.current.ctx.drawImage(cached.canvas, 0, 0);
        useCache = true;
      } else {
        // 새로운 캐시 생성
        const cacheCanvas = document.createElement('canvas');
        cacheCanvas.width = canvas?.width || 0;
        cacheCanvas.height = canvas?.height || 0;
        
        const originalCanvas = renderer.current.canvas;
        const originalCtx = renderer.current.ctx;
        
        // 임시로 캐시 캔버스로 전환
        renderer.current.canvas = cacheCanvas;
        renderer.current.ctx = cacheCanvas.getContext('2d')!;
        
        // 렌더링 실행
        renderFunction();
        
        // 원래 캔버스에 복사
        renderer.current.canvas = originalCanvas;
        renderer.current.ctx = originalCtx;
        renderer.current.ctx.drawImage(cacheCanvas, 0, 0);
        
        // 캐시 저장
        renderCache.current.set(layerId, {
          layerId,
          canvas: cacheCanvas,
          lastRenderHash: renderHash,
          lastRenderTime: Date.now(),
          bounds: transformer.current.getViewBounds(),
        });
      }
    } else {
      // 직접 렌더링
      renderFunction();
    }

    const renderTime = Date.now() - startTime;
    
    // 성능 통계 업데이트
    renderStats.current.renderTimes.push(renderTime);
    if (renderStats.current.renderTimes.length > 60) {
      renderStats.current.renderTimes.shift();
    }
    
    return !useCache; // 실제 렌더링 여부 반환
  }, [canvas, performance.enableCaching, generateRenderHash]);

  // 메인 렌더링 함수
  const render = useCallback(() => {
    if (!renderer.current || !transformer.current || isRenderingRef.current) return;
    
    isRenderingRef.current = true;
    const frameStartTime = Date.now();

    try {
      // 캔버스 클리어
      renderer.current.clear();

      // 뷰포트 컬링 확인
      const bounds = transformer.current.getViewBounds();
      const viewInfo = transformer.current.getViewInfo();

      // 품질 레벨에 따른 렌더링 옵션 조정
      const qualityMultiplier = {
        low: 0.5,
        medium: 0.75,
        high: 1.0,
      }[performance.qualityLevel];

      // 레이어별 렌더링
      sortedLayers.forEach(([layerId, layerConfig]) => {
        // 레이어 불투명도 적용
        renderer.current!.ctx.globalAlpha = layerConfig.opacity;

        switch (layerId) {
          case 'road':
            if (roadLayer.current) {
              const adjustedOptions = {
                ...layers.road.options,
                detailLevel: Math.floor(layers.road.options.detailLevel * qualityMultiplier),
              };
              
              renderLayer(layerId, () => {
                roadLayer.current!.render(adjustedOptions);
              }, { bounds, options: adjustedOptions });
            }
            break;

          case 'slot':
            if (slotLayer.current) {
              const visibleSlots = performance.enableCulling
                ? slots.filter(slot => transformer.current!.isPointInView(slot.position, 100))
                : slots;

              renderLayer(layerId, () => {
                slotLayer.current!.render(visibleSlots, layers.slot.options);
              }, visibleSlots);
            }
            break;

          case 'vehicle':
            if (vehicleLayer.current) {
              const visibleVehicles = performance.enableCulling
                ? vehicles.filter(vehicle => transformer.current!.isPointInView(vehicle.position, 100))
                : vehicles;

              const adjustedOptions = {
                ...layers.vehicle.options,
                trailLength: Math.floor(layers.vehicle.options.trailLength * qualityMultiplier),
              };

              renderLayer(layerId, () => {
                vehicleLayer.current!.render(visibleVehicles, adjustedOptions);
              }, visibleVehicles);
            }
            break;

          case 'traffic':
            if (layers.traffic?.data) {
              renderLayer(layerId, () => {
                renderTrafficLayer(layers.traffic.data);
              }, layers.traffic.data);
            }
            break;

          case 'background':
            renderLayer(layerId, () => {
              renderBackgroundLayer();
            });
            break;

          case 'overlay':
            renderLayer(layerId, () => {
              renderOverlayLayer();
            });
            break;
        }

        // 불투명도 초기화
        renderer.current!.ctx.globalAlpha = 1.0;
      });

      // 성능 통계 업데이트
      const frameTime = Date.now() - frameStartTime;
      updateRenderStats(frameTime);

      // 렌더링 완료 콜백
      if (onRenderComplete) {
        onRenderComplete(frameTime, renderStats.current.currentFPS);
      }

    } finally {
      isRenderingRef.current = false;
    }
  }, [
    sortedLayers,
    vehicles,
    slots,
    layers,
    performance,
    renderLayer,
    onRenderComplete,
  ]);

  // 성능 통계 업데이트
  const updateRenderStats = useCallback((frameTime: number) => {
    const stats = renderStats.current;
    const now = Date.now();
    
    stats.frameCount++;
    stats.renderTimes.push(frameTime);
    
    // 1초마다 FPS 계산
    if (now - stats.lastFPSCheck >= 1000) {
      stats.currentFPS = Math.round((stats.frameCount * 1000) / (now - stats.lastFPSCheck));
      stats.frameCount = 0;
      stats.lastFPSCheck = now;
    }
    
    // 평균 렌더링 시간 계산
    if (stats.renderTimes.length > 60) {
      stats.renderTimes.shift();
    }
    stats.averageRenderTime = stats.renderTimes.reduce((a, b) => a + b, 0) / stats.renderTimes.length;
  }, []);

  // 트래픽 레이어 렌더링
  const renderTrafficLayer = useCallback((trafficData: any[]) => {
    if (!roadLayer.current) return;
    
    const trafficPoints = trafficData.map(data => ({
      position: data.position,
      intensity: data.intensity || 0.5,
    }));
    
    roadLayer.current.renderTrafficHeatMap(trafficPoints);
  }, []);

  // 배경 레이어 렌더링
  const renderBackgroundLayer = useCallback(() => {
    if (!renderer.current || !transformer.current) return;
    
    // 간단한 그리드 배경
    const bounds = transformer.current.getViewBounds();
    const gridSize = 0.01; // 약 1km 간격
    
    renderer.current.ctx.strokeStyle = theme === 'dark' ? '#1F2937' : '#F3F4F6';
    renderer.current.ctx.lineWidth = 0.5;
    renderer.current.ctx.globalAlpha = 0.1;
    
    // 수직선 그리기
    for (let lng = Math.floor(bounds.minLng / gridSize) * gridSize; lng <= bounds.maxLng; lng += gridSize) {
      const start = transformer.current.gpsToCanvas({ lat: bounds.minLat, lng });
      const end = transformer.current.gpsToCanvas({ lat: bounds.maxLat, lng });
      
      renderer.current.ctx.beginPath();
      renderer.current.ctx.moveTo(start.x, start.y);
      renderer.current.ctx.lineTo(end.x, end.y);
      renderer.current.ctx.stroke();
    }
    
    // 수평선 그리기
    for (let lat = Math.floor(bounds.minLat / gridSize) * gridSize; lat <= bounds.maxLat; lat += gridSize) {
      const start = transformer.current.gpsToCanvas({ lat, lng: bounds.minLng });
      const end = transformer.current.gpsToCanvas({ lat, lng: bounds.maxLng });
      
      renderer.current.ctx.beginPath();
      renderer.current.ctx.moveTo(start.x, start.y);
      renderer.current.ctx.lineTo(end.x, end.y);
      renderer.current.ctx.stroke();
    }
    
    renderer.current.ctx.globalAlpha = 1.0;
  }, [theme]);

  // 오버레이 레이어 렌더링
  const renderOverlayLayer = useCallback(() => {
    if (!renderer.current || !transformer.current) return;
    
    const viewInfo = transformer.current.getViewInfo();
    
    // 줌 레벨 표시
    renderer.current.drawText(
      `Zoom: ${viewInfo.zoom.toFixed(2)}`,
      { x: 10, y: 20 },
      '12px Arial',
      {
        fillStyle: theme === 'dark' ? '#FFFFFF' : '#000000',
        strokeStyle: theme === 'dark' ? '#000000' : '#FFFFFF',
        lineWidth: 2,
      }
    );
    
    // 성능 정보 표시 (개발 모드에서만)
    if (process.env.NODE_ENV === 'development') {
      const stats = renderStats.current;
      renderer.current.drawText(
        `FPS: ${stats.currentFPS} | Render: ${stats.averageRenderTime.toFixed(1)}ms`,
        { x: 10, y: 40 },
        '10px Arial',
        {
          fillStyle: theme === 'dark' ? '#FFFFFF' : '#000000',
          strokeStyle: theme === 'dark' ? '#000000' : '#FFFFFF',
          lineWidth: 2,
        }
      );
    }
  }, [theme]);

  // 애니메이션 루프 관리
  useEffect(() => {
    const targetFrameTime = 1000 / performance.targetFPS;
    let lastFrameTime = 0;

    const animate = (currentTime: number) => {
      if (currentTime - lastFrameTime >= targetFrameTime) {
        render();
        lastFrameTime = currentTime;
      }
      
      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [render, performance.targetFPS]);

  // 캐시 정리 (메모리 관리)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const cacheTimeout = 60000; // 1분

      renderCache.current.forEach((cache, layerId) => {
        if (now - cache.lastRenderTime > cacheTimeout) {
          renderCache.current.delete(layerId);
        }
      });
    }, 30000); // 30초마다 정리

    return () => clearInterval(cleanupInterval);
  }, []);

  // 공개 API
  const clearCache = useCallback((layerId?: string) => {
    if (layerId) {
      renderCache.current.delete(layerId);
    } else {
      renderCache.current.clear();
    }
  }, []);

  const forceRender = useCallback(() => {
    clearCache();
    render();
  }, [clearCache, render]);

  const getStats = useCallback(() => {
    return {
      ...renderStats.current,
      cacheSize: renderCache.current.size,
    };
  }, []);

  // LayerManager는 시각적 렌더링을 하지 않는 컴포넌트이므로 ref를 노출하지 않습니다

  return null; // 시각적 렌더링을 하지 않는 컴포넌트
};

export default LayerManager;