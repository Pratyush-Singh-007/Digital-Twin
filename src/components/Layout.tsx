import React, { useState } from 'react';
import type { TabId, DataSourceStatus, LocationPreset } from '../types';
import { LOCATIONS } from '../data/locations';
import {
  LayoutDashboard,
  GitBranch,
  FlaskConical,
  BarChart3,
  Info,
  MapPin,
  Moon,
  Sun,
  Play,
  RotateCw,
  Check,
  ChevronDown,
  Terminal,
} from 'lucide-react';

interface Props {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  isDark: boolean;
  toggleTheme: () => void;
  dataSource: DataSourceStatus;
  lastUpdated: Date | null;
  location: LocationPreset;
  onSelectLocation: (loc: LocationPreset) => void;
  customLat: number;
  customLon: number;
  useCustom: boolean;
  onSetCustomCoords: (lat: number, lon: number) => void;
  onToggleCustom: (useCustom: boolean) => void;
  onStartDemo: () => void;
  onRefreshData: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  isDark,
  toggleTheme,
  dataSource,
  lastUpdated,
  location,
  onSelectLocation,
  customLat,
  customLon,
  useCustom,
  onSetCustomCoords,
  onToggleCustom,
  onStartDemo,
  onRefreshData,
  children,
}) => {
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [tempLat, setTempLat] = useState<string>(customLat.toString());
  const [tempLon, setTempLon] = useState<string>(customLon.toString());

  const navItems = [
    { id: 'dashboard' as TabId, label: 'Twin Dashboard', icon: LayoutDashboard },
    { id: 'decision' as TabId, label: 'Decision Logic', icon: GitBranch },
    { id: 'simulation' as TabId, label: 'Season Simulation', icon: FlaskConical },
    { id: 'evaluation' as TabId, label: 'Model Evaluation', icon: BarChart3 },
    { id: 'about' as TabId, label: 'About / Data', icon: Info },
  ];

  const handleApplyCustomCoords = () => {
    const lat = parseFloat(tempLat);
    const lon = parseFloat(tempLon);
    if (!isNaN(lat) && !isNaN(lon)) {
      onSetCustomCoords(lat, lon);
      onToggleCustom(true);
      setShowLocationModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-60 bg-zinc-50/50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 p-4 justify-between flex-shrink-0">
        <div className="space-y-6">
          {/* Logo & Identity */}
          <div className="px-1 flex items-center justify-between">
            <div>
              <div className="font-mono font-bold text-xs uppercase tracking-widest text-zinc-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 bg-zinc-900 dark:bg-white inline-block rounded-xs" />
                AGRI-TWIN
              </div>
              <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                UNCERTAINTY ENGINE v2.0
              </p>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500">
              CORE
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onStartDemo}
            className="w-full btn btn-primary btn-sm flex items-center justify-center gap-1.5 font-mono text-[11px]"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>RUN GUIDED DEMO</span>
          </button>

          <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 font-mono text-[10px] text-zinc-500 space-y-1">
            <div className="flex justify-between items-center text-zinc-400">
              <span>MODEL:</span>
              <span className="text-zinc-800 dark:text-zinc-200 font-semibold">RIDGE SURROGATE</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>CALIBRATION:</span>
              <span className="text-zinc-800 dark:text-zinc-200">SPLIT-CONFORMAL</span>
            </div>
            <div className="text-[9px] text-zinc-400 pt-0.5 border-t border-zinc-100 dark:border-zinc-800">
              Honest prototype benchmark
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black">
        {/* Top Header Bar */}
        <header className="bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-2.5 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3">
          {/* Location & Status Badges */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 text-xs font-mono transition-colors"
            >
              <MapPin className="w-3 h-3 text-zinc-500" />
              <span>
                {useCustom
                  ? `[${customLat.toFixed(2)}°N, ${customLon.toFixed(2)}°E]`
                  : `${location.name.toUpperCase()} (${location.state})`}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
            </button>

            {/* Data Source Badge */}
            {dataSource === 'live' ? (
              <span className="badge badge-green">LIVE OPEN-METEO</span>
            ) : dataSource === 'offline' ? (
              <span className="badge badge-amber">OFFLINE DEMO DATA</span>
            ) : dataSource === 'loading' ? (
              <span className="badge badge-blue">FETCHING...</span>
            ) : (
              <span className="badge badge-red">STREAM ERROR</span>
            )}

            <span className="badge badge-default">
              SURROGATE MODEL (DEMO)
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 font-mono text-xs">
            {lastUpdated && (
              <span className="hidden lg:inline text-zinc-400 text-[11px]">
                SYNC: {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            <button
              onClick={onRefreshData}
              title="Refresh telemetry"
              className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onStartDemo}
              className="md:hidden btn btn-primary btn-sm text-[11px]"
            >
              DEMO
            </button>
          </div>
        </header>

        {/* Mobile Tab Bar */}
        <div className="md:hidden bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex overflow-x-auto py-1 px-2 gap-1 font-mono text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content View */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Location Selector Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-950 rounded-lg max-w-md w-full p-5 border border-zinc-300 dark:border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                SELECT AGRO-CLIMATIC PRESET
              </h3>
              <button
                onClick={() => setShowLocationModal(false)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-mono text-xs"
              >
                [ESC]
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {LOCATIONS.map((loc) => {
                const isSelected = !useCustom && location.name === loc.name;
                return (
                  <button
                    key={loc.name}
                    onClick={() => {
                      onSelectLocation(loc);
                      onToggleCustom(false);
                      setShowLocationModal(false);
                    }}
                    className={`p-2.5 rounded border text-left font-mono transition-all ${
                      isSelected
                        ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {loc.name}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-zinc-900 dark:text-white" />}
                    </div>
                    <div className="text-[10px] text-zinc-500">{loc.state}</div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      CROP: {loc.crop}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Coordinates */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="font-mono text-[10px] uppercase text-zinc-400 block">
                CUSTOM COORDINATES
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[10px] text-zinc-400 block mb-0.5">LAT (°N)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tempLat}
                    onChange={(e) => setTempLat(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-zinc-400 block mb-0.5">LON (°E)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tempLon}
                    onChange={(e) => setTempLon(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <button
                onClick={handleApplyCustomCoords}
                className="w-full btn btn-primary btn-sm font-mono text-xs mt-1"
              >
                APPLY COORDINATES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
