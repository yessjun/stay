// 신호등 제어 시스템
export interface TrafficSignal {
  id: string;
  direction: 'north' | 'south' | 'east' | 'west';
  state: 'red' | 'yellow' | 'green';
  leftTurnState: 'red' | 'yellow' | 'green';
  timer: number;
  position: { x: number; y: number };
  connectedLanes: number[];
}

export class TrafficSignalSystem {
  private signals: Map<string, TrafficSignal>;
  private cycleTime: number = 60; // 신호 주기 (초)
  private yellowTime: number = 5; // 황색 신호 시간 (3초 -> 5초로 증가)
  private currentPhase: number = 0;
  private phaseTimer: number = 0;
  private phaseInitialized: boolean = false;
  private useLeftTurnLane: boolean = true; // 좌회전 전용 차선 사용 (8단계 신호 체계)
  
  constructor() {
    this.signals = new Map();
    this.initializeSignals();
  }
  
  private initializeSignals() {
    // 4방향 신호등 초기화
    const signalConfigs = [
      { id: 'N', direction: 'north' as const, connectedLanes: [0, 1, 2, 3] },
      { id: 'S', direction: 'south' as const, connectedLanes: [4, 5, 6, 7] },
      { id: 'E', direction: 'east' as const, connectedLanes: [8, 9] },
      { id: 'W', direction: 'west' as const, connectedLanes: [10, 11] }
    ];
    
    // 초기값: 남북 직진 신호 (좌회전은 분리)
    signalConfigs.forEach((config, index) => {
      this.signals.set(config.id, {
        ...config,
        state: (config.id === 'N' || config.id === 'S') ? 'green' : 'red',
        leftTurnState: 'red', // 좌회전은 별도 단계에서
        timer: 20,
        position: this.getSignalPosition(config.direction)
      });
    });
  }
  
  private getSignalPosition(direction: string): { x: number; y: number } {
    const positions = {
      north: { x: 470, y: 170 },
      south: { x: 730, y: 330 },
      east: { x: 730, y: 170 },
      west: { x: 470, y: 330 }
    };
    return positions[direction as keyof typeof positions];
  }
  
  // 신호 업데이트
  public update(deltaTime: number): void {
    this.phaseTimer += deltaTime;
    
    // 좌회전 전용 차선이 없는 경우 직좌 신호 사용 (4단계)
    if (!this.useLeftTurnLane) {
      switch (this.currentPhase) {
        case 0: // 남북 직좌 (직진+좌회전 동시)
          if (!this.phaseInitialized) {
            this.setNorthSouthStraightLeft();
            this.phaseInitialized = true;
          }
          if (this.phaseTimer >= 30) { // 20초 -> 30초로 증가
            this.setNorthSouthYellow();
            this.currentPhase = 1;
            this.phaseTimer = 0;
            this.phaseInitialized = false;
          }
          break;
          
        case 1: // 남북 황색
          if (this.phaseTimer >= this.yellowTime) {
            this.setAllRed();
            this.currentPhase = 2;
            this.phaseTimer = 0;
          }
          break;
          
        case 2: // 동서 직좌 (직진+좌회전 동시)
          if (!this.phaseInitialized) {
            this.setEastWestStraightLeft();
            this.phaseInitialized = true;
          }
          if (this.phaseTimer >= 30) { // 20초 -> 30초로 증가
            this.setEastWestYellow();
            this.currentPhase = 3;
            this.phaseTimer = 0;
            this.phaseInitialized = false;
          }
          break;
          
        case 3: // 동서 황색
          if (this.phaseTimer >= this.yellowTime) {
            this.setAllRed();
            this.currentPhase = 0;
            this.phaseTimer = 0;
          }
          break;
      }
    } else {
      // 좌회전 전용 차선이 있는 경우 (8단계 - 기존 로직)
      switch (this.currentPhase) {
        case 0: // 남북 좌회전
          if (!this.phaseInitialized) {
            this.setNorthSouthLeftTurn();
            this.phaseInitialized = true;
          }
          if (this.phaseTimer >= 15) { // 10초 -> 15초로 증가
            this.setNorthSouthLeftTurnYellow();
            this.currentPhase = 1;
            this.phaseTimer = 0;
            this.phaseInitialized = false;
          }
          break;
          
        case 1: // 남북 좌회전 황색
          if (this.phaseTimer >= this.yellowTime) {
            this.setAllRed();
            this.currentPhase = 2;
            this.phaseTimer = 0;
          }
          break;
          
        case 2: // 남북 직진
          if (!this.phaseInitialized) {
            this.setNorthSouthStraight();
            this.phaseInitialized = true;
          }
          if (this.phaseTimer >= 25) { // 15초 -> 25초로 증가
            this.setNorthSouthYellow();
            this.currentPhase = 3;
            this.phaseTimer = 0;
            this.phaseInitialized = false;
          }
          break;
          
        case 3: // 남북 직진 황색
          if (this.phaseTimer >= this.yellowTime) {
            this.setAllRed();
            this.currentPhase = 4;
            this.phaseTimer = 0;
          }
          break;
          
        case 4: // 동서 좌회전
          if (!this.phaseInitialized) {
            this.setEastWestLeftTurn();
            this.phaseInitialized = true;
          }
          if (this.phaseTimer >= 15) { // 10초 -> 15초로 증가
            this.setEastWestLeftTurnYellow();
            this.currentPhase = 5;
            this.phaseTimer = 0;
            this.phaseInitialized = false;
          }
          break;
          
        case 5: // 동서 좌회전 황색
          if (this.phaseTimer >= this.yellowTime) {
            this.setAllRed();
            this.currentPhase = 6;
            this.phaseTimer = 0;
          }
          break;
          
        case 6: // 동서 직진
          if (!this.phaseInitialized) {
            this.setEastWestStraight();
            this.phaseInitialized = true;
          }
          if (this.phaseTimer >= 25) { // 15초 -> 25초로 증가
            this.setEastWestYellow();
            this.currentPhase = 7;
            this.phaseTimer = 0;
            this.phaseInitialized = false;
          }
          break;
          
        case 7: // 동서 직진 황색
          if (this.phaseTimer >= this.yellowTime) {
            this.setAllRed();
            this.currentPhase = 0;
            this.phaseTimer = 0;
          }
          break;
      }
    }
    
    // 타이머 업데이트
    this.signals.forEach(signal => {
      signal.timer = Math.max(0, signal.timer - deltaTime);
    });
  }
  
