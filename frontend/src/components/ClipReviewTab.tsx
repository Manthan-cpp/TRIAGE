import React, { useState, useEffect } from 'react';
import type { CandidateDetail, ConfidenceLabel, ReviewerDecision, QueueItem } from '../types';
import { ConfidencePill } from './ConfidencePill';
import { CheckCircle2, XCircle, ArrowLeft, ArrowRight, Crosshair, Clock } from 'lucide-react';

interface Props {
  candidate: CandidateDetail | null;
  queueItem?: QueueItem;
  onDecision: (candidateId: string, status: 'verified' | 'false_alarm', notes?: string) => void;
  decision?: ReviewerDecision;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export const ClipReviewTab: React.FC<Props> = ({
  candidate, queueItem, onDecision, decision, onNext, onPrev, hasNext, hasPrev,
}) => {
  const [showBoxes, setShowBoxes] = useState(true);
  const [reviewerNotes, setReviewerNotes] = useState(decision?.notes || '');

  useEffect(() => {
    setReviewerNotes(decision?.notes || '');
  }, [candidate?.candidateId, decision?.notes]);

  if (!candidate) {
    return (
      <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>
        <Crosshair size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>No Candidate Selected</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Select a candidate row in the Priority Queue tab to inspect.</div>
      </div>
    );
  }

  const boxes = candidate.maskOverlayData?.boxes || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, height: '100%' }}>
      {/* Left Column: Image Canvas with Overlay */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Viewer Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
              {candidate.sourceMetadata.clipId}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {candidate.sourceMetadata.timestampSec !== undefined ? `T+${candidate.sourceMetadata.timestampSec}s` : 'Single Frame'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setShowBoxes(!showBoxes)}>
              {showBoxes ? 'Hide Overlays' : 'Show Overlays'}
            </button>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onPrev} disabled={!hasPrev} title="Previous candidate">
                <ArrowLeft size={14} />
              </button>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onNext} disabled={!hasNext} title="Next candidate">
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Viewport Frame with SVG Overlay */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#000',
            border: '1px solid var(--border-subtle)',
            borderRadius: 4,
            overflow: 'hidden',
            aspectRatio: '16/9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={candidate.sourceFrameUrl}
            alt={candidate.sourceMetadata.clipId}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />

          {showBoxes && (
            <svg
              viewBox="0 0 800 800"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {boxes.map((b, i) => {
                const w = Math.max(10, b.width || Math.abs(b.x2 - b.x1));
                const h = Math.max(10, b.height || Math.abs(b.y2 - b.y1));
                const x = Math.min(b.x1, b.x2);
                const y = Math.min(b.y1, b.y2);
                return (
                  <g key={i}>
                    {/* Single accent color bounding box per DESIGN.md Section 7.3 */}
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill="rgba(37, 99, 235, 0.15)"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                    />
                    <text
                      x={x}
                      y={Math.max(14, y - 6)}
                      fill="#60a5fa"
                      fontSize="14"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      SIGNAL #{i + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Coordinate Details Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
          <div>SIGNALS: <span style={{ color: 'var(--text-primary)' }}>{boxes.length}</span></div>
          <div>CORROBORATION: <span style={{ color: candidate.hasCorroboratingSignals ? '#34d399' : 'var(--text-muted)' }}>{candidate.hasCorroboratingSignals ? 'CONFIRMED' : 'NONE'}</span></div>
          <div>DAMPENING SCORE: <span style={{ color: candidate.dampening.isDampened ? '#fbbf24' : 'var(--text-primary)' }}>{candidate.dampening.dampeningScore}</span></div>
        </div>
      </div>

      {/* Right Column: Reasoning & Human Decision Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        {/* Top Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {queueItem && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                RANK #{queueItem.priorityRank}
              </span>
              <ConfidencePill label={queueItem.confidenceLabel as ConfidenceLabel} />
            </div>
          )}
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            ID: {candidate.candidateId.substring(0, 16)}...
          </span>
        </div>

        {/* Muse Spark Reasoning Card */}
        <div className="stat-card" style={{ gap: 8 }}>
          <span className="stat-label">Model Reasoning Justification (Muse Spark 1.3)</span>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>
            {queueItem?.reasoningSummary || 'Comparative triage signal evaluation.'}
          </p>
        </div>

        {/* Dampener & Evidence Card */}
        <div className="stat-card" style={{ gap: 10 }}>
          <span className="stat-label">Evidence & Perception Audit</span>
          <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Matched Prompts:</span>
              <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {candidate.maskOverlayData.matchedPrompts.join(', ') || 'none'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>False-Positive Dampener:</span>
              <span style={{ color: candidate.dampening.isDampened ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
                {candidate.dampening.isDampened ? 'DAMPENED' : 'CLEAN'}
              </span>
            </div>
            {candidate.dampening.reason && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
                Note: {candidate.dampening.reason}
              </div>
            )}
          </div>
        </div>

        {/* Human-in-the-Loop Review Decision Section */}
        <div className="stat-card" style={{ gap: 12, marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="stat-label">Human Reviewer Action (Decision Support)</span>
            {decision?.status && decision.status !== 'pending' && (
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: decision.status === 'verified' ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> {decision.status === 'verified' ? 'VERIFIED' : 'FALSE ALARM'}
              </span>
            )}
          </div>

          <textarea
            value={reviewerNotes}
            onChange={(e) => setReviewerNotes(e.target.value)}
            placeholder="Reviewer operational notes (e.g. check drone battery, team dispatched to sector...)"
            rows={2}
            style={{
              width: '100%',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 3,
              color: 'var(--text-primary)',
              padding: 8,
              fontSize: 11,
              outline: 'none',
              resize: 'none',
            }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => onDecision(candidate.candidateId, 'verified', reviewerNotes)}
            >
              <CheckCircle2 size={14} />
              <span>Mark Verified</span>
            </button>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, borderColor: '#7f1d1d', color: '#f87171' }}
              onClick={() => onDecision(candidate.candidateId, 'false_alarm', reviewerNotes)}
            >
              <XCircle size={14} />
              <span>Flag False Alarm</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
