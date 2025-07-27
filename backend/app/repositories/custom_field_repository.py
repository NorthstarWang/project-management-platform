from typing import List, Optional, Dict, Any
from .base_repository import BaseRepository
from ..models.custom_field_models import (
    CustomFieldDefinition, CustomFieldValueRecord, FieldTemplate,
    CustomFieldFilter, CustomFieldHistory, EntityType, FieldType
)
import time

class CustomFieldRepository(BaseRepository):
    """Repository for custom field operations"""
    
    def __init__(self):
        # Initialize custom field tables
        self.custom_field_definitions: Dict[str, CustomFieldDefinition] = {}
        self.custom_field_values: Dict[str, CustomFieldValueRecord] = {}
        self.field_templates: Dict[str, FieldTemplate] = {}
        self.custom_field_filters: Dict[str, CustomFieldFilter] = {}
        self.custom_field_history: List[CustomFieldHistory] = []
        self.field_dependencies: Dict[str, List[Dict[str, Any]]] = {}
        self.field_inheritance: Dict[str, List[Dict[str, Any]]] = {}
        
    def generate_id(self, prefix: str) -> str:
        """Generate a unique ID with prefix"""
        import uuid
        return f"{prefix}_{uuid.uuid4()}"
        
    # Field Definition Methods
    
    def create_field_definition(self, field_data: Dict[str, Any], created_by: str) -> CustomFieldDefinition:
        """Create a new custom field definition"""
        field_id = self.generate_id("field")
        
        field = CustomFieldDefinition(
            id=field_id,
            created_by=created_by,
            created_at=time.time(),
            updated_at=time.time(),
            **field_data
        )
        
        self.custom_field_definitions[field_id] = field
        return field
    
    def get_field_definition(self, field_id: str) -> Optional[CustomFieldDefinition]:
        """Get a field definition by ID"""
        return self.custom_field_definitions.get(field_id)
    
    def get_fields_by_entity_type(
        self, 
        entity_type: EntityType, 
        entity_id: Optional[str] = None,
        include_archived: bool = False
    ) -> List[CustomFieldDefinition]:
        """Get all fields for an entity type, optionally filtered by entity ID"""
        fields = []
        for field in self.custom_field_definitions.values():
            if field.entity_type == entity_type:
                if entity_id and field.entity_id and field.entity_id != entity_id:
                    continue
                if not include_archived and field.archived:
                    continue
                fields.append(field)
        
        # Sort by position
        return sorted(fields, key=lambda f: f.position)
    
    def update_field_definition(self, field_id: str, updates: Dict[str, Any]) -> Optional[CustomFieldDefinition]:
        """Update a field definition"""
        field = self.custom_field_definitions.get(field_id)
        if not field:
            return None
            
        # Update fields
        for key, value in updates.items():
            if hasattr(field, key) and value is not None:
                setattr(field, key, value)
        
        field.updated_at = time.time()
        return field
    
    def delete_field_definition(self, field_id: str) -> bool:
        """Delete a field definition (soft delete by archiving)"""
        field = self.custom_field_definitions.get(field_id)
        if not field:
            return False
            
        field.archived = True
        field.updated_at = time.time()
        return True
    
    def get_field_usage_count(self, field_id: str) -> int:
        """Get the number of values for a field"""
        count = 0
        for value in self.custom_field_values.values():
            if value.field_id == field_id:
                count += 1
        return count
    
    # Field Value Methods
    
    def set_field_value(
        self, 
        field_id: str, 
        entity_type: EntityType,
        entity_id: str,
        value: Any,
        user_id: str
    ) -> CustomFieldValueRecord:
        """Set a field value for an entity"""
        # Check if value already exists
        existing_value = self.get_field_value(field_id, entity_type, entity_id)
        
        if existing_value:
            # Update existing value
            old_value = existing_value.value
            value_id = existing_value.id
            
            # Update the appropriate value field based on field type
            field_def = self.get_field_definition(field_id)
            if field_def:
                self._update_value_record(existing_value, value, field_def.field_type)
            
            existing_value.updated_at = time.time()
            
            # Record history
            self._record_field_history(
                field_id, entity_type, entity_id,
                old_value, value, user_id
            )
            
            return existing_value
        else:
            # Create new value
            value_id = self.generate_id("value")
            field_def = self.get_field_definition(field_id)
            
            value_record = CustomFieldValueRecord(
                id=value_id,
                field_id=field_id,
                entity_type=entity_type,
                entity_id=entity_id,
                created_by=user_id,
                created_at=time.time(),
                updated_at=time.time()
            )
            
            if field_def:
                self._update_value_record(value_record, value, field_def.field_type)
            
            self.custom_field_values[value_id] = value_record
            
            # Record history
            self._record_field_history(
                field_id, entity_type, entity_id,
                None, value, user_id
            )
            
            return value_record
    
    def get_field_value(
        self, 
        field_id: str, 
        entity_type: EntityType,
        entity_id: str
    ) -> Optional[CustomFieldValueRecord]:
        """Get a field value for an entity"""
        for value in self.custom_field_values.values():
            if (value.field_id == field_id and 
                value.entity_type == entity_type and 
                value.entity_id == entity_id):
                return value
        return None
    
    def get_entity_field_values(
        self,
        entity_type: EntityType,
        entity_id: str
    ) -> List[Dict[str, Any]]:
        """Get all field values for an entity with field definitions"""
        values = []
        for value in self.custom_field_values.values():
            if value.entity_type == entity_type and value.entity_id == entity_id:
                field_def = self.get_field_definition(value.field_id)
                if field_def and not field_def.archived:
                    values.append({
                        "field_id": value.field_id,
                        "field_name": field_def.name,
                        "field_type": field_def.field_type,
                        "value": value.value,
                        "display_value": self._format_display_value(value.value, field_def),
                        "updated_at": value.updated_at
                    })
        
        return sorted(values, key=lambda v: v.get("updated_at", 0))
    
    def bulk_set_field_values(
        self,
        entity_type: EntityType,
        entity_id: str,
        field_values: List[Dict[str, Any]],
        user_id: str
    ) -> Dict[str, Any]:
        """Set multiple field values at once"""
        updated = 0
        errors = []
        
        for field_value in field_values:
            try:
                field_id = field_value.get("field_id")
                value = field_value.get("value")
                
                if not field_id:
                    errors.append("Missing field_id")
                    continue
                    
                self.set_field_value(
                    field_id, entity_type, entity_id, value, user_id
                )
                updated += 1
            except Exception as e:
                errors.append(str(e))
        
        return {"updated": updated, "errors": errors}
    
    def delete_field_value(
        self,
        field_id: str,
        entity_type: EntityType,
        entity_id: str,
        user_id: str
    ) -> bool:
        """Delete a field value"""
        value = self.get_field_value(field_id, entity_type, entity_id)
        if not value:
            return False
            
        # Record deletion in history
        self._record_field_history(
            field_id, entity_type, entity_id,
            value.value, None, user_id
        )
        
        # Remove from values
        del self.custom_field_values[value.id]
        return True
    
    def delete_entity_field_values(
        self,
        entity_type: EntityType,
        entity_id: str
    ) -> int:
        """Delete all field values for an entity"""
        deleted = 0
        value_ids_to_delete = []
        
        for value_id, value in self.custom_field_values.items():
            if value.entity_type == entity_type and value.entity_id == entity_id:
                value_ids_to_delete.append(value_id)
        
        for value_id in value_ids_to_delete:
            del self.custom_field_values[value_id]
            deleted += 1
            
        return deleted
    
    # Template Methods
    
    def create_template(self, template_data: Dict[str, Any], created_by: str) -> FieldTemplate:
        """Create a new field template"""
        template_id = self.generate_id("template")
        
        template = FieldTemplate(
            id=template_id,
            created_by=created_by,
            created_at=time.time(),
            **template_data
        )
        
        self.field_templates[template_id] = template
        return template
    
    def get_template(self, template_id: str) -> Optional[FieldTemplate]:
        """Get a template by ID"""
        return self.field_templates.get(template_id)
    
    def get_templates_by_entity_type(
        self,
        entity_type: EntityType,
        category: Optional[str] = None,
        is_public: Optional[bool] = None
    ) -> List[FieldTemplate]:
        """Get templates for an entity type"""
        templates = []
        for template in self.field_templates.values():
            if template.entity_type == entity_type:
                if category and template.category != category:
                    continue
                if is_public is not None and template.is_public != is_public:
                    continue
                templates.append(template)
        
        return sorted(templates, key=lambda t: t.usage_count, reverse=True)
    
    def increment_template_usage(self, template_id: str) -> None:
        """Increment the usage count for a template"""
        template = self.field_templates.get(template_id)
        if template:
            template.usage_count += 1
    
    # Filter Methods
    
    def create_filter(self, filter_data: Dict[str, Any], created_by: str) -> CustomFieldFilter:
        """Create a new filter"""
        filter_id = self.generate_id("filter")
        
        filter_obj = CustomFieldFilter(
            id=filter_id,
            created_by=created_by,
            created_at=time.time(),
            **filter_data
        )
        
        self.custom_field_filters[filter_id] = filter_obj
        return filter_obj
    
    def get_filter(self, filter_id: str) -> Optional[CustomFieldFilter]:
        """Get a filter by ID"""
        return self.custom_field_filters.get(filter_id)
    
    def get_filters_by_entity_type(
        self,
        entity_type: EntityType,
        user_id: Optional[str] = None,
        is_public: Optional[bool] = None
    ) -> List[CustomFieldFilter]:
        """Get filters for an entity type"""
        filters = []
        for filter_obj in self.custom_field_filters.values():
            if filter_obj.entity_type == entity_type:
                if is_public is not None and filter_obj.is_public != is_public:
                    continue
                if user_id and not filter_obj.is_public and filter_obj.created_by != user_id:
                    continue
                filters.append(filter_obj)
        
        return sorted(filters, key=lambda f: f.created_at, reverse=True)
    
    def delete_filter(self, filter_id: str) -> bool:
        """Delete a filter"""
        if filter_id in self.custom_field_filters:
            del self.custom_field_filters[filter_id]
            return True
        return False
    
    # Search Methods
    
    def search_field_values(
        self,
        entity_type: EntityType,
        conditions: List[Dict[str, Any]],
        logic: str = "AND"
    ) -> List[str]:
        """Search entities by custom field values"""
        matching_entities = set()
        
        for i, condition in enumerate(conditions):
            field_id = condition.get("field_id")
            operator = condition.get("operator")
            search_value = condition.get("value")
            
            field_def = self.get_field_definition(field_id)
            if not field_def:
                continue
            
            condition_matches = set()
            
            for value in self.custom_field_values.values():
                if (value.field_id == field_id and 
                    value.entity_type == entity_type and
                    self._matches_condition(value.value, operator, search_value)):
                    condition_matches.add(value.entity_id)
            
            if i == 0:
                matching_entities = condition_matches
            elif logic == "AND":
                matching_entities = matching_entities.intersection(condition_matches)
            else:  # OR
                matching_entities = matching_entities.union(condition_matches)
        
        return list(matching_entities)
    
    # Statistics Methods
    
    def get_field_statistics(self, field_id: str) -> Dict[str, Any]:
        """Get statistics for a field"""
        values = []
        null_count = 0
        
        for value in self.custom_field_values.values():
            if value.field_id == field_id:
                if value.value is None:
                    null_count += 1
                else:
                    values.append(value.value)
        
        total_values = len(values) + null_count
        unique_values = len(set(str(v) for v in values))
        
        stats = {
            "field_id": field_id,
            "total_values": total_values,
            "unique_values": unique_values,
            "null_count": null_count
        }
        
        # Add type-specific statistics
        field_def = self.get_field_definition(field_id)
        if field_def and field_def.field_type in [FieldType.NUMBER, FieldType.CURRENCY, FieldType.PERCENTAGE]:
            numeric_values = [v for v in values if isinstance(v, (int, float))]
            if numeric_values:
                stats["average_value"] = sum(numeric_values) / len(numeric_values)
                stats["min_value"] = min(numeric_values)
                stats["max_value"] = max(numeric_values)
        
        # Value distribution for select fields
        if field_def and field_def.field_type in [FieldType.SELECT, FieldType.MULTI_SELECT]:
            distribution = {}
            for value in values:
                if isinstance(value, list):
                    for v in value:
                        distribution[v] = distribution.get(v, 0) + 1
                else:
                    distribution[value] = distribution.get(value, 0) + 1
            stats["value_distribution"] = distribution
        
        return stats
    
    # History Methods
    
    def get_field_history(
        self,
        field_id: Optional[str] = None,
        entity_type: Optional[EntityType] = None,
        entity_id: Optional[str] = None,
        limit: int = 100
    ) -> List[CustomFieldHistory]:
        """Get field value history"""
        history = []
        
        for entry in self.custom_field_history:
            if field_id and entry.field_id != field_id:
                continue
            if entity_type and entry.entity_type != entity_type:
                continue
            if entity_id and entry.entity_id != entity_id:
                continue
            history.append(entry)
        
        # Sort by timestamp descending and limit
        history.sort(key=lambda h: h.changed_at, reverse=True)
        return history[:limit]
    
    # Helper Methods
    
    def _update_value_record(self, record: CustomFieldValueRecord, value: Any, field_type: FieldType) -> None:
        """Update the appropriate value field based on field type"""
        # Clear all value fields first
        record.value_text = None
        record.value_number = None
        record.value_date = None
        record.value_json = None
        record.value_file = None
        
        # Set the appropriate field based on type
        if field_type in [FieldType.TEXT, FieldType.EMAIL, FieldType.PHONE, FieldType.URL]:
            record.value_text = str(value) if value is not None else None
        elif field_type in [FieldType.NUMBER, FieldType.CURRENCY, FieldType.PERCENTAGE, FieldType.RATING]:
            record.value_number = float(value) if value is not None else None
        elif field_type in [FieldType.DATE]:
            record.value_date = str(value) if value is not None else None
        elif field_type in [FieldType.SELECT, FieldType.CHECKBOX]:
            record.value_text = str(value) if value is not None else None
        elif field_type in [FieldType.MULTI_SELECT, FieldType.TAGS, FieldType.USER, FieldType.MULTI_USER]:
            record.value_json = {"values": value if isinstance(value, list) else [value]} if value is not None else None
        elif field_type == FieldType.FILE:
            record.value_file = value if isinstance(value, dict) else None
        else:
            record.value_json = value
    
    def _format_display_value(self, value: Any, field_def: CustomFieldDefinition) -> str:
        """Format a value for display"""
        if value is None:
            return ""
            
        if field_def.field_type == FieldType.SELECT:
            # Find the label for the selected value
            for option in field_def.configuration.options:
                if option.value == value:
                    return option.label
            return str(value)
        elif field_def.field_type == FieldType.MULTI_SELECT and isinstance(value, dict):
            # Format multiple selections
            values = value.get("values", [])
            labels = []
            for val in values:
                for option in field_def.configuration.options:
                    if option.value == val:
                        labels.append(option.label)
                        break
                else:
                    labels.append(str(val))
            return ", ".join(labels)
        elif field_def.field_type == FieldType.CURRENCY:
            # Format currency
            prefix = field_def.configuration.prefix or "$"
            return f"{prefix}{value:,.2f}"
        elif field_def.field_type == FieldType.PERCENTAGE:
            return f"{value}%"
        else:
            return str(value)
    
    def _matches_condition(self, value: Any, operator: str, search_value: Any) -> bool:
        """Check if a value matches a search condition"""
        if value is None:
            return operator == "is_null"
            
        if operator == "equals":
            return value == search_value
        elif operator == "not_equals":
            return value != search_value
        elif operator == "contains":
            return str(search_value).lower() in str(value).lower()
        elif operator == "not_contains":
            return str(search_value).lower() not in str(value).lower()
        elif operator == "greater_than":
            try:
                return float(value) > float(search_value)
            except (ValueError, TypeError):
                return False
        elif operator == "less_than":
            try:
                return float(value) < float(search_value)
            except (ValueError, TypeError):
                return False
        elif operator == "greater_or_equal":
            try:
                return float(value) >= float(search_value)
            except (ValueError, TypeError):
                return False
        elif operator == "less_or_equal":
            try:
                return float(value) <= float(search_value)
            except (ValueError, TypeError):
                return False
        elif operator == "is_null":
            return False  # Already handled above
        elif operator == "is_not_null":
            return True
        elif operator == "in":
            return value in search_value if isinstance(search_value, list) else False
        elif operator == "not_in":
            return value not in search_value if isinstance(search_value, list) else True
        else:
            return False
    
    def _record_field_history(
        self,
        field_id: str,
        entity_type: EntityType,
        entity_id: str,
        old_value: Any,
        new_value: Any,
        user_id: str,
        reason: Optional[str] = None
    ) -> None:
        """Record a field value change in history"""
        history_entry = CustomFieldHistory(
            id=self.generate_id("history"),
            field_id=field_id,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
            changed_by=user_id,
            changed_at=time.time(),
            change_reason=reason
        )
        
        self.custom_field_history.append(history_entry)
        
        # Limit history size
        if len(self.custom_field_history) > 10000:
            self.custom_field_history = self.custom_field_history[-5000:]