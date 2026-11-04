import React, { useEffect, useState } from 'react';
import type { TabId } from '../types';
import {
  UploadCloud,
  ListOrdered,
  Crosshair,
} from 'lucide-react';
import Particles from './Particles/Particles';

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
          <img
            src="/logo.png"
            alt="Project Triage Emblem"
            className="brand-logo"
            style={{
              width: 24,
              height: 24,
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 2px 8px rgba(37, 99, 235, 0.4))',
            }}
          />
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
      <div className="main-body" style={{ position: 'relative' }}>
        {/* Ambient Particles Background - active for all tabs except Clip Review */}
        {activeTab !== 'clip' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 0,
              overflow: 'hidden',
            }}
          >
            <Particles
              particleColors={['#ffffff', '#e4e4e7', '#a1a1aa', '#71717a']}
              particleCount={100}
              particleSpread={10}
              speed={0.07}
              particleBaseSize={45}
              glow={0.25}
              twinkle={0.3}
              moveParticlesOnHover={true}
              hoverEffect="parallax"
              opacity={0.75}
            />
          </div>
        )}

        {/* Left Rail Navigation */}
        <nav className="nav-rail" aria-label="Operational Navigation" style={{ position: 'relative', zIndex: 2 }}>
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
        <main
          key={activeTab}
          className="tab-viewport"
          style={{
            position: 'relative',
            zIndex: 1,
            backgroundColor: activeTab === 'clip' ? 'var(--bg-primary)' : 'transparent',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
