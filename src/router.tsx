import { Routes, Route, Navigate } from 'react-router-dom';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>{title}</h1>
      <p>Écran à construire.</p>
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/login" element={<PlaceholderPage title="Connexion" />} />
      <Route path="/register" element={<PlaceholderPage title="Inscription" />} />

      <Route path="/projects" element={<PlaceholderPage title="Projets" />} />
      <Route path="/projects/:id" element={<PlaceholderPage title="Détail du projet" />} />

      <Route path="/employees" element={<PlaceholderPage title="Employés" />} />
      <Route path="/teams" element={<PlaceholderPage title="Équipes" />} />
      <Route path="/leave-requests" element={<PlaceholderPage title="Congés" />} />

      <Route path="/clients" element={<PlaceholderPage title="Clients" />} />
      <Route path="/pipeline" element={<PlaceholderPage title="Pipeline de vente" />} />

      <Route path="/products" element={<PlaceholderPage title="Produits" />} />
      <Route path="/orders" element={<PlaceholderPage title="Commandes" />} />
      <Route path="/suppliers" element={<PlaceholderPage title="Fournisseurs" />} />

      <Route path="/dashboard" element={<PlaceholderPage title="Tableau de bord" />} />

      <Route path="*" element={<PlaceholderPage title="Page introuvable" />} />
    </Routes>
  );
}