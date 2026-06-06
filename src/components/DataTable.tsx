import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { FilamentData } from '../types';

interface DataTableProps {
  data: FilamentData[];
  lockedColumns: string[];
}

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

const DataTable: React.FC<DataTableProps> = ({ data, lockedColumns }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const headerCellRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const [stickyOffsets, setStickyOffsets] = useState<number[]>([]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null;
        }
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      );
    }

    if (sortConfig.direction === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // YouTube URL validation
  const isValidYouTubeUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}(&.*)?$/;
    return youtubeRegex.test(url.trim());
  };

  // Convert Excel serial date to JavaScript Date
  const excelSerialToDate = (serial: number): Date => {
    // Excel dates start from January 1, 1900 (with 1 = January 1, 1900)
    // But Excel incorrectly treats 1900 as a leap year, so we need to account for that
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const daysSinceEpoch = Math.floor(serial);
    const timeFraction = serial - daysSinceEpoch;
    
    const date = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);
    
    // Add the time portion if it exists
    if (timeFraction > 0) {
      const hours = Math.floor(timeFraction * 24);
      const minutes = Math.floor((timeFraction * 24 - hours) * 60);
      const seconds = Math.floor(((timeFraction * 24 - hours) * 60 - minutes) * 60);
      
      date.setHours(hours, minutes, seconds);
    }
    
    return date;
  };

  const formatValue = (value: any, key: string) => {
    // Handle Date columns (Excel serial numbers)
    if (key.toLowerCase().includes('date') && typeof value === 'number' && value > 1000) {
      try {
        const date = excelSerialToDate(value);
        // Check if the date is valid
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      } catch (error) {
        console.warn('Failed to convert Excel date:', value, error);
      }
    }
    
    if (typeof value === 'number') {
      if (key.includes('Temperature') || key.includes('Price')) {
        return value.toFixed(1);
      }
      return value.toFixed(2);
    }
    
    // Handle YouTube Link column
    if (key === 'YouTube Link' && value) {
      const urlString = String(value).trim();
      if (isValidYouTubeUrl(urlString)) {
        return (
          <div className="flex items-center space-x-2">
            <a
              href={urlString}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
              aria-label={`Open YouTube video in new tab`}
            >
              <span className="text-sm">Watch Video</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        );
      } else if (urlString) {
        return (
          <span className="text-gray-400 text-sm" title="Invalid YouTube URL">
            Invalid URL
          </span>
        );
      }
    }
    
    return String(value);
  };

  const handleRowClick = (index: number) => {
    setSelectedRowIndex(index === selectedRowIndex ? null : index);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRowClick(index);
    }
  };

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        No data to display
      </div>
    );
  }

  const columns = Object.keys(data[0]);

  // Locked columns first (in original order), then unlocked columns (in original order)
  const displayColumns = useMemo(() => [
    ...lockedColumns.filter(c => columns.includes(c)),
    ...columns.filter(c => !lockedColumns.includes(c)),
  ], [columns, lockedColumns]);

  const lockedCount = lockedColumns.filter(c => columns.includes(c)).length;

  useLayoutEffect(() => {
    const offsets: number[] = [];
    let cumulative = 0;
    for (let i = 0; i < lockedCount; i++) {
      offsets.push(cumulative);
      const el = headerCellRefs.current[i];
      if (el) cumulative += el.offsetWidth;
    }
    setStickyOffsets(offsets);
  }, [data, lockedCount]);

  const getStickyHeaderStyle = (colIndex: number): React.CSSProperties | undefined => {
    if (colIndex >= lockedCount) return undefined;
    return {
      position: 'sticky',
      left: stickyOffsets[colIndex] ?? 0,
      zIndex: 20,
      background: 'linear-gradient(to right, #EFF6FF, #EEF2FF)',
      ...(colIndex === lockedCount - 1 && { boxShadow: '4px 0 6px -2px rgba(0,0,0,0.15)' }),
    };
  };

  const getStickyBodyStyle = (colIndex: number, rowSelected: boolean): React.CSSProperties | undefined => {
    if (colIndex >= lockedCount) return undefined;
    return {
      position: 'sticky',
      left: stickyOffsets[colIndex] ?? 0,
      zIndex: 1,
      backgroundColor: rowSelected ? '#EFF6FF' : 'white',
      ...(colIndex === lockedCount - 1 && { boxShadow: '4px 0 6px -2px rgba(0,0,0,0.15)' }),
    };
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 min-w-0">
        <div className="h-full w-full min-w-0 overflow-x-auto overflow-y-auto">
          <div className="min-w-full lg:min-w-max">
            <table
              className="min-w-full divide-y divide-gray-200"
              role="table"
              aria-label="Filament data table"
              style={{ minWidth: `${displayColumns.length * 120}px` }}
            >
              <thead className="table-header sticky top-0 z-10">
                <tr role="row">
                  {displayColumns.map((column, colIndex) => (
                    <th
                      key={column}
                      ref={(el) => { headerCellRefs.current[colIndex] = el; }}
                      onClick={() => handleSort(column)}
                      className="table-header-cell focus-visible"
                      role="columnheader"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleSort(column)}
                      aria-sort={
                        sortConfig?.key === column
                          ? sortConfig.direction === 'asc' ? 'ascending' : 'descending'
                          : 'none'
                      }
                      aria-label={`Sort by ${column}`}
                      style={getStickyHeaderStyle(colIndex)}
                    >
                      <div className="flex items-center justify-between min-w-0">
                        <span className="truncate mr-2" title={column}>{column}</span>
                        <span className="flex-shrink-0">{getSortIcon(column)}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200" role="rowgroup">
                {sortedData.map((row, index) => (
                  <tr
                    key={index}
                    onClick={() => handleRowClick(index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    tabIndex={0}
                    role="row"
                    aria-selected={selectedRowIndex === index}
                    aria-rowindex={index + 1}
                    className={`
                      table-row focus-visible
                      ${selectedRowIndex === index ? 'table-row-selected' : ''}
                    `}
                  >
                    {displayColumns.map((column, colIndex) => (
                      <td
                        key={column}
                        className="table-cell"
                        role="gridcell"
                        aria-describedby={`col-${colIndex}-desc`}
                        style={getStickyBodyStyle(colIndex, selectedRowIndex === index)}
                      >
                        <div className="min-w-0">
                          {formatValue(row[column], column)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedRowIndex !== null && sortedData[selectedRowIndex] && (
          `Selected row ${selectedRowIndex + 1}: ${sortedData[selectedRowIndex].Brand} ${sortedData[selectedRowIndex]['Filament type']}`
        )}
      </div>

      {/* Column descriptions for screen readers */}
      {displayColumns.map((column, index) => (
        <div key={`desc-${column}`} id={`col-${index}-desc`} className="sr-only">
          {column} column data
        </div>
      ))}
    </div>
  );
};

export default DataTable;