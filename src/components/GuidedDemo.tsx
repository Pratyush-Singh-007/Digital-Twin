import React, { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, X, Check } from 'lucide-react';
import type { TabId } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSetDropout: (rate: number) => void;
  onSetHeatSpike: (val: boolean) => void;
  onSetDroughtShock: (val: boolean) => void;
  onSetEpsilon: (eps: number) => void;
  onReset: () => void;
  onSetTab: (tab: TabId) => void;
}

interface Step {
  title: string;
  subtitle: string;
  description: string;
  action: () => void;
  highlightText: string;
}

export const GuidedDemo: React.FC<Props> = ({
  isOpen,
  onClose,
  onSetDropout,
  onSetHeatSpike,
  onSetDroughtShock,
  onSetEpsilon,
  onReset,
  onSetTab,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps: Step[] = [
    {
      title: 'STEP 1: BASELINE CLEAN TELEMETRY',
      subtitle: 'Normal sensor readings',
      description:
        'The prototype receives uncorrupted telemetry. Its nominal 90% interval is narrow for this sample, below the configured safety threshold. The scenario preview may permit irrigation when the scenario moisture threshold is crossed.',
      highlightText: 'Confidence band is narrow; uncertainty < ε.',
      action: () => {
        onSetTab('dashboard');
        onReset();
        onSetEpsilon(0.12);
      },
    },
    {
      title: 'STEP 2: INJECT 30% SENSOR DROPOUT',
      subtitle: 'Dropped sensor packets',
      description:
        'We now inject 30% sensor dropout. In the telemetry strip, gray dropout slots appear. Instead of failing silently, the digital twin widens its confidence envelope in real time (<300ms).',
      highlightText: 'Confidence band expands as sensor readings drop.',
      action: () => {
        onSetTab('dashboard');
        onSetDropout(0.3);
      },
    },
    {
      title: 'STEP 3: UNCERTAINTY EXCEEDS ε → ACTUATOR LOCKED',
      subtitle: 'Uncertainty exceeds limit',
      description:
        'Because interval width exceeds safety threshold ε, Rule 3 forces the actuator into LOCKED state. Automation disengages and requests human supervisor review.',
      highlightText: 'LOCKED: Epistemic uncertainty prevents erroneous actions.',
      action: () => {
        onSetTab('dashboard');
        onSetDropout(0.35);
        onSetEpsilon(0.10);
      },
    },
    {
      title: 'STEP 4: WETNESS ADVISORY → SCOUT',
      subtitle: 'Microclimate scouting cue',
      description:
        'The microclimate wetness score is a scouting cue only. It can direct a field inspection, but it never diagnoses disease or changes the irrigation preview.',
      highlightText: 'ADVISORY: inspect canopy conditions; no crop-specific disease gate is enabled.',
      action: () => {
        onSetTab('dashboard');
        onReset();
        onSetEpsilon(0.15);
      },
    },
    {
      title: 'STEP 5: FULL-SEASON SIMULATION BENCHMARK',
      subtitle: 'Compare season policies',
      description:
        'Explore the Season Simulation tab to run a 90-day parallel experiment demonstrating error elimination and water conservation.',
      highlightText: 'Click Finish or Season Sim tab to run the full benchmark.',
      action: () => {
        onSetTab('simulation');
      },
    },
  ];

  const handleClose = () => {
    onClose();
    window.requestAnimationFrame(() => document.getElementById('start-guide')?.focus());
  };

  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(0);
    steps[0].action();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      steps[next].action();
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      steps[prev].action();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full font-mono" role="dialog" aria-modal="true" aria-labelledby="guided-demo-title" data-testid="guided-demo">
      <div className="bg-white dark:bg-zinc-950 rounded-lg p-4 border-2 border-zinc-900 dark:border-zinc-100 shadow-2xl space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div className="text-[10px] uppercase font-bold text-zinc-500">
            WALKTHROUGH: STEP {currentStep + 1} / {steps.length}
          </div>
          <button aria-label="Close walkthrough" onClick={handleClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs">
            [ESC]
          </button>
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <div id="guided-demo-title" className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{step.title}</div>
          <div className="text-[10px] text-zinc-500" title={step.description}>{step.subtitle}</div>
          <p className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400 leading-snug">
            {step.description}
          </p>

          <div className="p-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-[10px] text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 font-sans font-semibold">
            <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-white flex-shrink-0" />
            <span>{step.highlightText}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
          <button aria-label="Close walkthrough" onClick={handleClose} className="text-[10px] text-zinc-400 hover:text-zinc-900">
            CLOSE
          </button>

          <div className="flex items-center gap-1.5">
            {currentStep > 0 && (
            <button data-testid="guided-back" onClick={handlePrev} className="btn btn-secondary btn-sm text-[10px]">
                <ChevronLeft className="w-3 h-3" /> BACK
              </button>
            )}

            <button data-testid="guided-next" onClick={handleNext} className="btn btn-primary btn-sm text-[10px]">
              {currentStep === steps.length - 1 ? 'FINISH' : 'NEXT'} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
