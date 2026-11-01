import React, { useEffect, useRef, useState } from 'react';
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
  ChevronDown,
  Check,
} from 'lucide-react';
import { HeadingNote } from './HeadingNote';

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

const destinations = [
  { id: 'decision' as TabId, label: 'Decisions', description: 'Irrigation safety checks', icon: GitBranch },
  { id: 'simulation' as TabId, label: 'Simulation', description: 'Season outcomes', icon: FlaskConical },
  { id: 'evaluation' as TabId, label: 'Evaluation', description: 'Model performance', icon: BarChart3 },
  { id: 'about' as TabId, label: 'Data & About', description: 'Sources and limits', icon: Info },
];

const PageNavigation: React.FC<Pick<Props, 'activeTab' | 'setActiveTab'>> = ({ activeTab, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        pagesButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <nav aria-label="Main navigation" className="flex items-center gap-1">
      <button
        type="button"
        aria-current={activeTab === 'dashboard' ? 'page' : undefined}
        onClick={() => { setActiveTab('dashboard'); setIsOpen(false); }}
        className={`flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-zinc-200 text-zinc-950 dark:bg-zinc-700 dark:text-white' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
      >
        <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
      </button>
      <div ref={containerRef} className="relative">
        <button
          ref={pagesButtonRef}
          type="button"
          data-testid="pages-menu-button"
          aria-expanded={isOpen}
          aria-controls="pages-menu"
          onClick={() => setIsOpen((open) => !open)}
          className={`flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${activeTab !== 'dashboard' || isOpen ? 'bg-zinc-200 text-zinc-950 dark:bg-zinc-700 dark:text-white' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
        >
          Pages <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div id="pages-menu" className="absolute left-0 top-full z-50 mt-2 w-60 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {destinations.map((item) => {
              const Icon = item.icon;
              const selected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => { setActiveTab(item.id); setIsOpen(false); pagesButtonRef.current?.focus(); }}
                  className={`flex min-h-12 w-full items-center gap-3 rounded px-2.5 py-2 text-left transition-colors ${selected ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white' : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800'}`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-[10px] text-zinc-500">{item.description}</span>
                  </span>
                  {selected && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};

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
  const locationButtonRef = useRef<HTMLButtonElement>(null);
  const latitudeInputRef = useRef<HTMLInputElement>(null);
  const [tempLat, setTempLat] = useState<string>(customLat.toString());
  const [tempLon, setTempLon] = useState<string>(customLon.toString());
  const [coordinateError, setCoordinateError] = useState<string | null>(null);

  useEffect(() => {
    if (!showLocationModal) return;
    latitudeInputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowLocationModal(false);
        locationButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showLocationModal]);

  const pageCopy: Record<TabId, { title: string; description: string }> = {
    dashboard: { title: 'Dashboard', description: 'Live field conditions' },
    decision: { title: 'Decisions', description: 'Irrigation safety checks' },
    simulation: { title: 'Simulation', description: 'Season outcomes' },
    evaluation: { title: 'Evaluation', description: 'Model performance' },
    about: { title: 'Data & About', description: 'Sources and limitations' },
  };
  const currentPage = pageCopy[activeTab];

  const handleApplyCustomCoords = () => {
    const lat = parseFloat(tempLat);
    const lon = parseFloat(tempLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setCoordinateError('Enter a valid latitude and longitude.');
      return;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setCoordinateError('Latitude must be −90 to 90; longitude −180 to 180.');
      return;
    }
    setCoordinateError(null);
    onSetCustomCoords(lat, lon);
    onToggleCustom(true);
    setShowLocationModal(false);
    locationButtonRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-earth-300 selection:text-zinc-900">
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-100 dark:bg-zinc-900">
        {/* Top Header Bar */}
        <header className="bg-white/95 dark:bg-zinc-800/95 border-b border-zinc-200 dark:border-zinc-700 px-4 md:px-7 py-3 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
            <div className="font-semibold tracking-tight text-sm text-zinc-900 dark:text-white">AgriTwin</div>
            <PageNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
            <button
              ref={locationButtonRef}
              onClick={() => {
                setTempLat((useCustom ? customLat : location.lat).toString());
                setTempLon((useCustom ? customLon : location.lon).toString());
                setCoordinateError(null);
                setShowLocationModal(true);
              }}
              aria-label="Choose field location"
              aria-haspopup="dialog"
              className="flex min-h-10 items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono transition-colors hover:border-clay"
              style={{ background: 'var(--surface-raised)', color: 'var(--ink)', borderColor: 'var(--border)' }}
            >
              <MapPin className="w-3 h-3 text-zinc-500" />
              <span data-testid="current-location">
                {useCustom
                  ? `[${Math.abs(customLat).toFixed(2)}°${customLat < 0 ? 'S' : 'N'}, ${Math.abs(customLon).toFixed(2)}°${customLon < 0 ? 'W' : 'E'}]`
                  : `${location.name.toUpperCase()} (${location.state})`}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
            </button>

            {/* Data Source Badge */}
            {dataSource === 'live' ? (
              <span data-testid="source-status" role="status" aria-live="polite" className="badge badge-green">LIVE OPEN-METEO</span>
            ) : dataSource === 'offline' ? (
              <span data-testid="source-status" role="status" aria-live="polite" className="badge badge-amber">OFFLINE DEMO DATA</span>
            ) : dataSource === 'loading' ? (
              <span data-testid="source-status" role="status" aria-live="polite" className="badge badge-blue">FETCHING...</span>
            ) : (
              <span data-testid="source-status" role="status" aria-live="polite" className="badge badge-red">STREAM ERROR</span>
            )}

            <span className="badge badge-default">
              SURROGATE MODEL (DEMO)
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 font-mono text-xs">
            {lastUpdated && (
              <span className="hidden lg:inline text-zinc-500 text-[11px]">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            <button
              onClick={onRefreshData}
              type="button"
              data-testid="refresh-data"
              aria-label={dataSource === 'loading' ? 'Refreshing weather data' : 'Refresh weather data'}
              title="Fetch current weather again"
              disabled={dataSource === 'loading'}
              className="min-h-10 min-w-10 flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${dataSource === 'loading' ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={toggleTheme}
              type="button"
              data-testid="toggle-theme"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="min-h-10 min-w-10 flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button id="start-guide" onClick={onStartDemo} type="button" className="btn btn-primary btn-sm text-[11px]">
              <Play className="h-3 w-3 fill-current" /> GUIDE
            </button>
          </div>
        </header>

        {/* Main Content View */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-9 max-w-7xl w-full mx-auto space-y-7">
          <section className="pb-1">
            <h1 className="font-sans text-2xl md:text-[2rem] leading-[1.12] font-semibold tracking-[-0.035em] text-zinc-800 dark:text-earth-50">{currentPage.title}</h1>
            <HeadingNote className="text-xs md:text-sm" title={`This page shows ${currentPage.description.toLowerCase()}.`}>{currentPage.description}</HeadingNote>
          </section>
          {children}
        </main>
      </div>

      {/* Location Selector Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="location-dialog-title" className="bg-white dark:bg-zinc-950 rounded-lg max-w-md w-full p-5 border border-zinc-300 dark:border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <div>
                <h3 id="location-dialog-title" className="font-mono font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Choose a location</h3>
                <HeadingNote>Preset or coordinates</HeadingNote>
              </div>
              <button
                onClick={() => { setShowLocationModal(false); locationButtonRef.current?.focus(); }}
                aria-label="Close location dialog"
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
                    data-testid={`location-${loc.name.toLowerCase()}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      onSelectLocation(loc);
                      onToggleCustom(false);
                      setShowLocationModal(false);
                      locationButtonRef.current?.focus();
                    }}
                    className={`p-2.5 rounded border text-left font-mono transition-all ${
                      isSelected
                        ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{loc.name}</span>
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
                <span className="font-mono text-[10px] uppercase text-zinc-700 dark:text-zinc-300 block">Custom coordinates</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[10px] text-zinc-400 block mb-0.5">LAT (°N)</label>
                  <input
                    type="number"
                    aria-label="Latitude"
                    aria-invalid={Boolean(coordinateError)}
                    aria-describedby={coordinateError ? 'coordinate-error' : undefined}
                    min="-90"
                    max="90"
                    step="0.01"
                    ref={latitudeInputRef}
                    value={tempLat}
                    onChange={(e) => { setTempLat(e.target.value); setCoordinateError(null); }}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-zinc-400 block mb-0.5">LON (°E)</label>
                  <input
                    type="number"
                    aria-label="Longitude"
                    aria-invalid={Boolean(coordinateError)}
                    aria-describedby={coordinateError ? 'coordinate-error' : undefined}
                    min="-180"
                    max="180"
                    step="0.01"
                    value={tempLon}
                    onChange={(e) => { setTempLon(e.target.value); setCoordinateError(null); }}
                    className="input-field"
                  />
                </div>
              </div>
              {coordinateError && <p id="coordinate-error" data-testid="coordinates-error" role="alert" className="text-xs text-rose-700 dark:text-rose-300">{coordinateError}</p>}
              <button
                onClick={handleApplyCustomCoords}
                data-testid="apply-coordinates"
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
