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
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { useSimulationStore } from '@/stores/simulationStore';
import ROICalculator from '@/components/impact/ROICalculator';
import PotholeDetection from '@/components/impact/PotholeDetection';

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
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">기대효과 및 활용분야</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          세종시 스마트시티를 위한 혁신적인 교통 솔루션의 예상 효과와 확장 가능성을 확인해보세요
        </p>
      </motion.div>

      {/* 주요 성과 지표 */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
      >
        {impactCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              variants={itemVariants}
              className="bg-white rounded-xl shadow-card p-6 relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.color}`} />
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.textColor}`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{card.value}</div>
              <div className="text-sm font-medium text-gray-700 mb-1">{card.title}</div>
              <div className="text-xs text-gray-500">{card.description}</div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Before/After 비교 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl shadow-card p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
              <ChartBarIcon className="h-6 w-6 mr-3" />
              도입 전후 비교
            </h3>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Before */}
              <div>
                <h4 className="text-lg font-semibold text-red-600 mb-6 text-center">도입 전</h4>
                <div className="space-y-4">
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-700">{beforeAfterData.before.waitTime}분</div>
                    <div className="text-sm text-red-600">평균 대기시간</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-700">{beforeAfterData.before.co2}kg</div>
                    <div className="text-sm text-red-600">일일 CO₂ 배출</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-700">₩{beforeAfterData.before.cost}만</div>
                    <div className="text-sm text-red-600">월간 운영비</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-700">{beforeAfterData.before.satisfaction}%</div>
                    <div className="text-sm text-red-600">시민 만족도</div>
                  </div>
                </div>
              </div>
              
              {/* After */}
              <div>
                <h4 className="text-lg font-semibold text-green-600 mb-6 text-center">도입 후</h4>
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-700">{beforeAfterData.after.waitTime}분</div>
                    <div className="text-sm text-green-600">평균 대기시간</div>
                    <div className="text-xs text-green-500 mt-1">
                      ↓ {((beforeAfterData.before.waitTime - beforeAfterData.after.waitTime) / beforeAfterData.before.waitTime * 100).toFixed(0)}% 감소
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-700">{beforeAfterData.after.co2}kg</div>
                    <div className="text-sm text-green-600">일일 CO₂ 배출</div>
                    <div className="text-xs text-green-500 mt-1">
                      ↓ {((beforeAfterData.before.co2 - beforeAfterData.after.co2) / beforeAfterData.before.co2 * 100).toFixed(0)}% 감소
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-700">₩{beforeAfterData.after.cost}만</div>
                    <div className="text-sm text-green-600">월간 운영비</div>
                    <div className="text-xs text-green-500 mt-1">
                      ↓ {((beforeAfterData.before.cost - beforeAfterData.after.cost) / beforeAfterData.before.cost * 100).toFixed(0)}% 절감
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-700">{beforeAfterData.after.satisfaction}%</div>
                    <div className="text-sm text-green-600">시민 만족도</div>
                    <div className="text-xs text-green-500 mt-1">
                      ↑ {beforeAfterData.after.satisfaction - beforeAfterData.before.satisfaction}%p 향상
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ROI 계산기 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <CurrencyDollarIcon className="h-6 w-6 mr-2" />
              투자수익률 (ROI)
            </h3>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">초기 투자비용</div>
                <div className="text-2xl font-bold text-gray-900">₩{roiCalculation.initialInvestment.toLocaleString()}만원</div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 mb-1">월간 절감액</div>
                <div className="text-2xl font-bold text-blue-700">₩{roiCalculation.monthlySavings.toLocaleString()}만원</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 mb-1">투자 회수 기간</div>
                <div className="text-2xl font-bold text-green-700">{roiCalculation.paybackPeriod}개월</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 mb-1">5년 ROI</div>
                <div className="text-2xl font-bold text-purple-700">{roiCalculation.fiveYearRoi}%</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 스마트시티 연계 효과 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-card p-8 mb-12"
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
          <LightBulbIcon className="h-6 w-6 mr-3" />
          스마트시티 연계 솔루션
        </h3>
        
        {/* 탭 메뉴 */}
        <div className="flex flex-wrap gap-2 mb-8">
          {smartCityFeatures.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setActiveTab(feature.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === feature.id
                  ? 'bg-sejong-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {feature.title}
            </button>
          ))}
        </div>
        
        {/* 탭 콘텐츠 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="text-xl font-semibold text-gray-900 mb-4">
              {smartCityFeatures.find(f => f.id === activeTab)?.title}
            </h4>
            <p className="text-gray-600 mb-6">
              {smartCityFeatures.find(f => f.id === activeTab)?.description}
            </p>
            
            <h5 className="font-semibold text-gray-900 mb-3">주요 효과</h5>
            <ul className="space-y-2">
              {smartCityFeatures.find(f => f.id === activeTab)?.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center text-sm text-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {smartCityFeatures.find(f => f.id === activeTab)?.demo.split(' ')[0]}
              </div>
              <p className="text-gray-700 font-medium mb-4">
                {smartCityFeatures.find(f => f.id === activeTab)?.demo.split(' ').slice(1).join(' ')}
              </p>
              
              {(activeTab === 'pothole' || activeTab === 'predict') && (
                <button
                  onClick={() => setShowInteractiveDemo(true)}
                  className="btn-primary px-6 py-3 rounded-lg font-medium"
                >
                  🎯 대화형 데모 체험하기
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 확장 로드맵 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-sejong-blue to-smart-green rounded-xl text-white p-8"
      >
        <h3 className="text-2xl font-bold mb-6 flex items-center">
          <MapIcon className="h-6 w-6 mr-3" />
          확장 로드맵
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6">
            <div className="text-4xl mb-4">🏙️</div>
            <h4 className="text-lg font-semibold mb-2">1단계: 세종시 전체</h4>
            <p className="text-sm opacity-90">
              현재 시범 구역에서 세종시 전체로 확대 적용
            </p>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6">
            <div className="text-4xl mb-4">🌐</div>
            <h4 className="text-lg font-semibold mb-2">2단계: 광역권 연계</h4>
            <p className="text-sm opacity-90">
              대전, 충청권과의 광역 교통 연계 시스템 구축
            </p>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6">
            <div className="text-4xl mb-4">🚀</div>
            <h4 className="text-lg font-semibold mb-2">3단계: 전국 표준화</h4>
            <p className="text-sm opacity-90">
              전국 스마트시티 표준 플랫폼으로 확산
            </p>
          </div>
        </div>
      </motion.div>

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