// 차량 레이어 - 도로를 따라 이동하는 차량 렌더링

import { Vehicle, Coordinate } from '@/types/vehicle';
import { CanvasRenderer, RenderStyle } from '@/utils/canvasUtils';
import { CoordinateTransform, CanvasPoint } from '@/utils/coordinateTransform';
import { roadNetwork } from '@/constants/sejongRoadNetwork';

export interface VehicleRenderOptions {
  showTrails: boolean;
  showDestination: boolean;
  showRoutes: boolean;
  showLabels: boolean;
  trailLength: number;
  animateMovement: boolean;
}

interface VehicleTrail {
  vehicleId: string;
  points: CanvasPoint[];
  timestamps: number[];
  maxLength: number;
}

interface VehicleAnimation {
  vehicleId: string;
  fromPosition: Coordinate;
  toPosition: Coordinate;
  startTime: number;
  duration: number;
  easing: (t: number) => number;
}

export class VehicleLayer {
  private renderer: CanvasRenderer;
  private transformer: CoordinateTransform;
  private trails: Map<string, VehicleTrail> = new Map();
  private animations: Map<string, VehicleAnimation> = new Map();
  private vehicleSprites: Map<string, HTMLCanvasElement> = new Map();

  constructor(renderer: CanvasRenderer, transformer: CoordinateTransform) {
    this.renderer = renderer;
    this.transformer = transformer;
    this.createVehicleSprites();
  }

