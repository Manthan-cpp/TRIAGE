import React from 'react';
import type { HealthInfo, JobMetrics, SystemInfo } from '../types';
import { Activity, Clock, Cpu, Database, Server } from 'lucide-react';

interface Props {
  healthInfo: HealthInfo | null;
  metrics: JobMetrics | null;
  systemInfo: SystemInfo | null;
}

function formatDuration(milliseconds?: number): string {
  if (milliseconds === undefined) return '—';
  return milliseconds < 1000 ? `${milliseconds}ms` : `${(milliseconds / 1000).toFixed(1)}s`;
}

export const TelemetryTab: React.FC<Props> = ({ healthInfo, metrics, systemInfo }) => {
  const samCalls = healthInfo?.costSummary.byModel[systemInfo?.models.sam.id || ''] || 0;
  const museCalls = healthInfo?.costSummary.byModel[systemInfo?.models.muse.id || ''] || 0;

  return (
    <div className="telemetry-page">
      <div>
        <h2 className="page-title">API Costs & System Telemetry</h2>
        <p className="page-subtitle">Runtime readings from the backend and the selected batch. Cost values are local estimates, not billing statements.</p>
      </div>

      <div className="telemetry-kpis">
        <div className="stat-card"><div className="section-heading"><Activity size={14} /><span className="stat-label">Successful API Calls</span></div><span className="stat-value">{healthInfo?.costSummary.totalCalls ?? '—'}</span><span className="stat-subtext">SAM: {samCalls} · Muse: {museCalls}</span></div>
        <div className="stat-card"><div className="section-heading"><Cpu size={14} /><span className="stat-label">Estimated Usage</span></div><span className="stat-value">{healthInfo ? `$${healthInfo.costSummary.totalCost.toFixed(4)}` : '—'}</span><span className="stat-subtext">Calculated from configured rates</span></div>
        <div className="stat-card"><div className="section-heading"><Server size={14} /><span className="stat-label">Service Status</span></div><span className="stat-value telemetry-status">{healthInfo?.status === 'ok' ? 'ONLINE' : '—'}</span><span className="stat-subtext">{healthInfo?.runtime?.environment || 'Runtime unavailable'}</span></div>
      </div>

      <div className="telemetry-grid">
        <div className="stat-card">
          <div className="section-heading"><Clock size={14} /><span className="stat-label">Current Batch Timing</span></div>
          {metrics ? (
            <div className="telemetry-list">
              <span>Elapsed <strong>{formatDuration(metrics.timing.elapsedMs)}</strong></span>
              <span>Ingestion <strong>{formatDuration(metrics.timing.stageDurations.ingest)}</strong></span>
              <span>Perception <strong>{formatDuration(metrics.timing.stageDurations.perception)}</strong></span>
              <span>Prioritization <strong>{formatDuration(metrics.timing.stageDurations.prioritization)}</strong></span>
            </div>
          ) : <p className="muted-copy">Run a batch to see measured stage timings.</p>}
        </div>

        <div className="stat-card">
          <div className="section-heading"><Database size={14} /><span className="stat-label">Active Runtime Configuration</span></div>
          {systemInfo ? (
            <div className="telemetry-list">
              <span>Perception model <strong>{systemInfo.models.sam.id}</strong></span>
              <span>Ranking model <strong>{systemInfo.models.muse.id}</strong></span>
              <span>Video sampling <strong>{systemInfo.pipeline.videoFps} fps</strong></span>
              <span>Image normalization <strong>{systemInfo.pipeline.maxImageDimension}px / q{systemInfo.pipeline.jpegQuality}</strong></span>
              <span>Concurrency <strong>{systemInfo.pipeline.perceptionConcurrency} units</strong></span>
            </div>
          ) : <p className="muted-copy">Runtime configuration unavailable.</p>}
        </div>
      </div>

      <div className="stat-card">
        <div className="section-heading"><Server size={14} /><span className="stat-label">Infrastructure</span></div>
        <div className="telemetry-list telemetry-list-wide">
          <span>Node runtime <strong>{healthInfo?.runtime?.nodeVersion || '—'}</strong></span>
          <span>Process uptime <strong>{healthInfo?.runtime ? `${healthInfo.runtime.uptimeSec}s` : '—'}</strong></span>
          <span>Storage mode <strong>{systemInfo?.storage.mode || '—'}</strong></span>
          <span>Database path configured <strong>{systemInfo?.storage.databasePathConfigured ? 'yes' : 'default'}</strong></span>
        </div>
      </div>
    </div>
  );
};
