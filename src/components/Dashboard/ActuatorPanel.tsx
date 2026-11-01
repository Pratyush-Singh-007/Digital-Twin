import React, { useState } from 'react';
import {
  Lock,
  AlertTriangle,
  Droplets,
  CheckCircle,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import type { Decision, ActuatorAction } from '../../types';
import { HeadingNote } from '../HeadingNote';

interface Props {
  decision: Decision;
  onApproveManually?: () => void;
  onDismiss?: () => void;
}

export const ActuatorPanel: React.FC<Props> = ({
  decision,
  onApproveManually,
  onDismiss,
}) => {
  const [manualOverride, setManualOverride] = useState<'approved' | 'dismissed' | null>(null);

  const currentAction: ActuatorAction =
    decision.action === 'LOCKED' && manualOverride === 'approved'
      ? 'IRRIGATE'
      : decision.action === 'LOCKED' && manualOverride === 'dismissed'
      ? 'SUSPENDED'
      : decision.action;

  const isLocked = decision.action === 'LOCKED' && !manualOverride;
  const isSuspended = currentAction === 'SUSPENDED';

  const handleApprove = () => {
    setManualOverride('approved');
    if (onApproveManually) onApproveManually();
  };

  const handleDismiss = () => {
    setManualOverride('dismissed');
    if (onDismiss) onDismiss();
  };

  return (
    <div
      data-testid="actuator-status"
      className={`card border-l-4 transition-colors font-mono ${
        isLocked
          ? 'border-l-rose-600 bg-rose-50/20 dark:bg-rose-950/10'
          : isSuspended
          ? 'border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10'
          : 'border-l-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10'
      }`}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-3">
        <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
          OPERATOR ACTION
        </span>

        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider font-bold ${
            isLocked
              ? 'border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
              : isSuspended
              ? 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
              : 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
          }`}
        >
          RULE {decision.ruleFired} ACTIVE
        </span>
      </div>

      <div className="flex items-start gap-4">
        <div
          className={`p-2.5 rounded border flex-shrink-0 ${
            isLocked
              ? 'bg-rose-600 text-white border-rose-700'
              : isSuspended
              ? 'bg-amber-500 text-white border-amber-600'
              : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-800 dark:border-zinc-200'
          }`}
        >
          {isLocked ? (
            <Lock className="w-6 h-6" />
          ) : isSuspended ? (
            <AlertTriangle className="w-6 h-6" />
          ) : (
            <Droplets className="w-6 h-6" />
          )}
        </div>

        <div className="space-y-1 flex-1 min-w-0">
          <h2
            className={`text-lg font-bold tracking-tight ${
              isLocked
                ? 'text-rose-700 dark:text-rose-400'
                : isSuspended
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {isLocked
              ? 'LOCKED: MANUAL REVIEW REQUIRED'
              : isSuspended
              ? 'SUSPENDED: PEST CONFLICT / ADEQUATE'
              : 'IRRIGATE: SAFE ACTION AUTHORIZED'}
          </h2>
          <HeadingNote>Prototype command preview</HeadingNote>

          <p className="text-xs font-sans text-zinc-700 dark:text-zinc-300">
            {manualOverride === 'approved'
              ? 'Operator override: irrigation is allowed in this prototype despite high uncertainty. No physical pump is connected.'
              : manualOverride === 'dismissed'
              ? 'Operator dismissed: the prototype keeps irrigation suspended. No physical actuator is connected.'
              : decision.reason}
          </p>

          <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-zinc-500">
            <span className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              MOISTURE: {(decision.soilMoisture * 100).toFixed(1)}%
            </span>
            <span className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              UNCERTAINTY: ±{((decision.uncertainty / 2) * 100).toFixed(1)}%
            </span>
            <span className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              PEST RISK: {(decision.pestRisk * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="mt-3 pt-2.5 border-t border-rose-200 dark:border-rose-900/40 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1 font-sans">
            <ShieldAlert className="w-3.5 h-3.5" />
            Safety brake active. Human supervisor must approve or dismiss:
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              data-testid="dismiss-action"
              className="btn btn-secondary btn-sm text-[11px] flex items-center gap-1"
            >
              <XCircle className="w-3 h-3" /> DISMISS
            </button>
            <button
              onClick={handleApprove}
              data-testid="approve-action"
              className="btn btn-primary btn-sm text-[11px] flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white"
            >
              <CheckCircle className="w-3 h-3" /> APPROVE MANUALLY
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
