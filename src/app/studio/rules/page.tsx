'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { GameGenre, WinConditionType, MovementProfile, TargetRule, AttackStyle } from '@/types';

// ============================================================================
// View 5: Mechanics & Rule Configurator
// ============================================================================

export default function MechanicsRuleConfigurator() {
  const {
    currentProject,
    setActiveTab,
    setIsDirty,
  } = useGameStore();

  // Set active tab on mount
  useEffect(() => {
    setActiveTab('rules');
  }, [setActiveTab]);

  // Local state for form inputs
  const [activeTab, setActiveTabLocal] = useState<'physics' | 'ai' | 'economy' | 'level'>('physics');

  // Get mechanics config from current project
  const mechanicsConfig = currentProject?.project_data.mechanics_config;
  const economyConfig = currentProject?.project_data.economy_config;

  return (
    <>
      {/* Mechanics & Rule Configurator Content */}
      <div className="view-container view-studio view-rules">
        <div className="config-layout">
          {/* Sidebar Navigation */}
          <aside className="config-sidebar">
            <div className="sidebar-header">
              <h2>Mechanics & Rules</h2>
            </div>
            <nav className="config-nav">
              <button
                className={`nav-item ${activeTab === 'physics' ? 'active' : ''}`}
                onClick={() => setActiveTabLocal('physics')}
              >
                <span className="nav-icon">⚙️</span>
                <span>Physics</span>
              </button>
              <button
                className={`nav-item ${activeTab === 'ai' ? 'active' : ''}`}
                onClick={() => setActiveTabLocal('ai')}
              >
                <span className="nav-icon">🤖</span>
                <span>Enemy AI</span>
              </button>
              <button
                className={`nav-item ${activeTab === 'economy' ? 'active' : ''}`}
                onClick={() => setActiveTabLocal('economy')}
              >
                <span className="nav-icon">💰</span>
                <span>Economy</span>
              </button>
              <button
                className={`nav-item ${activeTab === 'level' ? 'active' : ''}`}
                onClick={() => setActiveTabLocal('level')}
              >
                <span className="nav-icon">🗺️</span>
                <span>Level Builder</span>
              </button>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="config-main">
            {/* Physics Tab */}
            {activeTab === 'physics' && (
              <div className="config-section">
                <div className="section-header">
                  <h2>Physics Configuration</h2>
                  <p>Adjust game physics parameters</p>
                </div>

                <div className="config-grid">
                  {/* Player 1 Config */}
                  <div className="config-card">
                    <h3>Player 1</h3>
                    <div className="config-group">
                      <label>Gravity (Y-axis)</label>
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="10"
                        value={mechanicsConfig?.player_1_config?.gravity_y || 800}
                        onChange={(e) => setIsDirty(true)}
                      />
                      <span className="value-display">
                        {mechanicsConfig?.player_1_config?.gravity_y || 800}
                      </span>
                    </div>
                    <div className="config-group">
                      <label>Move Speed</label>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="10"
                        value={mechanicsConfig?.player_1_config?.move_speed || 200}
                        onChange={(e) => setIsDirty(true)}
                      />
                      <span className="value-display">
                        {mechanicsConfig?.player_1_config?.move_speed || 200}
                      </span>
                    </div>
                    <div className="config-group">
                      <label>Jump Force</label>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="10"
                        value={mechanicsConfig?.player_1_config?.jump_force || 420}
                        onChange={(e) => setIsDirty(true)}
                      />
                      <span className="value-display">
                        {mechanicsConfig?.player_1_config?.jump_force || 420}
                      </span>
                    </div>
                    <div className="config-group checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={mechanicsConfig?.player_1_config?.wall_slide_enabled || false}
                          onChange={(e) => setIsDirty(true)}
                        />
                        <span>Wall Slide Enabled</span>
                      </label>
                    </div>
                  </div>

                  {/* Player 2 Config */}
                  <div className="config-card">
                    <h3>Player 2</h3>
                    <div className="config-group">
                      <label>Gravity (Y-axis)</label>
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="10"
                        value={mechanicsConfig?.player_2_config?.gravity_y || 800}
                        onChange={(e) => setIsDirty(true)}
                      />
                      <span className="value-display">
                        {mechanicsConfig?.player_2_config?.gravity_y || 800}
                      </span>
                    </div>
                    <div className="config-group">
                      <label>Move Speed</label>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="10"
                        value={mechanicsConfig?.player_2_config?.move_speed || 210}
                        onChange={(e) => setIsDirty(true)}
                      />
                      <span className="value-display">
                        {mechanicsConfig?.player_2_config?.move_speed || 210}
                      </span>
                    </div>
                    <div className="config-group">
                      <label>Jump Force</label>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="10"
                        value={mechanicsConfig?.player_2_config?.jump_force || 400}
                        onChange={(e) => setIsDirty(true)}
                      />
                      <span className="value-display">
                        {mechanicsConfig?.player_2_config?.jump_force || 400}
                      </span>
                    </div>
                  </div>

                  {/* Win/Loss Conditions */}
                  <div className="config-card">
                    <h3>Win/Loss Conditions</h3>
                    <div className="config-group">
                      <label>Win Condition</label>
                      <select
                        value={mechanicsConfig?.win_condition || 'ReachGoal'}
                        onChange={(e) => setIsDirty(true)}
                      >
                        <option value="ReachGoal">Reach Goal</option>
                        <option value="DefeatEnemies">Defeat Enemies</option>
                        <option value="ScoreTarget">Score Target</option>
                        <option value="SurviveWaves">Survive Waves</option>
                        <option value="BossDefeat">Boss Defeat</option>
                        <option value="CollectItems">Collect Items</option>
                      </select>
                    </div>
                    <div className="config-group">
                      <label>Score Target</label>
                      <input
                        type="number"
                        min="1"
                        value={mechanicsConfig?.score_target || 1000}
                        onChange={(e) => setIsDirty(true)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enemy AI Tab */}
            {activeTab === 'ai' && (
              <div className="config-section">
                <div className="section-header">
                  <h2>Enemy AI Builder</h2>
                  <p>Compose enemy AI from movement, target, and attack profiles</p>
                </div>

                <div className="ai-builder">
                  <div className="ai-layer">
                    <h3>Movement Profile</h3>
                    <div className="ai-options">
                      {(['Patrol', 'DirectChase', 'Turret', 'FlyAndHover', 'PathFollower'] as MovementProfile[]).map((profile) => (
                        <button
                          key={profile}
                          className="ai-option"
                          onClick={() => setIsDirty(true)}
                        >
                          {profile}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ai-layer">
                    <h3>Target Rule</h3>
                    <div className="ai-options">
                      {(['Player1', 'Player2', 'NearestPlayer'] as TargetRule[]).map((target) => (
                        <button
                          key={target}
                          className="ai-option"
                          onClick={() => setIsDirty(true)}
                        >
                          {target}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ai-layer">
                    <h3>Attack Style</h3>
                    <div className="ai-options">
                      {(['ContactDamage', 'RangedProjectile', 'ProximityBlast'] as AttackStyle[]).map((style) => (
                        <button
                          key={style}
                          className="ai-option"
                          onClick={() => setIsDirty(true)}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ai-preview">
                  <h3>AI Preview</h3>
                  <div className="preview-card">
                    <span className="preview-icon">👾</span>
                    <span>Enemy AI Configuration</span>
                  </div>
                </div>
              </div>
            )}

            {/* Economy Tab */}
            {activeTab === 'economy' && (
              <div className="config-section">
                <div className="section-header">
                  <h2>Economy Configuration</h2>
                  <p>Configure currency, upgrades, and scaling</p>
                </div>

                <div className="config-grid">
                  <div className="config-card">
                    <h3>Currency Settings</h3>
                    <div className="config-group">
                      <label>Starting Currency</label>
                      <input
                        type="number"
                        min="0"
                        value={economyConfig?.starting_currency || 100}
                        onChange={(e) => setIsDirty(true)}
                      />
                    </div>
                    <div className="config-group">
                      <label>Currency Name</label>
                      <input
                        type="text"
                        value={economyConfig?.currency_name || 'Gold'}
                        onChange={(e) => setIsDirty(true)}
                      />
                    </div>
                    <div className="config-group">
                      <label>Currency per Click</label>
                      <input
                        type="number"
                        min="0"
                        value={economyConfig?.currency_per_click || 1}
                        onChange={(e) => setIsDirty(true)}
                      />
                    </div>
                    <div className="config-group">
                      <label>Currency per Kill</label>
                      <input
                        type="number"
                        min="0"
                        value={economyConfig?.currency_per_kill || 15}
                        onChange={(e) => setIsDirty(true)}
                      />
                    </div>
                  </div>

                  <div className="config-card">
                    <h3>Scaling & Costs</h3>
                    <div className="config-group">
                      <label>Passive Income Rate (per second)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={economyConfig?.passive_income_rate_sec || 0}
                        onChange={(e) => setIsDirty(true)}
                      />
                    </div>
                    <div className="config-group">
                      <label>Upgrade Cost Multiplier</label>
                      <input
                        type="number"
                        min="1"
                        max="2"
                        step="0.01"
                        value={economyConfig?.upgrade_cost_multiplier || 1.15}
                        onChange={(e) => setIsDirty(true)}
                      />
                    </div>
                    <div className="config-group">
                      <label>Turret Build Cost</label>
                      <input
                        type="number"
                        min="0"
                        value={economyConfig?.turret_build_cost || 50}
                        onChange={(e) => setIsDirty(true)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Level Builder Tab */}
            {activeTab === 'level' && (
              <div className="config-section">
                <div className="section-header">
                  <h2>Level Builder</h2>
                  <p>Build levels with tiles, spawners, and goals</p>
                </div>

                <div className="level-builder">
                  <div className="builder-tools">
                    <h3>Tools</h3>
                    <div className="tool-palette">
                      <button className="tool-btn active">
                        <span className="tool-icon">⬛</span>
                        <span>Tile</span>
                      </button>
                      <button className="tool-btn">
                        <span className="tool-icon">👤</span>
                        <span>Player Spawn</span>
                      </button>
                      <button className="tool-btn">
                        <span className="tool-icon">👾</span>
                        <span>Enemy</span>
                      </button>
                      <button className="tool-btn">
                        <span className="tool-icon">⚠️</span>
                        <span>Hazard</span>
                      </button>
                      <button className="tool-btn">
                        <span className="tool-icon">✨</span>
                        <span>Pickup</span>
                      </button>
                      <button className="tool-btn">
                        <span className="tool-icon">🎯</span>
                        <span>Goal</span>
                      </button>
                      <button className="tool-btn">
                        <span className="tool-icon">🔄</span>
                        <span>Wave Spawner</span>
                      </button>
                    </div>
                  </div>

                  <div className="builder-canvas">
                    <div className="canvas-grid">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={`row-${i}`} className="grid-row" />
                      ))}
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={`col-${i}`} className="grid-col" />
                      ))}
                    </div>
                    <div className="canvas-content">
                      <span className="canvas-placeholder">
                        <span className="placeholder-icon">🗺️</span>
                        <span>Level Grid - 20×20</span>
                      </span>
                    </div>
                  </div>

                  <div className="builder-properties">
                    <h3>Tile Properties</h3>
                    <div className="property-list">
                      <div className="property-item">
                        <label>Tile Type</label>
                        <select onChange={() => setIsDirty(true)}>
                          <option value="ground">Ground</option>
                          <option value="wall">Wall</option>
                          <option value="spike">Spike</option>
                          <option value="water">Water</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
