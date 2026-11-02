import React, { useEffect, useRef, useState } from 'react';
import type { TabId, DataSourceStatus, LocationPreset } from '../types';
import { LOCATIONS } from '../data/locations';
import {
  LayoutDashboard,
  GitBranch,
  FlaskConical,
  BarChart3,
  Info,
  Moon,
  Sun,
  Play,
  RotateCw,
  ChevronDown,
  Check,
  Sprout,
  Radio,
  Database,
  CircleDot,
  CloudSun,
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
  { id: 'dashboard' as TabId, label: 'Dashboard', description: 'Live field conditions', icon: LayoutDashboard },
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
    <nav aria-label="Page menu" className="flex items-center gap-1">
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
            {destinations.filter((item) => item.id !== 'dashboard').map((item) => {
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
  const contextLabel = useCustom
    ? `[${Math.abs(customLat).toFixed(2)}°${customLat < 0 ? 'S' : 'N'}, ${Math.abs(customLon).toFixed(2)}°${customLon < 0 ? 'W' : 'E'}]`
    : `${location.name.toUpperCase()} (${location.state})`;

  const sourceBadge = dataSource === 'live' ? (
    <span data-testid="source-status" role="status" aria-live="polite" className="badge badge-green"><Radio className="h-2.5 w-2.5" /> LIVE OPEN-METEO</span>
  ) : dataSource === 'offline' ? (
    <span data-testid="source-status" role="status" aria-live="polite" className="badge badge-amber"><Database className="h-2.5 w-2.5" /> OFFLINE DEMO DATA</span>
  ) : dataSource === 'loading' ? (
    <span data-testid="source-status" role="status" aria-live="polite" className="badge badge-blue"><RotateCw className="h-2.5 w-2.5 animate-spin" /> FETCHING...</span>
  ) : (
    <span data-testid="source-status" role="status" aria-live="polite" className="badge badge-red"><CircleDot className="h-2.5 w-2.5" /> STREAM ERROR</span>
  );

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
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans selection:bg-zinc-300 selection:text-zinc-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
        <div className="border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"><Sprout className="h-5 w-5" /></div>
            <div>
              <div className="text-sm font-semibold tracking-tight">AgriTwin</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">Field ops console</div>
            </div>
          </div>
        </div>

        <div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            <span>Field context</span><span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><i className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live</span>
          </div>
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
            className="group flex w-full items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left transition-colors hover:border-zinc-400 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
          >
            <span className="min-w-0">
              <span data-testid="current-location" className="block truncate font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">{contextLabel}</span>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{useCustom ? 'Custom observation point' : `${location.crop} monitoring site`}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-y-0.5" />
          </button>
          <div className="mt-3">{sourceBadge}</div>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 space-y-1 px-3 py-4">
          <div className="px-2 pb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Workspace</div>
          {destinations.map((item) => {
            const Icon = item.icon;
            const selected = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={selected ? 'page' : undefined}
                onClick={() => setActiveTab(item.id)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-medium transition-colors ${selected ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="m-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between text-[11px]"><span className="text-zinc-500">Model status</span><span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">READY</span></div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"><div className="h-full w-full rounded-full bg-emerald-500" /></div>
          <div className="mt-2 font-mono text-[10px] text-zinc-500">SURROGATE · 16 FEATURES</div>
        </div>
      </aside>

      <div className="min-h-screen min-w-0 lg:pl-64">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"><Sprout className="h-4 w-4" /></div>
              <span className="hidden text-sm font-semibold sm:inline">AgriTwin</span>
            </div>
            <button type="button" onClick={() => setActiveTab('dashboard')} aria-current={activeTab === 'dashboard' ? 'page' : undefined} className={`min-h-10 rounded-md px-3 text-xs font-medium transition-colors lg:hidden ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}>Dashboard</button>
            <PageNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="hidden min-w-0 border-l border-zinc-200 pl-3 dark:border-zinc-700 md:block">
              <div className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">{currentPage.title}</div>
              <div className="truncate text-[11px] text-zinc-500">{contextLabel}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs sm:gap-2">
            {lastUpdated && (
              <span className="hidden xl:inline text-zinc-500 text-[11px]">
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
              className="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RotateCw className={`w-3.5 h-3.5 ${dataSource === 'loading' ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={toggleTheme}
              type="button"
              data-testid="toggle-theme"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button id="start-guide" onClick={onStartDemo} type="button" className="btn btn-primary btn-sm px-2.5 text-[11px] sm:px-3">
              <Play className="h-3 w-3 fill-current" /><span className="hidden sm:inline">GUIDE</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-5 md:px-6 md:py-7 xl:px-8">
          <section className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"><CloudSun className="h-3.5 w-3.5" /> Operations workspace</div>
              <h1 className="text-2xl font-semibold leading-[1.1] tracking-[-0.035em] text-zinc-950 dark:text-white md:text-3xl">{currentPage.title}</h1>
              <HeadingNote className="mt-1 text-xs md:text-sm" title={`This page shows ${currentPage.description.toLowerCase()}.`}>{currentPage.description}</HeadingNote>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
              <i className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-zinc-500">Decision engine</span>
              <span className="font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">ONLINE</span>
            </div>
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
