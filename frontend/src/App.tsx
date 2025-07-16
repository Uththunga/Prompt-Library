import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Prompts } from './pages/Prompts';
import { Documents } from './pages/Documents';
import { Executions } from './pages/Executions';
import { ExecutePrompt } from './pages/ExecutePrompt';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return currentUser ? <>{children}</> : <Navigate to="/auth" />;
};

// Public Route component (redirect to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return currentUser ? <Navigate to="/" /> : <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <AuthProvider>
            <div className="App">
              <Routes>
                {/* Public routes */}
                <Route
                  path="/auth"
                  element={
                    <PublicRoute>
                      <AuthPage />
                    </PublicRoute>
                  }
                />

                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="prompts" element={<Prompts />} />
                  <Route path="prompts/:promptId/execute" element={<ExecutePrompt />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="executions" element={<Executions />} />
                  <Route path="analytics" element={<div>Analytics Page (Coming Soon)</div>} />
                  <Route path="workspaces" element={<div>Workspaces Page (Coming Soon)</div>} />
                  <Route path="settings" element={<div>Settings Page (Coming Soon)</div>} />
                </Route>

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </AuthProvider>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
