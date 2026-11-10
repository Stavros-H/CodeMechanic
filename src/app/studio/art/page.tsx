'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { AuthModal, SaveModal } from '@/components';
import { EntityRole, Resolution, Sprite } from '@/schemas/projectSchemas';

// ============================================================================
// View 4: Pixel & Hitbox Studio
// ============================================================================

export default function PixelHitboxStudio() {
  const router = useRouter();
  const {
    currentProject,
    setActiveTab,
    setIsDirty,
    isSaveModalOpen,
    setIsSaveModalOpen,
    remixProject,
  } = useGameStore();

  // Set active tab on mount
  useEffect(() => {
    setActiveTab('art');
  }, [setActiveTab]);

  // State for Sprite Backpack
  const [activeEntity, setActiveEntity] = useState<EntityRole>('player_1');
  const [selectedSprite, setSelectedSprite] = useState<Sprite | null>(null);
  const [showNewSpriteModal, setShowNewSpriteModal] = useState(false);
  const [newSpriteName, setNewSpriteName] = useState('');
  const [newSpriteRole, setNewSpriteRole] = useState<EntityRole>('player_1');
  const [newSpriteResolution, setNewSpriteResolution] = useState<Resolution>(32);

  // Entity list categorized by role
  const entityCategories = [
    { label: 'Players', roles: ['player_1', 'player_2'] as EntityRole[] },
    { label: 'Enemies', roles: ['enemy'] as EntityRole[] },
    { label: 'Hazards', roles: ['hazard'] as EntityRole[] },
    { label: 'Items', roles: ['pickup', 'goal'] as EntityRole[] },
    { label: 'Environment', roles: ['tile'] as EntityRole[] },
  ];

  // Handle save and continue
  const handleSaveAndContinue = () => {
    setIsSaveModalOpen(false);
    setIsDirty(false);
  };

  // Handle discard changes
  const handleDiscardChanges = () => {
    setIsSaveModalOpen(false);
    setIsDirty(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setIsSaveModalOpen(false);
  };

  // Create new sprite
  const handleCreateSprite = () => {
    // In a real implementation, this would create a new sprite
    // and add it to the current project
    setShowNewSpriteModal(false);
    setNewSpriteName('');
  };

  // Select entity
  const handleSelectEntity = (role: EntityRole) => {
    setActiveEntity(role);
    // Find sprite with this role in current project
    const sprite = currentProject?.project_data.sprites.find(
      (s) => s.role === role
    );
    setSelectedSprite(sprite || null);
  };

  return (
    <>
      {/* Modals */}
      <AuthModal />
      <SaveModal
        onSave={handleSaveAndContinue}
        onDiscard={handleDiscardChanges}
        onCancel={handleCancel}
      />

      {/* New Sprite Modal */}
      {showNewSpriteModal && (
        <div className="modal-overlay" onClick={() => setShowNewSpriteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Sprite</h2>
              <button
                className="modal-close"
                onClick={() => setShowNewSpriteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="sprite-name">Name</label>
                <input
                  type="text"
                  id="sprite-name"
                  value={newSpriteName}
                  onChange={(e) => setNewSpriteName(e.target.value)}
                  placeholder="My Character"
                />
              </div>
              <div className="form-group">
                <label htmlFor="sprite-role">Role</label>
                <select
                  id="sprite-role"
                  value={newSpriteRole}
                  onChange={(e) => setNewSpriteRole(e.target.value as EntityRole)}
                >
                  <option value="player_1">Player 1</option>
                  <option value="player_2">Player 2</option>
                  <option value="enemy">Enemy</option>
                  <option value="hazard">Hazard</option>
                  <option value="pickup">Pickup</option>
                  <option value="goal">Goal</option>
                  <option value="tile">Tile</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sprite-resolution">Resolution</label>
                <select
                  id="sprite-resolution"
                  value={newSpriteResolution}
                  onChange={(e) => setNewSpriteResolution(Number(e.target.value) as Resolution)}
                >
                  <option value={16}>16×16</option>
                  <option value={32}>32×32</option>
                  <option value={64}>64×64</option>
                </select>
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleCreateSprite}
                >
                  Create Sprite
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowNewSpriteModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pixel & Hitbox Studio Content */}
      <div className="view-container view-studio view-art">
        <div className="studio-layout">
          {/* Sprite Backpack Sidebar */}
          <aside className="sprite-backpack">
            <div className="backpack-header">
              <h2>Sprite Backpack</h2>
              <button
                className="btn btn-small btn-primary"
                onClick={() => setShowNewSpriteModal(true)}
              >
                <span className="btn-icon">+</span>
                <span>New Sprite</span>
              </button>
            </div>
            <div className="entity-categories">
              {entityCategories.map((category) => (
                <div key={category.label} className="entity-category">
                  <h3>{category.label}</h3>
                  <div className="entity-list">
                    {category.roles.map((role) => (
                      <button
                        key={role}
                        className={`entity-item ${activeEntity === role ? 'active' : ''}`}
                        onClick={() => handleSelectEntity(role)}
                      >
                        <span className="entity-icon">
                          {role === 'player_1' && '👤'}
                          {role === 'player_2' && '👥'}
                          {role === 'enemy' && '👾'}
                          {role === 'hazard' && '⚠️'}
                          {role === 'pickup' && '✨'}
                          {role === 'goal' && '🎯'}
                          {role === 'tile' && '⬛'}
                        </span>
                        <span className="entity-label">
                          {role.replace('_', ' ')}
                        </span>
                        {selectedSprite && selectedSprite.role === role && (
                          <span className="entity-check">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Main Canvas Area */}
          <main className="canvas-area">
            <div className="canvas-toolbar">
              <div className="toolbar-group">
                <h2>{activeEntity.replace('_', ' ')}</h2>
                {selectedSprite && (
                  <span className="sprite-info">
                    {selectedSprite.name} ({selectedSprite.resolution}×{selectedSprite.resolution})
                  </span>
                )}
              </div>
              <div className="toolbar-group">
                <button className="toolbar-btn active">
                  <span className="tool-icon">🖌️</span>
                  <span>Art Layer</span>
                </button>
                <button className="toolbar-btn">
                  <span className="tool-icon hitbox-icon">🟥</span>
                  <span>Hitbox Layer</span>
                </button>
              </div>
            </div>

            {/* Dual-Layer Canvas */}
            <div className="dual-canvas">
              <div className="canvas-layer art-layer">
                <div className="canvas-grid">
                  {/* Grid lines for pixel art */}
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={`row-${i}`} className="grid-row" />
                  ))}
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={`col-${i}`} className="grid-col" />
                  ))}
                </div>
                <div className="canvas-content">
                  <span className="canvas-placeholder">
                    <span className="placeholder-icon">🎨</span>
                    <span>Art Layer - Draw Here</span>
                  </span>
                </div>
              </div>
              <div className="canvas-layer hitbox-layer">
                <div className="canvas-content">
                  <span className="canvas-placeholder">
                    <span className="placeholder-icon hitbox-icon">🟥</span>
                    <span>Hitbox Layer - Define Collisions</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Canvas Controls */}
            <div className="canvas-controls">
              <div className="control-group">
                <span className="control-label">Tools:</span>
                <button className="control-btn active">Pencil</button>
                <button className="control-btn">Bucket</button>
                <button className="control-btn">Eraser</button>
                <button className="control-btn">Eyedropper</button>
              </div>
              <div className="control-group">
                <span className="control-label">Colors:</span>
                <div className="color-palette">
                  <button className="color-swatch" style={{ background: '#ff0000' }} />
                  <button className="color-swatch" style={{ background: '#00ff00' }} />
                  <button className="color-swatch" style={{ background: '#0000ff' }} />
                  <button className="color-swatch" style={{ background: '#ffff00' }} />
                  <button className="color-swatch" style={{ background: '#ff00ff' }} />
                  <button className="color-swatch" style={{ background: '#00ffff' }} />
                  <button className="color-swatch" style={{ background: '#ffffff' }} />
                  <button className="color-swatch" style={{ background: '#000000' }} />
                </div>
              </div>
              <div className="control-group">
                <button className="control-btn">Undo</button>
                <button className="control-btn">Redo</button>
              </div>
            </div>
          </main>

          {/* Properties Panel */}
          <aside className="properties-panel">
            <div className="panel-header">
              <h2>Properties</h2>
            </div>
            {selectedSprite ? (
              <div className="sprite-properties">
                <div className="property-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={selectedSprite.name}
                    onChange={(e) => {
                      // Update sprite name
                      setIsDirty(true);
                    }}
                  />
                </div>
                <div className="property-group">
                  <label>Resolution</label>
                  <span>{selectedSprite.resolution}×{selectedSprite.resolution}</span>
                </div>
                <div className="property-group">
                  <label>Animation States</label>
                  <div className="animation-list">
                    {Object.keys(selectedSprite.frames).map((state) => (
                      <div key={state} className="animation-item">
                        <span className="animation-name">{state}</span>
                        <span className="frame-count">
                          {selectedSprite.frames[state as keyof typeof selectedSprite.frames]?.length ?? 0} frames
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="property-group">
                  <label>Hitboxes</label>
                  <span>{selectedSprite.hitboxes.length} defined</span>
                </div>
              </div>
            ) : (
              <div className="panel-empty">
                <span className="empty-icon">ℹ️</span>
                <p>Select a sprite to view properties</p>
              </div>
            )}
          </aside>
        </div>

        {/* Frame Animation Preview */}
        <div className="frame-preview">
          <h3>Frame Animation Preview</h3>
          <div className="preview-area">
            <span className="preview-placeholder">
              Animation frames will appear here
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
