// 슬롯 레이어 - 도로 가장자리에 정확한 슬롯 위치 표시

import { ParkingSlot } from '@/types/slot';
import { Coordinate } from '@/types/vehicle';
import { CanvasRenderer, RenderStyle } from '@/utils/canvasUtils';
import { CoordinateTransform, CanvasPoint } from '@/utils/coordinateTransform';
import { roadNetwork } from '@/constants/sejongRoadNetwork';

export interface SlotRenderOptions {
  showCapacity: boolean;
  showUtilization: boolean;
  showLabels: boolean;
  showConnections: boolean;
  clusterSlots: boolean;
  minZoomForDetails: number;
}

interface SlotCluster {
  center: Coordinate;
  slots: ParkingSlot[];
  canvasPosition: CanvasPoint;
  totalCapacity: number;
  totalOccupied: number;
}

interface SlotStyle {
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  size: number;
  opacity: number;
}

export class SlotLayer {
  private renderer: CanvasRenderer;
  private transformer: CoordinateTransform;
  private slotStyles: Map<string, SlotStyle>;
  private clusters: SlotCluster[] = [];

  constructor(renderer: CanvasRenderer, transformer: CoordinateTransform) {
    this.renderer = renderer;
    this.transformer = transformer;
    this.slotStyles = this.createSlotStyles();
  }

  // 슬롯 상태별 스타일 정의
  private createSlotStyles(): Map<string, SlotStyle> {
    return new Map([
      ['available', {
        fillColor: '#10B981',   // emerald-500
        borderColor: '#059669', // emerald-600
        borderWidth: 2,
        size: 16,
        opacity: 0.9
      }],
      ['occupied', {
        fillColor: '#EF4444',   // red-500
        borderColor: '#DC2626', // red-600
        borderWidth: 2,
        size: 16,
        opacity: 0.9
      }],
      ['reserved', {
        fillColor: '#F59E0B',   // amber-500
        borderColor: '#D97706', // amber-600
        borderWidth: 2,
        size: 16,
        opacity: 0.9
      }],
      ['disabled', {
        fillColor: '#6B7280',   // gray-500
        borderColor: '#4B5563', // gray-600
        borderWidth: 1,
        size: 14,
        opacity: 0.6
      }],
      ['maintenance', {
        fillColor: '#8B5CF6',   // violet-500
        borderColor: '#7C3AED', // violet-600
        borderWidth: 2,
        size: 16,
        opacity: 0.8
      }]
    ]);
  }

  // 메인 렌더링 함수
  render(slots: ParkingSlot[], options: SlotRenderOptions): void {
    const viewInfo = this.transformer.getViewInfo();
    const bounds = this.transformer.getViewBounds();

    // 뷰 영역 내 슬롯만 필터링
    const visibleSlots = slots.filter(slot => 
      this.transformer.isPointInView(slot.position, 50)
    );

    if (visibleSlots.length === 0) return;

    // 줌 레벨에 따른 렌더링 방식 결정
    if (viewInfo.zoom < 1 && options.clusterSlots) {
      this.renderClustered(visibleSlots, options);
    } else {
      this.renderIndividual(visibleSlots, options);
    }

    // 슬롯 연결선 표시
    if (options.showConnections && viewInfo.zoom > options.minZoomForDetails) {
      this.renderSlotConnections(visibleSlots);
    }
  }

  // 개별 슬롯 렌더링
  private renderIndividual(slots: ParkingSlot[], options: SlotRenderOptions): void {
    const viewInfo = this.transformer.getViewInfo();
    
    slots.forEach(slot => {
      const adjustedPosition = this.adjustSlotToRoad(slot);
      const canvasPos = this.transformer.gpsToCanvas(adjustedPosition);
      
      this.renderSlot(slot, canvasPos, options, viewInfo.zoom);
    });
  }

  // 클러스터링된 슬롯 렌더링
  private renderClustered(slots: ParkingSlot[], options: SlotRenderOptions): void {
    const clusters = this.createClusters(slots, 0.001); // 약 100m 반경

    clusters.forEach(cluster => {
      this.renderCluster(cluster, options);
    });
  }

