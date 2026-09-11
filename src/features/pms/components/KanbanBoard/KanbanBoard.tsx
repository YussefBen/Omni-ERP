import { useMemo, useReducer, useState, type DragEvent, type FormEvent } from 'react';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useCreateTask, useDeleteTask, useUpdateTask } from '../../hooks/useTaskMutations';
import { useTasks } from '../../hooks/useTasks';
import { useEventTracking } from '@/features/monitoring';
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

// Injecte les tâches chargées depuis l'API dans le state du reducer
export interface KanbanSyncAction {
  type: 'SYNC_TASKS';
  tasks: Task[];
}

export type KanbanAction = KanbanMoveAction | KanbanSyncAction;

export type KanbanStateReducer = (state: KanbanState, action: KanbanAction) => KanbanState;

function defaultKanbanReducer(state: KanbanState, action: KanbanAction): KanbanState {
  switch (action.type) {
    case 'MOVE_TASK':
      return {
        tasks: state.tasks.map((task) =>
          task.id === action.taskId ? { ...task, status: action.toStatus } : task,
        ),
      };
    case 'SYNC_TASKS':
      return { tasks: action.tasks };
    default:
      return state;
  }
}

interface KanbanBoardProps {
  projectId?: number;
  // Permet au parent d'intercepter/bloquer une transition avant application
  stateReducer?: KanbanStateReducer;
}

export function KanbanBoard({ projectId, stateReducer }: KanbanBoardProps) {
  const tasksQuery = useTasks(projectId, { pageSize: 1000 });
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { mutate: deleteTask } = useDeleteTask();
  const { trackEvent } = useEventTracking();

  const [newTaskTitle, setNewTaskTitle] = useState('');

  // State Reducer Pattern : le parent peut fournir son propre reducer pour
  // intercepter/bloquer MOVE_TASK, mais SYNC_TASKS reste géré ici dans tous
  // les cas (sinon un reducer custom qui ne le connaît pas casserait le chargement)
  const reducer = useMemo(() => {
    if (!stateReducer) return defaultKanbanReducer;
    return (state: KanbanState, action: KanbanAction): KanbanState =>
      action.type === 'SYNC_TASKS'
        ? defaultKanbanReducer(state, action)
        : stateReducer(state, action);
  }, [stateReducer]);

  const [state, dispatch] = useReducer(reducer, { tasks: [] });

  // Resync pendant le rendu, pas dans un effet
  const [syncedData, setSyncedData] = useState(tasksQuery.data);
  if (tasksQuery.data !== syncedData) {
    setSyncedData(tasksQuery.data);
    if (tasksQuery.data) {
      dispatch({ type: 'SYNC_TASKS', tasks: tasksQuery.data.items });
    }
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

    dispatch({ type: 'MOVE_TASK', taskId, toStatus });
    updateTask({ id: taskId, status: toStatus });
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || !projectId) return;
    createTask({ projectId, title });
    trackEvent('task_created', { projectId });
    setNewTaskTitle('');
  }

  function handleDeleteTask(taskId: number) {
    if (!window.confirm('Supprimer cette tâche ?')) return;
    deleteTask(taskId);
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
                <div className={styles.taskHeader}>
                  <p className={styles.taskTitle}>{task.title}</p>
                  <button
                    type="button"
                    className={styles.deleteTask}
                    onClick={() => handleDeleteTask(task.id)}
                    aria-label={`Supprimer la tâche ${task.title}`}
                  >
                    ×
                  </button>
                </div>
                <span className={styles.taskHours}>{task.estimatedHours}h estimées</span>
              </Card>
            ))}

            {column.status === 'a_faire' && projectId && (
              <form className={styles.addTaskForm} onSubmit={handleAddTask}>
                <input
                  type="text"
                  className={styles.addTaskInput}
                  placeholder="Nouvelle tâche..."
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  disabled={isCreating}
                  aria-label="Titre de la nouvelle tâche"
                />
              </form>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}