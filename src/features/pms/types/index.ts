
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

// Enregistrement local : surcharge d'un post JSONPlaceholder, ou projet 100% local
export interface ProjectOverride {
  id?: number;
  title?: string;
  description?: string;
  ownerId?: number;
  status?: ProjectStatus;
  dueDate?: string;
}


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