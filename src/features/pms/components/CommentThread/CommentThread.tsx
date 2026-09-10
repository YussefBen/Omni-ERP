import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '../../hooks/useComments';
import type { Comment, CommentTarget } from '../../types';
import styles from './CommentThread.module.css';

interface CommentThreadProps {
  target: CommentTarget;
  // Id de l'utilisateur connecté : sert à poster et à savoir quels commentaires sont éditables
  authorId: number;
  // Résout un id en nom affichable ; par défaut affiche "Auteur #id"
  resolveAuthorName?: (authorId: number) => string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CommentThread({ target, authorId, resolveAuthorName }: CommentThreadProps) {
  const { data: comments, isLoading, isError, error } = useComments(target);
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');

  function authorLabel(id: number): string {
    return resolveAuthorName?.(id) ?? `Auteur #${id}`;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    createComment.mutate(
      { ...target, authorId, content: content.trim() },
      { onSuccess: () => setContent('') },
    );
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditingContent(comment.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingContent('');
  }

  function saveEdit(commentId: number) {
    if (!editingContent.trim()) return;
    updateComment.mutate(
      { id: commentId, content: editingContent.trim() },
      { onSuccess: () => cancelEdit() },
    );
  }

  // Affichage chronologique : du plus ancien au plus récent
  const sortedComments = [...(comments ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className={styles.thread}>
      <h3 className={styles.title}>Commentaires</h3>

      {isLoading && <Spinner label="Chargement des commentaires..." />}
      {isError && (
        <p role="alert" className={styles.error}>
          {error?.message ?? 'Impossible de charger les commentaires.'}
        </p>
      )}

      {!isLoading && !isError && (
        <ul className={styles.list}>
          {sortedComments.length === 0 && (
            <p className={styles.empty}>Aucun commentaire pour l&apos;instant.</p>
          )}
          {sortedComments.map((comment) => (
            <li key={comment.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <strong>{authorLabel(comment.authorId)}</strong>
                <span className={styles.date}>{formatDate(comment.createdAt)}</span>
              </div>

              {editingId === comment.id ? (
                <div className={styles.editBox}>
                  <textarea
                    className={styles.editTextarea}
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    rows={2}
                  />
                  <div className={styles.editActions}>
                    <Button onClick={() => saveEdit(comment.id)} disabled={updateComment.isPending}>
                      Enregistrer
                    </Button>
                    <Button variant="secondary" onClick={cancelEdit}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={styles.content}>{comment.content}</p>
                  {comment.authorId === authorId && (
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => startEdit(comment)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => deleteComment.mutate(comment.id)}
                        disabled={deleteComment.isPending}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <textarea
          className={styles.textarea}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Écrire un commentaire..."
          rows={2}
        />
        {createComment.isError && (
          <p className={styles.error} role="alert">
            {createComment.error?.message ?? "Impossible d'envoyer le commentaire."}
          </p>
        )}
        <Button type="submit" disabled={createComment.isPending || !content.trim()}>
          {createComment.isPending ? 'Envoi...' : 'Commenter'}
        </Button>
      </form>
    </div>
  );
}