  // 차량 스프라이트 생성 (캐싱용)
  private createVehicleSprites(): void {
    const statuses = ['idle', 'moving', 'picking', 'dropping', 'parked'];
    
    statuses.forEach(status => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 32;
      canvas.height = 32;

      this.drawVehicleSprite(ctx, status as Vehicle['status']);
      this.vehicleSprites.set(status, canvas);
    });
  }

  // 개별 차량 스프라이트 그리기
  private drawVehicleSprite(ctx: CanvasRenderingContext2D, status: Vehicle['status']): void {
    const centerX = 16;
    const centerY = 16;
    const size = 12;

    const colors = this.getVehicleColors(status);

    // 차량 몸체 (둥근 사각형) - 브라우저 호환성 고려
    ctx.beginPath();
    if (ctx.roundRect && typeof ctx.roundRect === 'function') {
      ctx.roundRect(centerX - size/2, centerY - size/2, size, size, 3);
    } else {
      // 수동으로 둥근 사각형 그리기
      const x = centerX - size/2;
      const y = centerY - size/2;
      const radius = 3;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + size - radius, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
      ctx.lineTo(x + size, y + size - radius);
      ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
      ctx.lineTo(x + radius, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    ctx.fillStyle = colors.body;
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 방향 표시 (앞부분 표시)
    ctx.beginPath();
    ctx.arc(centerX, centerY - size/3, 2, 0, Math.PI * 2);
    ctx.fillStyle = colors.front;
    ctx.fill();

    // 상태별 추가 표시
    if (status === 'moving') {
      // 움직임 표시 (작은 점들)
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(centerX - size/2 - 2, centerY, 1, 0, Math.PI * 2);
      ctx.arc(centerX - size/2 - 4, centerY - 2, 1, 0, Math.PI * 2);
      ctx.arc(centerX - size/2 - 4, centerY + 2, 1, 0, Math.PI * 2);
      ctx.fill();
    } else if (status === 'picking' || status === 'dropping') {
      // 승하차 표시 (작은 사각형)
      ctx.fillStyle = colors.accent;
      ctx.fillRect(centerX - 1, centerY + size/2 + 2, 2, 3);
    }
  }

  // 차량 상태별 색상 정의
  private getVehicleColors(status: Vehicle['status']) {
    switch (status) {
      case 'moving':
        return {
          body: '#3B82F6',    // blue-500
          border: '#2563EB',  // blue-600
          front: '#FFFFFF',   // white
          accent: '#60A5FA'   // blue-400
        };
      case 'idle':
        return {
          body: '#6B7280',    // gray-500
          border: '#4B5563',  // gray-600
          front: '#FFFFFF',
          accent: '#9CA3AF'   // gray-400
        };
      case 'picking':
        return {
          body: '#F59E0B',    // amber-500
          border: '#D97706',  // amber-600
          front: '#FFFFFF',
          accent: '#FBBF24'   // amber-400
        };
      case 'dropping':
        return {
          body: '#EF4444',    // red-500
          border: '#DC2626',  // red-600
          front: '#FFFFFF',
          accent: '#F87171'   // red-400
        };
      case 'parked':
        return {
          body: '#10B981',    // emerald-500
          border: '#059669',  // emerald-600
          front: '#FFFFFF',
          accent: '#34D399'   // emerald-400
        };
      default:
        return {
          body: '#6B7280',
          border: '#4B5563',
          front: '#FFFFFF',
          accent: '#9CA3AF'
        };
    }
  }

  // 메인 렌더링 함수
  render(vehicles: Vehicle[], options: VehicleRenderOptions): void {
    const currentTime = Date.now();
    const bounds = this.transformer.getViewBounds();

    // 뷰 영역 내 차량만 필터링
    const visibleVehicles = vehicles.filter(vehicle => 
      this.transformer.isPointInView(vehicle.position, 100)
    );

    // 트레일 렌더링 (차량보다 먼저)
    if (options.showTrails) {
      this.renderTrails(visibleVehicles, options.trailLength);
    }

    // 경로 렌더링
    if (options.showRoutes) {
      this.renderRoutes(visibleVehicles);
    }

    // 목적지 렌더링
    if (options.showDestination) {
      this.renderDestinations(visibleVehicles);
    }

    // 차량 렌더링
    visibleVehicles.forEach(vehicle => {
      let renderPosition = vehicle.position;

      // 애니메이션이 있다면 보간된 위치 사용
      if (options.animateMovement) {
        renderPosition = this.getAnimatedPosition(vehicle, currentTime);
      }

      this.renderVehicle(vehicle, renderPosition);

      // 라벨 렌더링
      if (options.showLabels) {
        this.renderVehicleLabel(vehicle, renderPosition);
      }
    });

    // 트레일 업데이트
    if (options.showTrails) {
      this.updateTrails(visibleVehicles, currentTime);
    }
  }

  // 개별 차량 렌더링
  private renderVehicle(vehicle: Vehicle, position: Coordinate): void {
    const canvasPos = this.transformer.gpsToCanvas(position);
    
    // 도로에 맞춰 위치 조정
    const adjustedPos = this.snapToRoad(position);
    const adjustedCanvasPos = this.transformer.gpsToCanvas(adjustedPos);

    // 차량 방향 계산
    const bearing = this.calculateVehicleBearing(vehicle);

    // 캔버스에 차량 그리기
    this.renderer.save();
    this.renderer.translate(adjustedCanvasPos.x, adjustedCanvasPos.y);
    this.renderer.rotate(bearing);

    // 미리 생성된 스프라이트 사용
    const sprite = this.vehicleSprites.get(vehicle.status);
    if (sprite) {
      const ctx = this.renderer.ctx;
      ctx.drawImage(sprite, -16, -16, 32, 32);
    } else {
      this.drawVehicleDirect(vehicle);
    }

    // 배터리 표시 (낮을 때만)
    if (vehicle.battery < 30) {
      this.drawBatteryIndicator(vehicle.battery);
    }

    // 승객 표시
    if (vehicle.passenger) {
      this.drawPassengerIndicator();
    }

    this.renderer.restore();
  }

  // 직접 차량 그리기 (스프라이트 없을 때 fallback)
  private drawVehicleDirect(vehicle: Vehicle): void {
    const colors = this.getVehicleColors(vehicle.status);
    const size = 12;

    this.renderer.drawRoundedRect(
      { x: -size/2, y: -size/2 },
      size,
      size,
      3,
      {
        fillStyle: colors.body,
        strokeStyle: colors.border,
        lineWidth: 2
      }
    );

    // 방향 표시
    this.renderer.drawCircle(
      { x: 0, y: -size/3 },
      2,
      { fillStyle: colors.front }
    );
  }

  // 배터리 표시
  private drawBatteryIndicator(batteryLevel: number): void {
    const color = batteryLevel < 15 ? '#EF4444' : '#F59E0B'; // red or amber
    
    this.renderer.drawRect(
      { x: -8, y: 10 },
      16,
      4,
      {
        fillStyle: '#000000',
        globalAlpha: 0.7
      }
    );

    this.renderer.drawRect(
      { x: -7, y: 11 },
      Math.max(1, (batteryLevel / 100) * 14),
      2,
      {
        fillStyle: color
      }
    );
  }

  // 승객 표시
  private drawPassengerIndicator(): void {
    this.renderer.drawCircle(
      { x: 8, y: -8 },
      4,
      {
        fillStyle: '#F59E0B', // amber-500
        strokeStyle: '#FFFFFF',
        lineWidth: 1
      }
    );

    // 사람 아이콘 (단순화)
    this.renderer.drawText(
      '👤',
      { x: 8, y: -8 },
      '8px Arial',
      { fillStyle: '#FFFFFF' },
      'center',
      'middle'
    );
  }

  // 차량 방향 계산
  private calculateVehicleBearing(vehicle: Vehicle): number {
    if (vehicle.route && vehicle.route.length > 1) {
      const currentIndex = this.findCurrentRouteIndex(vehicle);
      if (currentIndex < vehicle.route.length - 1) {
        return this.transformer.calculateBearing(
          vehicle.route[currentIndex],
          vehicle.route[currentIndex + 1]
        );
      }
    }

    if (vehicle.destination) {
      return this.transformer.calculateBearing(vehicle.position, vehicle.destination);
    }

    return 0; // 기본 북쪽 방향
  }

  // 도로에 위치 맞춤
  private snapToRoad(position: Coordinate): Coordinate {
    return roadNetwork.findNearestIntersection(position);
  }

  // 트레일 렌더링
  private renderTrails(vehicles: Vehicle[], maxLength: number): void {
    vehicles.forEach(vehicle => {
      const trail = this.trails.get(vehicle.id);
      if (!trail || trail.points.length < 2) return;

      const colors = this.getVehicleColors(vehicle.status);
      
      for (let i = 1; i < trail.points.length; i++) {
        const alpha = (i / trail.points.length) * 0.6;
        
        this.renderer.drawLine(
          trail.points[i - 1],
          trail.points[i],
          {
            strokeStyle: colors.body,
            lineWidth: 2,
            globalAlpha: alpha
          }
        );
      }
    });
  }

  // 경로 렌더링
  private renderRoutes(vehicles: Vehicle[]): void {
    vehicles.forEach(vehicle => {
      if (!vehicle.route || vehicle.route.length < 2) return;

      const canvasRoute = vehicle.route.map(point => 
        this.transformer.gpsToCanvas(point)
      );

      this.renderer.drawPath(canvasRoute, {
        strokeStyle: '#60A5FA', // blue-400
        lineWidth: 2,
        lineDash: [5, 5],
        globalAlpha: 0.6
      });
    });
  }

  // 목적지 렌더링
  private renderDestinations(vehicles: Vehicle[]): void {
    vehicles.forEach(vehicle => {
      if (!vehicle.destination) return;

      const destPos = this.transformer.gpsToCanvas(vehicle.destination);
      
      // 목적지 표시 (깃발 모양)
      this.renderer.drawCircle(destPos, 8, {
        fillStyle: '#EF4444', // red-500
        strokeStyle: '#FFFFFF',
        lineWidth: 2
      });

      this.renderer.drawText(
        '🏁',
        destPos,
        '12px Arial',
        { fillStyle: '#FFFFFF' },
        'center',
        'middle'
      );

      // 목적지까지의 직선 거리 표시
      const vehiclePos = this.transformer.gpsToCanvas(vehicle.position);
      this.renderer.drawLine(vehiclePos, destPos, {
        strokeStyle: '#EF4444',
        lineWidth: 1,
        lineDash: [3, 3],
        globalAlpha: 0.3
      });
    });
  }

  // 차량 라벨 렌더링
  private renderVehicleLabel(vehicle: Vehicle, position: Coordinate): void {
    const canvasPos = this.transformer.gpsToCanvas(position);
    const labelPos = { x: canvasPos.x, y: canvasPos.y - 20 };

    // 배경
    this.renderer.drawRoundedRect(
      { x: labelPos.x - 25, y: labelPos.y - 8 },
      50,
      16,
      8,
      {
        fillStyle: 'rgba(0, 0, 0, 0.8)',
        strokeStyle: 'rgba(255, 255, 255, 0.3)',
        lineWidth: 1
      }
    );

    // 차량 ID
    this.renderer.drawText(
      vehicle.id,
      labelPos,
      '10px Arial',
      { fillStyle: '#FFFFFF' },
      'center',
      'middle'
    );
  }

  // 트레일 업데이트
  private updateTrails(vehicles: Vehicle[], currentTime: number): void {
    vehicles.forEach(vehicle => {
      const canvasPos = this.transformer.gpsToCanvas(vehicle.position);
      
      let trail = this.trails.get(vehicle.id);
      if (!trail) {
        trail = {
          vehicleId: vehicle.id,
          points: [canvasPos],
          timestamps: [currentTime],
          maxLength: 50
        };
        this.trails.set(vehicle.id, trail);
      } else {
        // 새 포인트 추가
        trail.points.push(canvasPos);
        trail.timestamps.push(currentTime);

        // 최대 길이 제한
        if (trail.points.length > trail.maxLength) {
          trail.points.shift();
          trail.timestamps.shift();
        }

        // 오래된 포인트 제거 (5초 이상)
        const cutoffTime = currentTime - 5000;
        while (trail.timestamps.length > 0 && trail.timestamps[0] < cutoffTime) {
          trail.points.shift();
          trail.timestamps.shift();
        }
      }
    });

    // 존재하지 않는 차량의 트레일 제거
    const activeVehicleIds = new Set(vehicles.map(v => v.id));
    this.trails.forEach((_, vehicleId) => {
      if (!activeVehicleIds.has(vehicleId)) {
        this.trails.delete(vehicleId);
      }
    });
  }

  // 애니메이션된 위치 계산
  private getAnimatedPosition(vehicle: Vehicle, currentTime: number): Coordinate {
    const animation = this.animations.get(vehicle.id);
    
    if (!animation || currentTime > animation.startTime + animation.duration) {
      return vehicle.position;
    }

    const elapsed = currentTime - animation.startTime;
    const progress = Math.min(1, elapsed / animation.duration);
    const easedProgress = animation.easing(progress);

    return {
      lat: animation.fromPosition.lat + 
           (animation.toPosition.lat - animation.fromPosition.lat) * easedProgress,
      lng: animation.fromPosition.lng + 
           (animation.toPosition.lng - animation.fromPosition.lng) * easedProgress
    };
  }

  // 차량 이동 애니메이션 시작
  startVehicleAnimation(
    vehicleId: string,
    fromPosition: Coordinate,
    toPosition: Coordinate,
    duration: number = 1000
  ): void {
    this.animations.set(vehicleId, {
      vehicleId,
      fromPosition,
      toPosition,
      startTime: Date.now(),
      duration,
      easing: this.easeInOutQuart
    });
  }

  // 이징 함수
  private easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
  }

  // 현재 경로 인덱스 찾기
  private findCurrentRouteIndex(vehicle: Vehicle): number {
    if (!vehicle.route) return 0;

    let minDistance = Infinity;
    let closestIndex = 0;

    vehicle.route.forEach((point, index) => {
      const distance = this.transformer.gpsDistance(vehicle.position, point);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  // 트레일 설정 업데이트
  updateTrailSettings(vehicleId: string, maxLength: number): void {
    const trail = this.trails.get(vehicleId);
    if (trail) {
      trail.maxLength = maxLength;
      
      // 현재 길이가 새 최대값보다 크면 자르기
      if (trail.points.length > maxLength) {
        trail.points = trail.points.slice(-maxLength);
        trail.timestamps = trail.timestamps.slice(-maxLength);
      }
    }
  }

  // 모든 트레일 클리어
  clearAllTrails(): void {
    this.trails.clear();
  }

  // 특정 차량 트레일 클리어
  clearVehicleTrail(vehicleId: string): void {
    this.trails.delete(vehicleId);
  }
}

export default VehicleLayer;