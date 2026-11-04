import React from 'react';
import type { HealthInfo, SystemInfo } from '../types';
import { Cpu, ShieldAlert, XCircle, CheckCircle2, Scale } from 'lucide-react';

interface Props {
  healthInfo: HealthInfo | null;
  systemInfo: SystemInfo | null;
}

export const SettingsTab: React.FC<Props> = ({ healthInfo, systemInfo }) => {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          System Configuration & Ethical Scope
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>
          Meta Model API runtime specifications, ethical decision-support boundaries, and academic dataset licensing.
        </p>
      </div>

      {/* Meta AI Models Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="stat-card" style={{ gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={14} color="var(--accent-highlight)" />
            <span className="stat-label">Candidate Perception Model</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {systemInfo?.models.sam.id || 'Unavailable'}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Perception endpoint: <code>{systemInfo?.models.sam.endpoint || 'Unavailable'}</code>. Active prompts: <code>{systemInfo?.prompts.join(', ') || 'Unavailable'}</code>.
          </p>
        </div>

        <div className="stat-card" style={{ gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={14} color="#38bdf8" />
            <span className="stat-label">Comparative Prioritizer</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {systemInfo?.models.muse.id || 'Unavailable'}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Ranking endpoint: <code>{systemInfo?.models.muse.endpoint || 'Unavailable'}</code>. Output is schema-validated before persistence.
          </p>
        </div>
      </div>

      <div className="stat-card" style={{ gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={14} color="var(--accent-highlight)" />
          <span className="stat-label">Current API Usage</span>
        </div>
        <div style={{ display: 'flex', gap: 24, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <span>{healthInfo?.costSummary.totalCalls ?? 0} calls</span>
          <span>${(healthInfo?.costSummary.totalCost ?? 0).toFixed(4)} estimated</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Usage is estimated locally from successful model calls; external billing and spend limits remain account-level controls.
        </span>
      </div>

      {/* Ethical Rules & Banned Vocabulary Card (Lucide icons, NO emojis) */}
      <div className="stat-card" style={{ gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={15} color="#fbbf24" />
          <span className="stat-label">Non-Negotiable Ethical Boundaries & Vocabulary Lock</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: 'none', padding: 14, borderRadius: 6, boxShadow: 'var(--glass-shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <XCircle size={14} color="#f87171" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>
                Strictly Banned Terminology
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Forbidden tokens: <code>detected</code>, <code>survivor found</code>, <code>victim located</code>, <code>confirmed</code>. The system never asserts certainty of human life or presence.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: 'none', padding: 14, borderRadius: 6, boxShadow: 'var(--glass-shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <CheckCircle2 size={14} color="#34d399" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>
                Approved Decision-Support Terms
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Sanctioned tokens: <code>candidate signal</code>, <code>flagged for review</code>, <code>possible indicator</code>. Locked tiers: <code>possible-high</code>, <code>possible-medium</code>, <code>possible-low</code>.
            </p>
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 8, opacity: 0.9 }}>
          <strong>Zero-Dismissal Protocol:</strong> Low-confidence and empty frames are pushed down the queue but are NEVER auto-deleted or hidden. Full human agency is preserved over 100% of footage.
        </div>
      </div>

      {/* Dataset License Documentation Table */}
      <div className="dense-table-container">
        <div style={{ padding: '12px 16px', borderBottom: 'none', background: 'var(--glass-surface-elevated)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Scale size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Dataset License Verification & Attribution (Phase 0.1 Audit)
          </span>
        </div>
        <table className="dense-table">
          <thead>
            <tr>
              <th style={{ width: 140 }}>Dataset</th>
              <th style={{ width: 130 }}>License Type</th>
              <th style={{ width: 140 }}>Commercial Use</th>
              <th>Permitted Scope & Attribution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>SARD</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>CC BY 4.0</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>With Attribution</td>
              <td style={{ fontSize: 11 }}>Search-and-Rescue aerial drone dataset. Permitted for hackathon research and evaluation benchmarking.</td>
            </tr>
            <tr>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>UAV-SAR</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>CC-BY 4.0</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>Permitted w/ Attribution</td>
              <td style={{ fontSize: 11 }}>Wilderness aerial SAR drone sweeps. Full attribution cited in <code>docs/dataset_licenses.md</code>.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
