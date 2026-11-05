export interface Appliance {
  id: string;
  name: string;
  consumption: number; // in kW
  status: string;
  color: string;
  percentage: number;
  icon: 'ac' | 'ev' | 'fridge' | 'device';
}

export interface ChartDataPoint {
  time: string;
  generation: number;
  consumption: number;
}

export interface SimulatorData {
  year: number;
  savings: number;
  gridCost: number;
}

export type ViewState = 'dashboard' | 'simulator' | 'analysis' | 'calculator' | 'comparator' | 'recommender' | 'whatif' | 'history' | 'devices' | 'alerts' | 'settings';