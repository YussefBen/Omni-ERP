// Jeux de données servis par MSW pendant les tests.
// Volontairement réduits : un test doit pouvoir affirmer des valeurs exactes,
// ce qui est impossible sur les 194 produits ou les 208 clients réels.

import type {
  DummyJsonCart,
  DummyJsonProduct,
  OrderMeta,
  StockMovement,
  SupplierRecord,
} from '@/features/erp';
import type {
  ClientProfile,
  DummyJsonUser,
  JsonPlaceholderComment,
  Opportunity,
  PipelineStage,
} from '@/features/crm';

/* ---------- DummyJSON : utilisateurs ---------- */

export const mockUsers: DummyJsonUser[] = [
  {
    id: 1,
    firstName: 'Emily',
    lastName: 'Johnson',
    email: 'emily@exemple.fr',
    phone: '+33 1 00 00 00 01',
    image: 'https://cdn.exemple.fr/1.png',
    company: { name: 'Dooley SA', department: 'Engineering', title: 'Sales Manager' },
    address: { city: 'Phoenix', state: 'MS', country: 'United States' },
    role: 'admin',
  },
  {
    id: 2,
    firstName: 'Michael',
    lastName: 'Williams',
    email: 'michael@exemple.fr',
    phone: '+33 1 00 00 00 02',
    image: 'https://cdn.exemple.fr/2.png',
    company: { name: 'Kozey SARL', department: 'Support', title: 'Technicien' },
    address: { city: 'Houston', state: 'TX', country: 'United States' },
    role: 'user',
  },
  {
    id: 3,
    firstName: 'Sophia',
    lastName: 'Brown',
    email: 'sophia@exemple.fr',
    phone: '+33 1 00 00 00 03',
    image: 'https://cdn.exemple.fr/3.png',
    company: { name: 'Cronin SAS', department: 'Marketing', title: 'Directrice' },
    address: { city: 'Lyon', state: 'ARA', country: 'France' },
    role: 'manager',
  },
];

/* ---------- DummyJSON : paniers ---------- */

export const mockCarts: DummyJsonCart[] = [
  {
    id: 1,
    userId: 1,
    products: [
      {
        id: 101,
        title: 'Produit A',
        price: 500,
        quantity: 2,
        total: 1000,
        discountedTotal: 900,
        thumbnail: '',
      },
    ],
    total: 1000,
    discountedTotal: 900,
    totalProducts: 1,
    totalQuantity: 2,
  },
  {
    id: 2,
    userId: 1,
    products: [
      {
        id: 102,
        title: 'Produit B',
        price: 6000,
        quantity: 2,
        total: 12000,
        discountedTotal: 11000,
        thumbnail: '',
      },
    ],
    total: 12000,
    discountedTotal: 11000,
    totalProducts: 1,
    totalQuantity: 2,
  },
  {
    id: 3,
    userId: 2,
    products: [
      {
        id: 103,
        title: 'Produit C',
        price: 100,
        quantity: 3,
        total: 300,
        discountedTotal: 280,
        thumbnail: '',
      },
    ],
    total: 300,
    discountedTotal: 280,
    totalProducts: 1,
    totalQuantity: 3,
  },
];

/* ---------- DummyJSON : produits ---------- */

export const mockProducts: DummyJsonProduct[] = [
  {
    id: 101,
    title: 'Mascara Essence',
    description: 'Un mascara',
    category: 'beauty',
    brand: 'Essence',
    sku: 'BEA-001',
    price: 100,
    discountPercentage: 10,
    rating: 4.2,
    stock: 5,
    minimumOrderQuantity: 20,
    availabilityStatus: 'Low Stock',
    weight: 4,
    thumbnail: '',
  },
  {
    id: 102,
    title: 'Téléphone X',
    description: 'Un téléphone',
    category: 'smartphones',
    brand: 'Marque',
    sku: 'SMA-001',
    price: 600,
    discountPercentage: 0,
    rating: 4.8,
    stock: 120,
    minimumOrderQuantity: 5,
    availabilityStatus: 'In Stock',
    weight: 200,
    thumbnail: '',
  },
  {
    id: 103,
    title: 'Casque audio',
    description: 'Un casque',
    category: 'smartphones',
    brand: 'Marque',
    sku: 'SMA-002',
    price: 100,
    discountPercentage: 20,
    rating: 3.9,
    stock: 0,
    minimumOrderQuantity: 10,
    availabilityStatus: 'Out of Stock',
    weight: 300,
    thumbnail: '',
  },
];

export const mockCategories = ['beauty', 'smartphones', 'laptops'];

/* ---------- JSONPlaceholder : commentaires ---------- */

