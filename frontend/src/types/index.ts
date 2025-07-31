export interface Task {
  id: string;
  title: string;
  description: string;
  list_id: string;
  assignee_id?: string;
  assignee_name?: string;
  priority: string;
  status: string;
  due_date?: string;
  position: number;
  created_at: string;
  comments_count?: number;
  attachments_count?: number;
  project_id?: string;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string;
}

export interface List {
  id: string;
  name: string;
  board_id: string;
  position: number;
  tasks?: Task[];
}

export interface Board {
  id: string;
  name: string;
  description: string;
  project_id: string;
  lists?: List[];
  icon?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  boards?: Board[];
  created_at: string;
}

export * from './custom-fields';
export * from './dependency';
export * from './time-tracking';