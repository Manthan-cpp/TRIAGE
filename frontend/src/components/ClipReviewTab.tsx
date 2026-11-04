import React, { useState } from 'react';
import type { CandidateDetail, ConfidenceLabel, ReviewerDecision, QueueItem } from '../types';
import { ConfidencePill } from './ConfidencePill';
import { resolveMediaUrl } from '../api';
import { ArrowLeft, ArrowRight, Crosshair } from 'lucide-react';
import { ReviewDecisionPanel } from './ReviewDecisionPanel';

interface Props {
  candidate: CandidateDetail | null;
  queueItem?: QueueItem;
  onDecision: (candidateId: string, status: 'verified' | 'false_alarm', notes?: string) => Promise<void>;
  decision?: ReviewerDecision;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

const renderSituationalAssessment = (text?: string) => {
  if (!text) {
    return <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.45 }}>No assessment available.</p>;
  }

  const sections = [
    { label: 'The Person & Appearance', regex: /\*\*The Person & Appearance\*\*:\s*([^\n*]+(?:\n(?!\*\*)[^\n*]+)*)/i, color: '#3b82f6' },
    { label: 'Posture & Physical State', regex: /\*\*Posture & Physical State\*\*:\s*([^\n*]+(?:\n(?!\*\*)[^\n*]+)*)/i, color: '#f59e0b' },
    { label: 'Surroundings & Terrain', regex: /\*\*Surroundings & Terrain\*\*:\s*([^\n*]+(?:\n(?!\*\*)[^\n*]+)*)/i, color: '#10b981' },
    { label: 'Urgency/Risk Context', regex: /\*\*Urgency\/Risk Context\*\*:\s*([^\n*]+(?:\n(?!\*\*)[^\n*]+)*)/i, color: '#ef4444' },
  ];

  const matched = sections.map((s) => {
    const m = text.match(s.regex);
    return m ? { label: s.label, content: m[1].trim(), color: s.color } : null;
  }).filter(Boolean);

  if (matched.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {matched.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderLeft: `3px solid ${item!.color}`,
              borderRadius: '0 4px 4px 0',
              padding: '8px 12px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: item!.color,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 3,
              }}
            >
              {item!.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>
              {item!.content}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
      {text}
    </p>
  );
};

export const ClipReviewTab: React.FC<Props> = ({
  candidate, queueItem, onDecision, decision, onNext, onPrev, hasNext, hasPrev,
}) => {
  const [showBoxes, setShowBoxes] = useState(true);
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
    <div className="clip-review-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, height: '100%' }}>
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
          <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '100%' }}>
            <img
              src={resolveMediaUrl(candidate.sourceFrameUrl)}
              alt={candidate.sourceMetadata.clipId}
              style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain', display: 'block' }}
            />

            {showBoxes && (
              <svg
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
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
                  const x = Math.max(0, Math.min(990, Math.min(b.x1, b.x2)));
                  const y = Math.max(0, Math.min(990, Math.min(b.y1, b.y2)));
                  const rawW = Math.abs(b.x2 - b.x1);
                  const rawH = Math.abs(b.y2 - b.y1);
                  const w = Math.max(14, Math.min(1000 - x, rawW > 0 ? rawW : 20));
                  const h = Math.max(14, Math.min(1000 - y, rawH > 0 ? rawH : 20));
                  const labelY = y > 24 ? y - 6 : y + 20;
                  return (
                    <g key={i}>
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
                        y={labelY}
                        fill="#60a5fa"
                        fontSize="18"
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
        </div>

        {/* Coordinate Details Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
          <div>SIGNALS: <span style={{ color: 'var(--text-primary)' }}>{boxes.length}</span></div>
          <div>CORROBORATION: <span style={{ color: candidate.hasCorroboratingSignals ? '#34d399' : 'var(--text-muted)' }}>{candidate.hasCorroboratingSignals ? 'CORROBORATED' : 'NONE'}</span></div>
          <div>DAMPENING SCORE: <span style={{ color: candidate.dampening.isDampened ? '#fbbf24' : 'var(--text-primary)' }}>{candidate.dampening.dampeningScore}</span></div>
        </div>
      </div>

      {/* Right Column: Reasoning & Human Decision Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        {/* Top Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {(queueItem || candidate.priorityRank) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                RANK #{queueItem?.priorityRank || candidate.priorityRank}
              </span>
              <ConfidencePill label={(queueItem?.confidenceLabel || candidate.confidenceLabel || 'possible-medium') as ConfidenceLabel} />
            </div>
          )}
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            ID: {candidate.candidateId.substring(0, 16)}...
          </span>
        </div>

        {/* Muse Spark Situational Assessment Card */}
        <div className="stat-card" style={{ gap: 10 }}>
          <span className="stat-label">Situational Assessment & Scene Reasoning (Muse Spark 1.3)</span>
          {renderSituationalAssessment(candidate.fullReasoningText || queueItem?.fullReasoningText || queueItem?.reasoningSummary)}
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

        <ReviewDecisionPanel candidateId={candidate.candidateId} decision={decision} onDecision={onDecision} />
      </div>
    </div>
  );
};
