import { useState, useEffect, useCallback } from 'react';
import type { TabId, JobRecord, QueueItem, CandidateDetail, ReviewerDecision, HealthInfo } from './types';
import {
  fetchHealth,
  fetchJob,
  fetchQueue,
  fetchCandidate,
  submitFilesJob,
  submitDemoJob,
  saveCandidateDecision,
  fetchJobDecisions,
} from './api';
import { Layout } from './components/Layout';
import { IngestTab } from './components/IngestTab';
import { QueueTab } from './components/QueueTab';
import { ClipReviewTab } from './components/ClipReviewTab';
import { AuditTab } from './components/AuditTab';
import { OverviewTab } from './components/OverviewTab';
import { BenchmarksTab } from './components/BenchmarksTab';
import { TelemetryTab } from './components/TelemetryTab';
import { SettingsTab } from './components/SettingsTab';

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('ingest');
  const [currentJob, setCurrentJob] = useState<JobRecord | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail | null>(null);
  const [reviewerDecisions, setReviewerDecisions] = useState<Record<string, ReviewerDecision>>({});
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);

  // Poll health and cost telemetry on mount
  useEffect(() => {
    fetchHealth().then(setHealthInfo).catch(() => {});
    const interval = setInterval(() => {
      fetchHealth().then(setHealthInfo).catch(() => {});
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Poll active job status while in progress
  useEffect(() => {
    if (!currentJob) return;
    const isWorking = ['queued', 'ingesting', 'detecting', 'ranking'].includes(currentJob.status);
    if (!isWorking) return;

    const timer = setInterval(async () => {
      try {
        const updated = await fetchJob(currentJob.jobId);
        setCurrentJob(updated);

        if (updated.status === 'complete') {
          const q = await fetchQueue(updated.jobId);
          setQueueItems(q.rankedItems);
          const decs = await fetchJobDecisions(updated.jobId);
          setReviewerDecisions(decs);
          fetchHealth().then(setHealthInfo).catch(() => {});
        }
      } catch (err) {
        console.warn('Error polling job status:', err);
      }
    }, 1200);

    return () => clearInterval(timer);
  }, [currentJob?.jobId, currentJob?.status]);

  // Handler: Upload local files
  const handleUploadFiles = async (files: File[], label: string) => {
    const res = await submitFilesJob(files, label);
    setCurrentJob({
      jobId: res.jobId,
      status: 'queued',
      progress: { total: files.length, processed: 0 },
      currentStage: 'Job submitted to background queue...',
    });
    setQueueItems([]);
    setSelectedCandidate(null);
  };

  // Handler: Launch demo dataset
  const handleTriggerDemo = async (datasetKey: string, label: string) => {
    const res = await submitDemoJob(datasetKey, label);
    setCurrentJob({
      jobId: res.jobId,
      status: 'queued',
      progress: { total: 5, processed: 0 },
      currentStage: `Demo dataset "${datasetKey}" initializing...`,
    });
    setQueueItems([]);
    setSelectedCandidate(null);
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
  const handleReviewDecision = async (
    candidateId: string,
    status: 'verified' | 'false_alarm',
    notes?: string
  ) => {
    const now = new Date().toISOString();
    setReviewerDecisions((prev) => ({
      ...prev,
      [candidateId]: { status, notes, updatedAt: now },
    }));

    if (currentJob?.jobId) {
      try {
        await saveCandidateDecision(candidateId, currentJob.jobId, status, notes);
      } catch (err) {
        console.warn('Failed to persist decision to backend:', err);
      }
    }
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
      else if (e.key === '4') setActiveTab('audit');
      else if (e.key === '5') setActiveTab('overview');
      else if (e.key === '6') setActiveTab('benchmarks');
      else if (e.key === '7') setActiveTab('telemetry');
      else if (e.key === '8') setActiveTab('settings');
      else if (activeTab === 'clip' && (e.key === 'j' || e.key === 'ArrowRight')) handleNextCandidate();
      else if (activeTab === 'clip' && (e.key === 'k' || e.key === 'ArrowLeft')) handlePrevCandidate();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectedCandidate, handleNextCandidate, handlePrevCandidate]);

  const isProcessing = currentJob ? ['queued', 'ingesting', 'detecting', 'ranking'].includes(currentJob.status) : false;

  return (
    <Layout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      queueCount={queueItems.length}
      hasSelectedCandidate={Boolean(selectedCandidate)}
      activeJobId={currentJob?.jobId}
      isProcessing={isProcessing}
    >
      {activeTab === 'ingest' && (
        <IngestTab
          currentJob={currentJob}
          onUploadFiles={handleUploadFiles}
          onTriggerDemo={handleTriggerDemo}
          onNavigateToQueue={() => setActiveTab('queue')}
        />
      )}

      {activeTab === 'queue' && (
        <QueueTab
          items={queueItems}
          selectedCandidateId={selectedCandidate?.candidateId || null}
          onSelectCandidate={handleSelectCandidate}
          reviewerDecisions={reviewerDecisions}
        />
      )}

      {activeTab === 'clip' && (
        <ClipReviewTab
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

      {activeTab === 'audit' && (
        <AuditTab activeJobId={currentJob?.jobId} />
      )}

      {activeTab === 'overview' && (
        <OverviewTab
          items={queueItems}
          reviewerDecisions={reviewerDecisions}
        />
      )}

      {activeTab === 'benchmarks' && (
        <BenchmarksTab />
      )}

      {activeTab === 'telemetry' && (
        <TelemetryTab healthInfo={healthInfo} />
      )}

      {activeTab === 'settings' && (
        <SettingsTab healthInfo={healthInfo} />
      )}
    </Layout>
  );
}

export default App;
