import React, { lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { on } from '@auditflow/event-bus';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';

// Lazy-loaded MFE pages — each loads its own JS bundle on demand
const ProjectListPage   = lazy(() => import('mfeInventory/ProjectListPage'));
const ProjectDetailPage = lazy(() => import('mfeInventory/ProjectDetailPage'));
const AuditRunPage      = lazy(() => import('mfeAnalyzer/AuditRunPage'));
const ReportPage        = lazy(() => import('mfeReports/ReportPage'));

/** Handles cross-MFE navigation events emitted via Event Bus */
function EventBusRouter() {
  const navigate = useNavigate();
  useEffect(() => {
    const unsub = on('auditflow:navigate', ({ route }) => navigate(route));
    return unsub;
  }, [navigate]);
  return null;
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <>
      <EventBusRouter />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/projects" replace />} />

          <Route
            path="/projects"
            element={
              <ErrorBoundary name="MFE-Inventory">
                <ProjectListPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ErrorBoundary name="MFE-Inventory">
                <ProjectDetailPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/projects/:id/audit"
            element={
              <ErrorBoundary name="MFE-Analyzer">
                <AuditRunPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/reports/:auditId"
            element={
              <ErrorBoundary name="MFE-Reports">
                <ReportPage />
              </ErrorBoundary>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
