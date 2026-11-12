'use client';

import { useGameStore } from '@/store/useGameStore';

// ============================================================================
// Types
// ============================================================================

type SaveModalProps = {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  error?: string | null;
};

// ============================================================================
// Component
// ============================================================================

export function SaveModal({ onSave, onDiscard, onCancel, error }: SaveModalProps) {
  const { isSaveModalOpen } = useGameStore();

  if (!isSaveModalOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal save-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Unsaved Changes</h2>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          <p>
            You have unsaved changes. What would you like to do?
          </p>
          <div className="modal-actions">
            <button
              className="btn btn-primary"
              onClick={onSave}
            >
              Save & Continue
            </button>
            <button
              className="btn btn-secondary"
              onClick={onDiscard}
            >
              Discard Changes
            </button>
            <button
              className="btn btn-ghost"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SaveModal;
