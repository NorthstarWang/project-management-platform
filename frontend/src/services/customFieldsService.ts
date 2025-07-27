import apiClient, { ApiResponse } from './apiClient';
import {
  CustomFieldDefinition,
  FieldTemplate,
  CustomFieldFilter,
  EntityType,
  BulkFieldValueUpdate,
  CustomFieldStats,
  FieldSearchQuery,
} from '@/types/custom-fields';

class CustomFieldsService {
  private baseEndpoint = '/api/custom-fields';

  // Field Definition Methods
  async createField(fieldData: any): Promise<CustomFieldDefinition> {
    const response = await apiClient.post<CustomFieldDefinition>(this.baseEndpoint, fieldData);
    return response.data;
  }

  async getFields(entityType: EntityType, entityId?: string, includeArchived = false): Promise<any> {
    const params: Record<string, string> = {
      entity_type: entityType,
      include_archived: includeArchived.toString()
    };
    if (entityId) {
      params.entity_id = entityId;
    }
    const response = await apiClient.get<any>(this.baseEndpoint, params);
    return response.data;
  }

  async getField(fieldId: string): Promise<CustomFieldDefinition> {
    const response = await apiClient.get<CustomFieldDefinition>(`${this.baseEndpoint}/${fieldId}`);
    return response.data;
  }

  async updateField(fieldId: string, updates: any): Promise<CustomFieldDefinition> {
    const response = await apiClient.put<CustomFieldDefinition>(`${this.baseEndpoint}/${fieldId}`, updates);
    return response.data;
  }

  async deleteField(fieldId: string, deleteValues = false): Promise<any> {
    const params = { delete_values: deleteValues.toString() };
    const response = await apiClient.delete<any>(`${this.baseEndpoint}/${fieldId}`, params);
    return response.data;
  }

  // Field Value Methods
  async setFieldValues(bulkUpdate: BulkFieldValueUpdate): Promise<any> {
    const response = await apiClient.post<any>(`${this.baseEndpoint}/values`, bulkUpdate);
    return response.data;
  }

  async getFieldValues(entityType: EntityType, entityId: string): Promise<any> {
    const params = {
      entity_type: entityType,
      entity_id: entityId
    };
    const response = await apiClient.get<any>(`${this.baseEndpoint}/values`, params);
    return response.data;
  }

  async bulkFieldOperation(operation: any): Promise<any> {
    const response = await apiClient.post<any>(`${this.baseEndpoint}/values/bulk`, operation);
    return response.data;
  }

  // Template Methods
  async createTemplate(templateData: any): Promise<FieldTemplate> {
    const response = await apiClient.post<FieldTemplate>(`${this.baseEndpoint}/templates`, templateData);
    return response.data;
  }

  async getTemplates(entityType: EntityType, category?: string, isPublic?: boolean): Promise<FieldTemplate[]> {
    const params: Record<string, string> = {
      entity_type: entityType
    };
    if (category) params.category = category;
    if (isPublic !== undefined) params.is_public = isPublic.toString();
    
    const response = await apiClient.get<FieldTemplate[]>(`${this.baseEndpoint}/templates`, params);
    return response.data;
  }

  async getTemplate(templateId: string): Promise<FieldTemplate> {
    const response = await apiClient.get<FieldTemplate>(`${this.baseEndpoint}/templates/${templateId}`);
    return response.data;
  }

  async applyTemplate(templateId: string, entityType: EntityType, entityId?: string): Promise<any> {
    const body: any = { entity_type: entityType };
    if (entityId) body.entity_id = entityId;
    
    const response = await apiClient.post<any>(`${this.baseEndpoint}/templates/${templateId}/apply`, body);
    return response.data;
  }

  // Filter Methods
  async createFilter(filterData: any): Promise<CustomFieldFilter> {
    const response = await apiClient.post<CustomFieldFilter>(`${this.baseEndpoint}/filters`, filterData);
    return response.data;
  }

