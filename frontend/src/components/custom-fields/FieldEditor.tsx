'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import { CustomFieldDefinition, FieldType, EntityType, SelectOption } from '@/types/custom-fields';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from '@/components/ui/CustomToast';

interface FieldEditorProps {
  field?: CustomFieldDefinition;
  entityType: EntityType;
  entityId?: string;
  onSave: (field: any) => void;
  onCancel: () => void;
}

const FIELD_TYPES: { value: FieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Single line of text' },
  { value: 'number', label: 'Number', description: 'Numeric values' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'select', label: 'Select', description: 'Single selection from options' },
  { value: 'multi_select', label: 'Multi-select', description: 'Multiple selections' },
  { value: 'checkbox', label: 'Checkbox', description: 'Yes/No boolean' },
  { value: 'url', label: 'URL', description: 'Web links' },
  { value: 'email', label: 'Email', description: 'Email addresses' },
  { value: 'phone', label: 'Phone', description: 'Phone numbers' },
  { value: 'currency', label: 'Currency', description: 'Monetary values' },
  { value: 'percentage', label: 'Percentage', description: 'Percentage values' },
  { value: 'rating', label: 'Rating', description: 'Star rating' },
  { value: 'tags', label: 'Tags', description: 'Multiple text tags' },
  { value: 'user', label: 'User', description: 'Single user selection' },
  { value: 'multi_user', label: 'Multi-user', description: 'Multiple user selection' },
  { value: 'file', label: 'File', description: 'File attachments' },
  { value: 'color', label: 'Color', description: 'Color picker' },
];

const COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', 
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#6366f1'
];