  // 남북 직좌 신호 (직진만, 좌회전은 대향차량에 양보)
  private setNorthSouthStraightLeft() {
    this.signals.get('N')!.state = 'green';
    this.signals.get('S')!.state = 'green';
    this.signals.get('N')!.leftTurnState = 'red';  // 좌회전은 양보 원칙
    this.signals.get('S')!.leftTurnState = 'red';  // 좌회전은 양보 원칙
    this.signals.get('E')!.state = 'red';
    this.signals.get('W')!.state = 'red';
    this.signals.get('E')!.leftTurnState = 'red';
    this.signals.get('W')!.leftTurnState = 'red';
    
    this.signals.get('N')!.timer = 30;
    this.signals.get('S')!.timer = 30;
  }
  
  // 동서 직좌 신호 (직진만, 좌회전은 대향차량에 양보)
  private setEastWestStraightLeft() {
    this.signals.get('E')!.state = 'green';
    this.signals.get('W')!.state = 'green';
    this.signals.get('E')!.leftTurnState = 'red';  // 좌회전은 양보 원칙
    this.signals.get('W')!.leftTurnState = 'red';  // 좌회전은 양보 원칙
    this.signals.get('N')!.state = 'red';
    this.signals.get('S')!.state = 'red';
    this.signals.get('N')!.leftTurnState = 'red';
    this.signals.get('S')!.leftTurnState = 'red';
    
    this.signals.get('E')!.timer = 30;
    this.signals.get('W')!.timer = 30;
  }
  
  // 남북 좌회전 신호
  private setNorthSouthLeftTurn() {
    this.signals.get('N')!.state = 'red';
    this.signals.get('S')!.state = 'red';
    this.signals.get('N')!.leftTurnState = 'green';
    this.signals.get('S')!.leftTurnState = 'green';
    this.signals.get('E')!.state = 'red';
    this.signals.get('W')!.state = 'red';
    this.signals.get('E')!.leftTurnState = 'red';
    this.signals.get('W')!.leftTurnState = 'red';
    
    this.signals.get('N')!.timer = 15;
    this.signals.get('S')!.timer = 15;
  }
  
  private setNorthSouthLeftTurnYellow() {
    this.signals.get('N')!.leftTurnState = 'yellow';
    this.signals.get('S')!.leftTurnState = 'yellow';
    this.signals.get('N')!.timer = this.yellowTime;
    this.signals.get('S')!.timer = this.yellowTime;
  }
  
  // 남북 직진 신호
  private setNorthSouthStraight() {
    this.signals.get('N')!.state = 'green';
    this.signals.get('S')!.state = 'green';
    this.signals.get('N')!.leftTurnState = 'red';
    this.signals.get('S')!.leftTurnState = 'red';
    this.signals.get('E')!.state = 'red';
    this.signals.get('W')!.state = 'red';
    this.signals.get('E')!.leftTurnState = 'red';
    this.signals.get('W')!.leftTurnState = 'red';
    
    this.signals.get('N')!.timer = 25;
    this.signals.get('S')!.timer = 25;
  }
  
