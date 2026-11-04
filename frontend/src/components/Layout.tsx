import React, { useEffect, useState } from 'react';
import type { TabId } from '../types';
import {
  UploadCloud,
  ListOrdered,
  Crosshair,
  Shield,
} from 'lucide-react';

interface Props {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  queueCount: number;
  hasSelectedCandidate: boolean;
  activeJobId?: string;
  isProcessing: boolean;
  children: React.ReactNode;
}

export const Layout: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  queueCount,
  hasSelectedCandidate,
  children,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
       setTimeStr(`${now.toISOString().slice(11, 19)} UTC`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-shell">
      {/* Top Header */}
      <header className="top-header">
        <div className="brand-section">
          <Shield size={16} color="var(--accent-highlight)" />
          <span className="brand-title">Project Triage</span>
          <span className="brand-tag">SAR Decision Support</span>
        </div>

        <div className="telemetry-strip">
          <div className="telemetry-item">
            <span>{timeStr}</span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-body">
        {/* Left Rail Navigation */}
        <nav className="nav-rail" aria-label="Operational Navigation">
          <div>
            {/* Group 1: Triage Workflow */}
            <div className="nav-group">
              <span className="nav-label">Triage Workflow</span>

              <button
                className={`nav-btn ${activeTab === 'ingest' ? 'active' : ''}`}
                onClick={() => onSelectTab('ingest')}
              >
                <UploadCloud size={15} />
                <span>Ingest Batch</span>
              </button>

              <button
                className={`nav-btn ${activeTab === 'queue' ? 'active' : ''}`}
                onClick={() => onSelectTab('queue')}
              >
                <ListOrdered size={15} />
                <span>Priority Queue</span>
                {queueCount > 0 && <span className="nav-badge">{queueCount}</span>}
              </button>

              <button
                className={`nav-btn ${activeTab === 'clip' ? 'active' : ''}`}
                onClick={() => onSelectTab('clip')}
                disabled={!hasSelectedCandidate}
                title={!hasSelectedCandidate ? 'Select a clip from the Priority Queue first' : undefined}
              >
                <Crosshair size={15} />
                <span>Clip Review</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Dynamic Viewport with key for smooth cross-tab animation */}
        <main key={activeTab} className="tab-viewport">
          {children}
        </main>
      </div>
    </div>
  );
};
