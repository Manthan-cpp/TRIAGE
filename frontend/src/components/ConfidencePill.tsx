import React from 'react';
import type { ConfidenceLabel } from '../types';

interface Props {
  label: ConfidenceLabel;
}

export const ConfidencePill: React.FC<Props> = ({ label }) => {
  const getShapeClass = () => {
    switch (label) {
      case 'possible-high':
        return 'badge-shape shape-diamond';
      case 'possible-medium':
        return 'badge-shape shape-square';
      case 'possible-low':
      default:
        return 'badge-shape shape-circle';
    }
  };

  const getContainerClass = () => {
    switch (label) {
      case 'possible-high':
        return 'confidence-badge confidence-high';
      case 'possible-medium':
        return 'confidence-badge confidence-medium';
      case 'possible-low':
      default:
        return 'confidence-badge confidence-low';
    }
  };

  return (
    <span className={getContainerClass()} title={`Triage confidence tier: ${label}`}>
      <span className={getShapeClass()} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
