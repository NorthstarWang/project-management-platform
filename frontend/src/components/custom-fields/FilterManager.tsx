'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { CustomDialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/CustomDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { 
  Plus, 
  Filter,
  Globe,
  Lock,
  Star,
  StarOff,
  Trash2,
  Edit,
  Play,
  X
} from 'lucide-react';
import { 
  EntityType, 
  CustomFieldFilter,
  CustomFieldDefinition,
  FilterCondition 
} from '@/types/custom-fields';
import customFieldsService from '@/services/customFieldsService';
import { toast } from '@/components/ui/CustomToast';

interface FilterManagerProps {
  entityType: EntityType;
  filters: CustomFieldFilter[];
  fields: CustomFieldDefinition[];
  onFiltersChange: () => void;
}

const OPERATORS = {
  text: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'is_null', label: 'Is empty' },
    { value: 'is_not_null', label: 'Is not empty' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'greater_or_equal', label: 'Greater or equal' },
    { value: 'less_or_equal', label: 'Less or equal' },
    { value: 'is_null', label: 'Is empty' },
    { value: 'is_not_null', label: 'Is not empty' }
  ],
  select: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'in', label: 'Is any of' },
    { value: 'not_in', label: 'Is none of' },
    { value: 'is_null', label: 'Is empty' },
    { value: 'is_not_null', label: 'Is not empty' }
  ],
  boolean: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' }
  ],
  date: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'greater_than', label: 'Is after' },
    { value: 'less_than', label: 'Is before' },
    { value: 'is_null', label: 'Is empty' },
    { value: 'is_not_null', label: 'Is not empty' }
  ]
};

export const FilterManager: React.FC<FilterManagerProps> = ({
  entityType,
  filters,
  fields,
  onFiltersChange
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState<CustomFieldFilter | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filterToDelete, setFilterToDelete] = useState<CustomFieldFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter form state
  const [filterForm, setFilterForm] = useState({
    name: '',
    description: '',
    is_public: false,
    logic: 'AND' as 'AND' | 'OR',
    conditions: [] as FilterCondition[]
  });

  const handleAddCondition = () => {
    const newCondition: FilterCondition = {
      field_id: fields[0]?.id || '',
      operator: 'equals',
      value: ''
    };
    setFilterForm(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  };

  const handleRemoveCondition = (index: number) => {
    setFilterForm(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const handleConditionChange = (index: number, key: keyof FilterCondition, value: any) => {
    setFilterForm(prev => ({
      ...prev,
      conditions: prev.conditions.map((cond, i) => 
        i === index ? { ...cond, [key]: value } : cond
      )
    }));
  };

  const getOperatorsForField = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return OPERATORS.text;

    switch (field.field_type) {
      case 'number':
      case 'currency':
      case 'percentage':
      case 'rating':
        return OPERATORS.number;
      case 'select':
      case 'multi_select':
        return OPERATORS.select;
      case 'checkbox':
        return OPERATORS.boolean;
      case 'date':
        return OPERATORS.date;
      default:
        return OPERATORS.text;
    }
  };

  const handleSaveFilter = async () => {
    if (!filterForm.name.trim()) {
      toast.error('Filter name is required');
      return;
    }

    if (filterForm.conditions.length === 0) {
      toast.error('At least one condition is required');
      return;
    }

    try {
      const filterData = {
        ...filterForm,
        entity_type: entityType,
        filter_config: {
          conditions: filterForm.conditions,
          logic: filterForm.logic
        }
      };

      if (editingFilter) {
        // TODO: Implement update filter API
        // await customFieldsService.updateFilter(editingFilter.id, filterData);
        toast.success('Filter updated successfully');
      } else {
        await customFieldsService.createFilter(filterData);
        toast.success('Filter created successfully');
      }

      setShowCreateModal(false);
      resetForm();
      onFiltersChange();
    } catch (error) {
      toast.error('Failed to save filter');
    }
  };

  const handleDeleteFilter = async () => {
    if (!filterToDelete) return;

    try {
      await customFieldsService.deleteFilter(filterToDelete.id);
      toast.success('Filter deleted successfully');
      setShowDeleteConfirm(false);
      setFilterToDelete(null);
      onFiltersChange();
    } catch (error) {
      toast.error('Failed to delete filter');
    }
  };

  const handleApplyFilter = async (filter: CustomFieldFilter) => {
    try {
      const results = await customFieldsService.applyFilter(filter.id);
      toast.success(`Found ${results.total} matching ${entityType}s`);
      // TODO: Navigate to results or update parent component
    } catch (error) {
      toast.error('Failed to apply filter');
    }
  };

  const resetForm = () => {
    setFilterForm({
      name: '',
      description: '',
      is_public: false,
      logic: 'AND',
      conditions: []
    });
    setEditingFilter(null);
  };

  const filteredFilters = filters.filter(filter =>
    filter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    filter.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Search filters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          onClick={() => {
            resetForm();
            handleAddCondition();
            setShowCreateModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Create Filter
        </Button>
      </div>

      {filteredFilters.length === 0 ? (
        <div className="text-center py-8">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No filters found</p>
          <Button 
            onClick={() => {
              resetForm();
              handleAddCondition();
              setShowCreateModal(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create First Filter
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFilters.map(filter => (
            <Card key={filter.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <div>
                    <h3 className="font-semibold">{filter.name}</h3>
                    <p className="text-sm text-gray-500">
                      {filter.filter_config.conditions.length} conditions ({filter.filter_config.logic})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {filter.is_public ? (
                    <Globe className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Lock className="h-4 w-4 text-gray-400" />
                  )}
                  {filter.is_favorite && (
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  )}
                </div>
              </div>

              {filter.description && (
                <p className="text-sm text-gray-600 mb-3">{filter.description}</p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleApplyFilter(filter)}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingFilter(filter);
                    setFilterForm({
                      name: filter.name,
                      description: filter.description || '',
                      is_public: filter.is_public,
                      logic: filter.filter_config.logic,
                      conditions: filter.filter_config.conditions
                    });
                    setShowCreateModal(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterToDelete(filter);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Filter Modal */}
      <CustomDialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFilter ? 'Edit Filter' : 'Create Filter'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Filter Name*</Label>
              <Input
                value={filterForm.name}
                onChange={(e) => setFilterForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., High Priority Tasks"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={filterForm.description}
                onChange={(e) => setFilterForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Conditions</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={filterForm.logic}
                    onValueChange={(value: 'AND' | 'OR') => 
                      setFilterForm(prev => ({ ...prev, logic: value }))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCondition}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {filterForm.conditions.map((condition, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={condition.field_id}
                      onValueChange={(value) => handleConditionChange(index, 'field_id', value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map(field => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.operator}
                      onValueChange={(value) => handleConditionChange(index, 'operator', value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOperatorsForField(condition.field_id).map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!['is_null', 'is_not_null'].includes(condition.operator) && (
                      <Input
                        value={condition.value || ''}
                        onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1"
                      />
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCondition(index)}
                      disabled={filterForm.conditions.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Make Public</Label>
              <Switch
                checked={filterForm.is_public}
                onCheckedChange={(checked) => 
                  setFilterForm(prev => ({ ...prev, is_public: checked }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFilter}>
                {editingFilter ? 'Update' : 'Create'} Filter
              </Button>
            </div>
          </div>
        </DialogContent>
      </CustomDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Filter"
        description={`Are you sure you want to delete "${filterToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteFilter}
        type="danger"
      />
    </div>
  );
};