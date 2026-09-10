// Commentaires sur un projet ou une tâche

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createComment,
  deleteComment,
  fetchComments,
  updateComment,
} from '../services/pmsService';
import { pmsKeys } from './pmsKeys';
import type {
  Comment,
  CommentTarget,
  CreateCommentPayload,
  UpdateCommentPayload,
} from '../types';

interface UseCommentsResult {
  data: Comment[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// target : projectId, taskId, ou les deux
export function useComments(target: CommentTarget): UseCommentsResult {
  const query = useQuery({
    queryKey: pmsKeys.comments(target),
    queryFn: () => fetchComments(target),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

// Nouveau commentaire
export function useCreateComment() {
  const queryClient = useQueryClient();

  const mutation = useMutation<Comment, Error, CreateCommentPayload>({
    mutationFn: createComment,
    onSuccess: (_data, payload) => {
      void queryClient.invalidateQueries({
        queryKey: pmsKeys.comments({ projectId: payload.projectId, taskId: payload.taskId }),
      });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// Modifier le texte d'un commentaire
export function useUpdateComment() {
  const queryClient = useQueryClient();

  const mutation = useMutation<Comment, Error, UpdateCommentPayload>({
    mutationFn: updateComment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pmsKeys.all });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// Supprimer un commentaire
export function useDeleteComment() {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, number>({
    mutationFn: deleteComment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pmsKeys.all });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}