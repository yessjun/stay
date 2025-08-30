import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldExclamationIcon,
  CameraIcon,
  MapPinIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  BellAlertIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

interface IllegalParking {
  id: string;
  vehicleNumber: string;
  location: string;
  zone: 'school' | 'fire_lane' | 'bus_stop' | 'crosswalk' | 'no_parking';
  detectedAt: Date;
  duration: number; // minutes
  status: 'detected' | 'warned' | 'reported' | 'resolved';
  imageUrl?: string;
  violations: number; // 이전 위반 횟수
  fineAmount: number;
  autoReported: boolean;
}

interface ParkingZone {
  id: string;
  name: string;
  type: string;
  monitoring: boolean;
  dailyViolations: number;
}

const IllegalParkingDetection: React.FC = () => {
  const [violations, setViolations] = useState<IllegalParking[]>([]);
  const [selectedViolation, setSelectedViolation] = useState<IllegalParking | null>(null);
  const [scanningZone, setScanningZone] = useState<string | null>(null);
  const [stats, setStats] = useState({
    todayTotal: 42,
    weeklyAvg: 38,
    reportRate: 87,
    avgResponseTime: 8.5
  });

  // 모니터링 구역
  const monitoringZones: ParkingZone[] = [
    { id: 'Z01', name: '한솔초등학교 스쿨존', type: 'school', monitoring: true, dailyViolations: 12 },
    { id: 'Z02', name: '정부청사 소방도로', type: 'fire_lane', monitoring: true, dailyViolations: 5 },
    { id: 'Z03', name: '시청앞 버스정류장', type: 'bus_stop', monitoring: true, dailyViolations: 8 },
    { id: 'Z04', name: '달빛공원 횡단보도', type: 'crosswalk', monitoring: false, dailyViolations: 3 },
  ];

  // 초기 위반 데이터
  const initialViolations: IllegalParking[] = [
    {
      id: 'VIO001',
      vehicleNumber: '12가3456',
      location: '한솔초등학교 정문',
      zone: 'school',
      detectedAt: new Date(Date.now() - 900000),
      duration: 15,
      status: 'warned',
      violations: 2,
      fineAmount: 80000,
      autoReported: true
    },
    {
      id: 'VIO002',
      vehicleNumber: '34나7890',
      location: '정부청사 후문 소방도로',
      zone: 'fire_lane',
      detectedAt: new Date(Date.now() - 1800000),
      duration: 30,
      status: 'reported',
      violations: 5,
      fineAmount: 120000,
      autoReported: true
    },
    {
      id: 'VIO003',
      vehicleNumber: '56다1234',
      location: '시청앞 버스정류장',
      zone: 'bus_stop',
      detectedAt: new Date(Date.now() - 300000),
      duration: 5,
      status: 'detected',
      violations: 0,
      fineAmount: 40000,
      autoReported: false
    }
  ];

  useEffect(() => {
    setViolations(initialViolations);
    
    // AI 감지 시뮬레이션
    const interval = setInterval(() => {
      // 각 위반 차량의 주차 시간 증가
      setViolations(prev => prev.map(v => {
        if (v.status !== 'resolved') {
          return { ...v, duration: v.duration + 1 };
        }
        return v;
      }));

      // 랜덤하게 새로운 위반 감지
      if (Math.random() > 0.95) {
        detectNewViolation();
      }
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, []);

  const detectNewViolation = () => {
    const vehicleNumbers = ['78라5678', '90마9012', '23바3456', '45사7890'];
    const zones: IllegalParking['zone'][] = ['school', 'fire_lane', 'bus_stop', 'crosswalk', 'no_parking'];
    const locations = [
      '보람동 어린이집 앞',
      '달빛로 소방서 진입로',
      '아름동 버스정류장',
      '종촌동 횡단보도'
    ];

    const newViolation: IllegalParking = {
      id: `VIO${Date.now().toString().slice(-4)}`,
      vehicleNumber: vehicleNumbers[Math.floor(Math.random() * vehicleNumbers.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      zone: zones[Math.floor(Math.random() * zones.length)],
      detectedAt: new Date(),
      duration: 0,
      status: 'detected',
      violations: Math.floor(Math.random() * 10),
      fineAmount: [40000, 80000, 120000][Math.floor(Math.random() * 3)],
      autoReported: false
    };

    setViolations(prev => [newViolation, ...prev]);

    // 5분 후 자동 경고
    setTimeout(() => {
      warnViolation(newViolation.id);
    }, 300000);
  };

  const warnViolation = (violationId: string) => {
    setViolations(prev => prev.map(v => {
      if (v.id === violationId && v.status === 'detected') {
        return { ...v, status: 'warned' };
      }
      return v;
    }));

    // 10분 후 자동 신고
    setTimeout(() => {
      reportViolation(violationId);
    }, 600000);
  };

  const reportViolation = (violationId: string) => {
    setViolations(prev => prev.map(v => {
      if (v.id === violationId && v.status === 'warned') {
        return { ...v, status: 'reported', autoReported: true };
      }
      return v;
    }));
  };

  const getZoneStyle = (zone: string) => {
    const styles: { [key: string]: any } = {
      'school': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '🏫', label: '스쿨존' },
      'fire_lane': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '🚒', label: '소방도로' },
      'bus_stop': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '🚌', label: '버스정류장' },
      'crosswalk': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '🚸', label: '횡단보도' },
      'no_parking': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: '🚫', label: '주차금지' }
    };
    return styles[zone] || styles['no_parking'];
  };

  const getStatusStyle = (status: string) => {
    const styles: { [key: string]: any } = {
      'detected': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '감지됨' },
      'warned': { bg: 'bg-orange-100', text: 'text-orange-700', label: '경고발송' },
      'reported': { bg: 'bg-red-100', text: 'text-red-700', label: '신고완료' },
      'resolved': { bg: 'bg-green-100', text: 'text-green-700', label: '이동완료' }
    };
    return styles[status] || styles['detected'];
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  const startZoneScan = (zoneId: string) => {
    setScanningZone(zoneId);
    setTimeout(() => {
      setScanningZone(null);
      // 스캔 후 새로운 위반 감지 시뮬레이션
      if (Math.random() > 0.3) {
        detectNewViolation();
      }
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* 상태 표시 및 통계 */}
      <div className="flex items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2 bg-green-500 animate-pulse" />
            <span className="font-medium text-gray-700">
              AI 비전 시스템 활성
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <CameraIcon className="h-4 w-4 inline mr-1" />
            실시간 모니터링 중
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-700">{stats.todayTotal}</div>
          <div className="text-sm text-red-600">오늘 감지</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-700">{stats.weeklyAvg}</div>
          <div className="text-sm text-blue-600">주간 평균</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-700">{stats.reportRate}%</div>
          <div className="text-sm text-green-600">신고율</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="text-3xl font-bold text-purple-700">{stats.avgResponseTime}분</div>
          <div className="text-sm text-purple-600">평균 대응</div>
        </div>
      </div>

      {/* 모니터링 구역 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <MapPinIcon className="h-5 w-5 mr-2" />
          중점 모니터링 구역
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {monitoringZones.map(zone => {
            const zoneStyle = getZoneStyle(zone.type);
            
            return (
              <motion.div
                key={zone.id}
                whileHover={{ scale: 1.02 }}
                className={`border rounded-lg p-4 ${zoneStyle.border} ${zoneStyle.bg} relative overflow-hidden`}
              >
                {scanningZone === zone.id && (
                  <motion.div
                    className="absolute inset-0 bg-blue-500 bg-opacity-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: 3 }}
                  />
                )}
                
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">{zoneStyle.icon}</span>
                      <div>
                        <div className="font-semibold">{zone.name}</div>
                        <div className="text-xs opacity-75">{zoneStyle.label}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-sm mt-3">
                      <div className={`w-2 h-2 rounded-full mr-2 ${zone.monitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span>{zone.monitoring ? '모니터링 중' : '비활성'}</span>
                    </div>
                    
                    <div className="mt-2 text-sm">
                      오늘 위반: <span className="font-bold">{zone.dailyViolations}건</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => startZoneScan(zone.id)}
                    disabled={scanningZone === zone.id}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      scanningZone === zone.id 
                        ? 'bg-gray-300 text-gray-500' 
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {scanningZone === zone.id ? '스캔 중...' : '스캔'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 위반 목록 */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        <h3 className="font-semibold text-gray-800 flex items-center sticky top-0 bg-white pb-2">
          <ShieldExclamationIcon className="h-5 w-5 mr-2" />
          실시간 위반 감지 목록
        </h3>
        
        <AnimatePresence>
          {violations.map((violation, index) => {
            const zoneStyle = getZoneStyle(violation.zone);
            const statusStyle = getStatusStyle(violation.status);
            
            return (
              <motion.div
                key={violation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`border rounded-lg p-4 ${zoneStyle.border} hover:shadow-md transition-shadow cursor-pointer`}
                onClick={() => setSelectedViolation(violation)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">{zoneStyle.icon}</span>
                      <div>
                        <span className="font-bold text-gray-900 text-lg">{violation.vehicleNumber}</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                        {violation.autoReported && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            자동신고
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <MapPinIcon className="h-4 w-4 inline mr-1" />
                        {violation.location}
                      </div>
                      <div>
                        <ClockIcon className="h-4 w-4 inline mr-1" />
                        주차시간: {formatDuration(violation.duration)}
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded ${zoneStyle.bg} ${zoneStyle.text} text-xs`}>
                          {zoneStyle.label}
                        </span>
                      </div>
                      <div>
                        {violation.violations > 0 && (
                          <span className="text-red-600 font-medium">
                            누적 위반 {violation.violations}회
                          </span>
                        )}
                      </div>
                    </div>

                    {violation.duration > 5 && (
                      <div className="mt-2 flex items-center text-sm">
                        <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 mr-1" />
                        <span className="text-orange-600">
                          5분 이상 주차 - 과태료 ₩{violation.fineAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 text-right">
                    <div className="text-xs text-gray-500 mb-2">
                      {violation.detectedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {violation.status === 'detected' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          warnViolation(violation.id);
                        }}
                        className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
                      >
                        경고 발송
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 일일 통계 차트 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2" />
          시간대별 위반 통계
        </h3>
        
        <div className="flex items-end space-x-2 h-32">
          {[8, 12, 15, 18, 14, 10, 6, 3, 5, 9, 11, 7].map((value, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <motion.div
                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t"
                initial={{ height: 0 }}
                animate={{ height: `${(value / 18) * 100}%` }}
                transition={{ delay: index * 0.05 }}
              />
              <div className="text-xs text-gray-600 mt-1">
                {index * 2}시
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 상세 정보 모달 */}
      <AnimatePresence>
        {selectedViolation && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedViolation(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 max-w-md w-full"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">위반 상세 정보</h3>
                <button
                  onClick={() => setSelectedViolation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-900">{selectedViolation.vehicleNumber}</div>
                  <div className="text-sm text-gray-600 mt-1">차량번호</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-gray-500">위치</div>
                    <div className="font-medium">{selectedViolation.location}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-gray-500">구역</div>
                    <div className="font-medium">{getZoneStyle(selectedViolation.zone).label}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-gray-500">주차시간</div>
                    <div className="font-medium">{formatDuration(selectedViolation.duration)}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-gray-500">과태료</div>
                    <div className="font-medium text-red-600">₩{selectedViolation.fineAmount.toLocaleString()}</div>
                  </div>
                </div>

                {selectedViolation.violations > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center text-red-700">
                      <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                      <span className="font-medium">상습 위반 차량</span>
                    </div>
                    <div className="text-sm text-red-600 mt-1">
                      최근 6개월간 {selectedViolation.violations}회 위반
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t flex space-x-3">
                  <button className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium">
                    <TruckIcon className="h-5 w-5 inline mr-2" />
                    견인 요청
                  </button>
                  <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    <BellAlertIcon className="h-5 w-5 inline mr-2" />
                    재경고
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

export default IllegalParkingDetection;