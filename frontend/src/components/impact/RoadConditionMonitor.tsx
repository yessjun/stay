import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  MapPinIcon,
  ArrowTrendingUpIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  CameraIcon
} from '@heroicons/react/24/outline';

interface RoadDamage {
  id: string;
  type: 'pothole' | 'crack' | 'surface' | 'subsidence';
  severity: 1 | 2 | 3 | 4 | 5;
  location: string;
  coordinates: { lat: number; lng: number };
  detectedAt: Date;
  depth?: number; // cm
  area?: number; // m²
  repairPriority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'detected' | 'reported' | 'scheduled' | 'in_progress' | 'completed';
  vehicleReports: number;
  imageUrl?: string;
}

const RoadConditionMonitor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [damages, setDamages] = useState<RoadDamage[]>([]);
  const [selectedDamage, setSelectedDamage] = useState<RoadDamage | null>(null);
  const [roadQualityIndex, setRoadQualityIndex] = useState(82);
  const [scanProgress, setScanProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'analytics'>('map');

  // 초기 손상 데이터
  const initialDamages: RoadDamage[] = [
    {
      id: 'DMG001',
      type: 'pothole',
      severity: 4,
      location: '한누리대로 정부청사 구간',
      coordinates: { lat: 36.5040, lng: 127.2650 },
      detectedAt: new Date(Date.now() - 3600000),
      depth: 8.5,
      area: 0.35,
      repairPriority: 'urgent',
      status: 'scheduled',
      vehicleReports: 23
    },
    {
      id: 'DMG002',
      type: 'crack',
      severity: 2,
      location: '시청대로 교차로',
      coordinates: { lat: 36.4800, lng: 127.2890 },
      detectedAt: new Date(Date.now() - 7200000),
      depth: 2.1,
      area: 1.2,
      repairPriority: 'low',
      status: 'detected',
      vehicleReports: 5
    },
    {
      id: 'DMG003',
      type: 'surface',
      severity: 3,
      location: '달빛로 주거단지',
      coordinates: { lat: 36.4790, lng: 127.2600 },
      detectedAt: new Date(Date.now() - 1800000),
      area: 2.8,
      repairPriority: 'medium',
      status: 'reported',
      vehicleReports: 12
    }
  ];

  useEffect(() => {
    setDamages(initialDamages);
    if (canvasRef.current && viewMode === 'map') {
      drawRoadMap();
    }
  }, [viewMode]);

  // Canvas에 도로 맵 그리기
  const drawRoadMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas 크기 설정
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // 배경
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 도로 그리기
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 40;
    ctx.lineCap = 'round';

    // 메인 도로
    ctx.beginPath();
    ctx.moveTo(50, canvas.height / 2);
    ctx.lineTo(canvas.width - 50, canvas.height / 2);
    ctx.stroke();

    // 교차로
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 50);
    ctx.lineTo(canvas.width / 2, canvas.height - 50);
    ctx.stroke();

    // 도로 중앙선
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    
    ctx.beginPath();
    ctx.moveTo(50, canvas.height / 2);
    ctx.lineTo(canvas.width - 50, canvas.height / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 50);
    ctx.lineTo(canvas.width / 2, canvas.height - 50);
    ctx.stroke();

    ctx.setLineDash([]);

    // 손상 위치 표시
    damages.forEach((damage, index) => {
      const x = 100 + (index * 150);
      const y = canvas.height / 2 + (index % 2 === 0 ? -30 : 30);
      
      // 손상 표시
      ctx.fillStyle = getSeverityColor(damage.severity);
      ctx.beginPath();
      ctx.arc(x, y, 10 + damage.severity * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // 손상 타입 아이콘
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(getDamageIcon(damage.type), x, y + 4);
    });
  };

  const getSeverityColor = (severity: number): string => {
    const colors = ['#10b981', '#84cc16', '#fbbf24', '#fb923c', '#ef4444'];
    return colors[severity - 1];
  };

  const getDamageIcon = (type: string): string => {
    const icons: { [key: string]: string } = {
      'pothole': '⚫',
      'crack': '⚡',
      'surface': '▨',
      'subsidence': '◔'
    };
    return icons[type] || '○';
  };

  const getDamageLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      'pothole': '포트홀',
      'crack': '균열',
      'surface': '표면손상',
      'subsidence': '침하'
    };
    return labels[type] || '기타';
  };

  const getSeverityLabel = (severity: number): string => {
    const labels = ['경미', '보통', '주의', '심각', '위험'];
    return labels[severity - 1];
  };

  const getPriorityStyle = (priority: string) => {
    const styles: { [key: string]: any } = {
      'low': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      'medium': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
      'high': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      'urgent': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
    };
    return styles[priority] || styles['low'];
  };

  const startAIScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          
          // 새로운 손상 추가
          const newDamage: RoadDamage = {
            id: `DMG${Date.now().toString().slice(-4)}`,
            type: ['pothole', 'crack', 'surface'][Math.floor(Math.random() * 3)] as any,
            severity: Math.floor(Math.random() * 5 + 1) as any,
            location: `새로 탐지된 구간 ${Math.floor(Math.random() * 100)}`,
            coordinates: {
              lat: 36.48 + Math.random() * 0.05,
              lng: 127.26 + Math.random() * 0.05
            },
            detectedAt: new Date(),
            depth: Math.random() * 10,
            area: Math.random() * 3,
            repairPriority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)] as any,
            status: 'detected',
            vehicleReports: 1
          };
          
          setDamages(prev => [newDamage, ...prev]);
          setRoadQualityIndex(prev => Math.max(prev - Math.random() * 2, 0));
          
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  };

  const updateDamageStatus = (damageId: string, newStatus: RoadDamage['status']) => {
    setDamages(prev => prev.map(d => 
      d.id === damageId ? { ...d, status: newStatus } : d
    ));
  };

  return (
    <div className="space-y-6">
      {/* 상단 제어 패널 */}
      <div className="flex items-center">
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-md transition-all ${
              viewMode === 'map' ? 'bg-white shadow-sm' : ''
            }`}
          >
            지도 보기
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md transition-all ${
              viewMode === 'list' ? 'bg-white shadow-sm' : ''
            }`}
          >
            목록 보기
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`px-4 py-2 rounded-md transition-all ${
              viewMode === 'analytics' ? 'bg-white shadow-sm' : ''
            }`}
          >
            분석 보기
          </button>
        </div>
      </div>

      {/* 도로 품질 지수 */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">도로 품질 지수 (RQI)</h3>
          <span className="text-3xl font-bold text-blue-600">{roadQualityIndex.toFixed(1)}</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${roadQualityIndex}%` }}
            transition={{ duration: 1 }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>위험 (0-40)</span>
          <span>주의 (40-70)</span>
          <span>양호 (70-100)</span>
        </div>
      </div>

      {/* 스캔 진행률 */}
      {isScanning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-blue-50 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">AI 분석 진행 중</span>
            <span className="text-sm text-blue-600">{scanProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <motion.div
              className="h-2 bg-blue-600 rounded-full"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <p className="text-xs text-blue-600 mt-2">
            도로 표면 분석 • 균열 패턴 인식 • 손상 깊이 측정
          </p>
        </motion.div>
      )}

      {/* 뷰 모드별 콘텐츠 */}
      {viewMode === 'map' && (
        <div className="bg-gray-100 rounded-lg p-4">
          <canvas
            ref={canvasRef}
            className="w-full h-96 rounded-lg bg-white"
          />
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2" />
              <span>경미</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2" />
              <span>보통</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-500 rounded-full mr-2" />
              <span>심각</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded-full mr-2" />
              <span>위험</span>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {damages.map((damage, index) => {
              const priorityStyle = getPriorityStyle(damage.repairPriority);
              
              return (
                <motion.div
                  key={damage.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${priorityStyle.border}`}
                  onClick={() => setSelectedDamage(damage)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">{getDamageIcon(damage.type)}</span>
                        <div>
                          <span className="font-semibold text-gray-900">{damage.id}</span>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs ${priorityStyle.bg} ${priorityStyle.text}`}>
                            {damage.repairPriority === 'urgent' ? '긴급' : 
                             damage.repairPriority === 'high' ? '높음' :
                             damage.repairPriority === 'medium' ? '보통' : '낮음'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">유형:</span>
                          <span className="ml-2 font-medium">{getDamageLabel(damage.type)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">심각도:</span>
                          <span className="ml-2 font-medium">{getSeverityLabel(damage.severity)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">위치:</span>
                          <span className="ml-2">{damage.location}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">신고:</span>
                          <span className="ml-2">{damage.vehicleReports}건</span>
                        </div>
                      </div>
                      
                      {damage.depth && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500">깊이:</span>
                          <span className="ml-2 font-medium">{damage.depth.toFixed(1)}cm</span>
                          {damage.area && (
                            <>
                              <span className="ml-4 text-gray-500">면적:</span>
                              <span className="ml-2 font-medium">{damage.area.toFixed(1)}m²</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus = 
                            damage.status === 'detected' ? 'reported' :
                            damage.status === 'reported' ? 'scheduled' :
                            damage.status === 'scheduled' ? 'in_progress' : 'completed';
                          updateDamageStatus(damage.id, nextStatus);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        {damage.status === 'detected' ? '신고' :
                         damage.status === 'reported' ? '예약' :
                         damage.status === 'scheduled' ? '시작' : 
                         damage.status === 'in_progress' ? '완료' : '✓'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {viewMode === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 손상 유형별 통계 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              손상 유형별 분포
            </h4>
            <div className="space-y-3">
              {['pothole', 'crack', 'surface', 'subsidence'].map(type => {
                const count = damages.filter(d => d.type === type).length;
                const percentage = (count / damages.length * 100) || 0;
                
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{getDamageLabel(type)}</span>
                      <span className="font-medium">{count}건</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="h-2 bg-blue-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우선순위별 통계 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
              보수 우선순위
            </h4>
            <div className="space-y-3">
              {['urgent', 'high', 'medium', 'low'].map(priority => {
                const count = damages.filter(d => d.repairPriority === priority).length;
                const style = getPriorityStyle(priority);
                
                return (
                  <div key={priority} className={`p-3 rounded-lg ${style.bg} ${style.border} border`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${style.text}`}>
                        {priority === 'urgent' ? '긴급' :
                         priority === 'high' ? '높음' :
                         priority === 'medium' ? '보통' : '낮음'}
                      </span>
                      <span className={`text-2xl font-bold ${style.text}`}>{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 월간 추이 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 md:col-span-2">
            <h4 className="font-semibold text-gray-800 mb-4">월간 탐지 추이</h4>
            <div className="grid grid-cols-6 gap-2">
              {[65, 72, 58, 81, 76, 92].map((value, index) => (
                <div key={index} className="text-center">
                  <div className="bg-gray-100 rounded relative h-32 flex items-end">
                    <motion.div
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded"
                      initial={{ height: 0 }}
                      animate={{ height: `${value}%` }}
                      transition={{ delay: index * 0.1 }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-2">{index + 1}월</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 상세 정보 모달 */}
      <AnimatePresence>
        {selectedDamage && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDamage(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 max-w-md w-full"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">도로 손상 상세 정보</h3>
                <button
                  onClick={() => setSelectedDamage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <span className="ml-2 font-medium">{selectedDamage.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">유형:</span>
                    <span className="ml-2 font-medium">{getDamageLabel(selectedDamage.type)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">심각도:</span>
                    <span className="ml-2 font-medium">{getSeverityLabel(selectedDamage.severity)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">우선순위:</span>
                    <span className="ml-2 font-medium">
                      {selectedDamage.repairPriority === 'urgent' ? '긴급' :
                       selectedDamage.repairPriority === 'high' ? '높음' :
                       selectedDamage.repairPriority === 'medium' ? '보통' : '낮음'}
                    </span>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <div className="text-sm">
                    <MapPinIcon className="h-4 w-4 inline mr-1" />
                    {selectedDamage.location}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    좌표: {selectedDamage.coordinates.lat.toFixed(6)}, {selectedDamage.coordinates.lng.toFixed(6)}
                  </div>
                </div>
                
                {selectedDamage.depth && (
                  <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">깊이:</span>
                      <span className="ml-2 font-medium">{selectedDamage.depth.toFixed(1)}cm</span>
                    </div>
                    {selectedDamage.area && (
                      <div>
                        <span className="text-gray-500">면적:</span>
                        <span className="ml-2 font-medium">{selectedDamage.area.toFixed(1)}m²</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="border-t pt-3">
                  <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <WrenchScrewdriverIcon className="h-5 w-5 inline mr-2" />
                    보수 작업 예약
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoadConditionMonitor;