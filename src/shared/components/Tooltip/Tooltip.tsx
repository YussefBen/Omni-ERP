import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Tooltip.module.css";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: "top" | "bottom";
}

// Distance entre l'élément déclencheur et la bulle.
const GAP = 8;
// Marge minimale conservée avec les bords de la fenêtre.
const VIEWPORT_MARGIN = 8;

interface Position {
  top: number;
  left: number;
  // Le placement demandé n'est pas toujours tenable : une bulle en haut
  // d'écran doit basculer en dessous. On conserve le placement réellement
  // appliqué pour que la flèche pointe du bon côté.
  resolvedPlacement: "top" | "bottom";
}

// Tooltip rendu via createPortal dans document.body, pour échapper à l'overflow
// et au z-index du parent.
export function Tooltip({ content, children, placement = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const show = useCallback((): void => setVisible(true), []);
  const hide = useCallback((): void => {
    setVisible(false);
    // La position est oubliée à la fermeture : au prochain affichage,
    // elle sera recalculée depuis zéro plutôt que réutilisée périmée.
    setPosition(null);
  }, []);

  // useLayoutEffect plutôt que useEffect : le calcul a besoin des dimensions
  // réelles de la bulle, donc elle doit être dans le document. Mais avec
  // useEffect, le navigateur peindrait l'écran entre l'insertion et le
  // repositionnement — la bulle apparaîtrait brièvement au mauvais endroit.
  //
  // useLayoutEffect s'exécute après la mise en page mais avant la peinture :
  // l'utilisateur ne voit que la position finale.
  useLayoutEffect(() => {
    if (!visible) return;

    const trigger = triggerRef.current?.getBoundingClientRect();
    const tooltip = tooltipRef.current?.getBoundingClientRect();
    if (!trigger || !tooltip) return;

    // Placement demandé, corrigé si la bulle sortirait de l'écran.
    let resolved = placement;
    if (placement === "top" && trigger.top - tooltip.height - GAP < VIEWPORT_MARGIN) {
      resolved = "bottom";
    } else if (
      placement === "bottom" &&
      trigger.bottom + tooltip.height + GAP > window.innerHeight - VIEWPORT_MARGIN
    ) {
      resolved = "top";
    }

    const top =
      resolved === "top" ? trigger.top - tooltip.height - GAP : trigger.bottom + GAP;

    // Centrée sur le déclencheur, puis ramenée dans la fenêtre si elle
    // déborde à gauche ou à droite.
    const centered = trigger.left + trigger.width / 2 - tooltip.width / 2;
    const maxLeft = window.innerWidth - tooltip.width - VIEWPORT_MARGIN;
    const left = Math.min(Math.max(centered, VIEWPORT_MARGIN), Math.max(maxLeft, VIEWPORT_MARGIN));

    setPosition({ top, left, resolvedPlacement: resolved });
  }, [visible, placement, content]);

  const resolvedPlacement = position?.resolvedPlacement ?? placement;

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
            ref={tooltipRef}
            role="tooltip"
            className={`${styles.tooltip} ${
              resolvedPlacement === "top" ? styles.top : styles.bottom
            }`}
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              // Invisible tant que la position n'est pas calculée, mais
              // présente dans le document : sans cela, sa taille ne pourrait
              // pas être mesurée. display:none ne conviendrait pas, un
              // élément masqué ainsi n'a aucune dimension.
              visibility: position ? "visible" : "hidden",
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}