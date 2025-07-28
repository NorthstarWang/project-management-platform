'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import { 
  Settings,
  Save,
  X,
  Plus,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { 
  CustomFieldDefinition, 
  EntityType,
  BulkFieldValueUpdate 
} from '@/types/custom-fields';
import { FieldValueEditor } from './FieldValueEditor';
import customFieldsService from '@/services/customFieldsService';
import { toast } from '@/components/ui/CustomToast';
import { cn } from '@/lib/utils';

interface CustomFieldsSectionProps {
  entityType: EntityType;
  entityId: string;
  canEdit?: boolean;
  compact?: boolean;
  onManageFields?: () => void;
  className?: string;
}

export const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({
  entityType,
  entityId,
  canEdit = true,
  compact = false,
  onManageFields,
  className
}) => {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isExpanded, setIsExpanded] = useState(!compact);

  useEffect(() => {
    loadFieldsAndValues();
  }, [entityType, entityId]);

  const loadFieldsAndValues = async () => {
    setLoading(true);
    try {
      const [fieldsResponse, valuesResponse] = await Promise.all([
        customFieldsService.getFields(entityType, entityId),
        customFieldsService.getFieldValues(entityType, entityId)
      ]);

      setFields(fieldsResponse.fields || []);
      
      // Convert values array to object
      const valuesMap: Record<string, any> = {};
      if (valuesResponse && valuesResponse.values && Array.isArray(valuesResponse.values)) {
        valuesResponse.values.forEach((v: any) => {
          valuesMap[v.field_id] = v.value;
        });
      }
      setValues(valuesMap);
      setEditedValues(valuesMap);
    } catch (error) {
      console.error('Failed to load custom fields:', error);
      // Don't show error toast for expected 404s when no custom fields exist
      if (error instanceof Error && !error.message.includes('404')) {
        toast.error('Failed to load custom fields');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateField = (field: CustomFieldDefinition, value: any): string | null => {
    if (field.required && !value) {
      return `${field.name} is required`;
    }

    // Add more validation based on field type and rules
    const rules = field.validation_rules;
    
    if (field.field_type === 'text' && value) {
      if (rules.min_length && value.length < rules.min_length) {
        return `Minimum ${rules.min_length} characters required`;
      }
      if (rules.max_length && value.length > rules.max_length) {
        return `Maximum ${rules.max_length} characters allowed`;
      }
    }

    if ((field.field_type === 'number' || field.field_type === 'currency' || field.field_type === 'percentage') && value !== null) {
      const numValue = parseFloat(value);
      if (rules.min_value !== undefined && numValue < rules.min_value) {
        return `Minimum value is ${rules.min_value}`;
      }
      if (rules.max_value !== undefined && numValue > rules.max_value) {
        return `Maximum value is ${rules.max_value}`;
      }
    }

    return null;
  };

  const handleSave = async () => {
    // Validate all fields
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    fields.forEach(field => {
      const error = validateField(field, editedValues[field.id]);
      if (error) {
        newErrors[field.id] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);

    if (hasErrors) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setSaving(true);
    try {
      // Prepare bulk update
      const fieldValues = fields.map(field => ({
        field_id: field.id,
        value: editedValues[field.id] ?? null
      }));

      const bulkUpdate: BulkFieldValueUpdate = {
        entity_type: entityType,
        entity_id: entityId,
        values: fieldValues
      };

      await customFieldsService.setFieldValues(bulkUpdate);
      
      setValues(editedValues);
      setIsEditing(false);
      
      toast.success('Custom fields saved successfully');
    } catch (error) {
      toast.error('Failed to save custom fields');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedValues(values);
    setErrors({});
    setIsEditing(false);
  };

  const handleValueChange = (fieldId: string, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const visibleFields = isEditing 
    ? fields 
    : fields.filter(f => f.show_in_details && values[f.id] !== null && values[f.id] !== undefined);

  if (loading) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  if (fields.length === 0 && !onManageFields) {
    return null;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {compact && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            <h3 className="font-semibold">Custom Fields</h3>
            {!isExpanded && visibleFields.length > 0 && (
              <span className="text-sm text-gray-500">
                ({visibleFields.length} fields)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !isEditing && fields.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
            {onManageFields && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onManageFields}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {isExpanded && (
          <>
            {fields.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No custom fields configured</p>
                {onManageFields && (
                  <Button variant="outline" size="sm" onClick={onManageFields}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Custom Fields
                  </Button>
                )}
              </div>
            ) : visibleFields.length === 0 && !isEditing ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No custom field values set</p>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setIsEditing(true)}
                  >
                    Add Values
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className={compact ? "max-h-96" : ""}>
                <div className="space-y-4">
                  {visibleFields.map((field, index) => (
                    <div key={field.id}>
                      {index > 0 && <Separator className="mb-4" />}
                      <FieldValueEditor
                        field={field}
                        value={isEditing ? editedValues[field.id] : values[field.id]}
                        onChange={(value) => handleValueChange(field.id, value)}
                        error={errors[field.id]}
                        disabled={!isEditing}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {isEditing && (
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};