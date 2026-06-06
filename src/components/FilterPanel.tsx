import React, { useState } from 'react';
import { FilamentData, FilterState } from '../types';

interface FilterPanelProps {
  data: FilamentData[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// Custom component for dual-mode numerical input (slider + text input)
const DualModeNumericInput: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step, onChange }) => {
  // Validate and sanitize inputs
  const safeValue = isNaN(value) || !isFinite(value) ? min : Math.max(min, Math.min(max, value));
  const safeMin = isNaN(min) || !isFinite(min) ? 0 : min;
  const safeMax = isNaN(max) || !isFinite(max) ? 100 : Math.max(safeMin + 1, max);
  const safeStep = isNaN(step) || step <= 0 ? 0.1 : step;

  const [isTextMode, setIsTextMode] = useState(false);
  const [tempValue, setTempValue] = useState(safeValue.toString());

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    if (!isNaN(newValue) && isFinite(newValue)) {
      onChange(newValue);
    }
  };

  const handleTextClick = () => {
    setIsTextMode(true);
    setTempValue(safeValue.toString());
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempValue(e.target.value);
  };

  const handleTextBlur = () => {
    const newValue = Number(tempValue);
    if (!isNaN(newValue) && isFinite(newValue) && newValue >= safeMin && newValue <= safeMax) {
      onChange(newValue);
    }
    setIsTextMode(false);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTextBlur();
    } else if (e.key === 'Escape') {
      setTempValue(safeValue.toString());
      setIsTextMode(false);
    }
  };

  return (
    <div className="flex-1">
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="relative">
        {isTextMode ? (
          <input
            type="number"
            value={tempValue}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleTextKeyDown}
            min={safeMin}
            max={safeMax}
            step={safeStep}
            autoFocus
            className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          />
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleTextClick}
              className="w-full text-left px-2 py-1 text-sm border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-text"
            >
              {safeValue.toFixed(1)}
            </button>
            <input
              type="range"
              min={safeMin}
              max={safeMax}
              step={safeStep}
              value={safeValue}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        )}
      </div>
    </div>
  );
};

const fiberNames: Record<string, string> = {
  cf: 'Carbon Fiber',
  gf: 'Glass Fiber',
  gr: 'Graphene',
  kf: 'Kynar Fiber',
};

const fiberDisplayName = (fiber: string) => {
  const full = fiberNames[fiber.toLowerCase()];
  return full ? `${fiber} (${full})` : fiber;
};

const FilterPanel: React.FC<FilterPanelProps> = ({
  data,
  filters,
  onFiltersChange,
  isCollapsed,
  onToggleCollapse
}) => {
  const uniqueValues = React.useMemo(() => {
    return {
      brands: [...new Set(data.map(d => d.Brand).filter(Boolean))].sort(),
      baseMaterials: [...new Set(data.map(d => d.Base).filter((v): v is string => !!v))].sort(),
      fiberBlends: [...new Set(data.map(d => d.Fibers).filter((v): v is string => !!v))].sort()
    };
  }, [data]);

  const numericColumns = React.useMemo(() => {
    if (data.length === 0) return [];

    const columns = Object.keys(data[0]).filter(key => {
      // Check if the column has any numeric values across all rows
      const hasNumericValues = data.some(row => {
        const value = row[key];
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
      });

      // Also check if the first row value is numeric (for backwards compatibility)
      const firstValue = data[0][key];
      const firstIsNumeric = typeof firstValue === 'number' && !isNaN(firstValue) && isFinite(firstValue);

      // Exclude price columns as requested
      const isPriceColumn = key.includes('Price');

      return (hasNumericValues || firstIsNumeric) && !isPriceColumn;
    });

    return columns;
  }, [data]);

  const getMinMax = (column: string) => {
    const values = data.map(d => d[column] as number).filter(v => !isNaN(v) && isFinite(v));

    if (values.length === 0) {
      return { min: 0, max: 100 }; // Default range for empty data
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    // Ensure we have a valid range
    if (min === max) {
      return { min: min - 1, max: max + 1 }; // Add some padding if all values are the same
    }

    return { min, max };
  };

  const handleMultiSelectChange = (field: keyof FilterState, value: string) => {
    const currentValues = filters[field] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onFiltersChange({
      ...filters,
      [field]: newValues
    });
  };

  const handleNumericFilterChange = (column: string, type: 'min' | 'max', value: number) => {
    // Validate the value before setting it
    if (isNaN(value) || !isFinite(value)) {
      return; // Ignore invalid values
    }

    const { min, max } = getMinMax(column);
    const clampedValue = Math.max(min, Math.min(max, value));

    onFiltersChange({
      ...filters,
      numericFilters: {
        ...filters.numericFilters,
        [column]: {
          ...filters.numericFilters[column],
          [type]: clampedValue
        }
      }
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      brands: [],
      baseMaterials: [],
      fiberBlends: [],
      searchText: '',
      numericFilters: {}
    });
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white shadow-sm border-r">
        <button
          onClick={onToggleCollapse}
          className="w-full h-12 flex items-center justify-center hover:bg-gray-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white shadow-sm border-r overflow-y-auto">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All
            </button>
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            value={filters.searchText}
            onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
            placeholder="Search filaments..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brands ({filters.brands.length} selected)
          </label>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
            {uniqueValues.brands.map(brand => (
              <label key={brand} className="flex items-center px-3 py-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand)}
                  onChange={() => handleMultiSelectChange('brands', brand)}
                  className="mr-2"
                />
                <span className="text-sm">{brand}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Base ({filters.baseMaterials.length} selected)
          </label>
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
            {uniqueValues.baseMaterials.map(base => (
              <label key={base} className="flex items-center px-3 py-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={filters.baseMaterials.includes(base)}
                  onChange={() => handleMultiSelectChange('baseMaterials', base)}
                  className="mr-2"
                />
                <span className="text-sm">{base}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fibers ({filters.fiberBlends.length} selected)
          </label>
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
            {uniqueValues.fiberBlends.map(fiber => (
              <label key={fiber} className="flex items-center px-3 py-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={filters.fiberBlends.includes(fiber)}
                  onChange={() => handleMultiSelectChange('fiberBlends', fiber)}
                  className="mr-2"
                />
                <span className="text-sm">{fiberDisplayName(fiber)}</span>
              </label>
            ))}
          </div>
        </div>

        {numericColumns.map(column => {
          const { min, max } = getMinMax(column);
          const defaultFilter = { min, max };
          const currentFilter = filters.numericFilters[column] || defaultFilter;

          // Ensure filter values are valid
          const safeMinValue = isNaN(currentFilter.min) ? min : Math.max(min, Math.min(max, currentFilter.min));
          const safeMaxValue = isNaN(currentFilter.max) ? max : Math.max(min, Math.min(max, currentFilter.max));

          return (
            <div key={column}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {column}
              </label>
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <DualModeNumericInput
                    label="Min"
                    value={safeMinValue}
                    min={min}
                    max={max}
                    step={0.1}
                    onChange={(value) => handleNumericFilterChange(column, 'min', value)}
                  />
                  <DualModeNumericInput
                    label="Max"
                    value={safeMaxValue}
                    min={min}
                    max={max}
                    step={0.1}
                    onChange={(value) => handleNumericFilterChange(column, 'max', value)}
                  />
                </div>
                <div className="text-xs text-gray-500 text-center">
                  Full range: {min.toFixed(1)} - {max.toFixed(1)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FilterPanel;