// 포트홀 탐지 데모 컴포넌트 - AI 기반 도로 상태 모니터링 시연

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExclamationTriangleIcon, 
  CheckIcon as CheckCircleIcon, 
  MapPinIcon,
  ClockIcon,
  CameraIcon,
  WrenchIcon as WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

interface PotholeData {
  id: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  status: 'detected' | 'reported' | 'scheduled' | 'fixed';
  coordinates: { lat: number; lng: number };
  confidence: number; // AI 신뢰도 0-100
  vehicleReports: number; // 차량에서 보고한 횟수
}

const PotholeDetection: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [detectedPotholes, setDetectedPotholes] = useState<PotholeData[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedPothole, setSelectedPothole] = useState<PotholeData | null>(null);

  // 초기 포트홀 데이터
  const initialPotholes: PotholeData[] = [
    {
      id: 'PH001',
      location: '한누리대로 정부청사 앞',
      severity: 'high',
      detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
      status: 'scheduled',
      coordinates: { lat: 36.5040, lng: 127.2650 },
      confidence: 94,
      vehicleReports: 12
    },
    {
      id: 'PH002',
      location: '시청대로 세종시청 근처',
      severity: 'medium',
      detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4시간 전
      status: 'reported',
      coordinates: { lat: 36.4800, lng: 127.2890 },
      confidence: 87,
      vehicleReports: 8
    },
    {
      id: 'PH003',
      location: '달빛로 한솔동 입구',
      severity: 'critical',
      detectedAt: new Date(Date.now() - 30 * 60 * 1000), // 30분 전
      status: 'detected',
      coordinates: { lat: 36.4790, lng: 127.2600 },
      confidence: 98,
      vehicleReports: 3
    }
  ];

  useEffect(() => {
    setDetectedPotholes(initialPotholes);
  }, []);

  // AI 스캐닝 시뮬레이션
  const startScanning = () => {
    setIsScanning(true);
    setScanProgress(0);
    
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          
          // 새로운 포트홀 탐지 시뮬레이션
          const newPothole: PotholeData = {
            id: `PH${String(Date.now()).slice(-3)}`,
            location: `${['보람동로', '종촌동길', '아름동로'][Math.floor(Math.random() * 3)]} ${Math.floor(Math.random() * 100)}번지`,
            severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
            detectedAt: new Date(),
            status: 'detected',
            coordinates: {
              lat: 36.48 + (Math.random() - 0.5) * 0.05,
              lng: 127.27 + (Math.random() - 0.5) * 0.05
            },
            confidence: 85 + Math.random() * 15,
            vehicleReports: 1
          };
          
          setDetectedPotholes(prev => [newPothole, ...prev]);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'low':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          icon: '🟢',
          label: '경미'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          icon: '🟡',
          label: '보통'
        };
      case 'high':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
          icon: '🟠',
          label: '높음'
        };
      case 'critical':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          icon: '🔴',
          label: '긴급'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: '⚪',
          label: '알수없음'
        };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'detected':
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: '탐지됨' };
      case 'reported':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '신고됨' };
      case 'scheduled':
        return { bg: 'bg-purple-100', text: 'text-purple-700', label: '수리예정' };
      case 'fixed':
        return { bg: 'bg-green-100', text: 'text-green-700', label: '수리완료' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: '처리중' };
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${Math.floor(diffHours / 24)}일 전`;
  };

  const handleRepairAction = (potholeId: string) => {
    setDetectedPotholes(prev => prev.map(p => 
      p.id === potholeId 
        ? { ...p, status: p.status === 'detected' ? 'reported' : p.status === 'reported' ? 'scheduled' : 'fixed' }
        : p
    ));
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <CameraIcon className="h-8 w-8 text-sejong-blue mr-3" />
          <div>
            <h3 className="text-2xl font-bold text-gray-900">AI 포트홀 탐지 시스템</h3>
            <p className="text-gray-600">실시간 도로 상태 모니터링 및 자동 신고</p>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startScanning}
          disabled={isScanning}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            isScanning 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-sejong-blue text-white hover:bg-blue-700'
          }`}
        >
          {isScanning ? 'AI 스캔 중...' : 'AI 스캔 시작'}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 스캔 영역 */}
        <div className="space-y-6">
          {/* 스캔 진행률 */}
          {isScanning && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">AI 분석 진행률</span>
                <span className="text-sm text-blue-600">{scanProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <motion.div 
                  className="bg-blue-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="text-xs text-blue-600 mt-2">
                차량 센서 데이터 분석 중... 머신러닝 모델 실행 중...
              </div>
            </motion.div>
          )}

          {/* 가상 도로 뷰 */}
          <div className="bg-gray-900 rounded-lg p-6 h-80 relative overflow-hidden">
            <div className="text-white mb-4 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm">실시간 차량 카메라 피드</span>
            </div>
            
            {/* 도로 시뮬레이션 */}
            <div className="relative h-full">
              {/* 도로 라인 */}
              <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2">
                <div className="h-1 bg-gray-600 relative">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-px bg-yellow-400 w-32">
                    <motion.div
                      className="h-full bg-yellow-400"
                      animate={{ x: [-100, 400] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    />
                  </div>
                </div>
              </div>

              {/* 포트홀 표시 */}
              <AnimatePresence>
                {detectedPotholes.slice(0, 3).map((pothole, index) => (
                  <motion.div
                    key={pothole.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute"
                    style={{ 
                      left: `${20 + index * 30}%`, 
                      top: `${40 + index * 10}%` 
                    }}
                  >
                    <div className="relative">
                      <div className={`w-6 h-6 rounded-full border-2 ${getSeverityStyle(pothole.severity).border} bg-black`}>
                        <div className="absolute inset-0 bg-red-600 rounded-full animate-pulse opacity-50" />
                      </div>
                      <motion.div
                        className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.5 }}
                      >
                        포트홀 탐지!
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-2 border-r-2 border-t-2 border-transparent border-t-red-600" />
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* AI 분석 오버레이 */}
            {isScanning && (
              <motion.div
                className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-center text-white">
                  <div className="text-4xl mb-2">🤖</div>
                  <div className="text-sm">AI 분석 중...</div>
                </div>
              </motion.div>
            )}
          </div>

          {/* 탐지 통계 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">94.5%</div>
              <div className="text-sm text-green-700">탐지 정확도</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">2.1초</div>
              <div className="text-sm text-blue-700">평균 분석 시간</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{detectedPotholes.length}</div>
              <div className="text-sm text-purple-700">오늘 탐지 건수</div>
            </div>
          </div>
        </div>

        {/* 탐지 결과 목록 */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-800">탐지 결과</h4>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {detectedPotholes.map((pothole, index) => {
                const severityStyle = getSeverityStyle(pothole.severity);
                const statusStyle = getStatusStyle(pothole.status);
                
                return (
                  <motion.div
                    key={pothole.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedPothole(pothole)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">{severityStyle.icon}</span>
                          <div className="font-semibold text-gray-900">{pothole.id}</div>
                          <div className={`ml-2 px-2 py-1 rounded-full text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-1">
                          <MapPinIcon className="w-4 h-4 inline mr-1" />
                          {pothole.location}
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-500 space-x-3">
                          <span>
                            <ClockIcon className="w-3 h-3 inline mr-1" />
                            {formatTimeAgo(pothole.detectedAt)}
                          </span>
                          <span>신뢰도 {pothole.confidence}%</span>
                          <span>차량 신고 {pothole.vehicleReports}건</span>
                        </div>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-full text-xs ${severityStyle.bg} ${severityStyle.text} ${severityStyle.border} border`}>
                        {severityStyle.label}
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    {pothole.status !== 'fixed' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRepairAction(pothole.id);
                          }}
                          className="inline-flex items-center px-3 py-1 bg-sejong-blue text-white text-xs rounded hover:bg-blue-700 transition-colors"
                        >
                          <WrenchScrewdriverIcon className="w-3 h-3 mr-1" />
                          {pothole.status === 'detected' ? '신고하기' : 
                           pothole.status === 'reported' ? '수리예약' : '수리완료'}
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 상세 정보 모달 */}
      <AnimatePresence>
        {selectedPothole && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPothole(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">포트홀 상세 정보</h3>
                <button
                  onClick={() => setSelectedPothole(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">ID:</span>
                  <span className="ml-2 font-medium">{selectedPothole.id}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">위치:</span>
                  <span className="ml-2">{selectedPothole.location}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">좌표:</span>
                  <span className="ml-2 text-xs">
                    {selectedPothole.coordinates.lat.toFixed(6)}, {selectedPothole.coordinates.lng.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">AI 신뢰도:</span>
                  <span className="ml-2 font-medium">{selectedPothole.confidence}%</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">차량 신고:</span>
                  <span className="ml-2">{selectedPothole.vehicleReports}건</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PotholeDetection;