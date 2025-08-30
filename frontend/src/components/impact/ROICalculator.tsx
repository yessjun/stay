// ROI 계산기 컴포넌트 - 인터랙티브 투자수익률 계산

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CurrencyDollarIcon, ComputerDesktopIcon as CalculatorIcon, ArrowTrendingUpIcon as TrendingUpIcon } from '@heroicons/react/24/outline';

interface ROIData {
  initialInvestment: number;
  monthlySavings: number;
  implementationCost: number;
  maintenanceCost: number;
  paybackPeriod: number;
  fiveYearROI: number;
  totalSavings: number;
}

const ROICalculator: React.FC = () => {
  const [citySize, setCitySize] = useState(100); // 1 = 소도시, 100 = 중도시, 500 = 대도시
  const [vehicleCount, setVehicleCount] = useState(50);
  const [slotCount, setSlotCount] = useState(120);
  const [utilizationRate, setUtilizationRate] = useState(70); // %

  const [roiData, setRoiData] = useState<ROIData>({
    initialInvestment: 15000,
    monthlySavings: 2400,
    implementationCost: 8000,
    maintenanceCost: 500,
    paybackPeriod: 6.3,
    fiveYearROI: 340,
    totalSavings: 144000
  });

  const [isCalculating, setIsCalculating] = useState(false);

  // ROI 계산 로직
  useEffect(() => {
    setIsCalculating(true);
    
    const timer = setTimeout(() => {
      // 기본 비용 계산
      const baseCost = citySize * 150; // 도시 규모 * 150만원
      const vehicleCost = vehicleCount * 50; // 차량당 50만원
      const slotCost = slotCount * 20; // 슬롯당 20만원
      const implementationCost = baseCost * 0.5;
      
      const totalInitialCost = baseCost + vehicleCost + slotCost + implementationCost;
      
      // 월간 절감액 계산
      const trafficReduction = (utilizationRate / 100) * 0.3; // 교통 흐름 개선
      const fuelSavings = vehicleCount * 30 * trafficReduction; // 차량당 연료 절감
      const timeSavings = citySize * 5 * trafficReduction; // 시간 절약 가치
      const maintenanceSavings = slotCount * 15 * (utilizationRate / 100); // 인프라 효율성
      
      const totalMonthlySavings = (fuelSavings + timeSavings + maintenanceSavings) * 10;
      const monthlyMaintenance = totalInitialCost * 0.02; // 2% 유지비용
      const netMonthlySavings = totalMonthlySavings - monthlyMaintenance;
      
      // ROI 계산
      const paybackMonths = totalInitialCost / netMonthlySavings;
      const fiveYearSavings = netMonthlySavings * 60; // 5년
      const fiveYearROI = ((fiveYearSavings - totalInitialCost) / totalInitialCost) * 100;
      
      setRoiData({
        initialInvestment: totalInitialCost,
        monthlySavings: netMonthlySavings,
        implementationCost,
        maintenanceCost: monthlyMaintenance,
        paybackPeriod: paybackMonths,
        fiveYearROI: Math.max(50, fiveYearROI), // 최소 50%
        totalSavings: fiveYearSavings
      });
      
      setIsCalculating(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [citySize, vehicleCount, slotCount, utilizationRate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount * 10000); // 만원 단위를 원으로 변환
  };

  const getROIColor = (roi: number) => {
    if (roi > 300) return 'text-green-600 bg-green-50';
    if (roi > 200) return 'text-blue-600 bg-blue-50';
    if (roi > 100) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPaybackColor = (months: number) => {
    if (months < 12) return 'text-green-600';
    if (months < 24) return 'text-blue-600';
    if (months < 36) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <CalculatorIcon className="h-8 w-8 text-sejong-blue mr-3" />
        <div>
          <h3 className="text-2xl font-bold text-gray-900">ROI 계산기</h3>
          <p className="text-gray-600">프로젝트 규모에 따른 투자수익률을 계산해보세요</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 설정 패널 */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">프로젝트 설정</h4>
          
          {/* 도시 규모 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              도시 규모 (인구 만명 기준): {citySize}만명
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="50"
              value={citySize}
              onChange={(e) => setCitySize(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>소도시</span>
              <span>중도시</span>
              <span>대도시</span>
            </div>
          </div>

          {/* 차량 수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              관리 차량 수: {vehicleCount}대
            </label>
            <input
              type="range"
              min="20"
              max="200"
              step="10"
              value={vehicleCount}
              onChange={(e) => setVehicleCount(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>20대</span>
              <span>200대</span>
            </div>
          </div>

          {/* 슬롯 수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              정차 슬롯 수: {slotCount}개
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={slotCount}
              onChange={(e) => setSlotCount(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>50개</span>
              <span>500개</span>
            </div>
          </div>

          {/* 목표 이용률 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              목표 슬롯 이용률: {utilizationRate}%
            </label>
            <input
              type="range"
              min="40"
              max="90"
              step="5"
              value={utilizationRate}
              onChange={(e) => setUtilizationRate(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>40%</span>
              <span>90%</span>
            </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            계산 결과
            {isCalculating && (
              <div className="ml-2 w-4 h-4 border-2 border-sejong-blue border-t-transparent rounded-full animate-spin"></div>
            )}
          </h4>
          
          <motion.div
            key={roiData.initialInvestment}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* 초기 투자비용 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">총 초기 투자비용</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(roiData.initialInvestment)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                구축비 {formatCurrency(roiData.implementationCost)} 포함
              </div>
            </div>

            {/* 월간 순 절감액 */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 mb-1">월간 순 절감액</div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(roiData.monthlySavings)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                유지비 {formatCurrency(roiData.maintenanceCost)} 차감 후
              </div>
            </div>

            {/* 투자 회수 기간 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 mb-1">투자 회수 기간</div>
              <div className={`text-2xl font-bold ${getPaybackColor(roiData.paybackPeriod)}`}>
                {roiData.paybackPeriod.toFixed(1)}개월
              </div>
              <div className="text-xs text-blue-600 mt-1">
                약 {(roiData.paybackPeriod / 12).toFixed(1)}년
              </div>
            </div>

            {/* 5년 ROI */}
            <div className={`rounded-lg p-4 ${getROIColor(roiData.fiveYearROI)}`}>
              <div className="text-sm mb-1">5년 투자수익률</div>
              <div className="text-3xl font-bold">
                {roiData.fiveYearROI.toFixed(0)}%
              </div>
              <div className="text-xs mt-1">
                총 수익: {formatCurrency(roiData.totalSavings)}
              </div>
            </div>

            {/* 월별 수익 차트 (간단한 바 형태) */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 mb-3">월별 누적 수익</div>
              <div className="space-y-2">
                {[12, 24, 36, 48, 60].map((month) => {
                  const cumulativeProfit = (roiData.monthlySavings * month) - roiData.initialInvestment;
                  const isPositive = cumulativeProfit > 0;
                  return (
                    <div key={month} className="flex items-center">
                      <div className="w-16 text-xs text-gray-600">{month}개월</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ 
                            width: `${Math.min(Math.abs(cumulativeProfit) / (roiData.totalSavings) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      <div className={`text-xs w-20 text-right ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {cumulativeProfit > 0 ? '+' : ''}{(cumulativeProfit / 10000).toFixed(0)}만원
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ROI 등급 */}
            <div className="bg-gradient-to-r from-sejong-blue to-smart-green rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90">투자 등급</div>
                  <div className="text-xl font-bold">
                    {roiData.fiveYearROI > 300 ? 'A+' : 
                     roiData.fiveYearROI > 200 ? 'A' : 
                     roiData.fiveYearROI > 100 ? 'B' : 'C'}
                  </div>
                </div>
                <TrendingUpIcon className="w-8 h-8 opacity-80" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 상세 분석 */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h5 className="text-lg font-semibold text-gray-800 mb-4">상세 분석</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="font-medium text-blue-800">교통 효율성 개선</div>
            <div className="text-blue-600 mt-1">
              대기시간 {Math.round(utilizationRate * 0.3)}% 감소<br/>
              연료 소모 {Math.round(utilizationRate * 0.25)}% 절감
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="font-medium text-green-800">환경 효과</div>
            <div className="text-green-600 mt-1">
              CO₂ 배출 {Math.round(vehicleCount * 0.5)}톤 저감<br/>
              대기질 개선 효과
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="font-medium text-purple-800">사회적 가치</div>
            <div className="text-purple-600 mt-1">
              시민 편의성 증대<br/>
              스마트시티 경쟁력 강화
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROICalculator;