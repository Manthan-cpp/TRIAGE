import { useState, useEffect, useCallback } from 'react';
import type { TabId, JobRecord, QueueItem, ClipDetectionReport, CandidateDetail, ReviewerDecision, HealthInfo, JobMetrics, SystemInfo } from './types';
import {
  fetchHealth,
  fetchJobs,
  fetchJob,
  fetchJobMetrics,
  fetchSystemInfo,
  fetchQueue,
  fetchCandidate,
  submitFilesJob,
  saveCandidateDecision,
  fetchJobDecisions,
  resetSystemState,
} from './api';
import { Layout } from './components/Layout';
import { IngestTab } from './components/IngestTab';
import { QueueTab } from './components/QueueTab';
import { ClipReviewTab } from './components/ClipReviewTab';
import { TelemetryTab } from './components/TelemetryTab';
import { SettingsTab } from './components/SettingsTab';

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('ingest');
  const [currentJob, setCurrentJob] = useState<JobRecord | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [clipReports, setClipReports] = useState<ClipDetectionReport[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail | null>(null);
  const [reviewerDecisions, setReviewerDecisions] = useState<Record<string, ReviewerDecision>>({});
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);
  const [jobMetrics, setJobMetrics] = useState<JobMetrics | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  // Poll health and load latest job on mount
  useEffect(() => {
    fetchHealth().then(setHealthInfo).catch(() => {});
    fetchSystemInfo().then(setSystemInfo).catch(() => {});
    
    // Auto-load latest existing job from backend store
    fetchJobs(1).then(async (res) => {
      if (res.jobs && res.jobs.length > 0) {
        const latest = res.jobs[0];
        setCurrentJob({
          jobId: latest.id,
          status: latest.status,
          progress: { total: latest.totalUnits, processed: latest.processedUnits },
          currentStage: latest.currentStage,
          sourceLabel: latest.sourceLabel,
          completedAt: latest.completedAt,
        });

        const [q, metrics, decs] = await Promise.all([
          fetchQueue(latest.id).catch(() => null),
          fetchJobMetrics(latest.id).catch(() => null),
          fetchJobDecisions(latest.id).catch(() => ({})),
        ]);
        if (q) {
          setQueueItems(q.rankedItems);
          if (q.clipReports) setClipReports(q.clipReports);
        }
        if (metrics) setJobMetrics(metrics);
        setReviewerDecisions(decs);
      }
    }).catch(() => {});

    const interval = setInterval(() => {
      fetchHealth().then(setHealthInfo).catch(() => {});
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Poll active job status while in progress
  const activeJobId = currentJob?.jobId;
  const activeJobStatus = currentJob?.status;
  useEffect(() => {
    if (!activeJobId) return;
    const isWorking = ['queued', 'ingesting', 'detecting', 'ranking'].includes(activeJobStatus || '');
    if (!isWorking) return;

    const timer = setInterval(async () => {
      try {
        const [updated, q, metrics, decs] = await Promise.all([
          fetchJob(activeJobId),
          fetchQueue(activeJobId),
          fetchJobMetrics(activeJobId),
          fetchJobDecisions(activeJobId),
        ]);
        setCurrentJob(updated);
        setQueueItems(q.rankedItems);
        if (q.clipReports) setClipReports(q.clipReports);
        setJobMetrics(metrics);
        setReviewerDecisions(decs);
        if (updated.status === 'complete' || updated.status === 'failed') fetchHealth().then(setHealthInfo).catch(() => {});
      } catch (err) {
        console.warn('Error polling job status:', err);
      }
    }, 1200);

    return () => clearInterval(timer);
  }, [activeJobId, activeJobStatus]);

  // Handler: Upload local files
  const handleUploadFiles = async (files: File[], label: string) => {
    const res = await submitFilesJob(files, label);
    setCurrentJob({
      jobId: res.jobId,
      status: 'queued',
      progress: { total: 0, processed: 0 },
      currentStage: 'Job submitted to background queue...',
    });
    setQueueItems([]);
    setClipReports([]);
    setSelectedCandidate(null);
    setReviewerDecisions({});
    setJobMetrics(null);
  };

  // Handler: Select a candidate for detailed inspection
  const handleSelectCandidate = async (candidateId: string) => {
    try {
      const detail = await fetchCandidate(candidateId);
      setSelectedCandidate(detail);
      setActiveTab('clip');
    } catch (err) {
      console.error('Failed to load candidate details:', err);
    }
  };

  // Handler: Reviewer human-in-the-loop decision with backend persistence
  const handleReviewDecision = async (candidateId: string, status: 'verified' | 'false_alarm', notes?: string) => {
    if (!currentJob?.jobId) throw new Error('No active job is available for this review action.');
    await saveCandidateDecision(candidateId, currentJob.jobId, status, notes);
    setReviewerDecisions((prev) => ({
      ...prev,
      [candidateId]: { status, notes, updatedAt: new Date().toISOString() },
    }));
  };

  // Next / Previous navigation in Clip Review
  const currentQueueIdx = queueItems.findIndex((q) => q.candidateId === selectedCandidate?.candidateId);
  const handleNextCandidate = useCallback(() => {
    if (currentQueueIdx >= 0 && currentQueueIdx < queueItems.length - 1) {
      handleSelectCandidate(queueItems[currentQueueIdx + 1].candidateId);
    }
  }, [currentQueueIdx, queueItems]);

  const handlePrevCandidate = useCallback(() => {
    if (currentQueueIdx > 0) {
      handleSelectCandidate(queueItems[currentQueueIdx - 1].candidateId);
    }
  }, [currentQueueIdx, queueItems]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === '1') setActiveTab('ingest');
      else if (e.key === '2') setActiveTab('queue');
      else if (e.key === '3' && selectedCandidate) setActiveTab('clip');
      else if (activeTab === 'clip' && (e.key === 'j' || e.key === 'ArrowRight')) handleNextCandidate();
      else if (activeTab === 'clip' && (e.key === 'k' || e.key === 'ArrowLeft')) handlePrevCandidate();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectedCandidate, handleNextCandidate, handlePrevCandidate]);

  const handleResetWorkspace = useCallback(async () => {
    try {
      await resetSystemState();
      setCurrentJob(null);
      setQueueItems([]);
      setClipReports([]);
      setSelectedCandidate(null);
      setReviewerDecisions({});
      setActiveTab('ingest');
    } catch (err) {
      console.error('Reset failed:', err);
    }
  }, []);

  const isProcessing = currentJob ? ['queued', 'ingesting', 'detecting', 'ranking'].includes(currentJob.status) : false;

  return (
    <Layout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      queueCount={queueItems.length}
      hasSelectedCandidate={Boolean(selectedCandidate)}
      activeJobId={currentJob?.jobId}
      isProcessing={isProcessing}
      onResetWorkspace={handleResetWorkspace}
    >
      {activeTab === 'ingest' && (
        <IngestTab
          currentJob={currentJob}
          onUploadFiles={handleUploadFiles}
          onNavigateToQueue={() => setActiveTab('queue')}
        />
      )}

      {activeTab === 'queue' && (
        <QueueTab
          items={queueItems}
          clipReports={clipReports}
          selectedCandidateId={selectedCandidate?.candidateId || null}
          onSelectCandidate={handleSelectCandidate}
          reviewerDecisions={reviewerDecisions}
          onNavigateToIngest={() => setActiveTab('ingest')}
        />
      )}

      {activeTab === 'clip' && (
        <ClipReviewTab
          key={selectedCandidate?.candidateId || 'no-candidate'}
          candidate={selectedCandidate}
          queueItem={queueItems.find((q) => q.candidateId === selectedCandidate?.candidateId)}
          onDecision={handleReviewDecision}
          decision={selectedCandidate ? reviewerDecisions[selectedCandidate.candidateId] : undefined}
          onNext={handleNextCandidate}
          onPrev={handlePrevCandidate}
          hasNext={currentQueueIdx < queueItems.length - 1 && currentQueueIdx !== -1}
          hasPrev={currentQueueIdx > 0}
        />
      )}

      {activeTab === 'telemetry' && (
        <TelemetryTab healthInfo={healthInfo} metrics={jobMetrics} systemInfo={systemInfo} />
      )}
      {activeTab === 'settings' && <SettingsTab healthInfo={healthInfo} systemInfo={systemInfo} />}
    </Layout>
  );
}

export default App;
