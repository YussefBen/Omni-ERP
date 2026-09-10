import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./Select.module.css";

interface SelectContextValue {
  selectedValue: string | null;
  selectedLabel: ReactNode;
  setSelected: (value: string, label: ReactNode) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext(componentName: string): SelectContextValue {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error(`<Select.${componentName}> doit être utilisé à l'intérieur de <Select>`);
  }
  return context;
}

interface SelectProps {
  children: ReactNode;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

// Racine du compound component : porte l'état d'ouverture et la valeur sélectionnée
function Select({ children, defaultValue, onChange }: SelectProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(defaultValue ?? null);
  const [selectedLabel, setSelectedLabel] = useState<ReactNode>(null);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const setSelected = (value: string, label: ReactNode): void => {
    setSelectedValue(value);
    setSelectedLabel(label);
    setIsOpen(false);
    onChange?.(value);
  };

  // Ferme le menu déroulant au clic en dehors du composant
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider
      value={{ selectedValue, selectedLabel, setSelected, isOpen, setIsOpen }}
    >
      <div className={styles.select} ref={rootRef}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  placeholder?: string;
}

function SelectTrigger({ placeholder = "Sélectionner..." }: SelectTriggerProps) {
  const { selectedLabel, isOpen, setIsOpen } = useSelectContext("Trigger");

  return (
    <button
      type="button"
      className={styles.trigger}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      onClick={() => setIsOpen(!isOpen)}
    >
      <span className={styles.triggerLabel}>{selectedLabel ?? placeholder}</span>
      <span className={styles.chevron} aria-hidden="true">
        {isOpen ? "▲" : "▼"}
      </span>
    </button>
  );
}

function SelectOptions({ children }: { children: ReactNode }) {
  const { isOpen } = useSelectContext("Options");
  if (!isOpen) return null;

  return (
    <ul className={styles.options} role="listbox">
      {children}
    </ul>
  );
}

interface SelectOptionProps {
  value: string;
  children: ReactNode;
}

function SelectOption({ value, children }: SelectOptionProps) {
  const { selectedValue, setSelected } = useSelectContext("Option");
  const isSelected = selectedValue === value;

  return (
    <li
      role="option"
      aria-selected={isSelected}
      className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`}
      onClick={() => setSelected(value, children)}
    >
      {children}
    </li>
  );
}

// Attache les sous-composants sur le composant racine : usage <Select.Trigger>, <Select.Options>, etc.
Select.Trigger = SelectTrigger;
Select.Options = SelectOptions;
Select.Option = SelectOption;

export { Select };

/*
Exemple d'usage :

<Select defaultValue="todo" onChange={(value) => console.log(value)}>
  <Select.Trigger placeholder="Statut..." />
  <Select.Options>
    <Select.Option value="todo">À faire</Select.Option>
    <Select.Option value="in_progress">En cours</Select.Option>
    <Select.Option value="done">Terminé</Select.Option>
  </Select.Options>
</Select>
*/
