export interface FilamentData {
  // Core required fields
  Brand: string;
  'Filament type': string;
  
  // Common optional fields (for backwards compatibility)
  Base?: string;
  Color?: string;
  Fibers?: string;
  'Tensile (kg)'?: number;
  'Layer adhesion (kg)'?: number;
  'Layer/Tensile %'?: number;
  'Shear stress (kg)'?: number;
  'Shear (vertical)'?: number;
  'Bending 2mm deform (kg)'?: number;
  'Bending max load (kg)'?: number;
  'Torque 90° (Nm)'?: number;
  'Max Torque (Nm)'?: number;
  'Max Torque (vert)'?: number;
  'IZOD impact test kJ/m2'?: number;
  'Flexural modulus'?: number;
  'Filament bend'?: number;
  Price?: number;
  'Deform temp'?: number;
  'Prt temp'?: string;
  '3D printer'?: string;
  'YouTube Link'?: string;
  Date?: number;
  
  // Allow any additional columns dynamically
  [key: string]: string | number | undefined;
}

export interface FilterState {
  brands: string[];
  baseMaterials: string[];
  fiberBlends: string[];
  searchText: string;
  numericFilters: {
    [key: string]: {
      min: number;
      max: number;
    };
  };
}

export interface ChartConfig {
  xAxis: string;
  yAxis: string;
  type: 'scatter' | 'bar' | 'radar';
}