'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { CustomDialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/CustomDialog';
import { 
  Upload, 
  Download, 
  FileText,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { EntityType, CustomFieldDefinition } from '@/types/custom-fields';
import customFieldsService from '@/services/customFieldsService';
import { toast } from '@/components/ui/CustomToast';

interface ImportExportModalProps {
  entityType: EntityType;
  fields: CustomFieldDefinition[];
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportMapping {
  [csvColumn: string]: string; // CSV column -> field ID
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  entityType,
  fields,
  onClose,
  onImportComplete
}) => {
  const [activeTab, setActiveTab] = useState('export');
  
  // Export state
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>(fields.map(f => f.id));
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  
  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [updateExisting, setUpdateExisting] = useState(true);
  const [skipErrors, setSkipErrors] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    try {
      const exportRequest = {
        entity_type: entityType,
        field_ids: selectedFields,
        options: {
          format: exportFormat,
          include_headers: includeHeaders,
          date_format: dateFormat
        }
      };

      const blob = await customFieldsService.exportData(exportRequest);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `custom_fields_${entityType}_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export completed successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setImportFile(file);
    
    // Read CSV headers
    const text = await file.text();
    const lines = text.split('\n');
    if (lines.length > 0) {
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      setCsvHeaders(headers);
      
      // Auto-map if possible
      const autoMapping: ImportMapping = {
        'entity_id': 'entity_id' // Special mapping for entity ID
      };
      
      headers.forEach(header => {
        const field = fields.find(f => 
          f.name.toLowerCase() === header.toLowerCase()
        );
        if (field) {
          autoMapping[header] = field.id;
        }
      });
      
      setMapping(autoMapping);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file to import');
      return;
    }

    if (!mapping['entity_id']) {
      toast.error('Please map the entity ID column');
      return;
    }

    try {
      const results = await customFieldsService.importCSV(
        importFile,
        entityType,
        mapping,
        {
          update_existing: updateExisting,
          skip_errors: skipErrors
        }
      );

      setImportResults(results);

      if (results.errors.length === 0) {
        toast.success(`Imported ${results.imported} records, updated ${results.updated} records`);
        setTimeout(() => {
          onImportComplete();
          onClose();
        }, 2000);
      } else {
        toast.warning(`${results.imported + results.updated} records processed, ${results.errors.length} errors`);
      }
    } catch (error) {
      toast.error('Failed to import data');
    }
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  return (
    <CustomDialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import/Export Custom Fields</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">
              <Download className="h-4 w-4 mr-1" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-1" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div>
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={(v: 'csv' | 'json') => setExportFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportFormat === 'csv' && (
              <>
                <div className="flex items-center justify-between">
                  <Label>Include Headers</Label>
                  <Switch
                    checked={includeHeaders}
                    onCheckedChange={setIncludeHeaders}
                  />
                </div>
                <div>
                  <Label>Date Format</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Select Fields to Export</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFields(fields.map(f => f.id))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFields([])}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              <Card className="p-4 max-h-64 overflow-y-auto">
                {fields.map(field => (
                  <label
                    key={field.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => handleFieldToggle(field.id)}
                      className="rounded"
                    />
                    <span>{field.name}</span>
                    <span className="text-sm text-gray-500">({field.field_type})</span>
                  </label>
                ))}
              </Card>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export Data
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            {!importResults ? (
              <>
                <div>
                  <Label>Select CSV File</Label>
                  <div className="mt-1">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                  </div>
                  {importFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: {importFile.name}
                    </p>
                  )}
                </div>

                {csvHeaders.length > 0 && (
                  <>
                    <div>
                      <Label>Map CSV Columns to Fields</Label>
                      <p className="text-sm text-gray-500 mb-2">
                        Map each CSV column to the corresponding custom field
                      </p>
                      <Card className="p-4 space-y-2 max-h-64 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-2 font-semibold text-sm">
                          <div>CSV Column</div>
                          <div>Custom Field</div>
                        </div>
                        {csvHeaders.map(header => (
                          <div key={header} className="grid grid-cols-2 gap-2">
                            <div className="text-sm">{header}</div>
                            <Select
                              value={mapping[header] || ''}
                              onValueChange={(value) => 
                                setMapping(prev => ({ ...prev, [header]: value }))
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Skip" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Skip</SelectItem>
                                <SelectItem value="entity_id">Entity ID</SelectItem>
                                {fields.map(field => (
                                  <SelectItem key={field.id} value={field.id}>
                                    {field.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </Card>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Update Existing Records</Label>
                        <Switch
                          checked={updateExisting}
                          onCheckedChange={setUpdateExisting}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Skip Errors</Label>
                        <Switch
                          checked={skipErrors}
                          onCheckedChange={setSkipErrors}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={!importFile || csvHeaders.length === 0}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Import Data
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {importResults.errors.length === 0 ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-semibold">Import completed successfully!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">Import completed with errors</span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {importResults.imported}
                    </div>
                    <div className="text-sm text-gray-500">Records Imported</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {importResults.updated}
                    </div>
                    <div className="text-sm text-gray-500">Records Updated</div>
                  </Card>
                </div>

                {importResults.errors.length > 0 && (
                  <div>
                    <Label>Errors ({importResults.errors.length})</Label>
                    <Card className="p-4 max-h-48 overflow-y-auto">
                      {importResults.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-600 mb-1">
                          {error}
                        </div>
                      ))}
                    </Card>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={onClose}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </CustomDialog>
  );
};