import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {title && <h2 className={styles.title}>{title}</h2>}
        <button className={styles.closeButton} onClick={onClose} aria-label="Fermer">&times;</button>
        {children}
      </div>
    </div>,
    document.body,
  );
}