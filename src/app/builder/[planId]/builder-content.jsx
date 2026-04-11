'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import {
  getBuilderPlanAction,
  startBuilderPlanAction,
  pauseBuilderPlanAction,
  resumeBuilderPlanAction,
  retryBuilderStepAction,
  deleteBuilderPlanAction,
} from '../../../lib/builder/actions.js';
import { useSyncEvents } from '../../../lib/sync/use-sync.js';

const STATUS_COLORS = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-primary/20 text-primary animate-pulse',
  succeeded: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  skipped: 'bg-muted text-muted-foreground/60',
};

const STATUS_LABELS = {
  planning: 'Planning',
  planned: 'Ready',
  running: 'Running',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
};

export default function BuilderContent({ planId }) {
  const router = useRouter();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPlan = useCallback(async () => {
    const data = await getBuilderPlanAction(planId);
    if (data) setPlan(data);
    setLoading(false);
  }, [planId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Real-time updates via SSE
  const onSyncEvent = useCallback((event) => {
    if (event.planId !== planId) return;
    if (event.type?.startsWith('builder:')) {
      loadPlan();
    }
  }, [planId, loadPlan]);

  useSyncEvents(onSyncEvent);

  async function handleStart() {
    setActionLoading(true);
    await startBuilderPlanAction(planId);
    await loadPlan();
    setActionLoading(false);
  }

  async function handlePause() {
    setActionLoading(true);
    await pauseBuilderPlanAction(planId);
    await loadPlan();
    setActionLoading(false);
  }

  async function handleResume() {
    setActionLoading(true);
    await resumeBuilderPlanAction(planId);
    await loadPlan();
    setActionLoading(false);
  }

  async function handleRetry(stepId) {
    setActionLoading(true);
    await retryBuilderStepAction(stepId);
    await loadPlan();
    setActionLoading(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this build plan?')) return;
    await deleteBuilderPlanAction(planId);
    router.push('/projects');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading plan...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Plan not found.</p>
      </div>
    );
  }

  const steps = plan.steps || [];
  const completedCount = steps.filter((s) => s.status === 'succeeded').length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground truncate">Build Plan</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                plan.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                plan.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                plan.status === 'running' ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {STATUS_LABELS[plan.status] || plan.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{plan.goal}</p>
          </div>
          <div className="flex gap-2 ml-4">
            {(plan.status === 'planned' || plan.status === 'planning') && (
              <button
                onClick={handleStart}
                disabled={actionLoading}
                className="px-4 py-2 bg-primary text-background rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Start Build
              </button>
            )}
            {plan.status === 'running' && (
              <button
                onClick={handlePause}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg font-medium hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
              >
                Pause
              </button>
            )}
            {plan.status === 'paused' && (
              <button
                onClick={handleResume}
                disabled={actionLoading}
                className="px-4 py-2 bg-primary text-background rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Resume
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg font-medium hover:bg-red-500/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{completedCount} of {steps.length} steps complete</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="bg-card rounded-xl border border-border/40 overflow-hidden">
              <button
                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors cursor-pointer"
              >
                {/* Step number */}
                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${STATUS_COLORS[step.status] || 'bg-muted text-muted-foreground'}`}>
                  {step.stepNumber}
                </span>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{step.title}</span>
                  {step.retryCount > 0 && (
                    <span className="ml-2 text-xs text-amber-400">retry {step.retryCount}</span>
                  )}
                </div>

                {/* Status badge */}
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[step.status] || 'bg-muted'}`}>
                  {step.status}
                </span>

                {/* Retry button for failed steps */}
                {step.status === 'failed' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRetry(step.id); }}
                    disabled={actionLoading}
                    className="px-3 py-1 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                  >
                    Retry
                  </button>
                )}
              </button>

              {expandedStep === step.id && (
                <div className="px-5 pb-5 border-t border-border/30 space-y-3">
                  {/* Prompt */}
                  <div className="mt-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Prompt</h4>
                    <pre className="text-xs text-foreground/80 bg-background rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                      {step.prompt}
                    </pre>
                  </div>

                  {/* Output */}
                  {step.output && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Output</h4>
                      <div className="text-xs bg-background rounded-lg p-3 max-h-64 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-foreground/70">{step.output.slice(-3000)}</pre>
                      </div>
                    </div>
                  )}

                  {/* Validation */}
                  {step.validationResult && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Validation</h4>
                      <div className="text-xs space-y-1">
                        {(() => {
                          try {
                            const vr = JSON.parse(step.validationResult);
                            return (vr.checks || []).map((c, i) => (
                              <div key={i} className={`flex items-center gap-2 ${c.passed ? 'text-green-400' : 'text-red-400'}`}>
                                <span>{c.passed ? '✓' : '✗'}</span>
                                <span>{c.message}</span>
                              </div>
                            ));
                          } catch { return null; }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
