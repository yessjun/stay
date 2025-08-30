// 차량 관리 시스템 - 개별 차량의 상태와 행동을 관리

import { Vehicle, VehicleStatus, Coordinate, VehicleEvent } from '@/types/vehicle';
import { ParkingSlot } from '@/types/slot';

export class VehicleManager {
  private vehicles: Map<string, Vehicle> = new Map();
  private events: VehicleEvent[] = [];

  // 차량 등록
  public registerVehicle(vehicle: Vehicle): void {
    this.vehicles.set(vehicle.id, vehicle);
  }

  // 차량 제거
  public removeVehicle(vehicleId: string): void {
    this.vehicles.delete(vehicleId);
  }

  // 차량 상태 업데이트
  public updateVehicleStatus(vehicleId: string, status: VehicleStatus): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (vehicle) {
      const oldStatus = vehicle.status;
      vehicle.status = status;
      vehicle.lastUpdate = new Date();

      // 상태 변화 이벤트 생성
      this.addEvent({
        vehicleId,
        type: this.getEventTypeFromStatus(status),
        timestamp: new Date(),
        location: vehicle.position,
        severity: 'low',
        description: `차량이 ${oldStatus}에서 ${status}로 상태가 변경되었습니다.`,
        resolved: true
      });
    }
  }

  // 차량 위치 업데이트
  public updateVehiclePosition(vehicleId: string, position: Coordinate): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (vehicle) {
      vehicle.position = position;
      vehicle.lastUpdate = new Date();
    }
  }

  // 차량 목적지 설정
  public setDestination(vehicleId: string, destination: Coordinate): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (vehicle) {
      vehicle.destination = destination;
      vehicle.status = 'moving';
      vehicle.speed = 30 + Math.random() * 20; // 30-50 km/h
    }
  }

  // 가장 가까운 차량 찾기
  public findNearestVehicle(position: Coordinate, status?: VehicleStatus): Vehicle | null {
    let nearest: Vehicle | null = null;
    let minDistance = Infinity;

    for (const vehicle of this.vehicles.values()) {
      if (status && vehicle.status !== status) continue;

      const distance = this.calculateDistance(position, vehicle.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = vehicle;
      }
    }

    return nearest;
  }

  // 특정 지역 내 차량 찾기
  public findVehiclesInRadius(center: Coordinate, radius: number): Vehicle[] {
    const vehiclesInRadius: Vehicle[] = [];

    for (const vehicle of this.vehicles.values()) {
      const distance = this.calculateDistance(center, vehicle.position);
      if (distance <= radius) {
        vehiclesInRadius.push(vehicle);
      }
    }

    return vehiclesInRadius;
  }

  // 배터리 부족 차량 찾기
  public findLowBatteryVehicles(threshold: number = 20): Vehicle[] {
    return Array.from(this.vehicles.values()).filter(
      vehicle => vehicle.battery < threshold
    );
  }

  // 유지보수 필요 차량 찾기
  public findMaintenanceRequiredVehicles(): Vehicle[] {
    const now = new Date();
    const maintenanceThreshold = 30 * 24 * 60 * 60 * 1000; // 30일

    return Array.from(this.vehicles.values()).filter(vehicle => {
      const lastMaintenance = vehicle.lastUpdate; // 실제로는 lastMaintenance 필드 필요
      return (now.getTime() - lastMaintenance.getTime()) > maintenanceThreshold;
    });
  }

  // 차량 효율성 계산
  public calculateVehicleEfficiency(vehicleId: string): number {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return 0;

    // 효율성 = (완료된 여행 수 / 총 운행 시간) * (배터리 효율성) * (거리 효율성)
    const tripEfficiency = vehicle.tripCount > 0 ? Math.min(vehicle.tripCount / 10, 1) : 0;
    const batteryEfficiency = vehicle.battery / 100;
    const distanceEfficiency = vehicle.totalDistance > 0 ? Math.min(100 / vehicle.totalDistance, 1) : 1;

    return (tripEfficiency + batteryEfficiency + distanceEfficiency) / 3 * 100;
  }

  // 차량 배치 최적화
  public optimizeVehicleDistribution(slots: ParkingSlot[]): Map<string, string> {
    const assignments = new Map<string, string>(); // vehicleId -> slotId
    
    // 사용 가능한 슬롯들
    const availableSlots = slots.filter(slot => 
      slot.status === 'available' && slot.occupiedCount < slot.capacity
    );

    // 대기 중인 차량들
    const idleVehicles = Array.from(this.vehicles.values()).filter(
      vehicle => vehicle.status === 'idle'
    );

    // 우선순위 기반 할당
    availableSlots
      .sort((a, b) => b.priority - a.priority) // 높은 우선순위부터
      .forEach(slot => {
        if (idleVehicles.length === 0) return;

        // 슬롯에 가장 가까운 차량 찾기
        const nearestVehicle = this.findNearestVehicle(slot.position, 'idle');
        
        if (nearestVehicle) {
          assignments.set(nearestVehicle.id, slot.id);
          // 할당된 차량은 목록에서 제거
          const index = idleVehicles.findIndex(v => v.id === nearestVehicle.id);
          if (index > -1) {
            idleVehicles.splice(index, 1);
          }
        }
      });

    return assignments;
  }

  // 긴급상황 대응 - 모든 차량을 특정 지역에서 대피
  public evacuateArea(center: Coordinate, radius: number): string[] {
    const evacuatedVehicleIds: string[] = [];
    const vehiclesInArea = this.findVehiclesInRadius(center, radius);

    vehiclesInArea.forEach(vehicle => {
      if (vehicle.status === 'parked' || vehicle.status === 'idle') {
        // 대피 경로 설정
        const evacuationDestination = this.findEvacuationDestination(vehicle.position, center, radius);
        this.setDestination(vehicle.id, evacuationDestination);
        evacuatedVehicleIds.push(vehicle.id);

        // 긴급 이벤트 생성
        this.addEvent({
          vehicleId: vehicle.id,
          type: 'trip_start',
          timestamp: new Date(),
          location: vehicle.position,
          severity: 'high',
          description: '긴급상황으로 인한 차량 대피',
          resolved: false
        });
      }
    });

    return evacuatedVehicleIds;
  }

  // 차량 통계 생성
  public generateVehicleStats(): any {
    const vehicles = Array.from(this.vehicles.values());
    
    return {
      total: vehicles.length,
      active: vehicles.filter(v => v.status === 'moving' || v.status === 'picking' || v.status === 'dropping').length,
      idle: vehicles.filter(v => v.status === 'idle').length,
      parked: vehicles.filter(v => v.status === 'parked').length,
      moving: vehicles.filter(v => v.status === 'moving').length,
      picking: vehicles.filter(v => v.status === 'picking').length,
      dropping: vehicles.filter(v => v.status === 'dropping').length,
      averageBattery: vehicles.length > 0 ? 
        vehicles.reduce((sum, v) => sum + v.battery, 0) / vehicles.length : 0,
      averageSpeed: vehicles.length > 0 ? 
        vehicles.reduce((sum, v) => sum + v.speed, 0) / vehicles.length : 0,
      totalDistance: vehicles.reduce((sum, v) => sum + v.totalDistance, 0),
      totalTrips: vehicles.reduce((sum, v) => sum + v.tripCount, 0),
      averageEfficiency: vehicles.length > 0 ?
        vehicles.reduce((sum, v) => sum + this.calculateVehicleEfficiency(v.id), 0) / vehicles.length : 0
    };
  }

  // 이벤트 관리
  private addEvent(eventData: Omit<VehicleEvent, 'id'>): void {
    const event: VehicleEvent = {
      ...eventData,
      id: `vehicle-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.events.push(event);
    
    // 최대 1000개 이벤트만 유지
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  public getRecentEvents(limit: number = 50): VehicleEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public getUnresolvedEvents(): VehicleEvent[] {
    return this.events.filter(event => !event.resolved);
  }

  // 헬퍼 함수들
  private calculateDistance(pos1: Coordinate, pos2: Coordinate): number {
    const R = 6371; // 지구 반지름 (km)
    const dLat = this.toRadians(pos2.lat - pos1.lat);
    const dLng = this.toRadians(pos2.lng - pos1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(pos1.lat)) * Math.cos(this.toRadians(pos2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getEventTypeFromStatus(status: VehicleStatus): 'trip_start' | 'trip_end' | 'maintenance' | 'battery_low' | 'breakdown' | 'collision' {
    switch (status) {
      case 'moving':
        return 'trip_start';
      case 'idle':
        return 'trip_end';
      default:
        return 'maintenance';
    }
  }

  private findEvacuationDestination(vehiclePos: Coordinate, dangerCenter: Coordinate, dangerRadius: number): Coordinate {
    // 위험 지역 반대 방향으로 안전 거리만큼 이동
    const directionLat = vehiclePos.lat - dangerCenter.lat;
    const directionLng = vehiclePos.lng - dangerCenter.lng;
    const distance = Math.sqrt(directionLat * directionLat + directionLng * directionLng);
    
    if (distance === 0) {
      // 정확히 중심에 있다면 임의 방향으로
      return {
        lat: vehiclePos.lat + 0.01,
        lng: vehiclePos.lng + 0.01
      };
    }
    
    const safeDistance = dangerRadius * 1.5; // 위험 반지름의 1.5배 거리로 대피
    const normalizedLat = directionLat / distance;
    const normalizedLng = directionLng / distance;
    
    return {
      lat: dangerCenter.lat + normalizedLat * safeDistance,
      lng: dangerCenter.lng + normalizedLng * safeDistance
    };
  }

  // Public getters
  public getAllVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values());
  }

  public getVehicle(vehicleId: string): Vehicle | undefined {
    return this.vehicles.get(vehicleId);
  }

  public getVehicleCount(): number {
    return this.vehicles.size;
  }
}