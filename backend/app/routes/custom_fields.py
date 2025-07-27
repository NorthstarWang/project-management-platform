from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from typing import List, Optional, Dict, Any
from ..models.custom_field_models import (
    CustomFieldIn, CustomFieldUpdate, CustomFieldDefinition,
    BulkFieldValueUpdate, CustomFieldResponse,
    FieldTemplate, FieldTemplateIn, CustomFieldFilter, CustomFieldFilterIn,
    ImportRequest, ExportRequest, BulkFieldOperation,
    FieldSearchQuery, CustomFieldStats,
    EntityType
)
from ..services.custom_field_service import CustomFieldService
from ..logger import logger
from .dependencies import get_current_user
from ..data_manager import data_manager

router = APIRouter(prefix="/api/custom-fields", tags=["custom-fields"])
custom_field_service = data_manager.custom_field_service

# Field Definition Endpoints

@router.post("", response_model=CustomFieldDefinition, status_code=201)
async def create_custom_field(
    field_data: CustomFieldIn,
    current_user: dict = Depends(get_current_user)
):
    """Create a new custom field definition"""
    try:
        field = custom_field_service.create_field(field_data, current_user["id"])
        
        # Log the action
        logger.log_action(
            current_user.get("session_id"),
            "CUSTOM_FIELD_CREATED",
            {
                "text": f"User created custom field '{field.name}' of type {field.field_type}",
                "field_id": field.id,
                "field_name": field.name,
                "field_type": field.field_type,
                "entity_type": field.entity_type,
                "user_id": current_user["id"]
            }
        )
        
        return field
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=Dict[str, Any])
async def get_custom_fields(
    entity_type: EntityType,
    entity_id: Optional[str] = None,
    include_archived: bool = False,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get custom fields for an entity type"""
    try:
        query = FieldSearchQuery(
            entity_type=entity_type,
            include_archived=include_archived,
            page=page,
            per_page=per_page
        )
        
        result = custom_field_service.search_fields(query)
        
        # Log the action
        logger.log_action(
            current_user.get("session_id"),
            "CUSTOM_FIELDS_VIEWED",
            {
                "text": f"User viewed custom fields for {entity_type}",
                "entity_type": entity_type,
                "entity_id": entity_id,
                "result_count": result["total"]
            }
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Move /values endpoint before /{field_id} to prevent route matching issues
@router.get("/values", response_model=Dict[str, Any])
async def get_field_values(
    entity_type: EntityType = Query(...),
    entity_id: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Get all custom field values for an entity"""
    try:
        values = custom_field_service.get_entity_field_values(entity_type, entity_id)
        
        return {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "values": values
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{field_id}", response_model=CustomFieldDefinition)
async def get_custom_field(
    field_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific custom field by ID"""
    field = custom_field_service.get_field(field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    return field

@router.put("/{field_id}", response_model=CustomFieldDefinition)
async def update_custom_field(
    field_id: str,
    updates: CustomFieldUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a custom field definition"""
    try:
        # Check if user is admin or field creator
        field = custom_field_service.get_field(field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        
        if current_user["role"] != "admin" and field.created_by != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only update fields you created")
        
        updated_field = custom_field_service.update_field(field_id, updates, current_user["id"])
        if not updated_field:
            raise HTTPException(status_code=404, detail="Field not found")
        
        # Log the action
        logger.log_action(
            current_user.get("session_id"),
            "CUSTOM_FIELD_UPDATED",
            {
                "text": f"User updated custom field '{updated_field.name}'",
                "field_id": field_id,
                "field_name": updated_field.name,
                "changes": updates.dict(exclude_unset=True)
            }
        )
        
        return updated_field
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{field_id}", response_model=CustomFieldResponse)
async def delete_custom_field(
    field_id: str,
    delete_values: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    """Delete a custom field (soft delete by default)"""
    try:
        # Check if user is admin or field creator
        field = custom_field_service.get_field(field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        
        if current_user["role"] != "admin" and field.created_by != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only delete fields you created")
        
        success = custom_field_service.delete_field(field_id, delete_values)
        
        if success:
            # Log the action
            logger.log_action(
                current_user.get("session_id"),
                "CUSTOM_FIELD_DELETED",
                {
                    "text": f"User deleted custom field '{field.name}'",
                    "field_id": field_id,
                    "field_name": field.name,
                    "delete_values": delete_values
                }
            )
            
            return CustomFieldResponse(
                success=True,
                message=f"Field '{field.name}' deleted successfully"
            )
        else:
            return CustomFieldResponse(
                success=False,
                message="Failed to delete field"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Field Value Endpoints

@router.post("/values", response_model=Dict[str, Any])
async def set_field_values(
    bulk_update: BulkFieldValueUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Set custom field values for an entity"""
    try:
        result = custom_field_service.bulk_update_field_values(bulk_update, current_user["id"])
        
        # Log the action
        logger.log_action(
            current_user.get("session_id"),
            "CUSTOM_FIELD_VALUES_SET",
            {
                "text": f"User set {result['updated']} custom field values for {bulk_update.entity_type}",
                "entity_type": bulk_update.entity_type,
                "entity_id": bulk_update.entity_id,
                "field_count": result['updated']
            }
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# This endpoint has been moved before /{field_id} to fix route matching

@router.post("/values/bulk", response_model=Dict[str, Any])
async def bulk_field_operation(
    operation: BulkFieldOperation,
    current_user: dict = Depends(get_current_user)
):
    """Perform bulk field operations across multiple entities"""
    try:
        # Check permissions - only admins and managers can do bulk operations
        if current_user["role"] not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions for bulk operations")
        
        result = custom_field_service.bulk_operation(operation, current_user["id"])
        
        # Log the action
        logger.log_action(
            current_user.get("session_id"),
            "CUSTOM_FIELD_BULK_OPERATION",
            {
                "text": f"User performed bulk {operation.operation} on {len(operation.entity_ids)} entities",
                "operation": operation.operation,
                "entity_type": operation.entity_type,
                "entity_count": len(operation.entity_ids),
                "result": result
            }
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Template Endpoints

@router.post("/templates", response_model=FieldTemplate, status_code=201)
async def create_template(
    template_data: FieldTemplateIn,
    current_user: dict = Depends(get_current_user)
):
    """Create a field template"""
    try:
        template = custom_field_service.create_template(template_data, current_user["id"])
        
        # Log the action
        logger.log_action(
            current_user.get("session_id"),
            "CUSTOM_FIELD_TEMPLATE_CREATED",
            {
                "text": f"User created template '{template.name}' with {len(template.fields)} fields",
                "template_id": template.id,
                "template_name": template.name,
                "field_count": len(template.fields),
                "entity_type": template.entity_type
            }
        )
        
        return template
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates", response_model=List[FieldTemplate])
async def get_templates(
    entity_type: EntityType,
    category: Optional[str] = None,
    is_public: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get field templates for an entity type"""
    try:
        templates = custom_field_service.get_templates(entity_type, category, is_public)
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/{template_id}", response_model=FieldTemplate)
async def get_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific template by ID"""
    template = custom_field_service.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.post("/templates/{template_id}/apply", response_model=Dict[str, Any])
async def apply_template(
    template_id: str,
    entity_type: EntityType,
    entity_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Apply a template to create fields"""
    try:
        result = custom_field_service.apply_template(
            template_id,
            entity_type,
            entity_id,
            current_user["id"]
        )
        
        # Log the action
        logger.log_action(
            current_user.get("session_id"),
            "CUSTOM_FIELD_TEMPLATE_APPLIED",
            {
                "text": f"User applied template and created {result['fields_created']} fields",
                "template_id": template_id,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "fields_created": result['fields_created']
            }
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Filter Endpoints

@router.post("/filters", response_model=CustomFieldFilter, status_code=201)
async def create_filter(
    filter_data: CustomFieldFilterIn,
    current_user: dict = Depends(get_current_user)
):
    """Create a saved filter"""
    try:
        filter_obj = custom_field_service.create_filter(filter_data, current_user["id"])
        
        # Log the action
        logger.log_action(
            current_user.get("session_id"),
            "CUSTOM_FIELD_FILTER_CREATED",
            {
                "text": f"User created filter '{filter_obj.name}' with {len(filter_obj.filter_config['conditions'])} conditions",
                "filter_id": filter_obj.id,
                "filter_name": filter_obj.name,
                "entity_type": filter_obj.entity_type,
                "condition_count": len(filter_obj.filter_config.get('conditions', []))
            }
        )
        
        return filter_obj
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/filters", response_model=List[CustomFieldFilter])
async def get_filters(
    entity_type: EntityType,
    is_public: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get saved filters for an entity type"""
    try:
        filters = custom_field_service.get_filters(
            entity_type,
            current_user["id"],
            is_public
        )
        return filters
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/filters/{filter_id}", response_model=CustomFieldFilter)
async def get_filter(
    filter_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific filter by ID"""
    filter_obj = custom_field_service.get_filter(filter_id)
    if not filter_obj:
        raise HTTPException(status_code=404, detail="Filter not found")
    
    # Check access
    if not filter_obj.is_public and filter_obj.created_by != current_user["id"]:
        raise HTTPException(status_code=403, detail="You don't have access to this filter")
    
    return filter_obj

@router.post("/filters/{filter_id}/apply", response_model=Dict[str, Any])
async def apply_filter(
    filter_id: str,
    additional_filters: Optional[Dict[str, Any]] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Apply a filter to get matching entities"""
    try:
        result = custom_field_service.apply_filter(
            filter_id,
            additional_filters,
            page,
            per_page
        )
        
        # Log the action
        logger.log_action(
            current_user.get("session_id"),
            "CUSTOM_FIELD_FILTER_APPLIED",
            {
                "text": f"User applied filter and found {result['total']} results",
                "filter_id": filter_id,
                "result_count": result['total'],
                "page": page
            }
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/filters/{filter_id}", response_model=CustomFieldResponse)
async def delete_filter(
    filter_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a saved filter"""
    try:
        success = custom_field_service.delete_filter(filter_id, current_user["id"])
        
        if success:
            # Log the action
            logger.log_action(
                current_user.get("session_id"),
                "CUSTOM_FIELD_FILTER_DELETED",
                {
                    "text": "User deleted filter",
                    "filter_id": filter_id
                }
            )
            
            return CustomFieldResponse(
                success=True,
                message="Filter deleted successfully"
            )
        else:
            return CustomFieldResponse(
                success=False,
                message="Filter not found"
            )
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Import/Export Endpoints

@router.post("/import")
async def import_csv(
    file: UploadFile = File(...),
    entity_type: EntityType = Query(...),
    mapping: str = Query(...),  # JSON string of mapping
    update_existing: bool = Query(True),
    skip_errors: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    """Import custom field values from CSV"""
    try:
        # Parse mapping
        import json
        try:
            mapping_dict = json.loads(mapping)
        except (json.JSONDecodeError, TypeError):
            raise ValueError("Invalid mapping JSON")
        
        # Read file content
        content = await file.read()
        
        # Create import request
        import_request = ImportRequest(
            entity_type=entity_type,
            mapping=mapping_dict,
            options={
                "update_existing": update_existing,
                "skip_errors": skip_errors
            }
        )
        
        result = custom_field_service.import_csv(content, import_request, current_user["id"])
        
        # Log the action
        logger.log_action(
            current_user.get("session_id"),
            "CUSTOM_FIELDS_IMPORTED",
            {
                "text": f"User imported {result['imported'] + result['updated']} records from CSV",
                "entity_type": entity_type,
                "imported": result['imported'],
                "updated": result['updated'],
                "errors": len(result['errors'])
            }
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export")
async def export_data(
    export_request: ExportRequest,
    current_user: dict = Depends(get_current_user)
):
    """Export custom field data"""
    try:
        content, content_type, filename = custom_field_service.export_data(export_request)
        
        # Log the action
        logger.log_action(
            current_user.get("session_id"),
            "CUSTOM_FIELDS_EXPORTED",
            {
                "text": f"User exported custom field data to {export_request.options.format}",
                "entity_type": export_request.entity_type,
                "field_count": len(export_request.field_ids),
                "format": export_request.options.format
            }
        )
        
        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Statistics and History Endpoints

@router.get("/{field_id}/stats", response_model=CustomFieldStats)
async def get_field_statistics(
    field_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get statistics for a custom field"""
    try:
        stats = custom_field_service.get_field_statistics(field_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{field_id}/history", response_model=List[Dict[str, Any]])
async def get_field_history(
    field_id: str,
    entity_type: Optional[EntityType] = None,
    entity_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user)
):
    """Get value change history for a field"""
    try:
        history = custom_field_service.get_field_history(
            field_id,
            entity_type,
            entity_id,
            limit
        )
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))