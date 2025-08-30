// 도로 레이어 렌더링 시스템 - 실제 세종시 도로망 렌더링

import { Coordinate } from '@/types/vehicle';
import { CanvasRenderer, RenderStyle } from '@/utils/canvasUtils';
import { CoordinateTransform, CanvasPoint } from '@/utils/coordinateTransform';
import { MAIN_ROADS, GRID_ROADS, RoadSegment } from '@/constants/sejongRoadNetwork';

export interface RoadStyle {
  color: string;
  width: number;
  dashArray?: number[];
  opacity: number;
  borderColor?: string;
  borderWidth?: number;
}

export interface RoadRenderOptions {
  showLanes: boolean;
  showIntersections: boolean;
  showRoadLabels: boolean;
  showTrafficDirection: boolean;
  detailLevel: number; // 0-10, 높을수록 더 상세
}

export class RoadLayer {
  private renderer: CanvasRenderer;
  private transformer: CoordinateTransform;
  private roadStyles: Map<string, RoadStyle>;

  constructor(renderer: CanvasRenderer, transformer: CoordinateTransform) {
    this.renderer = renderer;
    this.transformer = transformer;
    this.roadStyles = this.createRoadStyles();
  }

  // 도로 타입별 스타일 정의
  private createRoadStyles(): Map<string, RoadStyle> {
    return new Map([
      ['highway', {
        color: '#1E40AF', // blue-800
        width: 12,
        opacity: 1,
        borderColor: '#1E3A8A', // blue-900
        borderWidth: 1
      }],
      ['main', {
        color: '#1F2937', // gray-800
        width: 8,
        opacity: 1,
        borderColor: '#111827', // gray-900
        borderWidth: 1
      }],
      ['sub', {
        color: '#374151', // gray-700
        width: 6,
        opacity: 0.9,
        borderColor: '#1F2937', // gray-800
        borderWidth: 0.5
      }],
      ['local', {
        color: '#6B7280', // gray-500
        width: 4,
        opacity: 0.8,
        borderColor: '#4B5563', // gray-600
        borderWidth: 0.5
      }],
      ['brt', {
        color: '#DC2626', // red-600
        width: 10,
        opacity: 1,
        borderColor: '#B91C1C', // red-700
        borderWidth: 1,
        dashArray: [5, 5]
      }]
    ]);
  }

  // 메인 렌더링 함수
  render(options: RoadRenderOptions): void {
    const bounds = this.transformer.getViewBounds();
    const viewInfo = this.transformer.getViewInfo();

    // 줄 레벨에 따른 렌더링 최적화
    if (viewInfo.zoom < 0.5) {
      this.renderLowDetail(bounds);
    } else if (viewInfo.zoom < 2) {
      this.renderMediumDetail(bounds, options);
    } else {
      this.renderHighDetail(bounds, options);
    }

    // 추가 기능들
    if (options.showIntersections && viewInfo.zoom > 1) {
      this.renderIntersections(bounds);
    }

    if (options.showRoadLabels && viewInfo.zoom > 3) {
      this.renderRoadLabels(bounds);
    }
  }

  // 저해상도 렌더링 (전체 뷰)
  private renderLowDetail(bounds: any): void {
    // 주요 간선도로만 렌더링
    Object.values(MAIN_ROADS).forEach(road => {
      if (this.isRoadInBounds(road, bounds)) {
        this.renderRoad(road, 0.5); // 축소된 두께
      }
    });
  }

  // 중간 해상도 렌더링
  private renderMediumDetail(bounds: any, options: RoadRenderOptions): void {
    // 주요 도로 먼저 렌더링
    Object.values(MAIN_ROADS).forEach(road => {
      if (this.isRoadInBounds(road, bounds)) {
        this.renderRoad(road);
      }
    });

    // 격자형 도로망 렌더링
    this.renderGridRoads(bounds, options.detailLevel);
  }

  // 고해상도 렌더링 (세부 뷰)
  private renderHighDetail(bounds: any, options: RoadRenderOptions): void {
    // 모든 도로 렌더링
    this.renderMediumDetail(bounds, options);

    // 차선 표시
    if (options.showLanes) {
      this.renderLanes(bounds);
    }

    // 교통 방향 표시
    if (options.showTrafficDirection) {
      this.renderTrafficDirection(bounds);
    }
  }

