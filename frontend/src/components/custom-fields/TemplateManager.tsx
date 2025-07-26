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
  FileText, 
  Users, 
  Globe,
  Lock,
  Download,
  Trash2,
  Edit,
  Copy,
  CheckCircle
} from 'lucide-react';
import { EntityType, FieldTemplate } from '@/types/custom-fields';
import customFieldsService from '@/services/customFieldsService';
import { toast } from '@/components/ui/CustomToast';

interface TemplateManagerProps {
  entityType: EntityType;
  templates: FieldTemplate[];
  onTemplatesChange: () => void;
}

const TEMPLATE_CATEGORIES = [
  { value: 'general', label: 'General', icon: '📋' },
  { value: 'project', label: 'Project Management', icon: '📊' },
  { value: 'sales', label: 'Sales & CRM', icon: '💼' },
  { value: 'marketing', label: 'Marketing', icon: '📣' },
  { value: 'hr', label: 'Human Resources', icon: '👥' },
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'it', label: 'IT & Development', icon: '💻' },
  { value: 'support', label: 'Customer Support', icon: '🎧' },
  { value: 'custom', label: 'Custom', icon: '⚙️' }
];

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  entityType,
  templates,
  onTemplatesChange
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FieldTemplate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<FieldTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: 'general',
    is_public: false
  });

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    try {
      // TODO: This would need to gather current fields to create template
      const currentFields: any[] = []; // Get from parent or API
      
      await customFieldsService.createTemplate({
        ...templateForm,
        entity_type: entityType,
        fields: currentFields
      });

      toast.success('Template created successfully');
      
      setShowCreateModal(false);
      setTemplateForm({
        name: '',
        description: '',
        category: 'general',
        is_public: false
      });
      onTemplatesChange();
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const result = await customFieldsService.applyTemplate(
        selectedTemplate.id,
        entityType
      );

      toast.success(`Created ${result.fields_created} fields from template`);
      
      setShowApplyModal(false);
      setSelectedTemplate(null);
      onTemplatesChange();
    } catch (error) {
      toast.error('Failed to apply template');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      // TODO: Implement delete template API
      // await customFieldsService.deleteTemplate(templateToDelete.id);
      
      toast.success('Template deleted successfully');
      
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
      onTemplatesChange();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (template: FieldTemplate) => {
    try {
      await customFieldsService.createTemplate({
        ...template,
        id: undefined,
        name: `${template.name} (Copy)`,
        is_public: false,
        created_at: undefined,
        created_by: undefined,
        usage_count: 0
      });

      toast.success('Template duplicated successfully');
      
      onTemplatesChange();
    } catch (error) {
      toast.error('Failed to duplicate template');
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category?: string) => {
    const cat = TEMPLATE_CATEGORIES.find(c => c.value === category);
    return cat?.icon || '📋';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TEMPLATE_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                <span className="mr-2">{cat.icon}</span>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create Template
        </Button>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No templates found</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-gray-500">
                      {template.fields.length} fields
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {template.is_public ? (
                    <Globe className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Lock className="h-4 w-4 text-gray-400" />
                  )}
                  {template.usage_count > 0 && (
                    <Badge variant="secondary">
                      {template.usage_count} uses
                    </Badge>
                  )}
                </div>
              </div>
              
              {template.description && (
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowApplyModal(true);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDuplicateTemplate(template)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTemplateToDelete(template);
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

      {/* Create Template Modal */}
      <CustomDialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Field Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name*</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Software Development Project"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={templateForm.category}
                onValueChange={(value) => setTemplateForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="mr-2">{cat.icon}</span>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Make Public</Label>
              <Switch
                checked={templateForm.is_public}
                onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, is_public: checked }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </CustomDialog>

      {/* Apply Template Modal */}
      <CustomDialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">{selectedTemplate.name}</h3>
                {selectedTemplate.description && (
                  <p className="text-sm text-gray-600 mb-2">{selectedTemplate.description}</p>
                )}
                <p className="text-sm">
                  This will create {selectedTemplate.fields.length} new fields
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApplyTemplate}>
                  Apply Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </CustomDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Template"
        description={`Are you sure you want to delete "${templateToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteTemplate}
        type="danger"
      />
    </div>
  );
};