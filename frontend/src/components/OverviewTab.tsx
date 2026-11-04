import React from 'react';
import type { JobMetrics, JobRecord, QueueItem, ReviewerDecision } from '../types';
import { Activity, Clock, Database, ShieldCheck } from 'lucide-react';

interface Props {
  items: QueueItem[];
  reviewerDecisions: Record<string, ReviewerDecision>;
  currentJob: JobRecord | null;
  metrics: JobMetrics | null;
}

function formatDuration(milliseconds?: number): string {
  if (milliseconds === undefined) return '—';
  if (milliseconds < 1000) return `${milliseconds}ms`;
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

export const OverviewTab: React.FC<Props> = ({ items, reviewerDecisions, currentJob, metrics }) => {
  const total = metrics?.queue.total ?? items.length;
  const highCount = metrics?.queue.possibleHigh ?? items.filter((item) => item.confidenceLabel === 'possible-high').length;
  const mediumCount = metrics?.queue.possibleMedium ?? items.filter((item) => item.confidenceLabel === 'possible-medium').length;
  const lowCount = metrics?.queue.possibleLow ?? items.filter((item) => item.confidenceLabel === 'possible-low').length;
  const reviewedCount = metrics?.review.reviewed ?? items.filter((item) => {
    const status = reviewerDecisions[item.candidateId]?.status;
    return status === 'verified' || status === 'false_alarm';
  }).length;
  const reviewedPct = total > 0 ? Math.round((reviewedCount / total) * 100) : 0;

  return (
    <div className="overview-page">
      <div>
        <h2 className="page-title">Mission Operations & Triage Metrics</h2>
        <p className="page-subtitle">Live measurements for the selected batch. Documented evaluation results are kept in Benchmarks.</p>
      </div>

      {!currentJob ? (
        <div className="empty-state">
          <Database size={28} />
          <strong>No batch selected</strong>
          <span>Start an ingestion batch to populate live operational metrics.</span>
        </div>
      ) : (
        <>
          <div className="overview-context">
            <span>Batch <strong>{currentJob.jobId}</strong></span>
            <span className={`status-chip status-${currentJob.status}`}>{currentJob.status}</span>
            <span>{currentJob.progress.processed} / {currentJob.progress.total || '—'} units processed</span>
          </div>

          <div className="overview-kpis">
            <div className="stat-card"><span className="stat-label">Queue Items</span><span className="stat-value">{total}</span><span className="stat-subtext">Current batch output</span></div>
            <div className="stat-card"><span className="stat-label">Possible-High</span><span className="stat-value confidence-value-high">{highCount}</span><span className="stat-subtext">Current queue tier</span></div>
            <div className="stat-card"><span className="stat-label">Possible-Medium</span><span className="stat-value confidence-value-medium">{mediumCount}</span><span className="stat-subtext">Current queue tier</span></div>
            <div className="stat-card"><span className="stat-label">Possible-Low</span><span className="stat-value">{lowCount}</span><span className="stat-subtext">Retained for review</span></div>
          </div>

          <div className="stat-card review-progress-card">
            <div className="section-heading"><Activity size={15} /><span className="stat-label">Human Review Progress</span><strong>{reviewedCount} / {total} ({reviewedPct}%)</strong></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${reviewedPct}%` }} /></div>
            <div className="live-facts">
              <span><Clock size={14} /> Batch elapsed: <strong>{formatDuration(metrics?.timing.elapsedMs)}</strong></span>
              <span><Database size={14} /> Processing: <strong>{currentJob.status}</strong></span>
              <span><ShieldCheck size={14} /> Source retention: <strong>Enabled</strong></span>
            </div>
          </div>

          <div className="stat-card operational-note">
            <strong>Decision-support boundary</strong>
            <p>Rankings organize reviewer attention. They do not establish human presence, replace field judgment, or trigger dispatch decisions.</p>
          </div>
        </>
      )}
    </div>
  );
};
