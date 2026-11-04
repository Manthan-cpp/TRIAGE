import React, { useState, useRef } from 'react';
import type { JobRecord } from '../types';
import { UploadCloud } from 'lucide-react';
import { PipelineStageTracker } from './PipelineStageTracker';

interface Props {
  currentJob: JobRecord | null;
  onUploadFiles: (files: File[], label: string) => Promise<void>;
  onNavigateToQueue: () => void;
}

export const IngestTab: React.FC<Props> = ({
  currentJob,
  onUploadFiles,
  onNavigateToQueue,
}) => {
  const [dragOver, setDragOver] = useState(false);
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
      void runSubmission(() => onUploadFiles(Array.from(e.dataTransfer.files), ''));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void runSubmission(() => onUploadFiles(Array.from(e.target.files!), ''));
      e.currentTarget.value = '';
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Footage Ingestion & Batch Setup
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>
          Upload aerial drone sweeps, disaster zone photos, or wilderness search footage for AI-assisted candidate triage.
        </p>
      </div>

      {/* Upload Box */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          backgroundColor: dragOver ? 'rgba(37, 99, 235, 0.16)' : 'var(--glass-surface)',
          backdropFilter: 'var(--glass-blur-md)',
          WebkitBackdropFilter: 'var(--glass-blur-md)',
          border: 'none',
          borderRadius: 8,
          boxShadow: dragOver ? '0 12px 40px rgba(37, 99, 235, 0.25)' : 'var(--glass-shadow-md)',
          padding: '48px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
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
        <div style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        }}>
          <UploadCloud size={26} color="var(--accent-highlight)" />
        </div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
            Drag & Drop Drone Footage or Photos Here
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Supports MP4, MOV, JPG, PNG, WEBP · Max 150MB per video, 25MB per image · Video sampled at 2 fps
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 6 }} disabled={isSubmitting}>
          Select Files from Computer
        </button>
      </div>

      {errorMessage && (
        <div role="alert" style={{ color: '#fca5a5', background: 'rgba(127, 29, 29, 0.28)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: 'none', padding: '10px 14px', borderRadius: 6, fontSize: 12, boxShadow: 'var(--glass-shadow-sm)' }}>
          {errorMessage}
        </div>
      )}

      {currentJob && (
        <PipelineStageTracker currentJob={currentJob} onNavigateToQueue={onNavigateToQueue} />
      )}
    </div>
  );
};