  // 개별 슬롯 렌더링
  private renderSlot(
    slot: ParkingSlot, 
    canvasPos: CanvasPoint, 
    options: SlotRenderOptions,
    zoom: number
  ): void {
    const style = this.slotStyles.get(slot.status) || this.slotStyles.get('available')!;
    const size = style.size * Math.min(2, Math.max(0.5, zoom));

    // 도로 방향에 따른 슬롯 모양 결정
    const shape = this.getSlotShape(slot);
    
    // 슬롯 본체 렌더링
    this.renderer.save();
    this.renderer.translate(canvasPos.x, canvasPos.y);
    this.renderer.rotate(this.getSlotRotation(slot));

    if (shape === 'rectangle') {
      this.renderRectangularSlot(slot, style, size, options);
    } else {
      this.renderCircularSlot(slot, style, size, options);
    }

    // 용량 표시
    if (options.showCapacity && zoom > 2) {
      this.renderCapacityIndicator(slot, size);
    }

    // 이용률 표시
    if (options.showUtilization && zoom > 2) {
      this.renderUtilizationBar(slot, size);
    }

    // 우선순위 표시
    if (slot.priority > 7 && zoom > 3) {
      this.renderPriorityIndicator(slot.priority);
    }

    this.renderer.restore();

    // 라벨 렌더링 (회전하지 않음)
    if (options.showLabels && zoom > options.minZoomForDetails) {
      this.renderSlotLabel(slot, canvasPos, size);
    }
  }

  // 사각형 슬롯 렌더링
  private renderRectangularSlot(
    slot: ParkingSlot, 
    style: SlotStyle, 
    size: number, 
    options: SlotRenderOptions
  ): void {
    const width = size * 1.5;
    const height = size;

    // 슬롯 배경
    this.renderer.drawRoundedRect(
      { x: -width/2, y: -height/2 },
      width,
      height,
      4,
      {
        fillStyle: style.fillColor,
        strokeStyle: style.borderColor,
        lineWidth: style.borderWidth,
        globalAlpha: style.opacity
      }
    );

    // 동적 슬롯 표시 (점선 테두리)
    if (slot.type === 'dynamic') {
      this.renderer.drawRoundedRect(
        { x: -width/2 - 2, y: -height/2 - 2 },
        width + 4,
        height + 4,
        6,
        {
          strokeStyle: style.borderColor,
          lineWidth: 1,
          lineDash: [3, 3],
          globalAlpha: 0.8
        },
        false
      );
    }

    // 차량 아이콘 (점유된 경우)
    if (slot.status === 'occupied') {
      this.renderVehicleIcon(width * 0.6, height * 0.6);
    } else if (slot.status === 'reserved') {
      this.renderReservationIcon();
    }
  }

  // 원형 슬롯 렌더링
  private renderCircularSlot(
    slot: ParkingSlot, 
    style: SlotStyle, 
    size: number, 
    options: SlotRenderOptions
  ): void {
    const radius = size / 2;

    // 슬롯 배경
    this.renderer.drawCircle(
      { x: 0, y: 0 },
      radius,
      {
        fillStyle: style.fillColor,
        strokeStyle: style.borderColor,
        lineWidth: style.borderWidth,
        globalAlpha: style.opacity
      }
    );

    // 동적 슬롯 표시
    if (slot.type === 'dynamic') {
      this.renderer.drawCircle(
        { x: 0, y: 0 },
        radius + 3,
        {
          strokeStyle: style.borderColor,
          lineWidth: 1,
          lineDash: [2, 2],
          globalAlpha: 0.8
        },
        false
      );
    }

    // 상태 아이콘
    if (slot.status === 'occupied') {
      this.renderVehicleIcon(radius * 1.2, radius * 1.2);
    } else if (slot.status === 'reserved') {
      this.renderReservationIcon();
    }
  }

  // 클러스터 렌더링
  private renderCluster(cluster: SlotCluster, options: SlotRenderOptions): void {
    const pos = cluster.canvasPosition;
    const utilizationRate = (cluster.totalOccupied / cluster.totalCapacity) * 100;
    
    // 클러스터 크기 계산 (슬롯 수에 비례)
    const baseSize = 20;
    const size = Math.min(50, baseSize + cluster.slots.length * 2);

    // 클러스터 배경
    const bgColor = this.getClusterColor(utilizationRate);
    this.renderer.drawCircle(pos, size/2, {
      fillStyle: bgColor,
      strokeStyle: '#FFFFFF',
      lineWidth: 2,
      globalAlpha: 0.8
    });

    // 클러스터 정보 텍스트
    this.renderer.drawText(
      cluster.slots.length.toString(),
      pos,
      `${Math.max(12, size * 0.4)}px Arial`,
      {
        fillStyle: '#FFFFFF',
        strokeStyle: '#000000',
        lineWidth: 2
      },
      'center',
      'middle'
    );

    // 이용률 링
    this.renderUtilizationRing(pos, size/2 + 5, utilizationRate);
  }

  // 슬롯을 도로에 맞춰 조정
  private adjustSlotToRoad(slot: ParkingSlot): Coordinate {
    // 가장 가까운 도로 찾기
    const nearestRoadPoint = roadNetwork.findNearestIntersection(slot.position);
    
    // 도로에서 약간 떨어진 위치에 슬롯 배치
    const offset = this.getSlotOffset(slot.direction);
    
    return {
      lat: nearestRoadPoint.lat + offset.lat,
      lng: nearestRoadPoint.lng + offset.lng
    };
  }

