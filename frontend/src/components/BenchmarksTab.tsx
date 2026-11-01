import React from 'react';
import { Compass, ShieldCheck, AlertCircle, Target, GitCommit } from 'lucide-react';

export const BenchmarksTab: React.FC = () => {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Empirical Feasibility & Accuracy Baseline
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>
          Phase 0 ground-truth audit across 38 evaluated cases (IoU ≥ 0.5). Outcome 2 locked in project constitution.
        </p>
      </div>

      {/* 3 Core Measured Conditions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Target size={14} color="#34d399" />
            <span className="stat-label">Light Occlusion (Ceiling)</span>
          </div>
          <span className="stat-value" style={{ color: '#34d399' }}>85.7%</span>
          <span className="stat-subtext">12/14 clearly visible targets localized</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} color="#fbbf24" />
            <span className="stat-label">Heavy Occlusion (Wilderness)</span>
          </div>
          <span className="stat-value" style={{ color: '#fbbf24' }}>62.5%</span>
          <span className="stat-subtext">10/16 partial rubble & canopy cases</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Compass size={14} color="#a1a1aa" />
            <span className="stat-label">Negative Controls (Debris)</span>
          </div>
          <span className="stat-value" style={{ color: 'var(--text-secondary)' }}>20.0%</span>
          <span className="stat-subtext">Raw false alarm rate (pre-dampener)</span>
        </div>
      </div>

      {/* Outcome 2 Lock Callout */}
      <div className="stat-card" style={{ gap: 10, borderLeft: '3px solid var(--accent-highlight)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GitCommit size={15} color="var(--accent-highlight)" />
          <span className="stat-label" style={{ color: 'var(--text-primary)' }}>
            Locked Architectural Decision: Outcome 2
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
          <strong>"Assistive lift only; false alarms infiltrate top ranks."</strong> The pipeline reliably sorts high-probability signals above empty debris, but visual false positives still emerge under heavy shadows and drone perspective distortion. Therefore, autonomous dispatch is forbidden, and human review is mandatory.
        </p>
      </div>

      {/* Prompt Set Sensitivity Audit Table */}
      <div className="dense-table-container">
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            SAM 3.1 Prompt Sensitivity Analysis (Phase 0.2 / 0.3)
          </span>
        </div>
        <table className="dense-table">
          <thead>
            <tr>
              <th style={{ width: 140 }}>Prompt Token</th>
              <th style={{ width: 110 }}>Weight</th>
              <th style={{ width: 130 }}>Hit Rate (Light)</th>
              <th style={{ width: 130 }}>Hit Rate (Heavy)</th>
              <th>Operational Finding</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>person</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>1.0 (Primary)</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>85.7%</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>50.0%</td>
              <td style={{ fontSize: 11 }}>Strong on upright figures; fails on buried limbs and prone figures.</td>
            </tr>
            <tr>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>clothing</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>0.8 (Secondary)</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>71.4%</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>62.5%</td>
              <td style={{ fontSize: 11 }}>Crucial for heavy occlusion: detects bright jackets when person prompt misses.</td>
            </tr>
            <tr>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>human limb</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>0.0 (Discarded)</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>28.5%</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>18.7%</td>
              <td style={{ fontSize: 11 }}>High false alarm rate on tree branches and rocks; rejected in Phase 0.</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Why Zero-Dismissal Rule Exists */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <ShieldCheck size={15} color="#38bdf8" />
          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
            Mathematical Proof for the Zero-Dismissal Rule
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Because heavy occlusion drops single-frame recall to 62.5%, any hard threshold or automatic discarding of "low-confidence" frames would irrevocably delete ~37.5% of real victims. The zero-dismissal rule ensures 100% of footage is retained and sorted, maintaining absolute safety and compliance with SAR operational doctrine.
        </p>
      </div>
    </div>
  );
};
