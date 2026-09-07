import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useUpdateTask } from '../../hooks/useTaskMutations';
import { useTasks } from '../../hooks/useTasks';
import type { Task, TaskStatus } from '../../types';
import styles from './KanbanBoard.module.css';

const STATUS_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'a_faire', label: 'À faire' },
  { status: 'en_cours', label: 'En cours' },
  { status: 'termine', label: 'Terminé' },
];

export interface KanbanState {
  tasks: Task[];
}

export interface KanbanMoveAction {
  type: 'MOVE_TASK';
  taskId: number;
  toStatus: TaskStatus;
}

export type KanbanAction = KanbanMoveAction;

export type KanbanStateReducer = (state: KanbanState, action: KanbanAction) => KanbanState;

// Reducer par défaut : applique simplement le déplacement demandé, sans condition
function defaultKanbanReducer(state: KanbanState, action: KanbanAction): KanbanState {
  switch (action.type) {
    case 'MOVE_TASK':
      return {
        tasks: state.tasks.map((task) =>
          task.id === action.taskId ? { ...task, status: action.toStatus } : task,
        ),
      };
    default:
      return state;
  }
}

interface KanbanBoardProps {
  // Si fourni, n'affiche que les tâches de ce projet ; sinon toutes les tâches, tous projets confondus
  projectId?: number;
  // Vrai State Reducer Pattern : le parent peut intercepter/modifier/bloquer une transition
  // avant qu'elle s'applique (pas un simple useReducer interne). Reçoit l'état courant + l'action,
  // retourne le nouvel état. Si non fourni, defaultKanbanReducer s'applique tel quel.
  //
  // Exemple d'usage côté parent, pour interdire de repasser une tâche "terminée" en "à faire" :
  //
  // <KanbanBoard
  //   projectId={project.id}
  //   stateReducer={(state, action) => {
  //     if (action.type === 'MOVE_TASK') {
  //       const task = state.tasks.find((t) => t.id === action.taskId);
  //       if (task?.status === 'termine' && action.toStatus === 'a_faire') return state; // bloqué
  //     }
  //     return defaultKanbanReducer(state, action); // le parent délègue au comportement par défaut
  //   }}
  // />
  stateReducer?: KanbanStateReducer;
}

export function KanbanBoard({ projectId, stateReducer }: KanbanBoardProps) {
  const tasksQuery = useTasks(projectId, { pageSize: 1000 });
  const { mutate: updateTask } = useUpdateTask();

  const [state, setState] = useState<KanbanState>({ tasks: [] });

  // Resynchronise l'état local à chaque mise à jour serveur : succès de la mutation, mais aussi
  // rollback automatique du cache React Query si updateTask échoue (voir useUpdateTask).
  useEffect(() => {
    if (tasksQuery.data) {
      setState({ tasks: tasksQuery.data.items });
    }
  }, [tasksQuery.data]);

  // Point d'entrée unique de toute transition d'état : passe par stateReducer si fourni, sinon
  // par le reducer par défaut. C'est la différence avec un useReducer interne classique — ici,
  // le parent peut totalement intercepter, modifier ou annuler la transition avant application.
  function dispatch(action: KanbanAction) {
    const reducer = stateReducer ?? defaultKanbanReducer;
    setState((currentState) => reducer(currentState, action));
  }

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { a_faire: [], en_cours: [], termine: [] };
    state.tasks.forEach((task) => {
      map[task.status].push(task);
    });
    return map;
  }, [state.tasks]);

  function handleDrop(event: DragEvent<HTMLDivElement>, toStatus: TaskStatus) {
    event.preventDefault();
    const taskId = Number(event.dataTransfer.getData('text/plain'));
    if (Number.isNaN(taskId)) return;

    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.status === toStatus) return;

    // Optimiste côté board (instantané), puis persistance réelle via la mutation React Query
    // (qui a elle-même son propre optimistic update + rollback sur le cache global, voir plus haut)
    dispatch({ type: 'MOVE_TASK', taskId, toStatus });
    updateTask({ id: taskId, status: toStatus });
  }

  if (tasksQuery.isLoading) return <Spinner label="Chargement du tableau..." />;

  if (tasksQuery.isError) {
    return (
      <p role="alert" className={styles.error}>
        {tasksQuery.error?.message ?? 'Impossible de charger les tâches.'}
      </p>
    );
  }

  return (
    <div className={styles.board}>
      {STATUS_COLUMNS.map((column) => (
        <div
          key={column.status}
          className={styles.column}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, column.status)}
        >
          <h3 className={styles.columnTitle}>
            {column.label}{' '}
            <span className={styles.columnCount}>{tasksByStatus[column.status].length}</span>
          </h3>

          <div className={styles.columnBody}>
            {tasksByStatus[column.status].length === 0 && (
              <p className={styles.emptyColumn}>Aucune tâche</p>
            )}
            {tasksByStatus[column.status].map((task) => (
              <Card
                key={task.id}
                className={styles.taskCard}
                draggable
                onDragStart={(event) => event.dataTransfer.setData('text/plain', String(task.id))}
              >
                <p className={styles.taskTitle}>{task.title}</p>
                <span className={styles.taskHours}>{task.estimatedHours}h estimées</span>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
