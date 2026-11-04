import React, { useState, useRef } from 'react';
import type { JobRecord } from '../types';
import { UploadCloud, Play, AlertTriangle, Layers, Film } from 'lucide-react';
import { PipelineStageTracker } from './PipelineStageTracker';

interface Props {
  currentJob: JobRecord | null;
  onUploadFiles: (files: File[], label: string) => Promise<void>;
  onTriggerDemo: (datasetKey: string, label: string) => Promise<void>;
  onNavigateToQueue: () => void;
}

export const IngestTab: React.FC<Props> = ({
  currentJob,
  onUploadFiles,
  onTriggerDemo,
  onNavigateToQueue,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('UAV Field Sweep 01');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runSubmission = async (action: () => Promise<void>) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await action();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The batch could not be submitted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void runSubmission(() => onUploadFiles(Array.from(e.dataTransfer.files), sourceLabel));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void runSubmission(() => onUploadFiles(Array.from(e.target.files!), sourceLabel));
      e.currentTarget.value = '';
    }
  };

  const handleDemo = (datasetKey: string, label: string) => {
    void runSubmission(() => onTriggerDemo(datasetKey, label));
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Footage Ingestion & Batch Setup
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>
          Upload aerial drone sweeps, wilderness photos, or launch a validated evaluation dataset.
        </p>
      </div>

      {/* Upload & Demo Launcher Grid */}
      <div className="ingest-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        {/* Drag and Drop Box */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            backgroundColor: dragOver ? 'var(--bg-hover)' : 'var(--bg-secondary)',
            border: `1px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
            borderRadius: 4,
            padding: 32,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
               accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.avi,.mkv"
            style={{ display: 'none' }}
          />
          <UploadCloud size={32} color="#71717a" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
              Drag & Drop Drone Footage Here
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Supports MP4, MOV, JPG, PNG (Max 150MB per video, 25MB per image)
            </div>
          </div>
          <button className="btn btn-secondary" style={{ marginTop: 8 }} disabled={isSubmitting}>
            Browse Local Media
          </button>
        </div>

        {/* 1-Click Evaluation Datasets */}
        <div className="stat-card" style={{ gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={16} color="var(--text-muted)" />
            <span className="stat-label">1-Click Evaluation Datasets</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Run pre-indexed academic benchmark footage from SARD and UAV-SAR research datasets:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{ justifyContent: 'flex-start' }}
              disabled={isSubmitting}
              onClick={() => handleDemo('eval_mix', 'Mixed Academic Benchmark (SARD + UAV + Negatives)')}
            >
              <Play size={14} />
              <span>Launch Balanced Eval Batch (Recommended)</span>
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start' }}
              disabled={isSubmitting}
              onClick={() => handleDemo('uav_sar', 'UAV-SAR Aerial Wilderness Sweep')}
            >
              <Film size={14} />
              <span>UAV-SAR Aerial Wilderness (High Occlusion)</span>
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start' }}
              disabled={isSubmitting}
              onClick={() => handleDemo('negative', 'Foliage/Debris Negative Controls')}
            >
              <AlertTriangle size={14} />
              <span>Foliage & Shadow Negative Controls</span>
            </button>
          </div>
        </div>
      </div>

      {/* Batch Name Config */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Batch Source Label:
        </span>
        <input
          type="text"
          value={sourceLabel}
          onChange={(e) => setSourceLabel(e.target.value)}
          placeholder="e.g. Flight Sweep Alpine Sector 4"
          style={{
            flex: 1,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 3,
            color: 'var(--text-primary)',
            padding: '6px 10px',
            fontSize: 12,
            outline: 'none',
          }}
        />
      </div>

      {errorMessage && (
        <div role="alert" style={{ color: '#fca5a5', background: 'rgba(127, 29, 29, 0.2)', border: '1px solid #7f1d1d', padding: '8px 12px', borderRadius: 4, fontSize: 12 }}>
          {errorMessage}
        </div>
      )}

      {currentJob && (
        <PipelineStageTracker currentJob={currentJob} onNavigateToQueue={onNavigateToQueue} />
      )}
    </div>
  );
};
