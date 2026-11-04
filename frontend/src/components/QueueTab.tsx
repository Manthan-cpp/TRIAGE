import React, { useState } from 'react';
import type { QueueItem, ConfidenceLabel, ReviewerDecision, ClipDetectionReport } from '../types';
import { ConfidencePill } from './ConfidencePill';
import { resolveMediaUrl } from '../api';
import { Search, Filter, Eye, CheckCircle, AlertOctagon, ShieldCheck, Film, Clock } from 'lucide-react';

export function formatTimecode(sec?: number): string {
  if (sec === undefined || sec === null || isNaN(sec)) return 'Photo';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}s`;
}

interface Props {
  items: QueueItem[];
  clipReports?: ClipDetectionReport[];
  selectedCandidateId: string | null;
  onSelectCandidate: (candidateId: string) => void;
  reviewerDecisions: Record<string, ReviewerDecision>;
  onNavigateToIngest?: () => void;
}

export const QueueTab: React.FC<Props> = ({
  items,
  clipReports,
  selectedCandidateId,
  onSelectCandidate,
  reviewerDecisions,
  onNavigateToIngest,
}) => {
  const [filterTier, setFilterTier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredItems = items.filter((item) => {
    if (filterTier !== 'all' && item.confidenceLabel !== filterTier) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.sourceFile.toLowerCase().includes(q) ||
        item.reasoningSummary.toLowerCase().includes(q) ||
        item.candidateId.toLowerCase().includes(q) ||
        item.matchedPrompts.some((p) => p.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      {/* Aerial Clip Detection Report (if video sweep analyzed) */}
      {clipReports && clipReports.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clipReports.map((report) => (
            <div
              key={report.sourceFile}
              style={{
                background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 6,
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                  }}>
                    <Film size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>AERIAL CLIP DETECTION REPORT</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{report.sourceFile}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Duration: <strong style={{ color: '#38bdf8' }}>{report.durationSec.toFixed(1)}s</strong> · Scanned: <strong style={{ color: '#94a3b8' }}>{report.totalFrames} frames @ 2 FPS</strong> · Detections: <strong style={{ color: report.flaggedFramesCount > 0 ? '#34d399' : '#94a3b8' }}>{report.flaggedFramesCount} frames flagged</strong>
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {report.flaggedFramesCount > 0 ? (
                    <span style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#34d399',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontFamily: 'var(--font-mono)',
                    }}>
                      <CheckCircle size={13} /> TARGET SIGNALS CONFIRMED
                    </span>
                  ) : (
                    <span style={{
                      backgroundColor: 'rgba(148, 163, 184, 0.1)',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      color: '#94a3b8',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 4,
                    }}>
                      NO TARGETS DETECTED
                    </span>
                  )}
                </div>
              </div>

              {/* Timeline bar with clickable timestamp markers */}
              {report.timeline.length > 0 && (
                <div style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 4,
                  padding: '8px 12px',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Detection Timeline Markers (Click to inspect frame):
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {report.timeline.map((evt, idx) => (
                      <button
                        key={`${evt.candidateId}-${idx}`}
                        onClick={() => onSelectCandidate(evt.candidateId)}
                        title={`Click to inspect frame at ${evt.timecode} (${evt.matchedPrompts.join(', ')})`}
                        style={{
                          background: selectedCandidateId === evt.candidateId ? 'rgba(56, 189, 248, 0.3)' : 'rgba(239, 68, 68, 0.15)',
                          border: `1px solid ${selectedCandidateId === evt.candidateId ? '#38bdf8' : 'rgba(239, 68, 68, 0.45)'}`,
                          color: selectedCandidateId === evt.candidateId ? '#38bdf8' : '#f87171',
                          padding: '3px 8px',
                          borderRadius: 3,
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Clock size={11} />
                        <span>{evt.timecode}</span>
                        <span style={{ fontSize: 9, opacity: 0.8, textTransform: 'uppercase' }}>
                          [{evt.matchedPrompts[0] || 'target'}]
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clip Executive Summary */}
              <div style={{
                fontSize: 12,
                lineHeight: 1.45,
                color: '#cbd5e1',
                backgroundColor: 'rgba(0,0,0,0.2)',
                padding: '8px 12px',
                borderRadius: 4,
                borderLeft: '3px solid #38bdf8',
              }}>
                {report.clipSummary}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Candidate Priority Queue
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              Ranked visual candidate signals for reviewer attention.
            </span>
            <span className="mono-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#38bdf8' }}>
              <ShieldCheck size={11} /> Zero-Dismissal Active
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Search box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '5px 10px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder=""
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
                width: 190,
              }}
            />
          </div>

          {/* Tier Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'var(--bg-secondary)', padding: 3, borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
            <Filter size={12} color="var(--text-muted)" style={{ marginLeft: 6 }} />
            {(['all', 'possible-high', 'possible-medium', 'possible-low'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                style={{
                  background: filterTier === tier ? 'var(--bg-tertiary)' : 'transparent',
                  color: filterTier === tier ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: filterTier === tier ? '1px solid var(--border-focus)' : '1px solid transparent',
                  borderRadius: 3,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {tier === 'all' ? 'All' : tier.replace('possible-', '')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dense Table View */}
      <div className="dense-table-container" style={{ flex: 1, overflowY: 'auto' }}>
        <table className="dense-table">
          <thead>
            <tr>
              <th style={{ width: 55, textAlign: 'center' }}>Rank</th>
              <th style={{ width: 135 }}>Confidence</th>
              <th style={{ width: 68 }}>Crop</th>
              <th style={{ width: 105, textAlign: 'center' }}>Timestamp</th>
              <th style={{ width: 135 }}>Source</th>
              <th>Reasoning Summary (Muse Spark 1.3)</th>
              <th style={{ width: 120 }}>Prompts Matched</th>
              <th style={{ width: 110, textAlign: 'center' }}>Review Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                  <div>No candidate frames found matching current criteria. All units remain retained.</div>
                  {items.length === 0 && onNavigateToIngest && (
                    <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={onNavigateToIngest}>
                      Go to Ingest Batch →
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedCandidateId === item.candidateId;
                const decision = reviewerDecisions[item.candidateId];
                return (
                  <tr
                    key={item.candidateId}
                    className={isSelected ? 'selected' : ''}
                    onClick={() => onSelectCandidate(item.candidateId)}
                  >
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      #{item.priorityRank}
                    </td>

                    <td>
                      <ConfidencePill label={item.confidenceLabel as ConfidenceLabel} />
                    </td>

                    <td>
                      <img
                        src={resolveMediaUrl(item.thumbnailUrl)}
                        alt={`Candidate #${item.priorityRank}`}
                        style={{
                          width: 48,
                          height: 32,
                          objectFit: 'cover',
                          borderRadius: 2,
                          border: '1px solid var(--border-subtle)',
                          display: 'block',
                        }}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {item.timestampSec !== undefined ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: '#34d399',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                        }}>
                          <Clock size={11} />
                          {formatTimecode(item.timestampSec)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                          Photo
                        </span>
                      )}
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 11 }}>
                        {item.sourceFile}
                      </div>
                    </td>

                    <td style={{ color: 'var(--text-primary)', lineHeight: 1.35 }}>
                      {item.reasoningSummary}
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {item.matchedPrompts.length > 0 ? (
                          item.matchedPrompts.map((p) => (
                            <span key={p} className="mono-chip">
                              {p}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>none</span>
                        )}
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {decision?.status === 'verified' && (
                        <span style={{ color: '#34d399', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <CheckCircle size={13} /> Checked
                        </span>
                      )}
                      {decision?.status === 'false_alarm' && (
                        <span style={{ color: '#f87171', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <AlertOctagon size={13} /> False Alarm
                        </span>
                      )}
                      {(!decision || decision.status === 'pending') && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Eye size={12} /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
