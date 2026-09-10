import { createContext, useContext, useState, type ReactNode } from "react";
import styles from "./Tabs.module.css";

interface TabsContextValue {
  activeValue: string;
  setActiveValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(componentName: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`<Tabs.${componentName}> doit être utilisé à l'intérieur de <Tabs>`);
  }
  return context;
}

interface TabsProps {
  children: ReactNode;
  defaultValue: string;
  // value/onChange permettent un usage en mode contrôlé si un écran a besoin de piloter l'onglet actif
  value?: string;
  onChange?: (value: string) => void;
}

// Racine du compound component : porte l'état de l'onglet actif et le partage via Context
function Tabs({ children, defaultValue, value, onChange }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : internalValue;

  const setActiveValue = (next: string): void => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ activeValue, setActiveValue }}>
      <div className={styles.tabs}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ children }: { children: ReactNode }) {
  return (
    <div className={styles.list} role="tablist">
      {children}
    </div>
  );
}

interface TabsTabProps {
  value: string;
  children: ReactNode;
}

function TabsTab({ value, children }: TabsTabProps) {
  const { activeValue, setActiveValue } = useTabsContext("Tab");
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
      onClick={() => setActiveValue(value)}
    >
      {children}
    </button>
  );
}

function TabsPanels({ children }: { children: ReactNode }) {
  return <div className={styles.panels}>{children}</div>;
}

interface TabsPanelProps {
  value: string;
  children: ReactNode;
}

function TabsPanel({ value, children }: TabsPanelProps) {
  const { activeValue } = useTabsContext("Panel");
  if (activeValue !== value) return null;

  return (
    <div className={styles.panel} role="tabpanel">
      {children}
    </div>
  );
}

// Attache les sous-composants sur le composant racine : usage <Tabs.List>, <Tabs.Tab>, etc.
Tabs.List = TabsList;
Tabs.Tab = TabsTab;
Tabs.Panels = TabsPanels;
Tabs.Panel = TabsPanel;

export { Tabs };

/*
Exemple d'usage :

<Tabs defaultValue="projects">
  <Tabs.List>
    <Tabs.Tab value="projects">Projets</Tabs.Tab>
    <Tabs.Tab value="tasks">Tâches</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panels>
    <Tabs.Panel value="projects">Contenu projets...</Tabs.Panel>
    <Tabs.Panel value="tasks">Contenu tâches...</Tabs.Panel>
  </Tabs.Panels>
</Tabs>
*/
