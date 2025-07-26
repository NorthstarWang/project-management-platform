'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CustomDialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/CustomDialog';
import { 
  Plus, 
  Search, 
  Filter,
  Download,
  Upload,
  Settings,
  Trash2,
  Edit,
  GripVertical,
  Archive,
  Eye,
  EyeOff,
  Copy,
  FileText,
  BarChart
} from 'lucide-react';
import { 
  CustomFieldDefinition, 
  EntityType,
  FieldTemplate,
  CustomFieldFilter 
} from '@/types/custom-fields';
import { FieldEditor } from './FieldEditor';
import { TemplateManager } from './TemplateManager';
import { FilterManager } from './FilterManager';
import { ImportExportModal } from './ImportExportModal';
import customFieldsService from '@/services/customFieldsService';
import { toast } from '@/components/ui/CustomToast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface CustomFieldsManagerProps {
  entityType: EntityType;
  entityId?: string;
  currentUser: any;
}

export const CustomFieldsManager: React.FC<CustomFieldsManagerProps> = ({
  entityType,
  entityId,
  currentUser
}) => {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [templates, setTemplates] = useState<FieldTemplate[]>([]);
  const [filters, setFilters] = useState<CustomFieldFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('fields');
  const [showArchived, setShowArchived] = useState(false);
  
  // Modals
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | undefined>();
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showFilterManager, setShowFilterManager] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomFieldDefinition | null>(null);

  useEffect(() => {
    loadData();
  }, [entityType, entityId, showArchived]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fieldsData, templatesData, filtersData] = await Promise.all([
        customFieldsService.getFields(entityType, entityId, showArchived),
        customFieldsService.getTemplates(entityType),
        customFieldsService.getFilters(entityType)
      ]);

      setFields(fieldsData.fields || []);
      setTemplates(templatesData);
      setFilters(filtersData);
    } catch (error) {
      toast.error('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateField = () => {
    setEditingField(undefined);
    setShowFieldEditor(true);
  };

  const handleEditField = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setShowFieldEditor(true);
  };

  const handleSaveField = async (fieldData: any) => {
    try {
      if (editingField) {
        await customFieldsService.updateField(editingField.id, fieldData);
        toast.success('Field updated successfully');
      } else {
        await customFieldsService.createField(fieldData);
        toast.success('Field created successfully');
      }
      setShowFieldEditor(false);
      loadData();
    } catch (error) {
      toast.error('Failed to save field');
    }
  };

  const handleDeleteField = async () => {
    if (!fieldToDelete) return;

    try {
      await customFieldsService.deleteField(fieldToDelete.id);
      toast.success('Field deleted successfully');
      setShowDeleteConfirm(false);
      setFieldToDelete(null);
      loadData();
    } catch (error) {
      toast.error('Failed to delete field');
    }
  };

  const handleArchiveField = async (field: CustomFieldDefinition) => {
    try {
      await customFieldsService.updateField(field.id, { archived: !field.archived });
      toast.success(field.archived ? 'Field restored' : 'Field archived');
      loadData();
    } catch (error) {
      toast.error('Failed to update field');
    }
  };

  const handleDuplicateField = async (field: CustomFieldDefinition) => {
    const duplicateData = {
      ...field,
      name: `${field.name} (Copy)`,
      id: undefined,
      created_at: undefined,
      updated_at: undefined
    };
    
    try {
      await customFieldsService.createField(duplicateData);
      toast.success('Field duplicated successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to duplicate field');
    }
  };

  const handleFieldReorder = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updates = items.map((field, index) => ({
      id: field.id,
      position: index
    }));

    setFields(items);

    // TODO: Implement batch position update API
    try {
      // await customFieldsService.updateFieldPositions(updates);
      toast.success('Fields reordered successfully');
    } catch (error) {
      toast.error('Failed to reorder fields');
      loadData(); // Reload on error
    }
  };

  const filteredFields = fields.filter(field => 
    field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFieldTypeIcon = (fieldType: string) => {
    const icons: Record<string, string> = {
      text: '📝',
      number: '#️⃣',
      date: '📅',
      select: '📋',
      multi_select: '📋',
      checkbox: '☑️',
      url: '🔗',
      email: '📧',
      phone: '📞',
      currency: '💰',
      percentage: '%',
      rating: '⭐',
      tags: '🏷️',
      user: '👤',
      multi_user: '👥',
      file: '📎',
      color: '🎨'
    };
    return icons[fieldType] || '📄';
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Custom Fields</h2>
            <p className="text-gray-500">Manage custom fields for {entityType}s</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowImportExport(true)}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import/Export
            </Button>
            <Button onClick={handleCreateField}>
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fields">Fields ({fields.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
            <TabsTrigger value="filters">Filters ({filters.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowArchived(!showArchived)}
              >
                {showArchived ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="ml-1">{showArchived ? 'Hide' : 'Show'} Archived</span>
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading fields...</div>
            ) : filteredFields.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No custom fields found</p>
                <Button onClick={handleCreateField}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Field
                </Button>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleFieldReorder}>
                <Droppable droppableId="fields">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {filteredFields.map((field, index) => (
                        <Draggable key={field.id} draggableId={field.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`p-4 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                                  </div>
                                  <span className="text-2xl">{getFieldTypeIcon(field.field_type)}</span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold">{field.name}</h3>
                                      {field.required && <Badge variant="secondary">Required</Badge>}
                                      {field.archived && <Badge variant="outline">Archived</Badge>}
                                    </div>
                                    <p className="text-sm text-gray-500">
                                      {field.description || field.field_type}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditField(field)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDuplicateField(field)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleArchiveField(field)}
                                  >
                                    <Archive className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setFieldToDelete(field);
                                      setShowDeleteConfirm(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </TabsContent>

          <TabsContent value="templates">
            <TemplateManager
              entityType={entityType}
              templates={templates}
              onTemplatesChange={loadData}
            />
          </TabsContent>

          <TabsContent value="filters">
            <FilterManager
              entityType={entityType}
              filters={filters}
              fields={fields}
              onFiltersChange={loadData}
            />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Field Editor Modal */}
      <CustomDialog open={showFieldEditor} onOpenChange={setShowFieldEditor}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Edit Custom Field' : 'Create Custom Field'}
            </DialogTitle>
          </DialogHeader>
          <FieldEditor
            field={editingField}
            entityType={entityType}
            entityId={entityId}
            onSave={handleSaveField}
            onCancel={() => setShowFieldEditor(false)}
          />
        </DialogContent>
      </CustomDialog>

      {/* Import/Export Modal */}
      {showImportExport && (
        <ImportExportModal
          entityType={entityType}
          fields={fields}
          onClose={() => setShowImportExport(false)}
          onImportComplete={loadData}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Field"
        description={`Are you sure you want to delete "${fieldToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteField}
        type="danger"
      />
    </div>
  );
};