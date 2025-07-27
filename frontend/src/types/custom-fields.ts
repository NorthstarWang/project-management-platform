export type EntityType = 'project' | 'task' | 'board' | 'user';

export type FieldType = 
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multi_select'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'currency'
  | 'percentage'
  | 'duration'
  | 'rating'
  | 'tags'
  | 'user'
  | 'multi_user'
  | 'file'
  | 'color'
  | 'location'
  | 'formula'
  | 'relation'
  | 'lookup';

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface FieldConfiguration {
  placeholder?: string;
  default_value?: any;
  options?: SelectOption[];
  min_value?: number;
  max_value?: number;
  decimal_places?: number;
  max_length?: number;
  allow_custom?: boolean;
  allow_multiple?: boolean;
  date_format?: string;
  include_time?: boolean;
  prefix?: string;
  suffix?: string;
  max_selections?: number;
  min_selections?: number;
  allowed_extensions?: string[];
  max_file_size?: number;
  formula?: string;
  related_entity_type?: EntityType;
  lookup_field_id?: string;
}

export interface ValidationRule {
  required?: boolean;
  unique?: boolean;
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
  custom_validation?: string;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  field_type: FieldType;
  entity_type: EntityType;
  entity_id?: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  position: number;
  configuration: FieldConfiguration;
  validation_rules: ValidationRule;
  default_value?: any;
  is_active: boolean;
  is_system: boolean;
  show_in_list: boolean;
  show_in_details: boolean;
  searchable: boolean;
  sortable: boolean;
  archived: boolean;
  usage_count?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  field_id: string;
  value: any;
}

export interface BulkFieldValueUpdate {
  entity_type: EntityType;
  entity_id: string;
  values: CustomFieldValue[];
}

export interface FieldTemplate {
  id: string;
  name: string;
  description?: string;
  entity_type: EntityType;
  category?: string;
  fields: any[];
  is_public: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
}

export interface FilterCondition {
  field_id: string;
  operator: string;
  value: any;
}

export interface FilterConfig {
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
}

export interface CustomFieldFilter {
  id: string;
  name: string;
  description?: string;
  entity_type: EntityType;
  filter_config: FilterConfig;
  is_public: boolean;
  is_favorite: boolean;
  created_by: string;
  created_at: string;
}

export interface CustomFieldStats {
  field_id: string;
  total_values: number;
  unique_values: number;
  null_count: number;
  average_value?: number;
  min_value?: number;
  max_value?: number;
  value_distribution?: Record<string, number>;
}

export interface FieldSearchQuery {
  query?: string;
  entity_type: EntityType;
  field_type?: FieldType;
  include_archived?: boolean;
  sort_by?: 'name' | 'created_at' | 'position';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}