  private setNorthSouthYellow() {
    this.signals.get('N')!.state = 'yellow';
    this.signals.get('S')!.state = 'yellow';
    
    this.signals.get('N')!.timer = this.yellowTime;
    this.signals.get('S')!.timer = this.yellowTime;
  }
  
  // 동서 좌회전 신호
  private setEastWestLeftTurn() {
    this.signals.get('E')!.state = 'red';
    this.signals.get('W')!.state = 'red';
    this.signals.get('E')!.leftTurnState = 'green';
    this.signals.get('W')!.leftTurnState = 'green';
    this.signals.get('N')!.state = 'red';
    this.signals.get('S')!.state = 'red';
    this.signals.get('N')!.leftTurnState = 'red';
    this.signals.get('S')!.leftTurnState = 'red';
    
    this.signals.get('E')!.timer = 15;
    this.signals.get('W')!.timer = 15;
  }
  
  private setEastWestLeftTurnYellow() {
    this.signals.get('E')!.leftTurnState = 'yellow';
    this.signals.get('W')!.leftTurnState = 'yellow';
    this.signals.get('E')!.timer = this.yellowTime;
    this.signals.get('W')!.timer = this.yellowTime;
  }
  
  // 동서 직진 신호
  private setEastWestStraight() {
    this.signals.get('E')!.state = 'green';
    this.signals.get('W')!.state = 'green';
    this.signals.get('E')!.leftTurnState = 'red';
    this.signals.get('W')!.leftTurnState = 'red';
    this.signals.get('N')!.state = 'red';
    this.signals.get('S')!.state = 'red';
    this.signals.get('N')!.leftTurnState = 'red';
    this.signals.get('S')!.leftTurnState = 'red';
    
    this.signals.get('E')!.timer = 25;
    this.signals.get('W')!.timer = 25;
  }
  
  private setEastWestYellow() {
    this.signals.get('E')!.state = 'yellow';
    this.signals.get('W')!.state = 'yellow';
    
    this.signals.get('E')!.timer = this.yellowTime;
    this.signals.get('W')!.timer = this.yellowTime;
  }
  
  private setAllRed() {
    this.signals.forEach(signal => {
      signal.state = 'red';
      signal.leftTurnState = 'red';
      signal.timer = 1;
    });
  }
  
  // 특정 방향의 신호 상태 조회
  public getSignalState(direction: string): 'red' | 'yellow' | 'green' {
    return this.signals.get(direction)?.state || 'red';
  }
  
  // 좌회전 신호 상태 조회
  public getLeftTurnState(direction: string): 'red' | 'yellow' | 'green' {
    return this.signals.get(direction)?.leftTurnState || 'red';
  }
  
  // 차량이 신호를 통과할 수 있는지 확인
  public canPass(direction: string, turning?: 'left' | 'right' | 'straight'): boolean {
    const signal = this.signals.get(direction);
    if (!signal) return false;
    
    if (turning === 'left') {
      return signal.leftTurnState === 'green';
    }
    
    return signal.state === 'green';
  }
  
  // 긴급 차량을 위한 모든 신호 적색 전환
  public emergencyOverride(): void {
    this.signals.forEach(signal => {
      signal.state = 'red';
      signal.leftTurnState = 'red';
      signal.timer = 60;
    });
    this.currentPhase = -1; // 긴급 모드
  }
  
  // 정상 모드로 복귀
  public resetToNormal(): void {
    this.currentPhase = 0;
    this.phaseTimer = 0;
    this.phaseInitialized = false;
    this.initializeSignals();
  }
  
  // 모든 신호 정보 반환
  public getAllSignals(): TrafficSignal[] {
    return Array.from(this.signals.values());
  }
  
  // 교통량에 따른 신호 시간 조절
  public adjustTimingForTraffic(trafficDensity: Map<string, number>): void {
    // 교통량이 많은 방향의 신호 시간을 늘림
    const northSouthDensity = (trafficDensity.get('N') || 0) + (trafficDensity.get('S') || 0);
    const eastWestDensity = (trafficDensity.get('E') || 0) + (trafficDensity.get('W') || 0);
    
    if (northSouthDensity > eastWestDensity * 1.5) {
      // 남북 방향에 더 많은 시간 할당
      this.cycleTime = 70;
    } else if (eastWestDensity > northSouthDensity * 1.5) {
      // 동서 방향에 더 많은 시간 할당
      this.cycleTime = 50;
    } else {
      // 균등 할당
      this.cycleTime = 60;
    }
  }
}