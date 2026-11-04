import React, { useEffect, useState } from 'react';
import { AlertCircle, Compass, GitCommit, ShieldCheck, Target } from 'lucide-react';
import { fetchBenchmarks } from '../api';
import type { BenchmarkRecord } from '../types';

function metric(record: BenchmarkRecord, key: string): string {
  const value = record.metrics[key]?.value;
  return value === undefined ? '—' : `${value}%`;
}

export const BenchmarksTab: React.FC = () => {
  const [record, setRecord] = useState<BenchmarkRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBenchmarks().then(setRecord).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Documented benchmark record unavailable.');
    });
  }, []);

  return (
    <div className="benchmarks-page">
      <div>
        <h2 className="page-title">Documented Evaluation Record</h2>
        <p className="page-subtitle">Versioned academic evaluation data. This is not live mission telemetry.</p>
      </div>

      {error && <div className="inline-alert" role="alert">{error}</div>}
      {!record && !error && <div className="empty-state">Loading documented evaluation record…</div>}
      {record && (
        <>
          <div className="benchmark-source">Source: <strong>{record.source}</strong> · Evaluated: <strong>{new Date(record.evaluatedAt).toLocaleString()}</strong> · {record.dataset.totalUnits} labeled units</div>
          <div className="benchmark-kpis">
            <div className="stat-card"><Target size={14} /><span className="stat-label">Light Occlusion</span><span className="stat-value">{metric(record, 'lightStrictRecall')}</span><span className="stat-subtext">Strict recall</span></div>
            <div className="stat-card"><AlertCircle size={14} /><span className="stat-label">Heavy Occlusion</span><span className="stat-value">{metric(record, 'heavyStrictRecall')}</span><span className="stat-subtext">Strict recall</span></div>
            <div className="stat-card"><Compass size={14} /><span className="stat-label">Negative Controls</span><span className="stat-value">{metric(record, 'negativeFalseAlarmRate')}</span><span className="stat-subtext">False-alarm rate</span></div>
          </div>

          <div className="stat-card benchmark-callout"><div className="section-heading"><GitCommit size={15} /><span className="stat-label">Evaluation Scope</span></div><p>{record.note}</p><p>Precision@10: <strong>{metric(record, 'precisionAt10')}</strong>. Precision@18: <strong>{metric(record, 'precisionAt18')}</strong>.</p></div>

          <div className="dense-table-container"><table className="dense-table"><thead><tr><th>Prompt</th><th>Weight</th><th>Light</th><th>Heavy</th><th>Finding</th></tr></thead><tbody>{record.promptSensitivity.map((item) => <tr key={item.prompt}><td>{item.prompt}</td><td>{item.weight}</td><td>{item.lightRate}%</td><td>{item.heavyRate}%</td><td>{item.finding}</td></tr>)}</tbody></table></div>

          <div className="stat-card"><div className="section-heading"><ShieldCheck size={15} /><span className="stat-label">Observed Failure Patterns</span></div><ul className="benchmark-list">{record.failurePatterns.map((pattern) => <li key={pattern}>{pattern}</li>)}</ul></div>
        </>
      )}
    </div>
  );
};
