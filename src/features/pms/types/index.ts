/* ---------- JSONPlaceholder ---------- */

// Post brut, sert de base à un projet
export interface JsonPlaceholderPost {
  id: number;
  userId: number;
  title: string;
  body: string;
}

// Todo brut, sert de base à une tâche
export interface JsonPlaceholderTodo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

/* ---------- Projet ---------- */

export type ProjectStatus = 'a_faire' | 'en_cours' | 'termine' | 'en_pause';

export interface Project {
  id: number;
  title: string;
  description: string;
  ownerId: number;
  status: ProjectStatus;
  dueDate: string;
  progress: number;
}

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus;
  page?: number;
  pageSize?: number;
}

export interface PaginatedProjects {
  items: Project[];
  total: number;
  page: number;
  pageSize: number;
}

// Surcharge d'un post JSONPlaceholder, ou projet 100% local
export interface ProjectOverride {
  id?: number;
  title?: string;
  description?: string;
  ownerId?: number;
  status?: ProjectStatus;
  dueDate?: string;
}

export interface CreateProjectPayload {
  title: string;
  description: string;
  ownerId: number;
  status?: ProjectStatus;
  dueDate?: string;
}

export interface UpdateProjectPayload {
  id: number;
  title?: string;
  description?: string;
  ownerId?: number;
  status?: ProjectStatus;
  dueDate?: string;
}

/* ---------- Tâche ---------- */

export type TaskStatus = 'a_faire' | 'en_cours' | 'termine';

export interface Task {
  id: number;
  projectId: number;
  title: string;
  status: TaskStatus;
  estimatedHours: number;
  assigneeId?: number;
}

export interface TaskFilters {
  projectId?: number;
  status?: TaskStatus;
  page?: number;
  pageSize?: number;
}

export interface PaginatedTasks {
  items: Task[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TaskOverride {
  id?: number;
  projectId?: number;
  title?: string;
  status?: TaskStatus;
  estimatedHours?: number;
  assigneeId?: number;
}

export interface CreateTaskPayload {
  projectId: number;
  title: string;
  status?: TaskStatus;
  estimatedHours?: number;
  assigneeId?: number;
}

export interface UpdateTaskPayload {
  id: number;
  projectId?: number;
  title?: string;
  status?: TaskStatus;
  estimatedHours?: number;
  assigneeId?: number;
}

/* ---------- Commentaires (100% local, JSONPlaceholder n'écrit rien pour de vrai) ---------- */

export interface CommentTarget {
  projectId?: number;
  taskId?: number;
}

export interface Comment {
  id: number;
  projectId?: number;
  taskId?: number;
  authorId: number;
  content: string;
  createdAt: string;
}

export interface CreateCommentPayload {
  projectId?: number;
  taskId?: number;
  authorId: number;
  content: string;
}

export interface UpdateCommentPayload {
  id: number;
  content: string;
}

/* ---------- KPI pour B ---------- */

export interface ProjectsKPI {
  total: number;
  active: number;
  completed: number;
  averageProgress: number;
  overdue: number;
}