export const FieldEditor: React.FC<FieldEditorProps> = ({
  field,
  entityType,
  entityId,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: field?.name || '',
    field_type: field?.field_type || 'text' as FieldType,
    description: field?.description || '',
    placeholder: field?.placeholder || '',
    required: field?.required || false,
    show_in_list: field?.show_in_list ?? true,
    show_in_details: field?.show_in_details ?? true,
    searchable: field?.searchable ?? true,
    sortable: field?.sortable ?? true,
    configuration: field?.configuration || {},
    validation_rules: field?.validation_rules || {},
    default_value: field?.default_value || null,
  });

  const [options, setOptions] = useState<SelectOption[]>(
    formData.configuration.options || [{ value: '', label: '', color: COLORS[0] }]
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldTypeChange = (newType: FieldType) => {
    setFormData(prev => ({
      ...prev,
      field_type: newType,
      configuration: {},
      validation_rules: {}
    }));
    
    // Reset options for select types
    if (newType === 'select' || newType === 'multi_select') {
      setOptions([{ value: '', label: '', color: COLORS[0] }]);
    }
  };

  const handleAddOption = () => {
    setOptions(prev => [...prev, { 
      value: '', 
      label: '', 
      color: COLORS[prev.length % COLORS.length] 
    }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, key: keyof SelectOption, value: string) => {
    setOptions(prev => prev.map((opt, i) => 
      i === index ? { ...opt, [key]: value } : opt
    ));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(options);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOptions(items);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Field name is required';
    }

    if (formData.field_type === 'select' || formData.field_type === 'multi_select') {
      const validOptions = options.filter(opt => opt.value && opt.label);
      if (validOptions.length === 0) {
        newErrors.options = 'At least one option is required';
      }
      
      // Check for duplicate values
      const values = validOptions.map(opt => opt.value);
      if (new Set(values).size !== values.length) {
        newErrors.options = 'Option values must be unique';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    const submitData = {
      ...formData,
      entity_type: entityType,
      entity_id: entityId,
    };

    // Add options for select types
    if (formData.field_type === 'select' || formData.field_type === 'multi_select') {
      submitData.configuration.options = options.filter(opt => opt.value && opt.label);
    }

    onSave(submitData);
  };

  const renderFieldConfiguration = () => {
    switch (formData.field_type) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
        return (
          <div className="space-y-4">
            <div>
              <Label>Max Length</Label>
              <Input
                type="number"
                value={formData.configuration.max_length || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  configuration: { ...prev.configuration, max_length: parseInt(e.target.value) || undefined }
                }))}
                placeholder="No limit"
              />
            </div>
          </div>
        );

      case 'number':
      case 'currency':
      case 'percentage':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Value</Label>
                <Input
                  type="number"
                  value={formData.configuration.min_value ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, min_value: parseFloat(e.target.value) || undefined }
                  }))}
                  placeholder="No minimum"
                />
              </div>
              <div>
                <Label>Max Value</Label>
                <Input
                  type="number"
                  value={formData.configuration.max_value ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, max_value: parseFloat(e.target.value) || undefined }
                  }))}
                  placeholder="No maximum"
                />
              </div>
            </div>
            {formData.field_type === 'currency' && (
              <div>
                <Label>Currency Symbol</Label>
                <Input
                  value={formData.configuration.prefix || '$'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, prefix: e.target.value }
                  }))}
                  placeholder="$"
                />
              </div>
            )}
          </div>
        );

      case 'select':
      case 'multi_select':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
            </div>
            {errors.options && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="h-4 w-4" />
                {errors.options}
              </div>
            )}
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="options">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {options.map((option, index) => (
                      <Draggable key={index} draggableId={`option-${index}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-2 p-2 rounded-md border ${
                              snapshot.isDragging ? 'bg-gray-50 shadow-lg' : 'bg-white'
                            }`}
                          >
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-gray-400" />
                            </div>
                            <div
                              className="w-6 h-6 rounded-full cursor-pointer"
                              style={{ backgroundColor: option.color }}
                              onClick={() => {
                                const colorIndex = COLORS.indexOf(option.color || COLORS[0]);
                                const nextColor = COLORS[(colorIndex + 1) % COLORS.length];
                                handleOptionChange(index, 'color', nextColor);
                              }}
                            />
                            <Input
                              value={option.value}
                              onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                              placeholder="Value"
                              className="flex-1"
                            />
                            <Input
                              value={option.label}
                              onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                              placeholder="Label"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOption(index)}
                              disabled={options.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            {formData.field_type === 'multi_select' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Selections</Label>
                  <Input
                    type="number"
                    value={formData.configuration.min_selections || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      configuration: { ...prev.configuration, min_selections: parseInt(e.target.value) || undefined }
                    }))}
                    placeholder="No minimum"
                  />
                </div>
                <div>
                  <Label>Max Selections</Label>
                  <Input
                    type="number"
                    value={formData.configuration.max_selections || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      configuration: { ...prev.configuration, max_selections: parseInt(e.target.value) || undefined }
                    }))}
                    placeholder="No maximum"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'date':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Include Time</Label>
              <Switch
                checked={formData.configuration.include_time || false}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  configuration: { ...prev.configuration, include_time: checked }
                }))}
              />
            </div>
          </div>
        );

      case 'rating':
        return (
          <div className="space-y-4">
            <div>
              <Label>Max Rating</Label>
              <Select
                value={formData.configuration.max_value?.toString() || '5'}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  configuration: { ...prev.configuration, max_value: parseInt(value) }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="10">10 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="p-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="display">Display Options</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div>
            <Label>Field Name*</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Project Status"
              error={errors.name}
            />
          </div>

          <div>
            <Label>Field Type*</Label>
            <Select
              value={formData.field_type}
              onValueChange={handleFieldTypeChange}
              disabled={!!field}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional field description"
            />
          </div>

          <div>
            <Label>Placeholder</Label>
            <Input
              value={formData.placeholder}
              onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
              placeholder="Placeholder text"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Required Field</Label>
            <Switch
              checked={formData.required}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, required: checked }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          {renderFieldConfiguration()}
        </TabsContent>

        <TabsContent value="display" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Show in List View</Label>
            <Switch
              checked={formData.show_in_list}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_in_list: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Show in Details View</Label>
            <Switch
              checked={formData.show_in_details}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_in_details: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Searchable</Label>
            <Switch
              checked={formData.searchable}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, searchable: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Sortable</Label>
            <Switch
              checked={formData.sortable}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sortable: checked }))}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          {field ? 'Update Field' : 'Create Field'}
        </Button>
      </div>
    </Card>
  );
};