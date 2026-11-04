import React, { useState, useEffect } from 'react';
import type { ReviewerDecision } from '../types';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Props {
  candidateId: string;
  decision?: ReviewerDecision;
  onDecision: (candidateId: string, status: 'verified' | 'false_alarm', notes?: string) => Promise<void>;
}

export const ReviewDecisionPanel: React.FC<Props> = ({ candidateId, decision, onDecision }) => {
  const [reviewerNotes, setReviewerNotes] = useState(decision?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  useEffect(() => {
    setReviewerNotes(decision?.notes || '');
  }, [candidateId, decision]);

  const submitDecision = async (status: 'verified' | 'false_alarm') => {
    if (isSaving) return;
    setIsSaving(true);
    setDecisionError(null);
    try {
      await onDecision(candidateId, status, reviewerNotes);
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : 'The reviewer action could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="stat-card" style={{ gap: 12, marginTop: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="stat-label">Human Reviewer Action (Decision Support)</span>
        {decision?.status && decision.status !== 'pending' && (
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} /> {decision.status === 'verified' ? 'VERIFIED' : 'FALSE ALARM'}
          </span>
        )}
      </div>

      <textarea
        value={reviewerNotes}
        onChange={(event) => setReviewerNotes(event.target.value)}
        placeholder=""
        rows={2}
        style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 3, color: 'var(--text-primary)', padding: 8, fontSize: 11, outline: 'none', resize: 'none' }}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => void submitDecision('verified')} disabled={isSaving}>
          <CheckCircle2 size={14} />
          <span>Mark Verified</span>
        </button>
        <button className="btn btn-secondary" style={{ flex: 1, borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }} onClick={() => void submitDecision('false_alarm')} disabled={isSaving}>
          <XCircle size={14} />
          <span>Flag False Alarm</span>
        </button>
      </div>
      {decisionError && <div role="alert" style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{decisionError}</div>}
    </div>
  );
};
