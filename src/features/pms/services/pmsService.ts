// Service PMS : lecture depuis JSONPlaceholder & écritures en JSON Server
import axios from 'axios';
import { API_CONFIG } from '@/shared/config/api';
import { DEFAULT_PAGE_SIZE } from '@/shared/config/constants';
import {
  deriveDueDate,
  deriveEstimatedHours,
  deriveProjectIdForTask,
  deriveProjectStatus,
  deriveTaskStatus,
} from '../hooks/pmsLogic';
import { getProjectProgress } from '../hooks/projectProgress';
import type {
  Comment,
  CommentTarget,
  CreateCommentPayload,
  CreateProjectPayload,
  CreateTaskPayload,
  JsonPlaceholderPost,
  JsonPlaceholderTodo,
  PaginatedProjects,
  PaginatedTasks,
  Project,
  ProjectFilters,
  ProjectOverride,
  Task,
  TaskFilters,
  TaskOverride,
  UpdateCommentPayload,
  UpdateProjectPayload,
  UpdateTaskPayload,
} from '../types';

const jsonPlaceholderApi = axios.create({ baseURL: API_CONFIG.jsonPlaceholder, timeout: 10000 });
const localApi = axios.create({ baseURL: API_CONFIG.jsonServer, timeout: 10000 });

// JSONPlaceholder a toujours 100 posts et 200 todos
const EXTERNAL_PROJECT_COUNT = 100;
const EXTERNAL_TASK_COUNT = 200;



async function fetchExternalProjects(): Promise<JsonPlaceholderPost[]> {
  const { data } = await jsonPlaceholderApi.get<JsonPlaceholderPost[]>('/posts');
  return data;
}

// Surcharge locale : même id qu'un post = override, id > 100 = projet 100% local
async function fetchProjectOverrides(): Promise<ProjectOverride[]> {
  const { data } = await localApi.get<ProjectOverride[]>('/projects');
  return data;
}

function mergeProjects(
  externalPosts: JsonPlaceholderPost[],
  overrides: ProjectOverride[],
): Project[] {
  const overrideMap = new Map(
    overrides.filter((o) => o.id !== undefined).map((o) => [o.id as number, o]),
  );
  const externalIds = new Set(externalPosts.map((p) => p.id));

  const fromExternal: Project[] = externalPosts.map((post) => {
    const override = overrideMap.get(post.id);
    return {
      id: post.id,
      title: override?.title ?? post.title,
      description: override?.description ?? post.body,
      ownerId: override?.ownerId ?? post.userId,
      status: override?.status ?? deriveProjectStatus(post.id),
      dueDate: override?.dueDate ?? deriveDueDate(post.id),
      progress: 0,
    };
  });

  // Projets créés localement, sans post JSONPlaceholder derrière
  const localOnly: Project[] = overrides
    .filter((o) => o.id !== undefined && !externalIds.has(o.id as number))
    .map((o) => ({
      id: o.id as number,
      title: o.title ?? 'Sans titre',
      description: o.description ?? '',
      ownerId: o.ownerId ?? 0,
      status: o.status ?? 'a_faire',
      dueDate: o.dueDate ?? deriveDueDate(o.id as number),
      progress: 0,
    }));

  return [...fromExternal, ...localOnly];
}

