// 지도 줌/팬 컨트롤 시스템 - 마우스, 터치, 키보드 인터랙션

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CoordinateTransform, ViewState, createViewState } from '@/utils/coordinateTransform';
import { getCanvasMousePos, getCanvasTouchPos } from '@/utils/canvasUtils';
import { Coordinate } from '@/types/vehicle';

export interface MapControlsProps {
  canvas: HTMLCanvasElement | null;
  transformer: CoordinateTransform;
  onViewStateChange: (viewState: ViewState) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  bounds?: {
    minZoom: number;
    maxZoom: number;
    maxBounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  enableKeyboard?: boolean;
  enableMouse?: boolean;
  enableTouch?: boolean;
  smoothTransitions?: boolean;
}

interface InteractionState {
  isDragging: boolean;
  isZooming: boolean;
  lastMousePos: { x: number; y: number } | null;
  lastTouchDistance: number | null;
  lastTouchCenter: { x: number; y: number } | null;
  dragStartTime: number;
  totalDragDistance: number;
}

interface AnimationState {
  target: ViewState;
  start: ViewState;
  startTime: number;
  duration: number;
  easing: (t: number) => number;
  isActive: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  canvas,
  transformer,
  onViewStateChange,
  onInteractionStart,
  onInteractionEnd,
  bounds = { minZoom: 0.1, maxZoom: 10 },
  enableKeyboard = true,
  enableMouse = true,
  enableTouch = true,
  smoothTransitions = true,
}) => {
  const interactionState = useRef<InteractionState>({
    isDragging: false,
    isZooming: false,
    lastMousePos: null,
    lastTouchDistance: null,
    lastTouchCenter: null,
    dragStartTime: 0,
    totalDragDistance: 0,
  });

  const animationState = useRef<AnimationState>({
    target: transformer.getViewInfo().center as any,
    start: transformer.getViewInfo().center as any,
    startTime: 0,
    duration: 0,
    easing: (t: number) => t,
    isActive: false,
  });

  const animationFrame = useRef<number | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!enableMouse || !canvas) return;
    
    event.preventDefault();
    const mousePos = getCanvasMousePos(canvas, event);
    
    interactionState.current.isDragging = true;
    interactionState.current.lastMousePos = mousePos;
    interactionState.current.dragStartTime = Date.now();
    interactionState.current.totalDragDistance = 0;
    
    setIsInteracting(true);
    onInteractionStart?.();
    
    canvas.style.cursor = 'grabbing';
  }, [canvas, enableMouse, onInteractionStart]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!enableMouse || !canvas || !interactionState.current.isDragging || !interactionState.current.lastMousePos) return;
    
    event.preventDefault();
    const mousePos = getCanvasMousePos(canvas, event);
    const deltaX = mousePos.x - interactionState.current.lastMousePos.x;
    const deltaY = mousePos.y - interactionState.current.lastMousePos.y;
    
    // 드래그 거리 누적
    interactionState.current.totalDragDistance += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 팬 적용
    const currentViewState = transformer.viewState;
    const newViewState = transformer.pan(deltaX, deltaY);
    
    // 경계 확인
    const constrainedViewState = constrainViewState(newViewState);
    transformer.updateViewState(constrainedViewState);
    onViewStateChange(constrainedViewState);
    
    interactionState.current.lastMousePos = mousePos;
  }, [canvas, enableMouse, transformer, onViewStateChange]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (!enableMouse || !canvas) return;
    
    event.preventDefault();
    
    // 관성 스크롤 처리
    if (interactionState.current.isDragging && smoothTransitions) {
      const dragDuration = Date.now() - interactionState.current.dragStartTime;
      const velocity = interactionState.current.totalDragDistance / dragDuration;
      
      if (velocity > 0.5) { // 최소 속도 임계값
        startInertialPan(velocity);
      }
    }
    
    interactionState.current.isDragging = false;
    interactionState.current.lastMousePos = null;
    
    setIsInteracting(false);
    onInteractionEnd?.();
    
    canvas.style.cursor = 'grab';
  }, [canvas, enableMouse, smoothTransitions, onInteractionEnd]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!enableMouse || !canvas) return;
    
    event.preventDefault();
    
    const mousePos = getCanvasMousePos(canvas, event as any);
    const zoomDelta = -event.deltaY * 0.01; // 휠 방향에 따른 줌
    
    zoomToPoint(mousePos, zoomDelta);
  }, [canvas, enableMouse]);

  // 터치 이벤트 핸들러
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!enableTouch || !canvas) return;
    
    event.preventDefault();
    
    if (event.touches.length === 1) {
      // 단일 터치: 팬 시작
      const touchPos = getCanvasTouchPos(canvas, event);
      interactionState.current.isDragging = true;
      interactionState.current.lastMousePos = touchPos;
      interactionState.current.dragStartTime = Date.now();
      interactionState.current.totalDragDistance = 0;
    } else if (event.touches.length === 2) {
      // 더블 터치: 줌 시작
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      
      interactionState.current.isZooming = true;
      interactionState.current.lastTouchDistance = distance;
      interactionState.current.lastTouchCenter = center;
    }
    
    setIsInteracting(true);
    onInteractionStart?.();
  }, [canvas, enableTouch, onInteractionStart]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!enableTouch || !canvas) return;
    
    event.preventDefault();
    
    if (event.touches.length === 1 && interactionState.current.isDragging) {
      // 팬 처리
      const touchPos = getCanvasTouchPos(canvas, event);
      
      if (interactionState.current.lastMousePos) {
        const deltaX = touchPos.x - interactionState.current.lastMousePos.x;
        const deltaY = touchPos.y - interactionState.current.lastMousePos.y;
        
        interactionState.current.totalDragDistance += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        const newViewState = transformer.pan(deltaX, deltaY);
        const constrainedViewState = constrainViewState(newViewState);
        transformer.updateViewState(constrainedViewState);
        onViewStateChange(constrainedViewState);
        
        interactionState.current.lastMousePos = touchPos;
      }
    } else if (event.touches.length === 2 && interactionState.current.isZooming) {
      // 줌 처리
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      
      if (interactionState.current.lastTouchDistance && interactionState.current.lastTouchCenter) {
        const scaleFactor = distance / interactionState.current.lastTouchDistance;
        const zoomDelta = (scaleFactor - 1) * 2; // 줌 감도 조정
        
        const rect = canvas.getBoundingClientRect();
        const canvasCenter = {
          x: center.x - rect.left,
          y: center.y - rect.top
        };
        
        zoomToPoint(canvasCenter, zoomDelta);
      }
      
      interactionState.current.lastTouchDistance = distance;
      interactionState.current.lastTouchCenter = center;
    }
  }, [canvas, enableTouch, transformer, onViewStateChange]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!enableTouch || !canvas) return;
    
    event.preventDefault();
    
    if (event.touches.length === 0) {
      // 모든 터치 종료
      if (interactionState.current.isDragging && smoothTransitions) {
        const dragDuration = Date.now() - interactionState.current.dragStartTime;
        const velocity = interactionState.current.totalDragDistance / dragDuration;
        
        if (velocity > 0.5) {
          startInertialPan(velocity);
        }
      }
      
      interactionState.current.isDragging = false;
      interactionState.current.isZooming = false;
      interactionState.current.lastMousePos = null;
      interactionState.current.lastTouchDistance = null;
      interactionState.current.lastTouchCenter = null;
      
      setIsInteracting(false);
      onInteractionEnd?.();
    } else if (event.touches.length === 1) {
      // 줌에서 팬으로 전환
      interactionState.current.isZooming = false;
      interactionState.current.lastTouchDistance = null;
      interactionState.current.lastTouchCenter = null;
      
      const touchPos = getCanvasTouchPos(canvas, event);
      interactionState.current.isDragging = true;
      interactionState.current.lastMousePos = touchPos;
      interactionState.current.dragStartTime = Date.now();
      interactionState.current.totalDragDistance = 0;
    }
  }, [canvas, enableTouch, smoothTransitions, onInteractionEnd]);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboard) return;
    
    const panDistance = 50; // 픽셀 단위 이동 거리
    const zoomStep = 0.2;
    
    let handled = false;
    
    switch (event.code) {
      case 'ArrowUp':
        pan(0, panDistance);
        handled = true;
        break;
      case 'ArrowDown':
        pan(0, -panDistance);
        handled = true;
        break;
      case 'ArrowLeft':
        pan(panDistance, 0);
        handled = true;
        break;
      case 'ArrowRight':
        pan(-panDistance, 0);
        handled = true;
        break;
      case 'Equal':
      case 'NumpadAdd':
        if (event.ctrlKey || event.metaKey) {
          zoomToCenter(zoomStep);
          handled = true;
        }
        break;
      case 'Minus':
      case 'NumpadSubtract':
        if (event.ctrlKey || event.metaKey) {
          zoomToCenter(-zoomStep);
          handled = true;
        }
        break;
    }
    
    if (handled) {
      event.preventDefault();
    }
  }, [enableKeyboard]);

  // 특정 점으로 줌
  const zoomToPoint = useCallback((point: { x: number; y: number }, zoomDelta: number) => {
    const currentViewState = transformer.viewState;
    const newViewState = transformer.adjustZoom(zoomDelta, point);
    const constrainedViewState = constrainViewState(newViewState);
    
    if (smoothTransitions && !isInteracting) {
      animateToViewState(constrainedViewState, 300);
    } else {
      transformer.updateViewState(constrainedViewState);
      onViewStateChange(constrainedViewState);
    }
  }, [transformer, onViewStateChange, smoothTransitions, isInteracting]);

  // 중심점으로 줌
  const zoomToCenter = useCallback((zoomDelta: number) => {
    if (!canvas) return;
    
    const center = {
      x: canvas.width / 2,
      y: canvas.height / 2
    };
    
    zoomToPoint(center, zoomDelta);
  }, [canvas, zoomToPoint]);

  // 팬 이동
  const pan = useCallback((deltaX: number, deltaY: number) => {
    const newViewState = transformer.pan(deltaX, deltaY);
    const constrainedViewState = constrainViewState(newViewState);
    
    if (smoothTransitions && !isInteracting) {
      animateToViewState(constrainedViewState, 200);
    } else {
      transformer.updateViewState(constrainedViewState);
      onViewStateChange(constrainedViewState);
    }
  }, [transformer, onViewStateChange, smoothTransitions, isInteracting]);

  // 뷰 상태 제약 적용
  const constrainViewState = useCallback((viewState: ViewState): ViewState => {
    let newViewState = { ...viewState };
    
    // 줌 제한
    newViewState.zoom = Math.max(bounds.minZoom, Math.min(bounds.maxZoom, newViewState.zoom));
    
    // 경계 제한
    if (bounds.maxBounds) {
      newViewState.centerLat = Math.max(
        bounds.maxBounds.south,
        Math.min(bounds.maxBounds.north, newViewState.centerLat)
      );
      newViewState.centerLng = Math.max(
        bounds.maxBounds.west,
        Math.min(bounds.maxBounds.east, newViewState.centerLng)
      );
    }
    
    return newViewState;
  }, [bounds]);

  // 관성 팬 시작
  const startInertialPan = useCallback((velocity: number) => {
    if (!interactionState.current.lastMousePos || !canvas) return;
    
    const friction = 0.95;
    const minVelocity = 0.01;
    
    const animate = () => {
      if (velocity < minVelocity) return;
      
      // 관성 감소
      velocity *= friction;
      
      // 팬 적용 (방향은 마지막 이동 방향 기준)
      const panDistance = velocity * 2;
      pan(panDistance, 0); // 간단화된 구현
      
      animationFrame.current = requestAnimationFrame(animate);
    };
    
    animate();
  }, [canvas, pan]);

  // 뷰 상태로 애니메이션
  const animateToViewState = useCallback((targetViewState: ViewState, duration: number = 1000) => {
    const currentViewState = transformer.viewState;
    
    animationState.current = {
      target: targetViewState,
      start: currentViewState,
      startTime: Date.now(),
      duration,
      easing: easeInOutCubic,
      isActive: true,
    };
    
    const animate = () => {
      if (!animationState.current.isActive) return;
      
      const elapsed = Date.now() - animationState.current.startTime;
      const progress = Math.min(1, elapsed / animationState.current.duration);
      const easedProgress = animationState.current.easing(progress);
      
      const interpolatedViewState: ViewState = {
        centerLat: animationState.current.start.centerLat + 
                   (animationState.current.target.centerLat - animationState.current.start.centerLat) * easedProgress,
        centerLng: animationState.current.start.centerLng + 
                   (animationState.current.target.centerLng - animationState.current.start.centerLng) * easedProgress,
        zoom: animationState.current.start.zoom + 
              (animationState.current.target.zoom - animationState.current.start.zoom) * easedProgress,
        canvasWidth: targetViewState.canvasWidth,
        canvasHeight: targetViewState.canvasHeight,
      };
      
      transformer.updateViewState(interpolatedViewState);
      onViewStateChange(interpolatedViewState);
      
      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        animationState.current.isActive = false;
      }
    };
    
    animate();
  }, [transformer, onViewStateChange]);

  // 이징 함수
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // 이벤트 리스너 등록/해제
  useEffect(() => {
    if (!canvas || !enableMouse) return;
    
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    canvas.style.cursor = 'grab';
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [canvas, enableMouse, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);

  useEffect(() => {
    if (!canvas || !enableTouch) return;
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canvas, enableTouch, handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    if (!enableKeyboard) return;
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboard, handleKeyDown]);

  // 컴포넌트 언마운트 시 애니메이션 정리
  useEffect(() => {
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      animationState.current.isActive = false;
    };
  }, []);

  // 공개 API 메서드들
  const flyTo = useCallback((center: Coordinate, zoom?: number, duration: number = 1000) => {
    const currentViewState = transformer.viewState;
    const targetViewState = createViewState(
      center,
      zoom ?? currentViewState.zoom,
      currentViewState.canvasWidth,
      currentViewState.canvasHeight
    );
    
    animateToViewState(constrainViewState(targetViewState), duration);
  }, [transformer, constrainViewState, animateToViewState]);

  const fitBounds = useCallback((bounds: { north: number; south: number; east: number; west: number }, padding: number = 50) => {
    const currentViewState = transformer.viewState;
    const boundingBox = {
      minLat: bounds.south,
      maxLat: bounds.north,
      minLng: bounds.west,
      maxLng: bounds.east
    };
    
    const targetViewState = transformer.fitBounds(boundingBox, padding);
    animateToViewState(constrainViewState(targetViewState), 1000);
  }, [transformer, constrainViewState, animateToViewState]);

  const resetView = useCallback((center: Coordinate, zoom: number = 1) => {
    flyTo(center, zoom, 500);
  }, [flyTo]);

  // MapControls는 이제 ref를 사용하지 않으므로 useImperativeHandle 제거

  return null; // 이 컴포넌트는 시각적 렌더링을 하지 않음
};

export default MapControls;