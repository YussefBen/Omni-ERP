import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Tooltip.module.css";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: "top" | "bottom";
}

// Tooltip rendu via createPortal dans document.body, pour échapper à l'overflow/z-index du parent
export function Tooltip({ content, children, placement = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  // Positionnement basique au survol/focus ; le calcul précis avec mesure de la tooltip
  // (via useLayoutEffect, pour éviter le flash visuel d'un tooltip mal placé) est prévu en Étape 6
  const show = (): void => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: placement === "top" ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
    setVisible(true);
  };

  const hide = (): void => setVisible(false);

  return (
    <>
      <span
        ref={triggerRef}
        className={styles.trigger}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
      >
        {children}
      </span>
      {visible &&
        createPortal(
          <div
            role="tooltip"
            className={`${styles.tooltip} ${placement === "top" ? styles.top : styles.bottom}`}
            style={{ top: coords.top, left: coords.left }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
