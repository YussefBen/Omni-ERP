import { useMemo, useState, type DragEvent } from 'react';
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
  projectId?: number;
  // Permet au parent d'intercepter/bloquer une transition avant application
  stateReducer?: KanbanStateReducer;
}

export function KanbanBoard({ projectId, stateReducer }: KanbanBoardProps) {
  const tasksQuery = useTasks(projectId, { pageSize: 1000 });
  const { mutate: updateTask } = useUpdateTask();

  const [state, setState] = useState<KanbanState>({ tasks: [] });

  // Resync pendant le rendu, pas dans un effet
  const [syncedData, setSyncedData] = useState(tasksQuery.data);
  if (tasksQuery.data !== syncedData) {
    setSyncedData(tasksQuery.data);
    if (tasksQuery.data) {
      setState({ tasks: tasksQuery.data.items });
    }
  }

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