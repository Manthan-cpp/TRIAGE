import React, { useState } from 'react';
import type { QueueItem, ConfidenceLabel, ReviewerDecision } from '../types';
import { ConfidencePill } from './ConfidencePill';
import { Search, Filter, Eye, CheckCircle, AlertOctagon, ShieldCheck } from 'lucide-react';

interface Props {
  items: QueueItem[];
  selectedCandidateId: string | null;
  onSelectCandidate: (candidateId: string) => void;
  reviewerDecisions: Record<string, ReviewerDecision>;
}

export const QueueTab: React.FC<Props> = ({
  items,
  selectedCandidateId,
  onSelectCandidate,
  reviewerDecisions,
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
              placeholder="Search file, prompt, reason..."
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
              <th style={{ width: 60, textAlign: 'center' }}>Rank</th>
              <th style={{ width: 145 }}>Confidence</th>
              <th style={{ width: 68 }}>Crop</th>
              <th style={{ width: 155 }}>Source / Frame</th>
              <th>Reasoning Summary (Muse Spark 1.3)</th>
              <th style={{ width: 130 }}>Prompts Matched</th>
              <th style={{ width: 110, textAlign: 'center' }}>Review Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                  No candidate frames found matching current criteria. All units remain retained.
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
                        src={item.thumbnailUrl}
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

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 11 }}>
                        {item.sourceFile}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {item.timestampSec !== undefined ? `T+${item.timestampSec}s` : 'Still Frame'}
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
