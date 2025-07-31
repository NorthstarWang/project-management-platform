export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  teams: string[];
  created_at: number;
  updated_at: number;
  is_active: boolean;
  avatar_url?: string;
  preferences?: {
    theme?: string;
    notifications?: boolean;
    language?: string;
  };
}