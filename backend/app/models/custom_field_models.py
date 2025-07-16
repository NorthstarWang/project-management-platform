from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from enum import Enum

class FieldType(str, Enum):
    """Supported custom field types"""
    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    SELECT = "select"
    MULTI_SELECT = "multi_select"
    USER = "user"
    MULTI_USER = "multi_user"
    FILE = "file"
    URL = "url"
    EMAIL = "email"
    PHONE = "phone"
    CURRENCY = "currency"
    PERCENTAGE = "percentage"
    RATING = "rating"
    CHECKBOX = "checkbox"
    FORMULA = "formula"
    DURATION = "duration"
    LOCATION = "location"
    COLOR = "color"
    TAGS = "tags"
    JSON = "json"

class TextSubtype(str, Enum):
    SINGLE_LINE = "single_line"
    MULTI_LINE = "multi_line"
    RICH_TEXT = "rich_text"
    MARKDOWN = "markdown"

class NumberSubtype(str, Enum):
    INTEGER = "integer"
    DECIMAL = "decimal"
    CURRENCY = "currency"
    PERCENTAGE = "percentage"

class DateSubtype(str, Enum):
    DATE_ONLY = "date_only"
    DATETIME = "datetime"
    DATE_RANGE = "date_range"
    RECURRING = "recurring"

class EntityType(str, Enum):
    TASK = "task"
    PROJECT = "project"
    BOARD = "board"

class FieldValidationRule(BaseModel):
    """Validation rules for custom fields"""
    required: Optional[bool] = False
    unique: Optional[bool] = False
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None
    min_date: Optional[str] = None
    max_date: Optional[str] = None
    allowed_extensions: Optional[List[str]] = None
    max_file_size: Optional[int] = None
    blacklist_words: Optional[List[str]] = None
    whitelist_words: Optional[List[str]] = None

class FieldOption(BaseModel):
    """Option for select/multi-select fields"""
    value: str
    label: str
    color: Optional[str] = None
    icon: Optional[str] = None
    position: Optional[int] = 0
    is_default: Optional[bool] = False

class FieldConfiguration(BaseModel):
    """Type-specific configuration for custom fields"""
    # Text configurations
    text_transform: Optional[str] = None  # uppercase, lowercase, capitalize
    autocomplete_source: Optional[str] = None
    placeholder: Optional[str] = None
    
    # Number configurations
    decimal_places: Optional[int] = 2
    step: Optional[float] = 1.0
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    thousands_separator: Optional[str] = ","
    decimal_separator: Optional[str] = "."
    currency_code: Optional[str] = "USD"
    
    # Date configurations
    date_format: Optional[str] = "YYYY-MM-DD"
    time_format: Optional[str] = "24h"
    timezone: Optional[str] = "user"
    exclude_weekends: Optional[bool] = False
    exclude_holidays: Optional[List[str]] = None
    
    # Select configurations
    options: Optional[List[FieldOption]] = []
    allow_custom: Optional[bool] = False
    max_selections: Optional[int] = None
    min_selections: Optional[int] = None
    show_colors: Optional[bool] = True
    show_icons: Optional[bool] = False
    hierarchical: Optional[bool] = False
    
    # User configurations
    allow_multiple: Optional[bool] = False
    max_users: Optional[int] = None
    filter_by_team: Optional[str] = None
    filter_by_role: Optional[List[str]] = None
    include_inactive: Optional[bool] = False
    show_avatar: Optional[bool] = True
    show_email: Optional[bool] = False
    
    # File configurations
    max_files: Optional[int] = 5
    show_preview: Optional[bool] = True
    enable_ocr: Optional[bool] = False
    
    # Formula configurations
    formula: Optional[str] = None
    result_type: Optional[str] = None
    update_trigger: Optional[str] = "realtime"
    error_handling: Optional[str] = "show_error"

class FieldDisplayOptions(BaseModel):
    """Display options for custom fields"""
    show_in_card: Optional[bool] = True
    show_in_table: Optional[bool] = True
    show_in_details: Optional[bool] = True
    column_width: Optional[int] = None
    help_text: Optional[str] = None
    tooltip: Optional[str] = None

class CustomFieldIn(BaseModel):
    """Input model for creating custom fields"""
    name: str = Field(..., min_length=1, max_length=255)
    field_type: FieldType
    entity_type: EntityType
    entity_id: Optional[str] = None  # Optional: specific to one entity
    description: Optional[str] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    position: Optional[int] = 0
    required: Optional[bool] = False
    unique_values: Optional[bool] = False
    configuration: Optional[FieldConfiguration] = FieldConfiguration()
    validation_rules: Optional[FieldValidationRule] = FieldValidationRule()
    display_options: Optional[FieldDisplayOptions] = FieldDisplayOptions()