export const mockComments: JsonPlaceholderComment[] = [
  {
    postId: 1,
    id: 1,
    name: 'un titre',
    email: 'a@exemple.fr',
    body: 'Service impeccable. Rien à redire.',
  },
  {
    postId: 1,
    id: 2,
    name: 'un autre titre',
    email: 'b@exemple.fr',
    body: 'Délais un peu longs. Mais correct.',
  },
  {
    postId: 2,
    id: 3,
    name: 'encore un titre',
    email: 'c@exemple.fr',
    body: 'Très satisfait de la prestation.',
  },
];

/* ---------- JSON Server : CRM ---------- */

export const mockPipelineStages: PipelineStage[] = [
  { id: 'prospection', label: 'Prospection', order: 1, probability: 10 },
  { id: 'qualification', label: 'Qualification', order: 2, probability: 25 },
  { id: 'proposition', label: 'Proposition', order: 3, probability: 50 },
  { id: 'negociation', label: 'Négociation', order: 4, probability: 75 },
  { id: 'gagnee', label: 'Gagnée', order: 5, probability: 100 },
  { id: 'perdue', label: 'Perdue', order: 6, probability: 0 },
];

export const mockOpportunities: Opportunity[] = [
  {
    id: 1,
    title: 'Refonte du portail',
    clientId: 1,
    stageId: 'negociation',
    amount: 40000,
    expectedCloseDate: '2026-09-30',
    owner: { id: 101, name: 'Camille Roussel' },
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-01T09:00:00.000Z',
  },
  {
    id: 2,
    title: 'Licences analytiques',
    clientId: 2,
    stageId: 'proposition',
    amount: 20000,
    expectedCloseDate: '2026-10-15',
    owner: { id: 102, name: 'Idriss Benali' },
    createdAt: '2026-06-10T09:00:00.000Z',
    updatedAt: '2026-06-10T09:00:00.000Z',
  },
  {
    id: 3,
    title: 'Contrat de maintenance',
    clientId: 3,
    stageId: 'gagnee',
    amount: 15000,
    expectedCloseDate: '2026-08-01',
    owner: { id: 101, name: 'Camille Roussel' },
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-08-01T09:00:00.000Z',
  },
];

export const mockClientProfiles: ClientProfile[] = [
  {
    id: 1,
    clientId: 1,
    status: 'Active',
    notes: 'Compte stratégique',
    updatedAt: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 2,
    clientId: 3,
    status: 'Churned',
    notes: '',
    updatedAt: '2026-07-01T09:00:00.000Z',
  },
];

/* ---------- JSON Server : ERP ---------- */

export const mockOrderMeta: OrderMeta[] = [
  {
    id: 1,
    orderId: 1,
    status: 'livree',
    placedAt: '2026-06-05T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
  {
    id: 2,
    orderId: 2,
    status: 'preparation',
    placedAt: '2026-07-12T10:00:00.000Z',
    updatedAt: '2026-07-12T10:00:00.000Z',
  },
  {
    id: 3,
    orderId: 3,
    status: 'annulee',
    placedAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-21T10:00:00.000Z',
  },
];

export const mockSuppliers: SupplierRecord[] = [
  {
    id: 1,
    name: 'Lumis Cosmétiques',
    contactName: 'Amélie Fournier',
    email: 'contact@lumis.fr',
    phone: '+33 1 45 22 87 10',
    country: 'France',
    categories: ['beauty'],
    leadTimeDays: 12,
    evaluations: [
      { id: 1, score: 5, comment: 'Parfait', createdAt: '2026-05-14T10:00:00.000Z' },
      { id: 2, score: 3, comment: '', createdAt: '2026-07-02T14:30:00.000Z' },
    ],
  },
  {
    id: 2,
    name: 'NordTech',
    contactName: 'Lars Andersen',
    email: 'sales@nordtech.se',
    phone: '+46 8 555 12 40',
    country: 'Suède',
    categories: ['smartphones', 'laptops'],
    leadTimeDays: 21,
    evaluations: [],
  },
];

export const mockStockMovements: StockMovement[] = [
  {
    id: 1,
    productId: 101,
    type: 'sortie',
    quantity: 10,
    reason: 'Commande client',
    orderId: 1,
    occurredAt: '2026-06-05T10:00:00.000Z',
  },
  {
    id: 2,
    productId: 102,
    type: 'entree',
    quantity: 50,
    reason: 'Réception fournisseur',
    occurredAt: '2026-06-20T10:00:00.000Z',
  },
  {
    id: 3,
    productId: 101,
    type: 'sortie',
    quantity: 5,
    reason: 'Commande client',
    orderId: 2,
    occurredAt: '2026-07-12T10:00:00.000Z',
  },
];