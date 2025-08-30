// 캔버스 렌더링 유틸리티

import { CanvasPoint } from './coordinateTransform';

export interface RenderStyle {
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  lineDash?: number[];
  globalAlpha?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export class CanvasRenderer {
  public ctx: CanvasRenderingContext2D;
  public canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }


  // 캔버스 크기 조정
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
  }

  // 캔버스 클리어
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // 스타일 적용
  applyStyle(style: RenderStyle): void {
    if (style.fillStyle) this.ctx.fillStyle = style.fillStyle;
    if (style.strokeStyle) this.ctx.strokeStyle = style.strokeStyle;
    if (style.lineWidth) this.ctx.lineWidth = style.lineWidth;
    if (style.lineCap) this.ctx.lineCap = style.lineCap;
    if (style.lineJoin) this.ctx.lineJoin = style.lineJoin;
    if (style.lineDash) this.ctx.setLineDash(style.lineDash);
    if (style.globalAlpha !== undefined) this.ctx.globalAlpha = style.globalAlpha;
    if (style.shadowColor) this.ctx.shadowColor = style.shadowColor;
    if (style.shadowBlur !== undefined) this.ctx.shadowBlur = style.shadowBlur;
    if (style.shadowOffsetX !== undefined) this.ctx.shadowOffsetX = style.shadowOffsetX;
    if (style.shadowOffsetY !== undefined) this.ctx.shadowOffsetY = style.shadowOffsetY;
  }

  // 스타일 초기화
  resetStyle(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.lineCap = 'butt';
    this.ctx.lineJoin = 'miter';
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1;
    this.ctx.shadowColor = 'rgba(0,0,0,0)';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
  }

  // 선 그리기
  drawLine(from: CanvasPoint, to: CanvasPoint, style?: RenderStyle): void {
    this.ctx.save();
    if (style) this.applyStyle(style);

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  // 다중 선 그리기 (경로)
  drawPath(points: CanvasPoint[], style?: RenderStyle, closePath: boolean = false): void {
    if (points.length < 2) return;

    this.ctx.save();
    if (style) this.applyStyle(style);

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }

    if (closePath) this.ctx.closePath();
    this.ctx.stroke();

    this.ctx.restore();
  }

  // 부드러운 곡선 그리기
  drawSmoothPath(points: CanvasPoint[], style?: RenderStyle, tension: number = 0.4): void {
    if (points.length < 2) return;

    this.ctx.save();
    if (style) this.applyStyle(style);

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const cp1x = points[i].x + (points[i + 1].x - points[i].x) * tension;
      const cp1y = points[i].y + (points[i + 1].y - points[i].y) * tension;
      
      const cp2x = points[i + 1].x - (points[i + 1].x - points[i].x) * tension;
      const cp2y = points[i + 1].y - (points[i + 1].y - points[i].y) * tension;

      this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i + 1].x, points[i + 1].y);
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  // 원 그리기
  drawCircle(center: CanvasPoint, radius: number, style?: RenderStyle, fill: boolean = true): void {
    this.ctx.save();
    if (style) this.applyStyle(style);

    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);

    if (fill) {
      this.ctx.fill();
    } else {
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  // 사각형 그리기
  drawRect(topLeft: CanvasPoint, width: number, height: number, style?: RenderStyle, fill: boolean = true): void {
    this.ctx.save();
    if (style) this.applyStyle(style);

    if (fill) {
      this.ctx.fillRect(topLeft.x, topLeft.y, width, height);
    } else {
      this.ctx.strokeRect(topLeft.x, topLeft.y, width, height);
    }

    this.ctx.restore();
  }

  // 둥근 사각형 그리기 (브라우저 호환성 고려)
  drawRoundedRect(
    topLeft: CanvasPoint, 
    width: number, 
    height: number, 
    radius: number,
    style?: RenderStyle, 
    fill: boolean = true
  ): void {
    this.ctx.save();
    if (style) this.applyStyle(style);

    // roundRect이 지원되는 경우
    if (this.ctx.roundRect && typeof this.ctx.roundRect === 'function') {
      this.ctx.beginPath();
      this.ctx.roundRect(topLeft.x, topLeft.y, width, height, radius);
    } else {
      // 수동으로 둥근 사각형 그리기 (폴백)
      this.ctx.beginPath();
      this.ctx.moveTo(topLeft.x + radius, topLeft.y);
      this.ctx.lineTo(topLeft.x + width - radius, topLeft.y);
      this.ctx.quadraticCurveTo(topLeft.x + width, topLeft.y, topLeft.x + width, topLeft.y + radius);
      this.ctx.lineTo(topLeft.x + width, topLeft.y + height - radius);
      this.ctx.quadraticCurveTo(topLeft.x + width, topLeft.y + height, topLeft.x + width - radius, topLeft.y + height);
      this.ctx.lineTo(topLeft.x + radius, topLeft.y + height);
      this.ctx.quadraticCurveTo(topLeft.x, topLeft.y + height, topLeft.x, topLeft.y + height - radius);
      this.ctx.lineTo(topLeft.x, topLeft.y + radius);
      this.ctx.quadraticCurveTo(topLeft.x, topLeft.y, topLeft.x + radius, topLeft.y);
    }

    if (fill) {
      this.ctx.fill();
    } else {
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  // 화살표 그리기
  drawArrow(from: CanvasPoint, to: CanvasPoint, arrowSize: number = 10, style?: RenderStyle): void {
    this.ctx.save();
    if (style) this.applyStyle(style);

    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    // 화살표 본체
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();

    // 화살표 머리
    this.ctx.beginPath();
    this.ctx.moveTo(to.x, to.y);
    this.ctx.lineTo(
      to.x - arrowSize * Math.cos(angle - Math.PI / 6),
      to.y - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(to.x, to.y);
    this.ctx.lineTo(
      to.x - arrowSize * Math.cos(angle + Math.PI / 6),
      to.y - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();

    this.ctx.restore();
  }

  // 텍스트 그리기
  drawText(
    text: string, 
    position: CanvasPoint, 
    font: string = '12px Arial', 
    style?: RenderStyle,
    align: CanvasTextAlign = 'center',
    baseline: CanvasTextBaseline = 'middle'
  ): void {
    this.ctx.save();
    if (style) this.applyStyle(style);

    this.ctx.font = font;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;

    if (style?.strokeStyle) {
      this.ctx.strokeText(text, position.x, position.y);
    }
    if (style?.fillStyle) {
      this.ctx.fillText(text, position.x, position.y);
    }

    this.ctx.restore();
  }

  // 다각형 그리기
  drawPolygon(points: CanvasPoint[], style?: RenderStyle, fill: boolean = true): void {
    if (points.length < 3) return;

    this.ctx.save();
    if (style) this.applyStyle(style);

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }

    this.ctx.closePath();

    if (fill) {
      this.ctx.fill();
    } else {
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  // 그라데이션 생성
  createLinearGradient(from: CanvasPoint, to: CanvasPoint, colorStops: [number, string][]): CanvasGradient {
    const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    colorStops.forEach(([offset, color]) => {
      gradient.addColorStop(offset, color);
    });
    return gradient;
  }

  createRadialGradient(center: CanvasPoint, radius: number, colorStops: [number, string][]): CanvasGradient {
    const gradient = this.ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
    colorStops.forEach(([offset, color]) => {
      gradient.addColorStop(offset, color);
    });
    return gradient;
  }

  // 클리핑 영역 설정
  clipRect(topLeft: CanvasPoint, width: number, height: number): void {
    this.ctx.beginPath();
    this.ctx.rect(topLeft.x, topLeft.y, width, height);
    this.ctx.clip();
  }

  clipCircle(center: CanvasPoint, radius: number): void {
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
    this.ctx.clip();
  }

  // 컨텍스트 상태 관리
  save(): void {
    this.ctx.save();
  }

  restore(): void {
    this.ctx.restore();
  }

  // 변환 행렬
  translate(x: number, y: number): void {
    this.ctx.translate(x, y);
  }

  rotate(angle: number): void {
    this.ctx.rotate(angle);
  }

  scale(scaleX: number, scaleY: number): void {
    this.ctx.scale(scaleX, scaleY);
  }

  // 히트맵 그리기
  drawHeatMap(points: { position: CanvasPoint; intensity: number }[], radius: number = 20): void {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'multiply';

    points.forEach(({ position, intensity }) => {
      const gradient = this.createRadialGradient(
        position, 
        radius, 
        [
          [0, `rgba(255, 0, 0, ${intensity})`],
          [0.5, `rgba(255, 255, 0, ${intensity * 0.5})`],
          [1, `rgba(255, 255, 0, 0)`]
        ]
      );

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(position.x, position.y, radius, 0, 2 * Math.PI);
      this.ctx.fill();
    });

    this.ctx.restore();
  }

  // 성능 측정
  measureRenderTime<T>(renderFunction: () => T): { result: T; time: number } {
    const startTime = performance.now();
    const result = renderFunction();
    const endTime = performance.now();
    return { result, time: endTime - startTime };
  }

  // 캔버스 이미지 저장
  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void {
    this.canvas.toBlob(callback, type, quality);
  }

  toDataURL(type?: string, quality?: number): string {
    return this.canvas.toDataURL(type, quality);
  }
}

// 유틸리티 함수들
export const getCanvasMousePos = (canvas: HTMLCanvasElement, event: MouseEvent): CanvasPoint => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
};

export const getCanvasTouchPos = (canvas: HTMLCanvasElement, event: TouchEvent): CanvasPoint => {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches[0];
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
};

export const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};