  // 방향별 슬롯 오프셋 계산
  private getSlotOffset(direction: ParkingSlot['direction']): Coordinate {
    const offsetDistance = 0.0001; // 약 11미터

    switch (direction) {
      case 'north': return { lat: offsetDistance, lng: 0 };
      case 'south': return { lat: -offsetDistance, lng: 0 };
      case 'east': return { lat: 0, lng: offsetDistance };
      case 'west': return { lat: 0, lng: -offsetDistance };
      default: return { lat: 0, lng: 0 };
    }
  }

  // 슬롯 회전각 계산
  private getSlotRotation(slot: ParkingSlot): number {
    switch (slot.direction) {
      case 'north': return 0;
      case 'east': return Math.PI / 2;
      case 'south': return Math.PI;
      case 'west': return -Math.PI / 2;
      default: return 0;
    }
  }

  // 슬롯 모양 결정
  private getSlotShape(slot: ParkingSlot): 'rectangle' | 'circle' {
    return slot.type === 'dynamic' ? 'circle' : 'rectangle';
  }

  // 차량 아이콘 렌더링
  private renderVehicleIcon(width: number, height: number): void {
    this.renderer.drawRoundedRect(
      { x: -width/2, y: -height/2 },
      width,
      height,
      2,
      {
        fillStyle: '#FFFFFF',
        strokeStyle: '#374151', // gray-700
        lineWidth: 1
      }
    );

    // 간단한 차량 모양
    this.renderer.drawCircle({ x: -width/4, y: height/4 }, 1, { fillStyle: '#374151' });
    this.renderer.drawCircle({ x: width/4, y: height/4 }, 1, { fillStyle: '#374151' });
    this.renderer.drawCircle({ x: -width/4, y: -height/4 }, 1, { fillStyle: '#374151' });
    this.renderer.drawCircle({ x: width/4, y: -height/4 }, 1, { fillStyle: '#374151' });
  }

  // 예약 아이콘 렌더링
  private renderReservationIcon(): void {
    this.renderer.drawText(
      '📅',
      { x: 0, y: 0 },
      '12px Arial',
      { fillStyle: '#FFFFFF' },
      'center',
      'middle'
    );
  }

  // 용량 표시
  private renderCapacityIndicator(slot: ParkingSlot, size: number): void {
    const pos = { x: size/2 + 5, y: -size/2 - 5 };
    
    // 배경
    this.renderer.drawCircle(pos, 8, {
      fillStyle: 'rgba(0, 0, 0, 0.8)',
      strokeStyle: '#FFFFFF',
      lineWidth: 1
    });

    // 텍스트
    this.renderer.drawText(
      `${slot.occupiedCount}/${slot.capacity}`,
      pos,
      '8px Arial',
      { fillStyle: '#FFFFFF' },
      'center',
      'middle'
    );
  }

  // 이용률 바 표시
  private renderUtilizationBar(slot: ParkingSlot, size: number): void {
    const barWidth = size;
    const barHeight = 4;
    const pos = { x: -barWidth/2, y: size/2 + 8 };

    // 배경
    this.renderer.drawRect(pos, barWidth, barHeight, {
      fillStyle: 'rgba(255, 255, 255, 0.3)'
    });

    // 이용률
    const utilizationWidth = (slot.utilizationRate / 100) * barWidth;
    const color = this.getUtilizationColor(slot.utilizationRate);
    
    this.renderer.drawRect(pos, utilizationWidth, barHeight, {
      fillStyle: color
    });
  }

  // 우선순위 표시
  private renderPriorityIndicator(priority: number): void {
    const pos = { x: -8, y: -8 };
    
    this.renderer.drawCircle(pos, 6, {
      fillStyle: '#FCD34D', // yellow-300
      strokeStyle: '#F59E0B', // amber-500
      lineWidth: 1
    });

    this.renderer.drawText(
      '⭐',
      pos,
      '8px Arial',
      { fillStyle: '#D97706' }, // amber-600
      'center',
      'middle'
    );
  }

  // 슬롯 라벨 렌더링
  private renderSlotLabel(slot: ParkingSlot, canvasPos: CanvasPoint, size: number): void {
    const labelPos = { x: canvasPos.x, y: canvasPos.y - size - 15 };

    // 배경
    this.renderer.drawRoundedRect(
      { x: labelPos.x - 30, y: labelPos.y - 8 },
      60,
      16,
      8,
      {
        fillStyle: 'rgba(0, 0, 0, 0.8)',
        strokeStyle: 'rgba(255, 255, 255, 0.3)',
        lineWidth: 1
      }
    );

    // 텍스트
    this.renderer.drawText(
      `${slot.id} (${slot.roadSection})`,
      labelPos,
      '10px Arial',
      { fillStyle: '#FFFFFF' },
      'center',
      'middle'
    );
  }