  async getFilters(entityType: EntityType, isPublic?: boolean): Promise<CustomFieldFilter[]> {
    const params: Record<string, string> = {
      entity_type: entityType
    };
    if (isPublic !== undefined) params.is_public = isPublic.toString();
    
    const response = await apiClient.get<CustomFieldFilter[]>(`${this.baseEndpoint}/filters`, params);
    return response.data;
  }

  async getFilter(filterId: string): Promise<CustomFieldFilter> {
    const response = await apiClient.get<CustomFieldFilter>(`${this.baseEndpoint}/filters/${filterId}`);
    return response.data;
  }

  async applyFilter(filterId: string, additionalFilters?: any, page = 1, perPage = 50): Promise<any> {
    const params = {
      page: page.toString(),
      per_page: perPage.toString()
    };
    const body = additionalFilters || {};
    
    const response = await apiClient.post<any>(`${this.baseEndpoint}/filters/${filterId}/apply`, body, params);
    return response.data;
  }

  async deleteFilter(filterId: string): Promise<any> {
    const response = await apiClient.delete<any>(`${this.baseEndpoint}/filters/${filterId}`);
    return response.data;
  }

  // Import/Export Methods
  async importCSV(file: File, entityType: EntityType, mapping: any, options: any): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const params = {
      entity_type: entityType,
      mapping: JSON.stringify(mapping),
      update_existing: options.update_existing?.toString() || 'true',
      skip_errors: options.skip_errors?.toString() || 'false'
    };

    // We need to manually make the request since apiClient doesn't support FormData
    const url = new URL(`${this.baseEndpoint}/import`, process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    if (apiClient.getSessionId()) {
      url.searchParams.append('session_id', apiClient.getSessionId()!);
    }

    const headers: any = {};
    const userIdHeader = (apiClient as any).defaultHeaders['x-user-id'];
    if (userIdHeader) {
      headers['x-user-id'] = userIdHeader;
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Import failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async exportData(exportRequest: any): Promise<Blob> {
    const response = await apiClient.post(`${this.baseEndpoint}/export`, exportRequest);
    
    // For export, we need to get the raw response
    const url = new URL(`${this.baseEndpoint}/export`, process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
    if (apiClient.getSessionId()) {
      url.searchParams.append('session_id', apiClient.getSessionId()!);
    }

    const headers: any = {
      'Content-Type': 'application/json'
    };
    const userIdHeader = (apiClient as any).defaultHeaders['x-user-id'];
    if (userIdHeader) {
      headers['x-user-id'] = userIdHeader;
    }

    const rawResponse = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(exportRequest)
    });

    if (!rawResponse.ok) {
      throw new Error(`Export failed: ${rawResponse.statusText}`);
    }

    return await rawResponse.blob();
  }

  // Statistics and History Methods
  async getFieldStatistics(fieldId: string): Promise<CustomFieldStats> {
    const response = await apiClient.get<CustomFieldStats>(`${this.baseEndpoint}/${fieldId}/stats`);
    return response.data;
  }

  async getFieldHistory(fieldId: string, entityType?: EntityType, entityId?: string, limit = 100): Promise<any[]> {
    const params: Record<string, string> = {
      limit: limit.toString()
    };
    if (entityType) params.entity_type = entityType;
    if (entityId) params.entity_id = entityId;
    
    const response = await apiClient.get<any[]>(`${this.baseEndpoint}/${fieldId}/history`, params);
    return response.data;
  }

  // Search Methods
  async searchFields(query: FieldSearchQuery): Promise<any> {
    const params: Record<string, string> = {};
    if (query.query) params.query = query.query;
    if (query.entity_type) params.entity_type = query.entity_type;
    if (query.field_type) params.field_type = query.field_type;
    if (query.include_archived !== undefined) params.include_archived = query.include_archived.toString();
    if (query.sort_by) params.sort_by = query.sort_by;
    if (query.sort_order) params.sort_order = query.sort_order;
    if (query.page) params.page = query.page.toString();
    if (query.per_page) params.per_page = query.per_page.toString();
    
    const response = await apiClient.get<any>(this.baseEndpoint, params);
    return response.data;
  }
}

// Create singleton instance
const customFieldsService = new CustomFieldsService();

export default customFieldsService;