class CustomFieldUpdate(BaseModel):
    """Input model for updating custom fields"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    position: Optional[int] = None
    required: Optional[bool] = None
    unique_values: Optional[bool] = None
    configuration: Optional[FieldConfiguration] = None
    validation_rules: Optional[FieldValidationRule] = None
    display_options: Optional[FieldDisplayOptions] = None
    archived: Optional[bool] = None

class CustomFieldValue(BaseModel):
    """Model for custom field values"""
    field_id: str
    value: Any
    
    @validator('value')
    def validate_value(cls, v, values):
        # Value validation will be handled by the service layer
        # based on field type and validation rules
        return v

class BulkFieldValueUpdate(BaseModel):
    """Model for bulk updating field values"""
    entity_type: EntityType
    entity_id: str
    values: List[CustomFieldValue]

class CustomFieldDefinition(BaseModel):
    """Complete custom field definition"""
    id: str
    name: str
    field_type: FieldType
    entity_type: EntityType
    entity_id: Optional[str] = None
    description: Optional[str] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    position: int = 0
    required: bool = False
    unique_values: bool = False
    archived: bool = False
    created_by: str
    created_at: float
    updated_at: float
    configuration: FieldConfiguration = FieldConfiguration()
    validation_rules: FieldValidationRule = FieldValidationRule()
    display_options: FieldDisplayOptions = FieldDisplayOptions()
    permissions: Optional[Dict[str, Any]] = {}
    usage_count: Optional[int] = 0

class CustomFieldValueRecord(BaseModel):
    """Complete custom field value record"""
    id: str
    field_id: str
    entity_type: EntityType
    entity_id: str
    value_text: Optional[str] = None
    value_number: Optional[float] = None
    value_date: Optional[str] = None
    value_json: Optional[Dict[str, Any]] = None
    value_file: Optional[Dict[str, Any]] = None
    created_by: str
    created_at: float
    updated_at: float
    
    @property
    def value(self) -> Any:
        """Get the actual value based on which field is populated"""
        if self.value_text is not None:
            return self.value_text
        elif self.value_number is not None:
            return self.value_number
        elif self.value_date is not None:
            return self.value_date
        elif self.value_json is not None:
            return self.value_json
        elif self.value_file is not None:
            return self.value_file
        return None

class FieldTemplate(BaseModel):
    """Custom field template"""
    id: str
    name: str
    description: Optional[str] = None
    entity_type: EntityType
    category: Optional[str] = None
    fields: List[Dict[str, Any]]  # Array of field definitions
    is_public: bool = False
    created_by: str
    created_at: float
    usage_count: int = 0

class FieldTemplateIn(BaseModel):
    """Input model for creating field templates"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    entity_type: EntityType
    category: Optional[str] = None
    fields: List[Dict[str, Any]]
    is_public: Optional[bool] = False

class CustomFieldFilter(BaseModel):
    """Custom field filter definition"""
    id: str
    name: str
    entity_type: EntityType
    filter_config: Dict[str, Any]
    is_public: bool = False
    is_default: bool = False
    created_by: str
    created_at: float

class FilterCondition(BaseModel):
    """Individual filter condition"""
    field_id: str
    operator: str  # equals, not_equals, contains, greater_than, etc.
    value: Any

class FilterConfig(BaseModel):
    """Filter configuration"""
    conditions: List[FilterCondition]
    logic: str = "AND"  # AND or OR

class CustomFieldFilterIn(BaseModel):
    """Input model for creating filters"""
    name: str = Field(..., min_length=1, max_length=255)
    entity_type: EntityType
    filter_config: FilterConfig
    is_public: Optional[bool] = False
    is_default: Optional[bool] = False

class FieldDependency(BaseModel):
    """Field dependency definition"""
    id: str
    field_id: str
    depends_on_field_id: str
    condition_type: str  # equals, not_equals, contains, etc.
    condition_value: Any
    action: str  # show, hide, require, calculate

class FieldInheritance(BaseModel):
    """Field inheritance rule"""
    id: str
    parent_entity_type: EntityType
    child_entity_type: EntityType
    field_id: str
    inheritance_type: str  # copy, reference, aggregate

class CustomFieldHistory(BaseModel):
    """Field value change history"""
    id: str
    field_id: str
    entity_type: EntityType
    entity_id: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    changed_by: str
    changed_at: float
    change_reason: Optional[str] = None

class ImportMapping(BaseModel):
    """CSV import field mapping"""
    csv_column: str
    field_id: str
    transform: Optional[str] = None  # Optional transformation function

class ImportOptions(BaseModel):
    """CSV import options"""
    update_existing: bool = True
    skip_errors: bool = False
    dry_run: bool = False
    notification_email: Optional[str] = None

class ImportRequest(BaseModel):
    """CSV import request"""
    entity_type: EntityType
    mapping: Dict[str, str]  # CSV column -> field_id
    options: Optional[ImportOptions] = ImportOptions()

class ExportOptions(BaseModel):
    """Export options"""
    format: str = "csv"  # csv, excel, json
    include_headers: bool = True
    include_metadata: bool = False
    date_format: str = "YYYY-MM-DD"
    timezone: str = "UTC"

class ExportRequest(BaseModel):
    """Export request"""
    entity_type: EntityType
    field_ids: List[str]
    filters: Optional[FilterConfig] = None
    options: Optional[ExportOptions] = ExportOptions()

class BulkFieldOperation(BaseModel):
    """Bulk field operation"""
    operation: str  # update, delete
    entity_type: EntityType
    entity_ids: List[str]
    field_updates: Optional[List[CustomFieldValue]] = None

class FieldSearchQuery(BaseModel):
    """Field search query"""
    entity_type: EntityType
    query: Optional[str] = None
    field_filters: Optional[List[FilterCondition]] = None
    include_archived: bool = False
    page: int = 1
    per_page: int = 20
    sort_by: Optional[str] = "position"
    sort_order: Optional[str] = "asc"

class FieldValueSearchQuery(BaseModel):
    """Field value search query"""
    entity_type: EntityType
    entity_ids: Optional[List[str]] = None
    field_ids: Optional[List[str]] = None
    include_empty: bool = False

class CustomFieldStats(BaseModel):
    """Statistics for a custom field"""
    field_id: str
    total_values: int
    unique_values: int
    null_count: int
    value_distribution: Optional[Dict[str, int]] = None
    average_value: Optional[float] = None
    min_value: Optional[Any] = None
    max_value: Optional[Any] = None

class CustomFieldResponse(BaseModel):
    """Standard response for custom field operations"""
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None
    errors: Optional[List[str]] = None