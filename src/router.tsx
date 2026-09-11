import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { usePageViewTracking } from '@/features/monitoring';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { AppLayout } from './app/layout/AppLayout';
import {
  loadClients,
  loadDashboard,
  loadEmployees,
  loadLeaveRequests,
  loadOrders,
  loadPipeline,
  loadProducts,
  loadProjectDetail,
  loadProjects,
  loadReports,
  loadSecurity,
  loadSettings,
  loadSuppliers,
  loadTeams,
} from './routePreloaders';

// Les deux écrans d'authentification restent chargés avec l'application :
// ce sont les premiers affichés, les différer ajouterait une attente
// là où l'utilisateur en remarquerait le plus l'effet.
import { LoginPage } from './app/pages/LoginPage/LoginPage';
import { RegisterPage } from './app/pages/RegisterPage/RegisterPage';

// Chargement différé pour tous les autres écrans : chaque fonction load*
// vient de routePreloaders.ts, pour être partagée avec le préchargement au survol.

const DashboardPage = lazy(() =>
  loadDashboard().then((m) => ({ default: m.DashboardPage })),
);
const ProjectsPage = lazy(() => loadProjects().then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() =>
  loadProjectDetail().then((m) => ({ default: m.ProjectDetailPage })),
);
const EmployeesPage = lazy(() =>
  loadEmployees().then((m) => ({ default: m.EmployeesPage })),
);
const TeamsPage = lazy(() => loadTeams().then((m) => ({ default: m.TeamsPage })));
const LeaveRequestsPage = lazy(() =>
  loadLeaveRequests().then((m) => ({ default: m.LeaveRequestsPage })),
);
const ClientsPage = lazy(() => loadClients().then((m) => ({ default: m.ClientsPage })));
const PipelinePage = lazy(() => loadPipeline().then((m) => ({ default: m.PipelinePage })));
const ProductsPage = lazy(() => loadProducts().then((m) => ({ default: m.ProductsPage })));
const OrdersPage = lazy(() => loadOrders().then((m) => ({ default: m.OrdersPage })));
const SuppliersPage = lazy(() =>
  loadSuppliers().then((m) => ({ default: m.SuppliersPage })),
);
const SettingsPage = lazy(() => loadSettings().then((m) => ({ default: m.SettingsPage })));
const ReportsPage = lazy(() => loadReports().then((m) => ({ default: m.ReportsPage })));
const SecurityPage = lazy(() => loadSecurity().then((m) => ({ default: m.SecurityPage })));

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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Tous les écrans métier partagent la mise en page, et exigent une
          session active : ProtectedRoute redirige vers /login sinon.
          Ceux d'authentification s'affichent seuls, sans menu : on ne
          propose pas de naviguer à quelqu'un qui n'est pas encore connecté. */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <AppLayout>
              {/* Suspense placé à l'intérieur de la mise en page : seule la
                  zone de contenu affiche l'indicateur pendant le
                  téléchargement, le menu reste en place. */}
              <Suspense fallback={<Spinner label="Chargement de l'écran..." />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

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

                  {/* Routes absentes du router d'origine : Settings (Étape 2)
                      et Reports/BI (Étape 5) */}
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />

                  {/* Deuxième vérification imbriquée : connecté ne suffit pas,
                      il faut aussi le rôle admin pour voir le journal d'audit. */}
                  <Route
                    path="/security"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <SecurityPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<PlaceholderPage title="Page introuvable" />} />
                </Routes>
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}