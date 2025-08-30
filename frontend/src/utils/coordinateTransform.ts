// 좌표 변환 유틸리티 - GPS 좌표와 캔버스 좌표 간 변환

import { Coordinate } from '@/types/vehicle';

export interface ViewState {
  centerLat: number;
  centerLng: number;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export class CoordinateTransform {
  private viewState: ViewState;
  private pixelsPerDegreeLat: number;
  private pixelsPerDegreeLng: number;

  constructor(viewState: ViewState) {
    this.viewState = viewState;
    const { pixelsPerDegreeLat, pixelsPerDegreeLng } = this.calculatePixelsPerDegree();
    this.pixelsPerDegreeLat = pixelsPerDegreeLat;
    this.pixelsPerDegreeLng = pixelsPerDegreeLng;
  }

  // 뷰 상태 업데이트
  updateViewState(newViewState: ViewState): void {
    this.viewState = newViewState;
    const { pixelsPerDegreeLat, pixelsPerDegreeLng } = this.calculatePixelsPerDegree();
    this.pixelsPerDegreeLat = pixelsPerDegreeLat;
    this.pixelsPerDegreeLng = pixelsPerDegreeLng;
  }

  // GPS 좌표를 캔버스 좌표로 변환
  gpsToCanvas(coordinate: Coordinate): CanvasPoint {
    const deltaLng = coordinate.lng - this.viewState.centerLng;
    const deltaLat = coordinate.lat - this.viewState.centerLat;

    const x = this.viewState.canvasWidth / 2 + deltaLng * this.pixelsPerDegreeLng;
    const y = this.viewState.canvasHeight / 2 - deltaLat * this.pixelsPerDegreeLat;

    return { x, y };
  }

  // 캔버스 좌표를 GPS 좌표로 변환
  canvasToGps(point: CanvasPoint): Coordinate {
    const deltaX = point.x - this.viewState.canvasWidth / 2;
    const deltaY = point.y - this.viewState.canvasHeight / 2;

    const lng = this.viewState.centerLng + deltaX / this.pixelsPerDegreeLng;
    const lat = this.viewState.centerLat - deltaY / this.pixelsPerDegreeLat;

    return { lat, lng };
  }

  // 줌 레벨에 따른 픽셀 밀도 계산
  private calculatePixelsPerDegree(): { pixelsPerDegreeLat: number; pixelsPerDegreeLng: number } {
    // 세종시 위도에서 위도와 경도의 실제 거리
    const kmPerDegreeLat = 111; // 위도 1도 = 111km (항상)
    const kmPerDegreeLng = 111 * Math.cos((this.viewState.centerLat * Math.PI) / 180); // 경도는 위도에 따라 변함
    
    // 줌 레벨에 따른 픽셀/km
    const pixelsPerKm = 100 * this.viewState.zoom;
    
    return {
      pixelsPerDegreeLat: pixelsPerKm * kmPerDegreeLat,
      pixelsPerDegreeLng: pixelsPerKm * kmPerDegreeLng
    };
  }

  // 현재 뷰 영역의 바운딩 박스 계산
  getViewBounds(): BoundingBox {
    const topLeft = this.canvasToGps({ x: 0, y: 0 });
    const bottomRight = this.canvasToGps({ 
      x: this.viewState.canvasWidth, 
      y: this.viewState.canvasHeight 
    });

    return {
      minLat: bottomRight.lat,
      maxLat: topLeft.lat,
      minLng: topLeft.lng,
      maxLng: bottomRight.lng
    };
  }

  // 두 점 사이의 캔버스 거리 계산
  canvasDistance(point1: CanvasPoint, point2: CanvasPoint): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 두 GPS 좌표 사이의 실제 거리 계산 (km)
  gpsDistance(coord1: Coordinate, coord2: Coordinate): number {
    const R = 6371; // 지구 반지름 (km)
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.lat)) * 
      Math.cos(this.toRadians(coord2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // 각도를 라디안으로 변환
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // 두 점 사이의 방향 계산 (라디안)
  calculateBearing(from: Coordinate, to: Coordinate): number {
    const dLng = this.toRadians(to.lng - from.lng);
    const lat1 = this.toRadians(from.lat);
    const lat2 = this.toRadians(to.lat);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - 
             Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    return Math.atan2(y, x);
  }

  // 점이 뷰 영역 내에 있는지 확인
  isPointInView(coordinate: Coordinate, margin: number = 50): boolean {
    const canvasPoint = this.gpsToCanvas(coordinate);
    return (
      canvasPoint.x >= -margin &&
      canvasPoint.x <= this.viewState.canvasWidth + margin &&
      canvasPoint.y >= -margin &&
      canvasPoint.y <= this.viewState.canvasHeight + margin
    );
  }

  // 줌 조정
  adjustZoom(delta: number, centerPoint?: CanvasPoint): ViewState {
    const zoomFactor = delta > 0 ? 1.2 : 0.8;
    const newZoom = Math.max(0.3, Math.min(5.0, this.viewState.zoom * zoomFactor));

    // 특정 점을 중심으로 줌하는 경우
    if (centerPoint) {
      const worldCoord = this.canvasToGps(centerPoint);
      return {
        ...this.viewState,
        zoom: newZoom,
        centerLat: worldCoord.lat,
        centerLng: worldCoord.lng
      };
    }

    return {
      ...this.viewState,
      zoom: newZoom
    };
  }

  // 팬 이동
  pan(deltaX: number, deltaY: number): ViewState {
    const startPoint = { x: this.viewState.canvasWidth / 2, y: this.viewState.canvasHeight / 2 };
    const endPoint = { x: startPoint.x - deltaX, y: startPoint.y - deltaY };
    
    const newCenter = this.canvasToGps(endPoint);

    return {
      ...this.viewState,
      centerLat: newCenter.lat,
      centerLng: newCenter.lng
    };
  }

  // 특정 영역으로 뷰 조정
  fitBounds(bounds: BoundingBox, padding: number = 50): ViewState {
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;

    const latSpan = bounds.maxLat - bounds.minLat;
    const lngSpan = bounds.maxLng - bounds.minLng;

    const availableWidth = this.viewState.canvasWidth - padding * 2;
    const availableHeight = this.viewState.canvasHeight - padding * 2;

    // 필요한 줌 레벨 계산
    const zoomLat = availableHeight / (latSpan * this.calculatePixelsPerDegree());
    const zoomLng = availableWidth / (lngSpan * this.calculatePixelsPerDegree());
    const zoom = Math.min(zoomLat, zoomLng, 10);

    return {
      ...this.viewState,
      centerLat,
      centerLng,
      zoom
    };
  }

  // 뷰 상태 정보
  getViewInfo(): {
    zoom: number;
    center: Coordinate;
    bounds: BoundingBox;
    pixelsPerKm: number;
  } {
    return {
      zoom: this.viewState.zoom,
      center: {
        lat: this.viewState.centerLat,
        lng: this.viewState.centerLng
      },
      bounds: this.getViewBounds(),
      pixelsPerKm: this.pixelsPerDegree * (1 / 111)
    };
  }
}

// 유틸리티 함수들
export const createViewState = (
  center: Coordinate,
  zoom: number,
  canvasWidth: number,
  canvasHeight: number
): ViewState => ({
  centerLat: center.lat,
  centerLng: center.lng,
  zoom,
  canvasWidth,
  canvasHeight
});

export const interpolateCoordinates = (
  from: Coordinate,
  to: Coordinate,
  progress: number
): Coordinate => ({
  lat: from.lat + (to.lat - from.lat) * progress,
  lng: from.lng + (to.lng - from.lng) * progress
});

export const smoothStep = (progress: number): number => {
  return progress * progress * (3 - 2 * progress);
};