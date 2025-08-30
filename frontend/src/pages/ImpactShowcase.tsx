import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  MapIcon, 
  LightBulbIcon, 
  CurrencyDollarIcon,
  ArrowRightIcon as TruckIcon,
  PresentationChartBarIcon as ChartPieIcon,
  ClockIcon,
  GlobeAltIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { useSimulationStore } from '@/stores/simulationStore';
import ROICalculator from '@/components/impact/ROICalculator';
import PotholeDetection from '@/components/impact/PotholeDetection';
import SmartCityAIDemo from '@/components/impact/SmartCityAIDemo';

const ImpactShowcase = () => {
  const { stats } = useSimulationStore();
  const [activeTab, setActiveTab] = useState('pothole');
  const [showInteractiveDemo, setShowInteractiveDemo] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState('roi');

  const impactCards = [
    {
      title: '교통 흐름 개선',
      value: '34%',
      description: '평균 대기시간 감소',
      icon: ClockIcon,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'CO₂ 배출 저감',
      value: `${stats.co2Reduction.toFixed(0)}kg`,
      description: '일일 탄소 절감량',
      icon: GlobeAltIcon,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: '운영비용 절감',
      value: '₩' + (stats.costSavings / 10000).toFixed(0) + '만원',
      description: '월간 예상 절감액',
      icon: CurrencyDollarIcon,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: '슬롯 효율성',
      value: `${stats.slotStats.utilizationRate.toFixed(1)}%`,
      description: '동적 할당 활용률',
      icon: ChartPieIcon,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ];

  const smartCityFeatures = [
    {
      id: 'pothole',
      title: '포트홀 자동 탐지',
      description: '차량 센서 데이터를 활용한 실시간 도로 상태 모니터링',
      benefits: ['90% 정확도로 포트홀 탐지', '평균 신고 시간 24시간 → 2시간', '연간 도로 보수비 30% 절감'],
      demo: '🛣️ AI 기반 실시간 도로 상태 분석'
    },
    {
      id: 'traffic',
      title: '지능형 교통 시스템',
      description: '실시간 교통량 분석을 통한 신호체계 최적화',
      benefits: ['신호 대기시간 25% 단축', '교통량 균등 분산', '연료 소비 15% 감소'],
      demo: '🚦 스마트 신호등 연계 시스템'
    },
    {
      id: 'predict',
      title: '수요 예측 시스템',
      description: '빅데이터 분석을 통한 교통 수요 및 패턴 예측',
      benefits: ['95% 정확도의 수요 예측', '동적 자원 배치', '서비스 품질 향상'],
      demo: '📊 머신러닝 기반 예측 모델'
    },
    {
      id: 'emergency',
      title: '긴급상황 대응',
      description: '사고 및 재난 상황 시 즉각적인 교통 재편성',
      benefits: ['긴급차량 우선 통행로 확보', '대피 경로 최적화', '시민 안전 강화'],
      demo: '🚨 실시간 긴급대응 시스템'
    }
  ];

  const beforeAfterData = {
    before: {
      waitTime: 15.2,
      co2: 450,
      cost: 850,
      satisfaction: 65
    },
    after: {
      waitTime: 8.5,
      co2: 280,
      cost: 590,
      satisfaction: 89
    }
  };

  const roiCalculation = {
    initialInvestment: 15000, // 만원
    monthlySavings: 2400, // 만원
    paybackPeriod: 6.3, // 개월
    fiveYearRoi: 340 // %
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 스마트 도시 AI 관리 시스템 데모 */}
      <SmartCityAIDemo />



      {/* 대화형 데모 모달 */}
      {showInteractiveDemo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInteractiveDemo(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">대화형 데모 체험</h3>
                <button
                  onClick={() => setShowInteractiveDemo(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {/* 데모 탭 메뉴 */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActiveDemoTab('roi')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeDemoTab === 'roi'
                      ? 'bg-sejong-blue text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  💰 ROI 계산기
                </button>
                <button
                  onClick={() => setActiveDemoTab('pothole')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeDemoTab === 'pothole'
                      ? 'bg-sejong-blue text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🛣️ 포트홀 탐지
                </button>
              </div>
            </div>
            
            {/* 모달 콘텐츠 */}
            <div className="p-6">
              {activeDemoTab === 'roi' && <ROICalculator />}
              {activeDemoTab === 'pothole' && <PotholeDetection />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ImpactShowcase;