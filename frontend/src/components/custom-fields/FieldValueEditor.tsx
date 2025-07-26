'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { 
  CustomFieldDefinition, 
  CustomFieldValue,
  SelectOption 
} from '@/types/custom-fields';
import { 
  Star, 
  StarOff, 
  X, 
  Calendar,
  Link,
  Mail,
  Phone,
  DollarSign,
  Percent,
  Hash,
  Tag,
  User,
  Users,
  Paperclip,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldValueEditorProps {
  field: CustomFieldDefinition;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const FieldValueEditor: React.FC<FieldValueEditorProps> = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
  className
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: any) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const renderFieldIcon = () => {
    switch (field.field_type) {
      case 'url': return <Link className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'currency': return <DollarSign className="h-4 w-4" />;
      case 'percentage': return <Percent className="h-4 w-4" />;
      case 'number': return <Hash className="h-4 w-4" />;
      case 'tags': return <Tag className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      case 'multi_user': return <Users className="h-4 w-4" />;
      case 'file': return <Paperclip className="h-4 w-4" />;
      case 'color': return <Palette className="h-4 w-4" />;
      case 'date': return <Calendar className="h-4 w-4" />;
      default: return null;
    }
  };

  const renderField = () => {
    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
        return (
          <Input
            type={field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : 'text'}
            value={localValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            error={error}
            leftIcon={renderFieldIcon()}
            className={className}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={localValue || ''}
            onChange={(e) => handleChange(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder={field.placeholder}
            disabled={disabled}
            error={error}
            leftIcon={renderFieldIcon()}
            className={className}
            min={field.configuration.min_value}
            max={field.configuration.max_value}
          />
        );

      case 'currency':
        return (
          <Input
            type="number"
            value={localValue || ''}
            onChange={(e) => handleChange(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder={field.placeholder}
            disabled={disabled}
            error={error}
            leftIcon={<span className="text-gray-500">{field.configuration.prefix || '$'}</span>}
            className={className}
            min={field.configuration.min_value}
            max={field.configuration.max_value}
            step="0.01"
          />
        );

      case 'percentage':
        return (
          <Input
            type="number"
            value={localValue || ''}
            onChange={(e) => handleChange(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder={field.placeholder}
            disabled={disabled}
            error={error}
            rightIcon={<Percent className="h-4 w-4" />}
            className={className}
            min={0}
            max={100}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={localValue || false}
              onCheckedChange={handleChange}
              disabled={disabled}
              id={field.id}
            />
            <Label 
              htmlFor={field.id}
              className={cn("cursor-pointer", disabled && "opacity-50 cursor-not-allowed")}
            >
              {field.name}
            </Label>
          </div>
        );

      case 'date':
        return (
          <DatePicker
            value={localValue}
            onChange={handleChange}
            placeholder={field.placeholder || 'Select date'}
            disabled={disabled}
            className={className}
          />
        );

      case 'select':
        return (
          <Select
            value={localValue || ''}
            onValueChange={handleChange}
            disabled={disabled}
          >
            <SelectTrigger className={className}>
              <SelectValue placeholder={field.placeholder || 'Select an option'}>
                {localValue && field.configuration.options?.find(opt => opt.value === localValue)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {field.configuration.options?.map((option: SelectOption) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.color && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi_select':
        const selectedValues = Array.isArray(localValue) ? localValue : [];
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedValues.length && "text-muted-foreground",
                  className
                )}
                disabled={disabled}
              >
                {selectedValues.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedValues.map((val) => {
                      const option = field.configuration.options?.find(opt => opt.value === val);
                      return option ? (
                        <Badge 
                          key={val} 
                          variant="secondary"
                          style={{ 
                            backgroundColor: option.color ? `${option.color}20` : undefined,
                            borderColor: option.color,
                            color: option.color
                          }}
                        >
                          {option.label}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <span>{field.placeholder || 'Select options'}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-2">
              <div className="space-y-1">
                {field.configuration.options?.map((option: SelectOption) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-gray-100",
                        isSelected && "bg-gray-100"
                      )}
                      onClick={() => {
                        if (isSelected) {
                          handleChange(selectedValues.filter(v => v !== option.value));
                        } else {
                          const maxSelections = field.configuration.max_selections;
                          if (!maxSelections || selectedValues.length < maxSelections) {
                            handleChange([...selectedValues, option.value]);
                          }
                        }
                      }}
                    >
                      <Checkbox checked={isSelected} />
                      <div className="flex items-center gap-2 flex-1">
                        {option.color && (
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: option.color }}
                          />
                        )}
                        <span>{option.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );

      case 'rating':
        const maxRating = field.configuration.max_value || 5;
        const currentRating = localValue || 0;
        return (
          <div className="flex gap-1">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleChange(star)}
                disabled={disabled}
                className={cn(
                  "p-1 hover:scale-110 transition-transform",
                  disabled && "cursor-not-allowed opacity-50"
                )}
              >
                {star <= currentRating ? (
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ) : (
                  <Star className="h-5 w-5 text-gray-300" />
                )}
              </button>
            ))}
            {currentRating > 0 && (
              <button
                type="button"
                onClick={() => handleChange(0)}
                disabled={disabled}
                className="p-1 ml-2"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
        );

      case 'tags':
        const tags = Array.isArray(localValue) ? localValue : [];
        
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleChange(tags.filter((_, i) => i !== index))}
                    disabled={disabled}
                    className="ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault();
                  handleChange([...tags, tagInput.trim()]);
                  setTagInput('');
                }
              }}
              placeholder="Type and press Enter to add tags"
              disabled={disabled}
              leftIcon={<Tag className="h-4 w-4" />}
            />
          </div>
        );

      case 'color':
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={localValue || '#000000'}
              onChange={(e) => handleChange(e.target.value)}
              disabled={disabled}
              className="h-10 w-20 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed"
            />
            <Input
              value={localValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="#000000"
              disabled={disabled}
              className="flex-1"
            />
          </div>
        );

      // TODO: Implement user, multi_user, file, formula, relation, lookup
      default:
        return (
          <div className="text-gray-500 text-sm">
            Field type &quot;{field.field_type}&quot; is not yet implemented
          </div>
        );
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      {field.field_type !== 'checkbox' && (
        <Label className="flex items-center gap-1">
          {field.name}
          {field.required && <span className="text-red-500">*</span>}
        </Label>
      )}
      {renderField()}
      {field.description && !error && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};