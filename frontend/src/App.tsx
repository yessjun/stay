import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import SimulationDashboard from '@/pages/SimulationDashboard';
import AdminPanel from '@/pages/AdminPanel';
import ImpactShowcase from '@/pages/ImpactShowcase';

// 페이지 전환 애니메이션
const pageVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5
};

function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-gradient-to-br from-neutral-100 via-blue-50 to-green-50">
        <Layout>
          <Routes>
            <Route 
              path="/" 
              element={
                <motion.div
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <SimulationDashboard />
                </motion.div>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <motion.div
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <AdminPanel />
                </motion.div>
              } 
            />
            <Route 
              path="/impact" 
              element={
                <motion.div
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <ImpactShowcase />
                </motion.div>
              } 
            />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;