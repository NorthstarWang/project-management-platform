from typing import List, Optional, Dict, Any, Tuple
from ..repositories.custom_field_repository import CustomFieldRepository
from ..models.custom_field_models import (
    CustomFieldIn, CustomFieldUpdate, CustomFieldDefinition,
    CustomFieldValue, BulkFieldValueUpdate, CustomFieldValueRecord,
    FieldTemplate, FieldTemplateIn, CustomFieldFilter, CustomFieldFilterIn,
    FilterConfig, ImportRequest, ExportRequest, BulkFieldOperation,
    FieldSearchQuery, FieldValueSearchQuery, CustomFieldStats,
    EntityType, FieldType, FieldValidationRule
)
import json
import csv
import io
from datetime import datetime

class CustomFieldService:
    """Service for custom field operations"""
    
    def __init__(self):
        self.repository = CustomFieldRepository()
    
    # Field Definition Methods
    
    def create_field(self, field_data: CustomFieldIn, user_id: str) -> CustomFieldDefinition:
        """Create a new custom field"""
        # Validate field configuration
        self._validate_field_configuration(field_data)
        
        # Check for duplicate names within entity type
        existing_fields = self.repository.get_fields_by_entity_type(
            field_data.entity_type,
            field_data.entity_id
        )
        
        for field in existing_fields:
            if field.name.lower() == field_data.name.lower():
                raise ValueError(f"Field with name '{field_data.name}' already exists for this entity type")
        
        # Create the field
        field_dict = field_data.dict()
        field = self.repository.create_field_definition(field_dict, user_id)
        
        return field
    
    def get_field(self, field_id: str) -> Optional[CustomFieldDefinition]:
        """Get a field by ID"""
        field = self.repository.get_field_definition(field_id)
        if field:
            # Update usage count
            field.usage_count = self.repository.get_field_usage_count(field_id)
        return field
    
    def get_fields(
        self,
        entity_type: EntityType,
        entity_id: Optional[str] = None,
        include_archived: bool = False
    ) -> List[CustomFieldDefinition]:
        """Get fields for an entity type"""
        fields = self.repository.get_fields_by_entity_type(
            entity_type,
            entity_id,
            include_archived
        )
        
        # Update usage counts
        for field in fields:
            field.usage_count = self.repository.get_field_usage_count(field.id)
        
        return fields
    
    def update_field(self, field_id: str, updates: CustomFieldUpdate, user_id: str) -> Optional[CustomFieldDefinition]:
        """Update a field definition"""
        field = self.repository.get_field_definition(field_id)
        if not field:
            return None
        
        # Validate updates
        updates_dict = updates.dict(exclude_unset=True)
        
        # If updating configuration, validate it
        if "configuration" in updates_dict:
            temp_field = field.copy()
            temp_field.configuration = updates_dict["configuration"]
            self._validate_field_configuration(temp_field)
        
        # Update the field
        updated_field = self.repository.update_field_definition(field_id, updates_dict)
        
        return updated_field
    
    def delete_field(self, field_id: str, delete_values: bool = False) -> bool:
        """Delete a field (soft delete unless delete_values is True)"""
        field = self.repository.get_field_definition(field_id)
        if not field:
            return False
        
        if delete_values:
            # Hard delete - remove all values
            for value in self.repository.custom_field_values.values():
                if value.field_id == field_id:
                    self.repository.delete_field_value(
                        field_id,
                        value.entity_type,
                        value.entity_id,
                        "system"
                    )
        
        # Soft delete the field
        return self.repository.delete_field_definition(field_id)
    
    # Field Value Methods
    
    def set_field_value(
        self,
        field_id: str,
        entity_type: EntityType,
        entity_id: str,
        value: Any,
        user_id: str
    ) -> CustomFieldValueRecord:
        """Set a field value"""
        # Get field definition
        field = self.repository.get_field_definition(field_id)
        if not field:
            raise ValueError(f"Field {field_id} not found")
        
        if field.archived:
            raise ValueError(f"Cannot set value for archived field")
        
        # Validate entity type matches
        if field.entity_type != entity_type:
            raise ValueError(f"Field is for {field.entity_type}, not {entity_type}")
        
        # Validate value
        self._validate_field_value(field, value)
        
        # Set the value
        return self.repository.set_field_value(
            field_id,
            entity_type,
            entity_id,
            value,
            user_id
        )
    
    def get_field_value(
        self,
        field_id: str,
        entity_type: EntityType,
        entity_id: str
    ) -> Optional[Any]:
        """Get a field value"""
        value_record = self.repository.get_field_value(field_id, entity_type, entity_id)
        return value_record.value if value_record else None
    
    def get_entity_field_values(
        self,
        entity_type: EntityType,
        entity_id: str
    ) -> List[Dict[str, Any]]:
        """Get all field values for an entity"""
        values = self.repository.get_entity_field_values(entity_type, entity_id)
        # Always return a list, even if empty
        return values if values is not None else []
    
    def bulk_update_field_values(
        self,
        bulk_update: BulkFieldValueUpdate,
        user_id: str
    ) -> Dict[str, Any]:
        """Bulk update field values"""
        # Validate all values first
        for field_value in bulk_update.values:
            field = self.repository.get_field_definition(field_value.field_id)
            if not field:
                raise ValueError(f"Field {field_value.field_id} not found")
            if field.entity_type != bulk_update.entity_type:
                raise ValueError(f"Field {field_value.field_id} is not for entity type {bulk_update.entity_type}")
            self._validate_field_value(field, field_value.value)
        
        # Perform bulk update
        return self.repository.bulk_set_field_values(
            bulk_update.entity_type,
            bulk_update.entity_id,
            [fv.dict() for fv in bulk_update.values],
            user_id
        )
    
    def bulk_operation(self, operation: BulkFieldOperation, user_id: str) -> Dict[str, Any]:
        """Perform bulk field operations across multiple entities"""
        if operation.operation == "update" and operation.field_updates:
            updated = 0
            errors = []
            
            for entity_id in operation.entity_ids:
                try:
                    bulk_update = BulkFieldValueUpdate(
                        entity_type=operation.entity_type,
                        entity_id=entity_id,
                        values=operation.field_updates
                    )
                    result = self.bulk_update_field_values(bulk_update, user_id)
                    updated += result["updated"]
                    errors.extend(result.get("errors", []))
                except Exception as e:
                    errors.append(f"Error updating entity {entity_id}: {str(e)}")
            
            return {"updated": updated, "errors": errors}
        
        elif operation.operation == "delete":
            deleted = 0
            for entity_id in operation.entity_ids:
                deleted += self.repository.delete_entity_field_values(
                    operation.entity_type,
                    entity_id
                )
            return {"deleted": deleted}
        
        else:
            raise ValueError(f"Unknown operation: {operation.operation}")
    
    # Template Methods
    
    def create_template(self, template_data: FieldTemplateIn, user_id: str) -> FieldTemplate:
        """Create a field template"""
        # Validate template fields
        for field_def in template_data.fields:
            try:
                field_in = CustomFieldIn(**field_def)
                self._validate_field_configuration(field_in)
            except Exception as e:
                raise ValueError(f"Invalid field definition in template: {str(e)}")
        
        # Create template
        return self.repository.create_template(template_data.dict(), user_id)
    
    def get_template(self, template_id: str) -> Optional[FieldTemplate]:
        """Get a template by ID"""
        return self.repository.get_template(template_id)
    
    def get_templates(
        self,
        entity_type: EntityType,
        category: Optional[str] = None,
        is_public: Optional[bool] = None
    ) -> List[FieldTemplate]:
        """Get templates for an entity type"""
        return self.repository.get_templates_by_entity_type(
            entity_type,
            category,
            is_public
        )
    
    def apply_template(
        self,
        template_id: str,
        entity_type: EntityType,
        user_id: str,
        entity_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Apply a template to create fields"""
        template = self.repository.get_template(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        if template.entity_type != entity_type:
            raise ValueError(f"Template is for {template.entity_type}, not {entity_type}")
        
        fields_created = []
        errors = []
        
        for field_def in template.fields:
            try:
                field_def["entity_type"] = entity_type
                if entity_id:
                    field_def["entity_id"] = entity_id
                
                field_in = CustomFieldIn(**field_def)
                field = self.create_field(field_in, user_id)
                fields_created.append(field)
            except Exception as e:
                errors.append(str(e))
        
        # Increment template usage
        self.repository.increment_template_usage(template_id)
        
        return {
            "fields_created": len(fields_created),
            "fields": fields_created,
            "errors": errors
        }
    
    # Filter Methods
    
    def create_filter(self, filter_data: CustomFieldFilterIn, user_id: str) -> CustomFieldFilter:
        """Create a saved filter"""
        # Validate filter conditions
        for condition in filter_data.filter_config.conditions:
            field = self.repository.get_field_definition(condition.field_id)
            if not field:
                raise ValueError(f"Field {condition.field_id} not found")
        
        return self.repository.create_filter(filter_data.dict(), user_id)
    
    def get_filter(self, filter_id: str) -> Optional[CustomFieldFilter]:
        """Get a filter by ID"""
        return self.repository.get_filter(filter_id)
    
    def get_filters(
        self,
        entity_type: EntityType,
        user_id: Optional[str] = None,
        is_public: Optional[bool] = None
    ) -> List[CustomFieldFilter]:
        """Get filters for an entity type"""
        return self.repository.get_filters_by_entity_type(
            entity_type,
            user_id,
            is_public
        )
    
    def apply_filter(
        self,
        filter_id: str,
        additional_filters: Optional[Dict[str, Any]] = None,
        page: int = 1,
        per_page: int = 50
    ) -> Dict[str, Any]:
        """Apply a filter to get matching entities"""
        filter_obj = self.repository.get_filter(filter_id)
        if not filter_obj:
            raise ValueError(f"Filter {filter_id} not found")
        
        # Search using filter conditions
        matching_entity_ids = self.repository.search_field_values(
            filter_obj.entity_type,
            [c.dict() for c in filter_obj.filter_config["conditions"]],
            filter_obj.filter_config.get("logic", "AND")
        )
        
        # Apply pagination
        start = (page - 1) * per_page
        end = start + per_page
        paginated_ids = matching_entity_ids[start:end]
        
        return {
            "results": paginated_ids,
            "total": len(matching_entity_ids),
            "page": page,
            "per_page": per_page
        }
    
    def delete_filter(self, filter_id: str, user_id: str) -> bool:
        """Delete a filter"""
        filter_obj = self.repository.get_filter(filter_id)
        if not filter_obj:
            return False
        
        # Check permissions
        if not filter_obj.is_public and filter_obj.created_by != user_id:
            raise ValueError("You can only delete your own filters")
        
        return self.repository.delete_filter(filter_id)
    
    # Search Methods
    
    def search_fields(self, query: FieldSearchQuery) -> Dict[str, Any]:
        """Search field definitions"""
        fields = self.repository.get_fields_by_entity_type(
            query.entity_type,
            include_archived=query.include_archived
        )
        
        # Apply text search if query provided
        if query.query:
            query_lower = query.query.lower()
            fields = [f for f in fields if 
                     query_lower in f.name.lower() or 
                     (f.description and query_lower in f.description.lower())]
        
        # Apply field filters
        if query.field_filters:
            for condition in query.field_filters:
                # Filter fields based on their properties
                if condition.field_id == "field_type" and condition.operator == "equals":
                    fields = [f for f in fields if f.field_type == condition.value]
                elif condition.field_id == "required" and condition.operator == "equals":
                    fields = [f for f in fields if f.required == condition.value]
        
        # Sort
        if query.sort_by == "name":
            fields.sort(key=lambda f: f.name)
        elif query.sort_by == "created_at":
            fields.sort(key=lambda f: f.created_at)
        else:  # position
            fields.sort(key=lambda f: f.position)
        
        if query.sort_order == "desc":
            fields.reverse()
        
        # Paginate
        start = (query.page - 1) * query.per_page
        end = start + query.per_page
        paginated_fields = fields[start:end]
        
        return {
            "fields": paginated_fields,
            "total": len(fields),
            "page": query.page,
            "per_page": query.per_page
        }
    
    def search_field_values(self, query: FieldValueSearchQuery) -> List[Dict[str, Any]]:
        """Search field values"""
        results = []
        
        if query.entity_ids:
            # Get values for specific entities
            for entity_id in query.entity_ids:
                values = self.repository.get_entity_field_values(
                    query.entity_type,
                    entity_id
                )
                if query.field_ids:
                    values = [v for v in values if v["field_id"] in query.field_ids]
                if not query.include_empty:
                    values = [v for v in values if v["value"] is not None]
                
                results.append({
                    "entity_id": entity_id,
                    "values": values
                })
        
        return results
    
    # Import/Export Methods
    
    def import_csv(
        self,
        file_content: bytes,
        import_request: ImportRequest,
        user_id: str
    ) -> Dict[str, Any]:
        """Import field values from CSV"""
        imported = 0
        updated = 0
        errors = []
        
        try:
            # Parse CSV
            csv_file = io.StringIO(file_content.decode('utf-8'))
            reader = csv.DictReader(csv_file)
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                try:
                    entity_id = None
                    field_updates = []
                    
                    # Process each mapped column
                    for csv_column, field_id in import_request.mapping.items():
                        if csv_column not in row:
                            continue
                        
                        value = row[csv_column]
                        
                        # Special handling for entity_id
                        if field_id == "entity_id":
                            entity_id = value
                            continue
                        
                        # Get field definition
                        field = self.repository.get_field_definition(field_id)
                        if not field:
                            errors.append(f"Row {row_num}: Field {field_id} not found")
                            continue
                        
                        # Convert value based on field type
                        converted_value = self._convert_import_value(value, field)
                        field_updates.append({
                            "field_id": field_id,
                            "value": converted_value
                        })
                    
                    if not entity_id:
                        errors.append(f"Row {row_num}: No entity_id found")
                        continue
                    
                    # Apply field updates
                    if field_updates:
                        result = self.repository.bulk_set_field_values(
                            import_request.entity_type,
                            entity_id,
                            field_updates,
                            user_id
                        )
                        
                        if result["updated"] > 0:
                            if import_request.options.update_existing:
                                updated += 1
                            else:
                                imported += 1
                        
                        errors.extend([f"Row {row_num}: {e}" for e in result.get("errors", [])])
                    
                except Exception as e:
                    error_msg = f"Row {row_num}: {str(e)}"
                    if import_request.options.skip_errors:
                        errors.append(error_msg)
                    else:
                        raise ValueError(error_msg)
        
        except Exception as e:
            errors.append(f"CSV parsing error: {str(e)}")
        
        return {
            "imported": imported,
            "updated": updated,
            "errors": errors[:100]  # Limit error messages
        }
    
    def export_data(self, export_request: ExportRequest) -> Tuple[bytes, str, str]:
        """Export field data"""
        # Get field definitions
        fields = []
        field_map = {}
        for field_id in export_request.field_ids:
            field = self.repository.get_field_definition(field_id)
            if field:
                fields.append(field)
                field_map[field_id] = field
        
        if not fields:
            raise ValueError("No valid fields to export")
        
        # Build data rows
        rows = []
        entity_ids = []
        
        if export_request.filters:
            # Apply filters to get entities
            entity_ids = self.repository.search_field_values(
                export_request.entity_type,
                [c.dict() for c in export_request.filters.conditions],
                export_request.filters.logic
            )
        else:
            # Get all entities with values
            entity_ids = set()
            for value in self.repository.custom_field_values.values():
                if value.entity_type == export_request.entity_type:
                    entity_ids.add(value.entity_id)
            entity_ids = list(entity_ids)
        
        # Build rows
        for entity_id in entity_ids:
            row = {"entity_id": entity_id}
            
            # Get all field values for entity
            values = self.repository.get_entity_field_values(
                export_request.entity_type,
                entity_id
            )
            
            # Add requested field values
            value_map = {v["field_id"]: v["value"] for v in values}
            for field in fields:
                value = value_map.get(field.id)
                formatted_value = self._format_export_value(value, field, export_request.options)
                row[field.name] = formatted_value
            
            rows.append(row)
        
        # Generate export based on format
        if export_request.options.format == "json":
            content = json.dumps(rows, indent=2).encode('utf-8')
            content_type = "application/json"
            filename = f"custom_fields_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        else:  # CSV
            output = io.StringIO()
            
            # Write header
            fieldnames = ["entity_id"] + [f.name for f in fields]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            
            if export_request.options.include_headers:
                writer.writeheader()
            
            # Write data
            writer.writerows(rows)
            
            content = output.getvalue().encode('utf-8')
            content_type = "text/csv"
            filename = f"custom_fields_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return content, content_type, filename
    
    # Statistics Methods
    
    def get_field_statistics(self, field_id: str) -> CustomFieldStats:
        """Get statistics for a field"""
        stats_dict = self.repository.get_field_statistics(field_id)
        return CustomFieldStats(**stats_dict)
    
    def get_field_history(
        self,
        field_id: Optional[str] = None,
        entity_type: Optional[EntityType] = None,
        entity_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get field value history"""
        history = self.repository.get_field_history(
            field_id,
            entity_type,
            entity_id,
            limit
        )
        
        # Format history entries
        formatted_history = []
        for entry in history:
            field = self.repository.get_field_definition(entry.field_id)
            formatted_history.append({
                "id": entry.id,
                "field_id": entry.field_id,
                "field_name": field.name if field else "Unknown",
                "entity_type": entry.entity_type,
                "entity_id": entry.entity_id,
                "old_value": entry.old_value,
                "new_value": entry.new_value,
                "changed_by": entry.changed_by,
                "changed_at": entry.changed_at,
                "change_reason": entry.change_reason
            })
        
        return formatted_history
    
    # Validation Methods
    
    def _validate_field_configuration(self, field: CustomFieldIn) -> None:
        """Validate field configuration based on type"""
        config = field.configuration
        
        if field.field_type in [FieldType.SELECT, FieldType.MULTI_SELECT]:
            if not config.options:
                raise ValueError(f"{field.field_type} fields must have at least one option")
            
            # Check for duplicate option values
            values = [opt.value for opt in config.options]
            if len(values) != len(set(values)):
                raise ValueError("Option values must be unique")
        
        elif field.field_type == FieldType.NUMBER:
            if field.validation_rules:
                rules = field.validation_rules
                if rules.min_value is not None and rules.max_value is not None:
                    if rules.min_value > rules.max_value:
                        raise ValueError("min_value cannot be greater than max_value")
        
        elif field.field_type == FieldType.FORMULA:
            if not config.formula:
                raise ValueError("Formula fields must have a formula")
            # TODO: Validate formula syntax
    
    def _validate_field_value(self, field: CustomFieldDefinition, value: Any) -> None:
        """Validate a field value against field rules"""
        rules = field.validation_rules
        config = field.configuration
        
        # Check required
        if rules.required and value is None:
            raise ValueError(f"Field '{field.name}' is required")
        
        if value is None:
            return  # No further validation needed for null values
        
        # Type-specific validation
        if field.field_type == FieldType.TEXT:
            if not isinstance(value, str):
                raise ValueError(f"Text field requires string value")
            
            if rules.min_length and len(value) < rules.min_length:
                raise ValueError(f"Text must be at least {rules.min_length} characters")
            
            if rules.max_length and len(value) > rules.max_length:
                raise ValueError(f"Text must be at most {rules.max_length} characters")
            
            if rules.pattern:
                import re
                if not re.match(rules.pattern, value):
                    raise ValueError(f"Text does not match required pattern")
        
        elif field.field_type in [FieldType.NUMBER, FieldType.CURRENCY, FieldType.PERCENTAGE]:
            try:
                num_value = float(value)
            except:
                raise ValueError(f"Invalid number value")
            
            if rules.min_value is not None and num_value < rules.min_value:
                raise ValueError(f"Value must be at least {rules.min_value}")
            
            if rules.max_value is not None and num_value > rules.max_value:
                raise ValueError(f"Value must be at most {rules.max_value}")
        
        elif field.field_type == FieldType.SELECT:
            valid_values = [opt.value for opt in config.options]
            if value not in valid_values and not config.allow_custom:
                raise ValueError(f"Invalid option: {value}")
        
        elif field.field_type == FieldType.MULTI_SELECT:
            if not isinstance(value, list):
                raise ValueError("Multi-select field requires list value")
            
            valid_values = [opt.value for opt in config.options]
            for v in value:
                if v not in valid_values and not config.allow_custom:
                    raise ValueError(f"Invalid option: {v}")
            
            if config.max_selections and len(value) > config.max_selections:
                raise ValueError(f"Maximum {config.max_selections} selections allowed")
            
            if config.min_selections and len(value) < config.min_selections:
                raise ValueError(f"Minimum {config.min_selections} selections required")
        
        elif field.field_type == FieldType.EMAIL:
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, value):
                raise ValueError("Invalid email address")
        
        elif field.field_type == FieldType.URL:
            import re
            url_pattern = r'^https?://[^\s]+$'
            if not re.match(url_pattern, value):
                raise ValueError("Invalid URL")
        
        elif field.field_type == FieldType.DATE:
            # Validate date format
            try:
                datetime.fromisoformat(value.replace('Z', '+00:00'))
            except:
                raise ValueError("Invalid date format")
    
    def _convert_import_value(self, value: str, field: CustomFieldDefinition) -> Any:
        """Convert imported string value to appropriate type"""
        if not value or value.strip() == "":
            return None
        
        value = value.strip()
        
        if field.field_type in [FieldType.NUMBER, FieldType.CURRENCY, FieldType.PERCENTAGE]:
            try:
                return float(value)
            except:
                raise ValueError(f"Invalid number: {value}")
        
        elif field.field_type == FieldType.CHECKBOX:
            return value.lower() in ["true", "yes", "1", "on"]
        
        elif field.field_type in [FieldType.MULTI_SELECT, FieldType.TAGS]:
            # Split by comma
            return [v.strip() for v in value.split(",") if v.strip()]
        
        elif field.field_type == FieldType.DATE:
            # Try to parse various date formats
            for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"]:
                try:
                    dt = datetime.strptime(value, fmt)
                    return dt.isoformat()
                except:
                    continue
            raise ValueError(f"Could not parse date: {value}")
        
        else:
            return value
    
    def _format_export_value(self, value: Any, field: CustomFieldDefinition, options: Any) -> str:
        """Format value for export"""
        if value is None:
            return ""
        
        if field.field_type == FieldType.DATE and value:
            try:
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                if options.date_format == "MM/DD/YYYY":
                    return dt.strftime("%m/%d/%Y")
                else:
                    return dt.strftime("%Y-%m-%d")
            except:
                return str(value)
        
        elif field.field_type in [FieldType.MULTI_SELECT, FieldType.TAGS]:
            if isinstance(value, dict) and "values" in value:
                return ", ".join(value["values"])
            elif isinstance(value, list):
                return ", ".join(value)
        
        elif field.field_type == FieldType.CURRENCY:
            try:
                return f"{float(value):.2f}"
            except:
                return str(value)
        
        return str(value)