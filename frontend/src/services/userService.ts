import apiClient from "./apiClient";
import { User } from "@/types/user";

export interface UserFilters {
  role?: string;
  team_id?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

class UserService {
  async getUsers(filters?: UserFilters): Promise<User[]> {
    try {
      const params: Record<string, string> = {};
      if (filters) {
        if (filters.role) params.role = filters.role;
        if (filters.team_id) params.team_id = filters.team_id;
        if (filters.search) params.search = filters.search;
        if (filters.page !== undefined) params.page = filters.page.toString();
        if (filters.per_page !== undefined) params.per_page = filters.per_page.toString();
      }
      const response = await apiClient.get("/api/users", params);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch users:", error);
      throw error;
    }
  }

  async getUser(userId: string): Promise<User> {
    try {
      const response = await apiClient.get(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user:", error);
      throw error;
    }
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put(`/api/users/${userId}`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to update user:", error);
      throw error;
    }
  }

  async getUsersByTeam(teamId: string): Promise<User[]> {
    try {
      const response = await apiClient.get(`/api/teams/${teamId}/members`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      throw error;
    }
  }

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    try {
      const params: Record<string, string> = { 
        q: query, 
        limit: limit.toString() 
      };
      const response = await apiClient.get("/api/users/search", params);
      return response.data;
    } catch (error) {
      console.error("Failed to search users:", error);
      throw error;
    }
  }
}

const userService = new UserService();
export default userService;