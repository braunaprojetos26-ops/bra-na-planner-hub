// Field types
export type FieldType = 
  | 'text' 
  | 'number' 
  | 'currency' 
  | 'select' 
  | 'multi_select' 
  | 'boolean' 
  | 'date' 
  | 'list' 
  | 'textarea';

// Schema definition types
export interface DataCollectionSchema {
  id: string;
  name: string;
  version: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  sections?: DataCollectionSection[];
}

export interface DataCollectionSection {
  id: string;
  schema_id: string;
  key: string;
  title: string;
  description: string | null;
  icon: string;
  order_position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  fields?: DataCollectionField[];
}

export interface FieldOptions {
  items?: string[];
  itemSchema?: Record<string, string>;
  typeOptions?: string[];
  interestTypeOptions?: string[];
  [key: string]: unknown;
}

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export interface ConditionalOn {
  field: string;
  value: unknown;
}

export interface DataCollectionField {
  id: string;
  section_id: string;
  key: string;
  label: string;
  description: string | null;
  field_type: FieldType;
  options: FieldOptions;
  validation: FieldValidation;
  data_path: string;
  placeholder: string | null;
  default_value: unknown;
  conditional_on: ConditionalOn | null;
  order_position: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Collected data types
export type DataCollectionStatus = 'draft' | 'completed';

export interface ContactDataCollection {
  id: string;
  contact_id: string;
  schema_id: string;
  collected_by: string;
  status: DataCollectionStatus;
  data_collection: Record<string, unknown>;
  collected_at: string | null;
  created_at: string;
  updated_at: string;
}

// System settings
export interface SystemSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Form data types for insert/update
export interface DataCollectionSectionFormData {
  schema_id: string;
  key: string;
  title: string;
  description?: string;
  icon?: string;
  order_position: number;
  is_active?: boolean;
}

export interface DataCollectionFieldFormData {
  section_id: string;
  key: string;
  label: string;
  description?: string;
  field_type: FieldType;
  options?: FieldOptions;
  validation?: FieldValidation;
  data_path: string;
  placeholder?: string;
  default_value?: unknown;
  conditional_on?: ConditionalOn;
  order_position: number;
  is_required?: boolean;
  is_active?: boolean;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  completedRequiredFields: number;
  totalRequiredFields: number;
}
