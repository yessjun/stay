import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CameraIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  MapPinIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import RoadConditionMonitor from './RoadConditionMonitor';
import IncidentDetection from './IncidentDetection';
import IllegalParkingDetection from './IllegalParkingDetection';

interface AIFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface Notification {
  id: string;
  type: 'pothole' | 'accident' | 'parking' | 'traffic' | 'good';
  message: string;
  location: string;
  time: Date;
  severity: 'low' | 'medium' | 'high';
}

const SmartCityAIDemo: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<string>('road');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const aiFeatures: AIFeature[] = [
    {
      id: 'road',
      title: '도로 상태 모니터링',
      description: '균열, 포트홀 등 도로 손상 실시간 탐지',
      icon: CameraIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'incident',
      title: '사고 자동 신고',
      description: '충돌 감지 및 긴급 대응 시스템',
      icon: ExclamationTriangleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      id: 'parking',
      title: '불법 주정차 감지',
      description: '주정차 금지구역 AI 모니터링',
      icon: ShieldCheckIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  // 알림 메시지 템플릿
  const notificationTemplates = {
    pothole: [
      '포트홀 탐지',
      '도로 균열 발견',
      '노면 손상 감지',
      '침하 구간 발견'
    ],
    accident: [
      '차량 충돌 감지',
      '접촉사고 발생',
      '차량 고장 신고',
      '긴급상황 발생'
    ],
    parking: [
      '스쿨존 불법주차',
      '소방도로 주차 위반',
      '버스정류장 불법정차',
      '횡단보도 주차 감지'
    ],
    traffic: [
      '교통 정체 구간',
      '신호 대기 증가',
      '우회 권장 구간'
    ],
    good: [
      '도로 상태 양호',
      '교통 흐름 원활',
      '정상 운행 중'
    ]
  };

  const locations = [
    '한누리대로',
    '시청대로',
    '달빛로',
    '보람동로',
    '아름동로',
    '종촌동길',
    '도담동로',
    '새롬로'
  ];

  // 실시간 알림 생성
  useEffect(() => {
    const generateNotification = () => {
      const types: ('pothole' | 'accident' | 'parking' | 'traffic' | 'good')[] = 
        ['pothole', 'accident', 'parking', 'traffic', 'good'];
      const type = types[Math.floor(Math.random() * types.length)];
      const messages = notificationTemplates[type];
      const message = messages[Math.floor(Math.random() * messages.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      
      const severityMap = {
        pothole: Math.random() > 0.5 ? 'high' : 'medium',
        accident: Math.random() > 0.3 ? 'high' : 'medium',
        parking: 'medium',
        traffic: 'low',
        good: 'low'
      };

      const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        type,
        message,
        location,
        time: new Date(),
        severity: severityMap[type] as 'low' | 'medium' | 'high'
      };

      setNotifications(prev => {
        const updated = [newNotification, ...prev].slice(0, 3); // 최대 3개 유지
        return updated;
      });
    };

    // 초기 알림 생성
    generateNotification();
    generateNotification();

    // 랜덤 간격으로 새 알림 생성 (8-15초)
    const interval = setInterval(() => {
      generateNotification();
    }, 8000 + Math.random() * 7000);

    return () => clearInterval(interval);
  }, []);

  const getNotificationStyle = (type: string, severity: string) => {
    if (type === 'good') return { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' };
    if (type === 'accident' || severity === 'high') return { dot: 'bg-red-500 animate-pulse', text: 'text-red-700', bg: 'bg-red-50' };
    if (type === 'parking' || severity === 'medium') return { dot: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' };
    return { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' };
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-8">

      {/* 실시간 알림 패널 - 개선된 UI */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <BellAlertIcon className="h-5 w-5 text-gray-700 mr-2" />
            <h4 className="font-semibold text-gray-800">실시간 모니터링</h4>
            <div className="ml-3 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
              <span className="text-xs text-gray-500">LIVE</span>
            </div>
          </div>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString('ko-KR')}
          </span>
        </div>
        
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {notifications.map((notif, index) => {
              const style = getNotificationStyle(notif.type, notif.severity);
              
              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ 
                    duration: 0.2,
                    delay: index * 0.03
                  }}
                  className={`${style.bg} rounded-lg p-2 border border-gray-100 hover:shadow-sm transition-all`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0`} />
                    <div className={`text-sm font-medium ${style.text}`}>
                      {notif.message}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 ml-auto space-x-2">
                      <MapPinIcon className="h-3 w-3" />
                      <span>{notif.location}</span>
                      <span className="text-gray-300">|</span>
                      <span>{formatTime(notif.time)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* 기능 선택 탭 - 개선된 디자인 */}
      <div className="bg-gray-50 rounded-lg p-1 mb-8">
        <div className="grid grid-cols-3 gap-1">
          {aiFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(feature.id)}
                className={`relative py-3 px-4 rounded-md transition-all ${
                  activeFeature === feature.id
                    ? 'bg-white shadow-sm'
                    : 'hover:bg-gray-100'
                }`}
              >
                {activeFeature === feature.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-md shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative flex flex-col items-center space-y-1">
                  <Icon className={`h-6 w-6 ${
                    activeFeature === feature.id ? feature.color : 'text-gray-500'
                  }`} />
                  <div className={`text-sm font-medium ${
                    activeFeature === feature.id ? 'text-gray-900' : 'text-gray-600'
                  }`}>
                    {feature.title}
                  </div>
                  <div className="text-xs text-gray-400 hidden lg:block">
                    {feature.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 기능별 컴포넌트 렌더링 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeFeature}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeFeature === 'road' && <RoadConditionMonitor />}
          {activeFeature === 'incident' && <IncidentDetection />}
          {activeFeature === 'parking' && <IllegalParkingDetection />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SmartCityAIDemo;