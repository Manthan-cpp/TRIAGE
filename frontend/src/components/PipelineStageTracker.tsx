import React from 'react';
import type { JobRecord } from '../types';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  currentJob: JobRecord;
  onNavigateToQueue: () => void;
}

const stages = [
  { key: 'queued', label: 'Queued' },
  { key: 'ingesting', label: 'Frame Ingestion (2 fps)' },
  { key: 'detecting', label: 'SAM 3.1 Candidate Segmentation' },
  { key: 'ranking', label: 'Muse Spark Prioritization' },
  { key: 'complete', label: 'Review Ready' },
];

function getStageIndex(status: string): number {
  const index = stages.findIndex((stage) => stage.key === status);
  return index;
}

export const PipelineStageTracker: React.FC<Props> = ({ currentJob, onNavigateToQueue }) => {
  const currentIdx = getStageIndex(currentJob.status);

  return (
    <div className="stat-card" style={{ gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="stat-label">Pipeline Execution Status: {currentJob.jobId}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          Processed: {currentJob.progress.processed} / {currentJob.progress.total || '...'} Units
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {stages.map((stage, index) => {
          const isPast = index < currentIdx;
          const isCurrent = index === currentIdx;
          return (
            <div
              key={stage.key}
              style={{
                backgroundColor: isCurrent ? 'var(--accent-subtle)' : isPast ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: 'none',
                borderRadius: 6,
                boxShadow: isCurrent ? '0 4px 14px rgba(37, 99, 235, 0.25)' : 'var(--glass-shadow-sm)',
                padding: '9px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transition: 'all var(--transition-normal)',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: isCurrent ? 'var(--accent-highlight)' : isPast ? 'var(--text-secondary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {isPast ? <CheckCircle2 size={12} /> : <span>STEP {index + 1}</span>}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {stage.label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(12, 12, 15, 0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '12px 16px', borderRadius: 6, border: 'none', boxShadow: 'var(--glass-shadow-sm)' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {currentJob.status === 'failed' ? currentJob.errorMessage || currentJob.currentStage : currentJob.currentStage}
        </span>
        {currentJob.status === 'complete' && (
          <button className="btn btn-primary" onClick={onNavigateToQueue}>Open Priority Queue →</button>
        )}
      </div>
    </div>
  );
};
