import React, { useState, useEffect, useMemo } from 'react';
import FileUpload from './components/FileUpload';
import FilterPanel from './components/FilterPanel';
import DataTable from './components/DataTable';
import Charts from './components/Charts';
import ErrorBoundary from './components/ErrorBoundary';
import { TableSettingsDialog, RadarSettingsDialog } from './components/SettingsDialog';
import { FilamentData, FilterState, ChartConfig } from './types';
import { parseExcelFile, validateExcelData } from './utils/excel';

const App: React.FC = () => {
  const [data, setData] = useState<FilamentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'charts'>('table');
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    brands: [],
    baseMaterials: [],
    fiberBlends: [],
    searchText: '',
    numericFilters: {}
  });

  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    xAxis: '',
    yAxis: '',
    type: 'scatter'
  });

  const [lockedColumns, setLockedColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mytechfun-locked-columns');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error();
      return parsed;
    } catch {
      localStorage.removeItem('mytechfun-locked-columns');
      return [];
    }
  });
  const [tableSettingsOpen, setTableSettingsOpen] = useState(false);
  const [radarSettingsOpen, setRadarSettingsOpen] = useState(false);

  const columns = useMemo(() => data.length > 0 ? Object.keys(data[0]) : [], [data]);

  // Load persisted data on mount
  useEffect(() => {
    const savedData = localStorage.getItem('mytechfun-filament-data');
    if (savedData) {
      try {
        setData(JSON.parse(savedData));
      } catch (e) {
        console.error('Failed to load saved data:', e);
      }
    }
  }, []);

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Brand filter
      if (filters.brands.length > 0 && item.Brand && !filters.brands.includes(item.Brand)) {
        return false;
      }

      // Base material filter
      if (filters.baseMaterials.length > 0 && !filters.baseMaterials.includes(item.Base || '')) {
        return false;
      }

      // Fiber blend filter
      if (filters.fiberBlends.length > 0 && !filters.fiberBlends.includes(item.Fibers || '')) {
        return false;
      }

      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const searchableFields = [
          item.Brand,
          item['Filament type'],
          item.Base,
          item.Fibers
        ];
        
        const matches = searchableFields.some(field =>
          field && field.toLowerCase().includes(searchLower)
        );
        
        if (!matches) return false;
      }

      // Numeric range filters
      for (const [column, range] of Object.entries(filters.numericFilters)) {
        const value = item[column] as number;
        if (typeof value === 'number' && !isNaN(value)) {
          if (value < range.min || value > range.max) {
            return false;
          }
        }
      }

      return true;
    });
  }, [data, filters]);

  // Get numeric columns for chart axes
  const numericColumns = useMemo(() => {
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

      return hasNumericValues || firstIsNumeric;
    });


    return columns;
  }, [data]);

  const [radarColumns, setRadarColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mytechfun-radar-columns');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error();
      return parsed;
    } catch {
      localStorage.removeItem('mytechfun-radar-columns');
      return [];
    }
  });
  const [radarWeights, setRadarWeights] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('mytechfun-radar-weights');
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error();
      return parsed;
    } catch {
      localStorage.removeItem('mytechfun-radar-weights');
      return {};
    }
  });

  useEffect(() => {
    if (numericColumns.length > 0 && radarColumns.length === 0) {
      setRadarColumns(numericColumns.slice(0, 6));
    }
  }, [numericColumns]);

  useEffect(() => {
    localStorage.setItem('mytechfun-locked-columns', JSON.stringify(lockedColumns));
  }, [lockedColumns]);

  useEffect(() => {
    localStorage.setItem('mytechfun-radar-columns', JSON.stringify(radarColumns));
  }, [radarColumns]);

  useEffect(() => {
    localStorage.setItem('mytechfun-radar-weights', JSON.stringify(radarWeights));
  }, [radarWeights]);

  const [radarTopN, setRadarTopN] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mytechfun-radar-top-n');
      if (!saved) return 3;
      const parsed = JSON.parse(saved);
      if (typeof parsed !== 'number' || !isFinite(parsed)) throw new Error();
      return parsed;
    } catch {
      localStorage.removeItem('mytechfun-radar-top-n');
      return 3;
    }
  });

  useEffect(() => {
    localStorage.setItem('mytechfun-radar-top-n', JSON.stringify(radarTopN));
  }, [radarTopN]);

  // Set default chart axes when data changes
  useEffect(() => {
    if (numericColumns.length >= 2 && (!chartConfig.xAxis || !chartConfig.yAxis)) {
      setChartConfig(prev => ({
        ...prev,
        xAxis: prev.xAxis || numericColumns[0],
        yAxis: prev.yAxis || numericColumns[1]
      }));
    }
  }, [numericColumns, chartConfig.xAxis, chartConfig.yAxis]);

  const handleFileUpload = async (file: File) => {
    console.log('Starting file upload process.');
    setLoading(true);
    setError(null);

    try {
      console.log('Parsing Excel file.');
      const parsedData = await parseExcelFile(file);
      console.log('Excel parsing complete:', {
        rows: parsedData.length,
        columns: parsedData.length > 0 ? Object.keys(parsedData[0]) : []
      });

      const validationErrors = validateExcelData(parsedData);
      console.log('🔍 Validation results:', validationErrors);

      if (validationErrors.length > 0) {
        setError(`Data validation failed: ${validationErrors.join(', ')}`);
        setLoading(false);
        return;
      }

      console.log('Saving data to state and localStorage.');
      setData(parsedData);
      localStorage.setItem('mytechfun-filament-data', JSON.stringify(parsedData));
      console.log('Data saved successfully');

      // Reset filters when new data is loaded
      setFilters({
        brands: [],
        baseMaterials: [],
        fiberBlends: [],
        searchText: '',
        numericFilters: {}
      });

      // Reset chart state when new data is loaded
      setChartConfig({
        xAxis: '',
        yAxis: '',
        type: 'scatter'
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const handleUnloadData = () => {
    const confirmed = window.confirm(
      'Are you sure you want to unload the current dataset? This will remove all loaded filament data and filters.'
    );

    if (!confirmed) return;

    // Clear data from state
    setData([]);

    // Clear data from localStorage
    localStorage.removeItem('mytechfun-filament-data');

    // Reset all filters
    setFilters({
      brands: [],
      baseMaterials: [],
      fiberBlends: [],
      searchText: '',
      numericFilters: {}
    });

    // Reset chart configuration
    setChartConfig({
      xAxis: '',
      yAxis: '',
      type: 'scatter'
    });

    // Switch to table view since there will be no charts
    setActiveTab('table');

    // Clear any errors
    setError(null);

    setTableSettingsOpen(false);
    setRadarSettingsOpen(false);
  };

  const handleChartAxisChange = (axis: 'xAxis' | 'yAxis', value: string) => {
    setChartConfig(prev => ({
      ...prev,
      [axis]: value
    }));
  };

  const handleChartTypeChange = (type: 'scatter' | 'bar' | 'radar') => {
    setChartConfig(prev => ({
      ...prev,
      type
    }));
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-gray-600">Loading...</span>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MyTechFun Filament Viewer</h1>
            <p className="text-sm text-gray-600">
              {data.length > 0 
                ? `${filteredData.length} of ${data.length} filaments` 
                : 'Upload an Excel file to get started'
              }
            </p>
          </div>

          {data.length > 0 && (
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-200 rounded-lg">
                <button
                  onClick={() => setActiveTab('table')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'table'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'charts'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Charts
                </button>
              </div>

              <button
                onClick={handleUnloadData}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Unload current dataset"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Unload Data
              </button>

            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {data.length === 0 ? (
          // Upload screen
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-2xl">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <FileUpload onFileUpload={handleFileUpload} isLoading={loading} />
              
              <div className="mt-8 text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  About MyTechFun Filament Viewer
                </h2>
                <div className="text-sm text-gray-600 space-y-2 max-w-lg mx-auto">
                  <p>Analyze and compare 3D printer filament properties from MyTechFun Excel files.</p>
                  <p>Features include:</p>
                  <ul className="text-left space-y-1 mt-2">
                    <li>• Interactive scatter plots with correlation analysis</li>
                    <li>• Comparative bar charts by material type</li>
                    <li>• Radar charts for top-performing filaments</li>
                    <li>• Advanced filtering and search capabilities</li>
                    <li>• Sortable data tables with all measurements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Filter Panel */}
            <ErrorBoundary fallback={
              <div className="w-80 bg-red-50 border-r border-red-200 flex items-center justify-center">
                <div className="text-center p-4">
                  <p className="text-red-600 text-sm">Filter panel error</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 text-xs text-red-800 underline"
                  >
                    Reload page
                  </button>
                </div>
              </div>
            }>
              <FilterPanel
                data={data}
                filters={filters}
                onFiltersChange={setFilters}
                isCollapsed={filtersCollapsed}
                onToggleCollapse={() => setFiltersCollapsed(!filtersCollapsed)}
              />
            </ErrorBoundary>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {activeTab === 'charts' && (
                /* Chart Controls */
                <div className="bg-white border-b px-6 py-4">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Chart Type:</label>
                      <select
                        value={chartConfig.type}
                        onChange={(e) => handleChartTypeChange(e.target.value as any)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Select chart type"
                      >
                        <option value="scatter">Scatter Plot</option>
                        <option value="bar">Bar Chart</option>
                        <option value="radar">Radar Chart</option>
                      </select>
                    </div>

                    {chartConfig.type === 'radar' && (
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Show top:</label>
                        <select
                          value={radarTopN}
                          onChange={e => setRadarTopN(Number(e.target.value))}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Number of top filaments to display"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <option key={n} value={n}>{n} filament{n !== 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {chartConfig.type === 'radar' && (
                      <button
                        onClick={() => setRadarSettingsOpen(true)}
                        className="flex items-center space-x-1.5 px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        aria-label="Open radar chart settings"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Settings</span>
                      </button>
                    )}

                    {chartConfig.type === 'scatter' && (
                      <>
                        <div className="flex items-center space-x-2">
                          <label className="text-sm font-medium text-gray-700">X-Axis:</label>
                          <select
                            value={chartConfig.xAxis}
                            onChange={(e) => handleChartAxisChange('xAxis', e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Select X-axis variable"
                          >
                            {numericColumns.map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <label className="text-sm font-medium text-gray-700">Y-Axis:</label>
                          <select
                            value={chartConfig.yAxis}
                            onChange={(e) => handleChartAxisChange('yAxis', e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Select Y-axis variable"
                          >
                            {numericColumns.map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'table' && (
                <div className="bg-white border-b px-6 py-3 flex items-center justify-end">
                  <button
                    onClick={() => setTableSettingsOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    aria-label="Open table settings"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Settings</span>
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 p-6 min-h-0 min-w-0">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : activeTab === 'table' ? (
                  <ErrorBoundary fallback={
                    <div className="flex-1 flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
                      <div className="text-center p-8">
                        <div className="text-red-500 mb-4">
                          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-red-800 mb-2">Table Display Error</h3>
                        <p className="text-red-600 text-sm mb-4">There was an error displaying the data table.</p>
                        <button
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Reload Page
                        </button>
                      </div>
                    </div>
                  }>
                    <DataTable data={filteredData} lockedColumns={lockedColumns} />
                  </ErrorBoundary>
                ) : (
                  <ErrorBoundary fallback={
                    <div className="flex-1 flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
                      <div className="text-center p-8">
                        <div className="text-red-500 mb-4">
                          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-red-800 mb-2">Chart Display Error</h3>
                        <p className="text-red-600 text-sm mb-4">There was an error displaying the charts.</p>
                        <button
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Reload Page
                        </button>
                      </div>
                    </div>
                  }>
                    <Charts
                      data={filteredData}
                      chartType={chartConfig.type}
                      xAxis={chartConfig.xAxis}
                      yAxis={chartConfig.yAxis}
                      radarColumns={radarColumns}
                      radarWeights={radarWeights}
                      radarTopN={radarTopN}
                    />
                  </ErrorBoundary>
                )}
              </div>
            </div>
          </>
        )}
        </div>
      </div>
      <TableSettingsDialog
        isOpen={tableSettingsOpen}
        onClose={() => setTableSettingsOpen(false)}
        columns={columns}
        lockedColumns={lockedColumns}
        onLockedColumnsChange={setLockedColumns}
      />
      <RadarSettingsDialog
        isOpen={radarSettingsOpen}
        onClose={() => setRadarSettingsOpen(false)}
        numericColumns={numericColumns}
        radarColumns={radarColumns}
        onRadarColumnsChange={setRadarColumns}
        radarWeights={radarWeights}
        onRadarWeightsChange={setRadarWeights}
      />
    </ErrorBoundary>
  );
};

export default App;
