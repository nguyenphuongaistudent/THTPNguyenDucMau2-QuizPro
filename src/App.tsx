import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/useAuthStore';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ExamListPage from './pages/ExamListPage';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Đang tải...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        
        <Route path="/exams" element={
          <ProtectedRoute>
            <ExamListPage />
          </ProtectedRoute>
        } />
        
        <Route path="/quiz/:examId" element={
          <ProtectedRoute>
            <QuizPage />
          </ProtectedRoute>
        } />
        
        <Route path="/results/:attemptId" element={
          <ProtectedRoute>
            <ResultPage />
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