  // 개별 도로 렌더링
  private renderRoad(road: RoadSegment, scaleMultiplier: number = 1): void {
    const style = this.roadStyles.get(road.type) || this.roadStyles.get('local')!;
    const canvasPoints = road.points.map(point => this.transformer.gpsToCanvas(point));

    if (canvasPoints.length < 2) return;

    // 도로 테두리
    if (style.borderWidth && style.borderColor) {
      const borderStyle: RenderStyle = {
        strokeStyle: style.borderColor,
        lineWidth: (style.width + style.borderWidth * 2) * scaleMultiplier,
        lineCap: 'round',
        lineJoin: 'round',
        globalAlpha: style.opacity
      };

      if (style.dashArray) {
        borderStyle.lineDash = style.dashArray.map(dash => dash * scaleMultiplier);
      }

      this.renderer.drawPath(canvasPoints, borderStyle);
    }

    // 도로 본체
    const roadStyle: RenderStyle = {
      strokeStyle: style.color,
      lineWidth: style.width * scaleMultiplier,
      lineCap: 'round',
      lineJoin: 'round',
      globalAlpha: style.opacity
    };

    if (style.dashArray) {
      roadStyle.lineDash = style.dashArray.map(dash => dash * scaleMultiplier);
    }

    this.renderer.drawPath(canvasPoints, roadStyle);
  }

  // 격자형 도로망 렌더링
  private renderGridRoads(bounds: any, detailLevel: number): void {
    const style = this.roadStyles.get('local')!;
    
    // 세부 레벨에 따른 간격 조정
    const step = Math.max(1, Math.floor(10 - detailLevel));

    // 수평선 (동서 도로)
    GRID_ROADS.horizontal.forEach((lat, index) => {
      if (index % step !== 0) return;
      
      if (lat >= bounds.minLat && lat <= bounds.maxLat) {
        const start = { lat, lng: Math.max(bounds.minLng, GRID_ROADS.vertical[0]) };
        const end = { lat, lng: Math.min(bounds.maxLng, GRID_ROADS.vertical[GRID_ROADS.vertical.length - 1]) };
        
        const canvasStart = this.transformer.gpsToCanvas(start);
        const canvasEnd = this.transformer.gpsToCanvas(end);

        this.renderer.drawLine(canvasStart, canvasEnd, {
          strokeStyle: style.color,
          lineWidth: style.width * 0.8,
          globalAlpha: style.opacity * 0.7
        });
      }
    });

    // 수직선 (남북 도로)
    GRID_ROADS.vertical.forEach((lng, index) => {
      if (index % step !== 0) return;

      if (lng >= bounds.minLng && lng <= bounds.maxLng) {
        const start = { lat: Math.max(bounds.minLat, GRID_ROADS.horizontal[0]), lng };
        const end = { lat: Math.min(bounds.maxLat, GRID_ROADS.horizontal[GRID_ROADS.horizontal.length - 1]), lng };
        
        const canvasStart = this.transformer.gpsToCanvas(start);
        const canvasEnd = this.transformer.gpsToCanvas(end);

        this.renderer.drawLine(canvasStart, canvasEnd, {
          strokeStyle: style.color,
          lineWidth: style.width * 0.8,
          globalAlpha: style.opacity * 0.7
        });
      }
    });
  }

  // 차선 렌더링
  private renderLanes(bounds: any): void {
    Object.values(MAIN_ROADS).forEach(road => {
      if (!this.isRoadInBounds(road, bounds)) return;

      const style = this.roadStyles.get(road.type)!;
      const canvasPoints = road.points.map(point => this.transformer.gpsToCanvas(point));
      const laneCount = this.getLaneCount(road.type);

      for (let i = 1; i < laneCount; i++) {
        const offset = (i - laneCount / 2) * 3; // 3픽셀 간격
        const offsetPoints = this.offsetPath(canvasPoints, offset);

        this.renderer.drawPath(offsetPoints, {
          strokeStyle: '#FFFFFF',
          lineWidth: 1,
          lineDash: [5, 10],
          globalAlpha: 0.8
        });
      }
    });
  }

  // 교통 방향 화살표 렌더링
  private renderTrafficDirection(bounds: any): void {
    Object.values(MAIN_ROADS).forEach(road => {
      if (!this.isRoadInBounds(road, bounds)) return;

      const canvasPoints = road.points.map(point => this.transformer.gpsToCanvas(point));
      const arrowSpacing = 100; // 픽셀 간격

      for (let i = 0; i < canvasPoints.length - 1; i++) {
        const start = canvasPoints[i];
        const end = canvasPoints[i + 1];
        const distance = this.renderer.ctx.canvas.width; // 임시로 canvas width 사용

        if (distance > arrowSpacing) {
          const arrowCount = Math.floor(distance / arrowSpacing);
          
          for (let j = 1; j <= arrowCount; j++) {
            const progress = j / (arrowCount + 1);
            const arrowPos = {
              x: start.x + (end.x - start.x) * progress,
              y: start.y + (end.y - start.y) * progress
            };

            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            this.renderArrow(arrowPos, angle);
          }
        }
      }
    });
  }

  // 교차로 렌더링
  private renderIntersections(bounds: any): void {
    GRID_ROADS.horizontal.forEach(lat => {
      GRID_ROADS.vertical.forEach(lng => {
        const intersection = { lat, lng };
        
        if (lat >= bounds.minLat && lat <= bounds.maxLat &&
            lng >= bounds.minLng && lng <= bounds.maxLng) {
          
          const canvasPoint = this.transformer.gpsToCanvas(intersection);
          const isMainIntersection = this.isMainIntersection(lat, lng);

          this.renderer.drawCircle(canvasPoint, isMainIntersection ? 8 : 4, {
            fillStyle: isMainIntersection ? '#FCD34D' : '#D1D5DB', // yellow-300 or gray-300
            strokeStyle: isMainIntersection ? '#F59E0B' : '#9CA3AF', // yellow-500 or gray-400
            lineWidth: 1,
            globalAlpha: 0.8
          });
        }
      });
    });
  }

  // 도로 라벨 렌더링
  private renderRoadLabels(bounds: any): void {
    Object.values(MAIN_ROADS).forEach(road => {
      if (!this.isRoadInBounds(road, bounds)) return;

      const midIndex = Math.floor(road.points.length / 2);
      const labelPos = this.transformer.gpsToCanvas(road.points[midIndex]);

      this.renderer.drawText(road.name, labelPos, '14px Arial', {
        fillStyle: '#FFFFFF',
        strokeStyle: '#000000',
        lineWidth: 3
      }, 'center', 'middle');
    });
  }

  // 유틸리티 함수들
  private isRoadInBounds(road: RoadSegment, bounds: any): boolean {
    return road.points.some(point => 
      point.lat >= bounds.minLat && point.lat <= bounds.maxLat &&
      point.lng >= bounds.minLng && point.lng <= bounds.maxLng
    );
  }

  private getLaneCount(roadType: string): number {
    switch (roadType) {
      case 'highway': return 6;
      case 'main': return 4;
      case 'sub': return 3;
      case 'brt': return 2;
      default: return 2;
    }
  }

  private offsetPath(points: CanvasPoint[], offset: number): CanvasPoint[] {
    return points.map((point, index) => {
      let angle = 0;
      
      if (index === 0) {
        angle = Math.atan2(points[1].y - point.y, points[1].x - point.x) + Math.PI / 2;
      } else if (index === points.length - 1) {
        angle = Math.atan2(point.y - points[index - 1].y, point.x - points[index - 1].x) + Math.PI / 2;
      } else {
        const angle1 = Math.atan2(point.y - points[index - 1].y, point.x - points[index - 1].x);
        const angle2 = Math.atan2(points[index + 1].y - point.y, points[index + 1].x - point.x);
        angle = (angle1 + angle2) / 2 + Math.PI / 2;
      }

      return {
        x: point.x + Math.cos(angle) * offset,
        y: point.y + Math.sin(angle) * offset
      };
    });
  }

  private isMainIntersection(lat: number, lng: number): boolean {
    // 한누리대로와의 교차점
    if (Math.abs(lat - 36.4800) < 0.002) return true;
    
    // 주요 남북 도로와의 교차점
    if (Math.abs(lng - 127.2890) < 0.002 || 
        Math.abs(lng - 127.2650) < 0.002) return true;

    return false;
  }

  private renderArrow(position: CanvasPoint, angle: number): void {
    this.renderer.save();
    this.renderer.translate(position.x, position.y);
    this.renderer.rotate(angle);

    // 화살표 모양
    const arrowPath = [
      { x: -8, y: -3 },
      { x: 0, y: 0 },
      { x: -8, y: 3 }
    ];

    this.renderer.drawPath(arrowPath, {
      strokeStyle: '#FFFFFF',
      lineWidth: 2,
      lineCap: 'round',
      globalAlpha: 0.8
    });

    this.renderer.restore();
  }

  // 트래픽 히트맵 렌더링
  renderTrafficHeatMap(trafficData: { position: Coordinate; intensity: number }[]): void {
    const heatmapPoints = trafficData
      .map(data => ({
        position: this.transformer.gpsToCanvas(data.position),
        intensity: data.intensity
      }))
      .filter(point => this.isPointInView(point.position));

    this.renderer.drawHeatMap(heatmapPoints, 30);
  }

  private isPointInView(point: CanvasPoint): boolean {
    const bounds = this.transformer.getViewBounds();
    return point.x >= 0 && point.x <= this.renderer.canvas.width &&
           point.y >= 0 && point.y <= this.renderer.canvas.height;
  }

  // 도로 스타일 동적 업데이트
  updateRoadStyle(roadType: string, style: Partial<RoadStyle>): void {
    const currentStyle = this.roadStyles.get(roadType);
    if (currentStyle) {
      this.roadStyles.set(roadType, { ...currentStyle, ...style });
    }
  }

  // 야간 모드 스타일 적용
  applyNightMode(): void {
    this.roadStyles.forEach((style, type) => {
      style.color = this.darkenColor(style.color, 0.7);
      if (style.borderColor) {
        style.borderColor = this.darkenColor(style.borderColor, 0.7);
      }
    });
  }

  private darkenColor(color: string, factor: number): string {
    // 간단한 색상 어둡게 처리
    const hex = color.replace('#', '');
    const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor);
    const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor);
    const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

export default RoadLayer;