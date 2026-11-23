import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ToastProvider } from './components/ToastContext';

// 17 Pages
import { Dashboard } from './pages/Dashboard';
import { DatasetManagement } from './pages/DatasetManagement';
import { DataExplorer } from './pages/DataExplorer';
import { RProgrammingStudio } from './pages/RProgrammingStudio';
import { RConsole } from './pages/RConsole';
import { RScriptLibrary } from './pages/RScriptLibrary';
import { RFMSegmentation } from './pages/RFMSegmentation';
import { KMeansClustering } from './pages/KMeansClustering';
import { SalesForecasting } from './pages/SalesForecasting';
import { SalesAnalysis } from './pages/SalesAnalysis';
import { StatisticalAnalysis } from './pages/StatisticalAnalysis';
import { DataVisualization } from './pages/DataVisualization';
import { AutomatedInsights } from './pages/AutomatedInsights';
import { ManualAnalysis } from './pages/ManualAnalysis';
import { AnalysisHistory } from './pages/AnalysisHistory';
import { ReportsDownloads } from './pages/ReportsDownloads';
import { Settings } from './pages/Settings';

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeDataset, setActiveDataset] = useState('uci_online_retail_default');

  return (
    <ToastProvider>
      <Router>
        <div className="min-h-screen bg-[#0B1120] text-slate-100 flex">
          {/* Collapsible Sidebar */}
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            toggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
          />

          {/* Main Content Area */}
          <div
            className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
              isSidebarCollapsed ? 'ml-20' : 'ml-64'
            }`}
          >
            <Navbar
              activeDataset={activeDataset}
              setActiveDataset={setActiveDataset}
            />

            <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
              <Routes>
                {/* OVERVIEW */}
                <Route path="/" element={<Dashboard activeDataset={activeDataset} />} />
                <Route
                  path="/datasets"
                  element={<DatasetManagement activeDataset={activeDataset} setActiveDataset={setActiveDataset} />}
                />
                <Route path="/explorer" element={<DataExplorer activeDataset={activeDataset} />} />

                {/* R PROGRAMMING */}
                <Route path="/r-studio" element={<RProgrammingStudio activeDataset={activeDataset} />} />
                <Route path="/r-console" element={<RConsole />} />
                <Route path="/r-scripts" element={<RScriptLibrary activeDataset={activeDataset} />} />

                {/* DATA ANALYTICS */}
                <Route path="/rfm" element={<RFMSegmentation activeDataset={activeDataset} />} />
                <Route path="/kmeans" element={<KMeansClustering activeDataset={activeDataset} />} />
                <Route path="/forecast" element={<SalesForecasting activeDataset={activeDataset} />} />
                <Route path="/sales-analysis" element={<SalesAnalysis activeDataset={activeDataset} />} />
                <Route path="/statistics" element={<StatisticalAnalysis activeDataset={activeDataset} />} />
                <Route path="/visualizations" element={<DataVisualization activeDataset={activeDataset} />} />
                <Route path="/insights" element={<AutomatedInsights activeDataset={activeDataset} />} />
                <Route path="/manual-analysis" element={<ManualAnalysis activeDataset={activeDataset} />} />

                {/* MANAGEMENT */}
                <Route path="/history" element={<AnalysisHistory />} />
                <Route path="/reports" element={<ReportsDownloads activeDataset={activeDataset} />} />
                <Route path="/settings" element={<Settings />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ToastProvider>
  );
}
