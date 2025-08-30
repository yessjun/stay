import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  PhoneIcon,
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Incident {
  id: string;
  type: 'collision' | 'breakdown' | 'obstacle' | 'emergency';
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  location: string;
  coordinates: { lat: number; lng: number };
  detectedAt: Date;
  reportedAt?: Date;
  responseTime?: number; // seconds
  involvedVehicles: number;
  injuries: number;
  status: 'detected' | 'reported' | 'responding' | 'resolved';
  emergencyUnits: string[];
  trafficImpact: 'low' | 'medium' | 'high';
  autoReported: boolean;
}

const IncidentDetection: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [simulationMode, setSimulationMode] = useState<'auto' | 'manual'>('auto');
  const [detectionTime, setDetectionTime] = useState(0);
  const [showEmergencyRoute, setShowEmergencyRoute] = useState(false);

  // 초기 사고 데이터
  const initialIncidents: Incident[] = [
    {
      id: 'INC001',
      type: 'collision',
      severity: 'moderate',
      location: '한누리대로 정부청사 앞',
      coordinates: { lat: 36.5040, lng: 127.2650 },
      detectedAt: new Date(Date.now() - 600000),
      reportedAt: new Date(Date.now() - 597000),
      responseTime: 3,
      involvedVehicles: 2,
      injuries: 0,
      status: 'responding',
      emergencyUnits: ['구급차 1대', '경찰차 1대'],
      trafficImpact: 'medium',
      autoReported: true
    },
    {
      id: 'INC002',
      type: 'breakdown',
      severity: 'minor',
      location: '시청대로 교차로',
      coordinates: { lat: 36.4800, lng: 127.2890 },
      detectedAt: new Date(Date.now() - 1800000),
      reportedAt: new Date(Date.now() - 1795000),
      responseTime: 5,
      involvedVehicles: 1,
      injuries: 0,
      status: 'resolved',
      emergencyUnits: ['견인차 1대'],
      trafficImpact: 'low',
      autoReported: true
    }
  ];

  useEffect(() => {
    setIncidents(initialIncidents);
    
    // 자동 감지 시뮬레이션
    if (simulationMode === 'auto') {
      const interval = setInterval(() => {
        setDetectionTime(prev => prev + 1);
        
        // 10초마다 새로운 사고 시뮬레이션
        if (Math.random() > 0.9) {
          simulateNewIncident();
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [simulationMode]);

  const simulateNewIncident = () => {
    const types: Incident['type'][] = ['collision', 'breakdown', 'obstacle', 'emergency'];
    const severities: Incident['severity'][] = ['minor', 'moderate', 'severe', 'critical'];
    const locations = [
      '보람동로 주거단지',
      '달빛로 상업지구',
      '아름동로 학교앞',
      '종촌동길 교차로'
    ];

    const newIncident: Incident = {
      id: `INC${Date.now().toString().slice(-4)}`,
      type: types[Math.floor(Math.random() * types.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      coordinates: {
        lat: 36.48 + Math.random() * 0.05,
        lng: 127.26 + Math.random() * 0.05
      },
      detectedAt: new Date(),
      involvedVehicles: Math.floor(Math.random() * 3) + 1,
      injuries: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0,
      status: 'detected',
      emergencyUnits: [],
      trafficImpact: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
      autoReported: false
    };

    setIncidents(prev => [newIncident, ...prev]);

    // 3초 후 자동 신고
    setTimeout(() => {
      autoReportIncident(newIncident.id);
    }, 3000);
  };

  const autoReportIncident = (incidentId: string) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId && inc.status === 'detected') {
        const reportedAt = new Date();
        const responseTime = Math.floor((reportedAt.getTime() - inc.detectedAt.getTime()) / 1000);
        
        // 심각도에 따른 긴급 유닛 배치
        let emergencyUnits: string[] = [];
        switch (inc.severity) {
          case 'critical':
            emergencyUnits = ['구급차 2대', '소방차 1대', '경찰차 2대'];
            break;
          case 'severe':
            emergencyUnits = ['구급차 1대', '경찰차 2대'];
            break;
          case 'moderate':
            emergencyUnits = ['구급차 1대', '경찰차 1대'];
            break;
          default:
            emergencyUnits = ['경찰차 1대'];
        }

        return {
          ...inc,
          status: 'reported',
          reportedAt,
          responseTime,
          emergencyUnits,
          autoReported: true
        };
      }
      return inc;
    }));
  };

  const getSeverityStyle = (severity: string) => {
    const styles: { [key: string]: any } = {
      'minor': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '🟢' },
      'moderate': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: '🟡' },
      'severe': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '🟠' },
      'critical': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '🔴' }
    };
    return styles[severity] || styles['minor'];
  };

  const getIncidentIcon = (type: string): string => {
    const icons: { [key: string]: string } = {
      'collision': '💥',
      'breakdown': '🚗',
      'obstacle': '⚠️',
      'emergency': '🚨'
    };
    return icons[type] || '⚠️';
  };

  const getIncidentLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      'collision': '충돌사고',
      'breakdown': '차량고장',
      'obstacle': '장애물',
      'emergency': '긴급상황'
    };
    return labels[type] || '기타';
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const manualIncidentTrigger = () => {
    simulateNewIncident();
  };

  return (
    <div className="space-y-6">
      {/* 제어 패널 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2 bg-green-500 animate-pulse" />
            <span className="font-medium text-gray-700">
              AI 모니터링 활성
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            <ClockIcon className="h-4 w-4 inline mr-1" />
            실행 시간: {Math.floor(detectionTime / 60)}분 {detectionTime % 60}초
          </div>
        </div>

      </div>

      {/* 실시간 통계 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-700">
            {incidents.filter(i => i.status !== 'resolved').length}
          </div>
          <div className="text-sm text-blue-600">진행중 사고</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-700">
            {incidents.filter(i => i.autoReported).length}
          </div>
          <div className="text-sm text-green-600">자동 신고</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="text-3xl font-bold text-purple-700">
            3.2초
          </div>
          <div className="text-sm text-purple-600">평균 감지시간</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="text-3xl font-bold text-orange-700">
            98.5%
          </div>
          <div className="text-sm text-orange-600">감지 정확도</div>
        </div>
      </div>

      {/* 사고 감지 시각화 */}
      <div className="bg-gray-900 rounded-lg p-6 relative overflow-hidden h-64">
        <div className="absolute top-4 left-4 text-white text-sm flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          실시간 도로 모니터링
        </div>

        {/* 도로 시뮬레이션 */}
        <svg className="w-full h-full" viewBox="0 0 800 200">
          {/* 도로 */}
          <rect x="0" y="80" width="800" height="40" fill="#4b5563" />
          <line x1="0" y1="100" x2="800" y2="100" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 10" />
          
          {/* 차량 및 사고 표시 */}
          <AnimatePresence>
            {incidents.slice(0, 5).map((incident, index) => (
              <motion.g
                key={incident.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
              >
                <motion.circle
                  cx={150 + index * 120}
                  cy={100}
                  r="15"
                  fill={getSeverityStyle(incident.severity).icon === '🔴' ? '#ef4444' : '#fbbf24'}
                  animate={{ r: [15, 20, 15] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <text
                  x={150 + index * 120}
                  y={105}
                  textAnchor="middle"
                  fill="white"
                  fontSize="20"
                >
                  {getIncidentIcon(incident.type)}
                </text>
              </motion.g>
            ))}
          </AnimatePresence>

          {/* 긴급차량 경로 */}
          {showEmergencyRoute && (
            <motion.path
              d="M 50 100 Q 400 50 750 100"
              stroke="#ef4444"
              strokeWidth="3"
              fill="none"
              strokeDasharray="10 5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </svg>

        {/* AI 감지 오버레이 */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-0 w-1 h-20 bg-blue-500"
            animate={{ left: ['0%', '100%'] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          />
        </div>
      </div>

      {/* 사고 목록 */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {incidents.map((incident, index) => {
            const severityStyle = getSeverityStyle(incident.severity);
            
            return (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`border rounded-lg p-4 ${severityStyle.border} ${severityStyle.bg}`}
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">{getIncidentIcon(incident.type)}</span>
                      <div>
                        <span className="font-semibold text-gray-900">{incident.id}</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${severityStyle.text} font-medium`}>
                          {incident.severity === 'critical' ? '위급' :
                           incident.severity === 'severe' ? '심각' :
                           incident.severity === 'moderate' ? '보통' : '경미'}
                        </span>
                        {incident.autoReported && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            자동신고
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <MapPinIcon className="h-4 w-4 inline mr-1" />
                        {incident.location}
                      </div>
                      <div>
                        <ClockIcon className="h-4 w-4 inline mr-1" />
                        감지: {formatTime(incident.detectedAt)}
                      </div>
                      <div>
                        차량 {incident.involvedVehicles}대 연루
                      </div>
                      <div>
                        {incident.injuries > 0 ? (
                          <span className="text-red-600 font-medium">부상자 {incident.injuries}명</span>
                        ) : (
                          <span className="text-green-600">부상자 없음</span>
                        )}
                      </div>
                    </div>

                    {incident.responseTime && (
                      <div className="mt-2 text-sm text-gray-600">
                        <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                        신고까지 {incident.responseTime}초
                      </div>
                    )}

                    {incident.emergencyUnits.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {incident.emergencyUnits.map((unit, idx) => (
                          <span key={idx} className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs">
                            {unit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      incident.status === 'detected' ? 'bg-red-100 text-red-700' :
                      incident.status === 'reported' ? 'bg-yellow-100 text-yellow-700' :
                      incident.status === 'responding' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {incident.status === 'detected' ? '감지됨' :
                       incident.status === 'reported' ? '신고됨' :
                       incident.status === 'responding' ? '대응중' : '해결됨'}
                    </div>
                  </div>
                </div>

                {/* 교통 영향도 */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">교통 영향도</span>
                    <div className="flex items-center">
                      <div className={`w-full h-2 rounded-full ${
                        incident.trafficImpact === 'high' ? 'bg-red-500' :
                        incident.trafficImpact === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} style={{ width: '60px' }} />
                      <span className="ml-2 font-medium">
                        {incident.trafficImpact === 'high' ? '높음' :
                         incident.trafficImpact === 'medium' ? '보통' : '낮음'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 상세 정보 모달 */}
      <AnimatePresence>
        {selectedIncident && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedIncident(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 max-w-lg w-full"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">사고 상세 정보</h3>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">{getIncidentIcon(selectedIncident.type)}</span>
                  <div>
                    <div className="font-semibold">{getIncidentLabel(selectedIncident.type)}</div>
                    <div className="text-sm text-gray-600">{selectedIncident.id}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-500">위치</div>
                    <div className="font-medium">{selectedIncident.location}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-500">감지 시각</div>
                    <div className="font-medium">{formatTime(selectedIncident.detectedAt)}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-500">연루 차량</div>
                    <div className="font-medium">{selectedIncident.involvedVehicles}대</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-500">부상자</div>
                    <div className="font-medium">{selectedIncident.injuries}명</div>
                  </div>
                </div>

                {selectedIncident.emergencyUnits.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">출동 유닛</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedIncident.emergencyUnits.map((unit, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {unit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <button className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                    <PhoneIcon className="h-5 w-5 inline mr-2" />
                    긴급 지원 요청
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

export default IncidentDetection;