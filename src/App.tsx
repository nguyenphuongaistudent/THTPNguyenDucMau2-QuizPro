import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/useAuthStore';

// Layout
import DashboardLayout from './components/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ExamListPage from './pages/ExamListPage';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import QuestionBankPage from './pages/QuestionBankPage';
import ExamManagementPage from './pages/ExamManagementPage';
import ExamEditorPage from './pages/ExamEditorPage';
import ReportsPage from './pages/ReportsPage';
import MyResultsPage from './pages/MyResultsPage';
import UserManagementPage from './pages/UserManagementPage';

function ProtectedRoute({ children, roles, noLayout = false }: { children: React.ReactNode, roles?: string[], noLayout?: boolean }) {
  const { user, loading } = useAuthStore();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Đang tải...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }
  
  if (noLayout) return <>{children}</>;
  
  return <DashboardLayout>{children}</DashboardLayout>;
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
        
        {/* Student Routes */}
        <Route path="/exams" element={
          <ProtectedRoute roles={['student', 'teacher', 'admin']}>
            <ExamListPage />
          </ProtectedRoute>
        } />
        
        <Route path="/results" element={
          <ProtectedRoute roles={['student']}>
            <MyResultsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/results/:attemptId" element={
          <ProtectedRoute>
            <ResultPage />
          </ProtectedRoute>
        } />

        {/* Teacher/Admin Routes */}
        <Route path="/questions" element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <QuestionBankPage />
          </ProtectedRoute>
        } />

        <Route path="/exams/manage" element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <ExamManagementPage />
          </ProtectedRoute>
        } />

        <Route path="/exams/create" element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <ExamEditorPage />
          </ProtectedRoute>
        } />

        <Route path="/exams/edit/:id" element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <ExamEditorPage />
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <ReportsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/users" element={
          <ProtectedRoute roles={['admin']}>
            <UserManagementPage />
          </ProtectedRoute>
        } />
        
        {/* Quiz Page (No Layout) */}
        <Route path="/quiz/:examId" element={
          <ProtectedRoute noLayout>
            <QuizPage />
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
