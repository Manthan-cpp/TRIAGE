import type { JobRecord, QueueItem, CandidateDetail, HealthInfo, AuditLogEntry, ReviewerDecision } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function fetchJobs(limit = 20): Promise<{ jobs: any[]; total: number }> {
  const res = await fetch(`${API_BASE}/api/jobs?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to list jobs: ${res.status}`);
  return res.json();
}

export async function fetchJob(jobId: string): Promise<JobRecord> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Failed to get job ${jobId}: ${res.status}`);
  return res.json();
}

export async function fetchQueue(jobId: string): Promise<{ jobId: string; total: number; rankedItems: QueueItem[] }> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/queue`);
  if (!res.ok) throw new Error(`Failed to get queue for ${jobId}: ${res.status}`);
  return res.json();
}

export async function fetchCandidate(candidateId: string): Promise<CandidateDetail> {
  const res = await fetch(`${API_BASE}/api/candidates/${candidateId}`);
  if (!res.ok) throw new Error(`Failed to get candidate ${candidateId}: ${res.status}`);
  return res.json();
}

export async function submitFilesJob(files: File[], sourceLabel: string): Promise<{ jobId: string; status: string }> {
  const formData = new FormData();
  formData.append('sourceLabel', sourceLabel || 'User Drone Upload');
  for (const f of files) {
    formData.append('files', f);
  }

  const res = await fetch(`${API_BASE}/api/jobs`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed with status ${res.status}`);
  }
  return res.json();
}

export async function submitDemoJob(demoDataset: string, sourceLabel: string): Promise<{ jobId: string; status: string }> {
  const res = await fetch(`${API_BASE}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demoDataset, sourceLabel }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Demo submission failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchJobAudit(jobId: string): Promise<AuditLogEntry[]> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/audit`);
  if (!res.ok) throw new Error(`Failed to get audit log for ${jobId}: ${res.status}`);
  const data = await res.json();
  return data.events || [];
}

export async function fetchRecentAudit(limit = 100): Promise<AuditLogEntry[]> {
  const res = await fetch(`${API_BASE}/api/audit?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to get recent audit log: ${res.status}`);
  const data = await res.json();
  return data.events || [];
}

export async function saveCandidateDecision(
  candidateId: string,
  jobId: string,
  decision: 'verified' | 'false_alarm',
  notes?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/candidates/${candidateId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, decision, notes }),
  });
  if (!res.ok) throw new Error(`Failed to record decision for ${candidateId}`);
}

export async function fetchJobDecisions(jobId: string): Promise<Record<string, ReviewerDecision>> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/decisions`);
  if (!res.ok) return {};
  const data = await res.json();
  return data.decisions || {};
}
