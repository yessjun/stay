import React from 'react';
import Navigation from './Navigation';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-green-50">
      <Navigation />
      
      <motion.main 
        className="flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.main>
      
      {/* 푸터 */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p>&copy; 2025 STAY Team. 제12회 대한민국 SW융합 해커톤 대회</p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>공유 자율주행 차량의 대기 슬롯 동적 오케스트레이션 플랫폼</span>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <span>STAY</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;