  // 슬롯 연결선 렌더링
  private renderSlotConnections(slots: ParkingSlot[]): void {
    // 같은 도로 구간의 슬롯들을 연결
    const roadGroups = this.groupSlotsByRoad(slots);
    
    roadGroups.forEach(group => {
      if (group.length < 2) return;

      for (let i = 0; i < group.length - 1; i++) {
        const slot1 = group[i];
        const slot2 = group[i + 1];
        
        const pos1 = this.transformer.gpsToCanvas(this.adjustSlotToRoad(slot1));
        const pos2 = this.transformer.gpsToCanvas(this.adjustSlotToRoad(slot2));

        this.renderer.drawLine(pos1, pos2, {
          strokeStyle: '#9CA3AF', // gray-400
          lineWidth: 1,
          lineDash: [2, 4],
          globalAlpha: 0.5
        });
      }
    });
  }

  // 슬롯 클러스터 생성
  private createClusters(slots: ParkingSlot[], radius: number): SlotCluster[] {
    const clusters: SlotCluster[] = [];
    const processed = new Set<string>();

    slots.forEach(slot => {
      if (processed.has(slot.id)) return;

      const clusterSlots = slots.filter(otherSlot => {
        if (processed.has(otherSlot.id)) return false;
        
        const distance = this.transformer.gpsDistance(slot.position, otherSlot.position);
        return distance <= radius;
      });

      if (clusterSlots.length > 0) {
        const center = this.calculateClusterCenter(clusterSlots);
        const totalCapacity = clusterSlots.reduce((sum, s) => sum + s.capacity, 0);
        const totalOccupied = clusterSlots.reduce((sum, s) => sum + s.occupiedCount, 0);

        clusters.push({
          center,
          slots: clusterSlots,
          canvasPosition: this.transformer.gpsToCanvas(center),
          totalCapacity,
          totalOccupied
        });

        clusterSlots.forEach(s => processed.add(s.id));
      }
    });

    return clusters;
  }

  // 클러스터 중심 계산
  private calculateClusterCenter(slots: ParkingSlot[]): Coordinate {
    const totalLat = slots.reduce((sum, slot) => sum + slot.position.lat, 0);
    const totalLng = slots.reduce((sum, slot) => sum + slot.position.lng, 0);

    return {
      lat: totalLat / slots.length,
      lng: totalLng / slots.length
    };
  }

  // 도로별 슬롯 그룹핑
  private groupSlotsByRoad(slots: ParkingSlot[]): ParkingSlot[][] {
    const roadGroups = new Map<string, ParkingSlot[]>();

    slots.forEach(slot => {
      const roadSection = slot.roadSection;
      if (!roadGroups.has(roadSection)) {
        roadGroups.set(roadSection, []);
      }
      roadGroups.get(roadSection)!.push(slot);
    });

    return Array.from(roadGroups.values());
  }

  // 클러스터 색상 결정
  private getClusterColor(utilizationRate: number): string {
    if (utilizationRate > 80) return '#EF4444'; // red-500
    if (utilizationRate > 60) return '#F59E0B'; // amber-500
    if (utilizationRate > 40) return '#10B981'; // emerald-500
    return '#6B7280'; // gray-500
  }

  // 이용률 색상 결정
  private getUtilizationColor(utilizationRate: number): string {
    if (utilizationRate > 80) return '#EF4444'; // red-500
    if (utilizationRate > 60) return '#F59E0B'; // amber-500
    return '#10B981'; // emerald-500
  }

  // 이용률 링 렌더링
  private renderUtilizationRing(center: CanvasPoint, radius: number, utilizationRate: number): void {
    const circumference = 2 * Math.PI * radius;
    const dashLength = (utilizationRate / 100) * circumference;
    
    this.renderer.drawCircle(center, radius, {
      strokeStyle: this.getUtilizationColor(utilizationRate),
      lineWidth: 3,
      lineDash: [dashLength, circumference - dashLength],
      globalAlpha: 0.8
    }, false);
  }

  // 슬롯 스타일 업데이트
  updateSlotStyle(status: string, style: Partial<SlotStyle>): void {
    const currentStyle = this.slotStyles.get(status);
    if (currentStyle) {
      this.slotStyles.set(status, { ...currentStyle, ...style });
    }
  }

  // 야간 모드 적용
  applyNightMode(): void {
    this.slotStyles.forEach((style, status) => {
      style.fillColor = this.darkenColor(style.fillColor, 0.8);
      style.borderColor = this.darkenColor(style.borderColor, 0.8);
    });
  }

  // 색상 어둡게 처리
  private darkenColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor);
    const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor);
    const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

export default SlotLayer;