export async function fetchProjects(filters: ProjectFilters = {}): Promise<PaginatedProjects> {
  const [externalPosts, overrides, allTasks] = await Promise.all([
    fetchExternalProjects(),
    fetchProjectOverrides(),
    fetchMergedTasks(),
  ]);

  let projects = mergeProjects(externalPosts, overrides).map((p) => ({
    ...p,
    progress: getProjectProgress(p.id, allTasks),
  }));

  if (filters.search) {
    const term = filters.search.toLowerCase();
    projects = projects.filter((p) => p.title.toLowerCase().includes(term));
  }

  if (filters.status) {
    projects = projects.filter((p) => p.status === filters.status);
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const start = (page - 1) * pageSize;

  return {
    items: projects.slice(start, start + pageSize),
    total: projects.length,
    page,
    pageSize,
  };
}

// Toute la liste, sans pagination, pour les KPI et le calcul de progression
async function fetchAllProjects(): Promise<Project[]> {
  const [externalPosts, overrides, allTasks] = await Promise.all([
    fetchExternalProjects(),
    fetchProjectOverrides(),
    fetchMergedTasks(),
  ]);
  return mergeProjects(externalPosts, overrides).map((p) => ({
    ...p,
    progress: getProjectProgress(p.id, allTasks),
  }));
}

// Un seul projet pour un écran de détail
export async function fetchProjectById(id: number): Promise<Project> {
  const projects = await fetchAllProjects();
  const project = projects.find((p) => p.id === id);
  if (!project) throw new Error(`Projet ${id} introuvable`);
  return project;
}



// Prochain id local, toujours au-dessus des 100 posts JSONPlaceholder (pas de collision)
async function nextLocalProjectId(): Promise<number> {
  const overrides = await fetchProjectOverrides();
  const maxId = overrides.reduce((max, o) => Math.max(max, o.id ?? 0), EXTERNAL_PROJECT_COUNT);
  return maxId + 1;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const id = await nextLocalProjectId();
  const { data } = await localApi.post<ProjectOverride>('/projects', { id, ...payload });
  return {
    id,
    title: data.title ?? payload.title,
    description: data.description ?? payload.description,
    ownerId: data.ownerId ?? payload.ownerId,
    status: data.status ?? payload.status ?? 'a_faire',
    dueDate: data.dueDate ?? payload.dueDate ?? deriveDueDate(id),
    progress: 0,
  };
}

// Upsert : PATCH si une surcharge existe déjà pour cet id, sinon POST
export async function updateProject(payload: UpdateProjectPayload): Promise<ProjectOverride> {
  const { id, ...patch } = payload;
  const overrides = await fetchProjectOverrides();
  const existing = overrides.find((o) => o.id === id);

  if (existing) {
    const { data } = await localApi.patch<ProjectOverride>(`/projects/${id}`, patch);
    return data;
  }
  const { data } = await localApi.post<ProjectOverride>('/projects', { id, ...patch });
  return data;
}

// Suppression réelle seulement pour les projets 100% locaux
export async function deleteProject(id: number): Promise<void> {
  if (id <= EXTERNAL_PROJECT_COUNT) {
    throw new Error(
      'Ce projet vient de JSONPlaceholder, source en lecture seule : suppression impossible.',
    );
  }
  await localApi.delete(`/projects/${id}`);
}



async function fetchExternalTasks(): Promise<JsonPlaceholderTodo[]> {
  const { data } = await jsonPlaceholderApi.get<JsonPlaceholderTodo[]>('/todos');
  return data;
}

async function fetchTaskOverrides(): Promise<TaskOverride[]> {
  const { data } = await localApi.get<TaskOverride[]>('/tasks');
  return data;
}

function mergeTasks(externalTodos: JsonPlaceholderTodo[], overrides: TaskOverride[]): Task[] {
  const overrideMap = new Map(
    overrides.filter((o) => o.id !== undefined).map((o) => [o.id as number, o]),
  );
  const externalIds = new Set(externalTodos.map((t) => t.id));

  const fromExternal: Task[] = externalTodos.map((todo) => {
    const override = overrideMap.get(todo.id);
    return {
      id: todo.id,
      projectId: override?.projectId ?? deriveProjectIdForTask(todo.id, EXTERNAL_PROJECT_COUNT),
      title: override?.title ?? todo.title,
      status: override?.status ?? (todo.completed ? 'termine' : deriveTaskStatus(todo.id)),
      estimatedHours: override?.estimatedHours ?? deriveEstimatedHours(todo.id),
      assigneeId: override?.assigneeId,
    };
  });

  // Tâches créées localement, sans todo JSONPlaceholder derrière
  const localOnly: Task[] = overrides
    .filter((o) => o.id !== undefined && !externalIds.has(o.id as number))
    .map((o) => ({
      id: o.id as number,
      projectId: o.projectId ?? 1,
      title: o.title ?? 'Sans titre',
      status: o.status ?? 'a_faire',
      estimatedHours: o.estimatedHours ?? 0,
      assigneeId: o.assigneeId,
    }));

  return [...fromExternal, ...localOnly];
}

// Utilisé aussi par fetchProjects() pour calculer la progression
async function fetchMergedTasks(): Promise<Task[]> {
  const [externalTodos, overrides] = await Promise.all([
    fetchExternalTasks(),
    fetchTaskOverrides(),
  ]);
  return mergeTasks(externalTodos, overrides);
}

export async function fetchTasks(filters: TaskFilters = {}): Promise<PaginatedTasks> {
  let tasks = await fetchMergedTasks();

  if (filters.projectId !== undefined) {
    tasks = tasks.filter((t) => t.projectId === filters.projectId);
  }
  if (filters.status) {
    tasks = tasks.filter((t) => t.status === filters.status);
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const start = (page - 1) * pageSize;

  return {
    items: tasks.slice(start, start + pageSize),
    total: tasks.length,
    page,
    pageSize,
  };
}

// Une seule tâche pour un écran de détail
export async function fetchTaskById(id: number): Promise<Task> {
  const tasks = await fetchMergedTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) throw new Error(`Tâche ${id} introuvable`);
  return task;
}



async function nextLocalTaskId(): Promise<number> {
  const overrides = await fetchTaskOverrides();
  const maxId = overrides.reduce((max, o) => Math.max(max, o.id ?? 0), EXTERNAL_TASK_COUNT);
  return maxId + 1;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const id = await nextLocalTaskId();
  const { data } = await localApi.post<TaskOverride>('/tasks', { id, ...payload });
  return {
    id,
    projectId: data.projectId ?? payload.projectId,
    title: data.title ?? payload.title,
    status: data.status ?? payload.status ?? 'a_faire',
    estimatedHours: data.estimatedHours ?? payload.estimatedHours ?? 0,
    assigneeId: data.assigneeId ?? payload.assigneeId,
  };
}

export async function updateTask(payload: UpdateTaskPayload): Promise<TaskOverride> {
  const { id, ...patch } = payload;
  const overrides = await fetchTaskOverrides();
  const existing = overrides.find((o) => o.id === id);

  if (existing) {
    const { data } = await localApi.patch<TaskOverride>(`/tasks/${id}`, patch);
    return data;
  }
  const { data } = await localApi.post<TaskOverride>('/tasks', { id, ...patch });
  return data;
}

// Suppression réelle seulement pour les tâches 100% locales
export async function deleteTask(id: number): Promise<void> {
  if (id <= EXTERNAL_TASK_COUNT) {
    throw new Error(
      'Cette tâche vient de JSONPlaceholder, source en lecture seule : suppression impossible.',
    );
  }
  await localApi.delete(`/tasks/${id}`);
}



export async function fetchComments(target: CommentTarget): Promise<Comment[]> {
  const params: Record<string, number> = {};
  if (target.projectId !== undefined) params.projectId = target.projectId;
  if (target.taskId !== undefined) params.taskId = target.taskId;
  const { data } = await localApi.get<Comment[]>('/comments', { params });
  return data;
}

export async function createComment(payload: CreateCommentPayload): Promise<Comment> {
  const { data } = await localApi.post<Comment>('/comments', {
    ...payload,
    createdAt: new Date().toISOString(),
  });
  return data;
}

export async function updateComment({ id, content }: UpdateCommentPayload): Promise<Comment> {
  const { data } = await localApi.patch<Comment>(`/comments/${id}`, { content });
  return data;
}

export async function deleteComment(id: number): Promise<void> {
  await localApi.delete(`/comments/${id}`);
}



export { fetchAllProjects };