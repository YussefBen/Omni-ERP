import { Navigate, Route, Routes } from 'react-router-dom';
import { usePageViewTracking } from '@/features/monitoring';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { RegisterPage } from './pages/RegisterPage/RegisterPage';
import { ProjectsPage } from './pages/ProjectsPage/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage/ProjectDetailPage';
import { EmployeesPage } from './pages/EmployeesPage/EmployeesPage';
import { TeamsPage } from './pages/TeamsPage/TeamsPage';
import { LeaveRequestsPage } from './pages/LeaveRequestsPage/LeaveRequestsPage';
import { ClientsPage } from './pages/ClientsPage/ClientsPage';
import { PipelinePage } from './pages/PipelinePage/PipelinePage';
import { ProductsPage } from './pages/ProductsPage/ProductsPage';
import { OrdersPage } from './pages/OrdersPage/OrdersPage';
import { SuppliersPage } from './pages/SuppliersPage/SuppliersPage';
import { DashboardPage } from './pages/DashboardPage/DashboardPage';
import { SettingsPage } from './pages/SettingsPage/SettingsPage';
import { ReportsPage } from './pages/ReportsPage/ReportsPage';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>{title}</h1>
      <p>Écran à construire.</p>
    </div>
  );
}

export function AppRouter() {
  usePageViewTracking();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:id" element={<ProjectDetailPage />} />

      <Route path="/employees" element={<EmployeesPage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/leave-requests" element={<LeaveRequestsPage />} />

      <Route path="/clients" element={<ClientsPage />} />
      <Route path="/pipeline" element={<PipelinePage />} />

      <Route path="/products" element={<ProductsPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/suppliers" element={<SuppliersPage />} />

      <Route path="/dashboard" element={<DashboardPage />} />

      {/* Routes absentes du router d'origine : Settings (Étape 2) et Reports/BI (Étape 5) */}
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/reports" element={<ReportsPage />} />

      <Route path="*" element={<PlaceholderPage title="Page introuvable" />} />
    </Routes>
  );
}
