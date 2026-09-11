export const loadDashboard = () => import('./app/pages/DashboardPage/DashboardPage');
export const loadProjects = () => import('./app/pages/ProjectsPage/ProjectsPage');
export const loadProjectDetail = () => import('./app/pages/ProjectDetailPage/ProjectDetailPage');
export const loadEmployees = () => import('./app/pages/EmployeesPage/EmployeesPage');
export const loadTeams = () => import('./app/pages/TeamsPage/TeamsPage');
export const loadLeaveRequests = () => import('./app/pages/LeaveRequestsPage/LeaveRequestsPage');
export const loadClients = () => import('./app/pages/ClientsPage/ClientsPage');
export const loadPipeline = () => import('./app/pages/PipelinePage/PipelinePage');
export const loadProducts = () => import('./app/pages/ProductsPage/ProductsPage');
export const loadOrders = () => import('./app/pages/OrdersPage/OrdersPage');
export const loadSuppliers = () => import('./app/pages/SuppliersPage/SuppliersPage');
export const loadSettings = () => import('./app/pages/SettingsPage/SettingsPage');
export const loadReports = () => import('./app/pages/ReportsPage/ReportsPage');
export const loadSecurity = () => import('./app/pages/SecurityPage/SecurityPage');

export const routePreloaders: Record<string, () => Promise<unknown>> = {
  '/dashboard': loadDashboard,
  '/projects': loadProjects,
  '/employees': loadEmployees,
  '/teams': loadTeams,
  '/leave-requests': loadLeaveRequests,
  '/clients': loadClients,
  '/pipeline': loadPipeline,
  '/products': loadProducts,
  '/orders': loadOrders,
  '/suppliers': loadSuppliers,
  '/settings': loadSettings,
  '/reports': loadReports,
  '/security': loadSecurity,
};