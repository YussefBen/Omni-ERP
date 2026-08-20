// Point d'entrée public du domaine ERP.
// Les autres domaines et les écrans importent depuis ici, jamais depuis les fichiers internes.

export {
  useProducts,
  useProduct,
  useProductCategories,
  useProductCatalog,
} from './hooks/useProducts';

export {
  useOrders,
  useOrder,
  useUpdateOrderStatus,
  getAllowedOrderTransitions,
  canChangeOrderStatus,
} from './hooks/useOrders';

export {
  useSuppliers,
  useSupplier,
  useEvaluateSupplier,
  getSupplierProducts,
  getSuppliersForProduct,
} from './hooks/useSuppliers';

export {
  useStockMovements,
  useCreateStockMovement,
  useLowStockAlerts,
  useStockRotation,
} from './hooks/useStock';

export {
  getLowStockAlerts,
  countCriticalAlerts,
  getAlertsValue,
  getStockRotation,
  getNetMovement,
  getTopMovingProducts,
} from './hooks/stockLogic';

export { getStockLevel, getFinalPrice, toProduct, toOrder, toSupplier } from './hooks/erpMappers';

export type * from './types';