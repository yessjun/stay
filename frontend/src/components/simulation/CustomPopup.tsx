// 커스텀 팝업 컴포넌트 - React Portal을 사용한 지도 외부 팝업 렌더링

import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { MapRef } from 'react-map-gl';

interface Position {
  lat: number;
  lng: number;
}

interface CustomPopupProps {
  position: Position;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  mapRef: MapRef | null;
  anchor?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  offset?: [number, number];
  maxWidth?: string;
  className?: string;
}

interface PopupPosition {
  x: number;
  y: number;
  anchor: 'top' | 'bottom' | 'left' | 'right';
}

const CustomPopup: React.FC<CustomPopupProps> = ({
  position,
  isOpen,
  onClose,
  children,
  mapRef,
  anchor = 'auto',
  offset = [0, -10],
  maxWidth = '300px',
  className = ''
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  // 포털 컨테이너 생성
  useEffect(() => {
    let element = document.getElementById('popup-portal');
    if (!element) {
      element = document.createElement('div');
      element.id = 'popup-portal';
      element.style.position = 'fixed';
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.pointerEvents = 'none';
      element.style.zIndex = '10000';
      document.body.appendChild(element);
    }
    setPortalElement(element);

    return () => {
      // 컴포넌트 언마운트 시 정리는 하지 않음 (다른 팝업들이 사용할 수 있음)
    };
  }, []);

  // 화면 좌표 계산 및 팝업 위치 결정
  useEffect(() => {
    if (!isOpen || !mapRef || !portalElement) {
      setPopupPosition(null);
      return;
    }

    const updatePosition = () => {
      try {
        const map = mapRef.getMap();
        if (!map) return;

        // 위경도를 화면 좌표로 변환
        const point = map.project([position.lng, position.lat]);
        
        // 지도 컨테이너의 경계 정보
        const mapContainer = map.getContainer();
        const mapRect = mapContainer.getBoundingClientRect();
        
        // 화면상의 절대 좌표 계산
        const screenX = mapRect.left + point.x + offset[0];
        const screenY = mapRect.top + point.y + offset[1];

        // 팝업 크기 추정 (실제 크기를 알기 위해서는 렌더링 후 측정 필요)
        const popupWidth = 300; // maxWidth 기본값
        const popupHeight = 200; // 추정값

        // 화면 경계 고려한 anchor 결정
        let finalAnchor = anchor;
        if (anchor === 'auto') {
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;

          // 우선순위: bottom > top > right > left
          if (screenY + popupHeight <= windowHeight - 20) {
            finalAnchor = 'top'; // 마커 아래로 팝업
          } else if (screenY - popupHeight >= 20) {
            finalAnchor = 'bottom'; // 마커 위로 팝업
          } else if (screenX + popupWidth <= windowWidth - 20) {
            finalAnchor = 'left'; // 마커 우측으로 팝업
          } else {
            finalAnchor = 'right'; // 마커 좌측으로 팝업
          }
        }

        // anchor에 따른 최종 위치 계산
        let finalX = screenX;
        let finalY = screenY;

        switch (finalAnchor) {
          case 'top':
            finalX = screenX - popupWidth / 2;
            finalY = screenY + 10;
            break;
          case 'bottom':
            finalX = screenX - popupWidth / 2;
            finalY = screenY - popupHeight - 10;
            break;
          case 'left':
            finalX = screenX + 10;
            finalY = screenY - popupHeight / 2;
            break;
          case 'right':
            finalX = screenX - popupWidth - 10;
            finalY = screenY - popupHeight / 2;
            break;
        }

        // 화면 경계 안에 포함되도록 조정
        finalX = Math.max(10, Math.min(finalX, window.innerWidth - popupWidth - 10));
        finalY = Math.max(10, Math.min(finalY, window.innerHeight - popupHeight - 10));

        setPopupPosition({
          x: finalX,
          y: finalY,
          anchor: finalAnchor
        });

      } catch (error) {
        console.warn('팝업 위치 계산 오류:', error);
      }
    };

    updatePosition();

    // 지도 이동/줌 시 위치 업데이트
    const map = mapRef.getMap();
    if (map) {
      map.on('move', updatePosition);
      map.on('zoom', updatePosition);
      map.on('resize', updatePosition);

      return () => {
        map.off('move', updatePosition);
        map.off('zoom', updatePosition);
        map.off('resize', updatePosition);
      };
    }
  }, [isOpen, position, mapRef, portalElement, anchor, offset]);

  // 외부 클릭 시 팝업 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ESC 키로 팝업 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // 팝업이 닫혀있거나 위치가 계산되지 않았으면 렌더링하지 않음
  if (!isOpen || !popupPosition || !portalElement) {
    return null;
  }

  const popupContent = (
    <div
      ref={popupRef}
      className={`absolute bg-white rounded-lg shadow-xl border border-gray-200 ${className}`}
      style={{
        left: `${popupPosition.x}px`,
        top: `${popupPosition.y}px`,
        maxWidth,
        pointerEvents: 'auto',
        zIndex: 10001
      }}
    >
      {/* 팝업 화살표 */}
      <div
        className="absolute w-3 h-3 bg-white border-gray-200 transform rotate-45"
        style={{
          ...(popupPosition.anchor === 'top' && {
            top: '-6px',
            left: '50%',
            marginLeft: '-6px',
            borderTop: '1px solid #e5e7eb',
            borderLeft: '1px solid #e5e7eb'
          }),
          ...(popupPosition.anchor === 'bottom' && {
            bottom: '-6px',
            left: '50%',
            marginLeft: '-6px',
            borderBottom: '1px solid #e5e7eb',
            borderRight: '1px solid #e5e7eb'
          }),
          ...(popupPosition.anchor === 'left' && {
            left: '-6px',
            top: '50%',
            marginTop: '-6px',
            borderLeft: '1px solid #e5e7eb',
            borderBottom: '1px solid #e5e7eb'
          }),
          ...(popupPosition.anchor === 'right' && {
            right: '-6px',
            top: '50%',
            marginTop: '-6px',
            borderRight: '1px solid #e5e7eb',
            borderTop: '1px solid #e5e7eb'
          })
        }}
      />

      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
        title="닫기"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>

      {/* 팝업 내용 */}
      <div className="relative">
        {children}
      </div>
    </div>
  );

  return createPortal(popupContent, portalElement);
};

export default CustomPopup;