'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useGameStore } from '@/store/useGameStore';
import { useGuardedNavigation } from '@/hooks/useUnsavedChangesGuard';
import { useStudioStore } from '@/studio/store/useStudioStore';
import { EntityRole, Resolution, Sprite } from '@/schemas/projectSchemas';
import { ALL_PALETTES, getPaletteById } from '@/studio/utils/palettes';
import { rasterizeShape } from '@/studio/utils/rasterize';
import {
  schemaHitboxesToStudio,
  studioHitboxesToSchema,
} from '@/studio/utils/hitboxes';
import {
  computeBoundsFromImageData,
  loadImageDataFromUrl,
} from '@/studio/utils/bounds';
import {
  DrawingTool,
  VALID_RESOLUTIONS,
  ENTITY_CATEGORIES,
  AnimationState,
  ANIMATION_STATES,
  StudioHitbox,
  HitboxType,
  HITBOX_TYPE_COLORS,
  PixelData,
  Bounds,
  calculateBounds,
} from '@/studio/types';
import { createDefaultProject } from '@/lib/defaultProject';

// ============================================================================
// Constants
// ============================================================================

const CANVAS_SCALE_OPTIONS = [1, 2, 4, 8, 16];
const PLAYBACK_INTERVAL_MS = 180;

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getRoleIcon(role: EntityRole): string {
  switch (role) {
    case 'player_1': return '👤';
    case 'player_2': return '👥';
    case 'enemy': return '👹';
    case 'hazard': return '⚠️';
    case 'pickup': return '✨';
    case 'goal': return '🏆';
    case 'tile': return '⬛';
  }
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image could not be decoded'));
    };
    img.src = url;
  });
}

function renderPixelsToDataUrl(pixels: PixelData[], resolution: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  for (const pixel of pixels) {
    ctx.fillStyle = pixel.color;
    ctx.fillRect(pixel.x, pixel.y, 1, 1);
  }
  return canvas.toDataURL('image/png');
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('File could not be read'));
    reader.readAsDataURL(file);
  });
}

function renderFileToDataUrl(
  file: File,
  mode: 'crop' | 'downscale',
  resolution: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas is unavailable'));
        return;
      }
      ctx.imageSmoothingEnabled = false;
      if (mode === 'crop') {
        const sx = Math.max(0, Math.floor((img.naturalWidth - resolution) / 2));
        const sy = Math.max(0, Math.floor((img.naturalHeight - resolution) / 2));
        ctx.drawImage(img, sx, sy, resolution, resolution, 0, 0, resolution, resolution);
      } else {
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, resolution, resolution);
      }
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image could not be decoded'));
    };
    img.src = url;
  });
}

// ============================================================================
// Pixel Canvas Component
// ============================================================================

interface PixelCanvasProps {
  width: number;
  height: number;
  scale: number;
  showGrid: boolean;
  pixels: PixelData[];
  onPixelDraw: (x: number, y: number, color: string) => void;
  onPixelErase: (x: number, y: number) => void;
  onBucketFill: (x: number, y: number) => void;
  onPickColor: (x: number, y: number) => void;
  onDrawShape: (shape: {
    type: 'rectangle' | 'circle' | 'line';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
  }) => void;
  primaryColor: string;
  activeTool: DrawingTool;
}

function PixelCanvas({
  width,
  height,
  scale,
  showGrid,
  pixels,
  onPixelDraw,
  onPixelErase,
  onBucketFill,
  onPickColor,
  onDrawShape,
  primaryColor,
  activeTool,
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const shapePreviewRef = useRef<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasWidth = width * scale;
    const canvasHeight = height * scale;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Checkerboard backdrop for transparency
    const cell = Math.max(4, scale);
    for (let y = 0; y < canvasHeight; y += cell) {
      for (let x = 0; x < canvasWidth; x += cell) {
        ctx.fillStyle = ((x / cell + y / cell) % 2 === 0) ? '#1a1a24' : '#22222e';
        ctx.fillRect(x, y, cell, cell);
      }
    }

    // Painted pixels
    for (const pixel of pixels) {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(pixel.x * scale, pixel.y * scale, scale, scale);
    }

    // Shape preview
    if (shapePreviewRef.current) {
      const { x1, y1, x2, y2 } = shapePreviewRef.current;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (activeTool === 'rectangle') {
        ctx.rect(x1 * scale, y1 * scale, (x2 - x1) * scale, (y2 - y1) * scale);
      } else if (activeTool === 'circle') {
        const centerX = ((x1 + x2) / 2) * scale;
        const centerY = ((y1 + y2) / 2) * scale;
        ctx.ellipse(
          centerX,
          centerY,
          Math.abs(x2 - x1) * scale * 0.5,
          Math.abs(y2 - y1) * scale * 0.5,
          0,
          0,
          Math.PI * 2
        );
      } else if (activeTool === 'line') {
        ctx.moveTo(x1 * scale + scale / 2, y1 * scale + scale / 2);
        ctx.lineTo(x2 * scale + scale / 2, y2 * scale + scale / 2);
      }
      ctx.stroke();
    }

    // Grid overlay
    if (showGrid && scale >= 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, canvasHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(canvasWidth, y * scale);
        ctx.stroke();
      }
    }
  }, [width, height, scale, showGrid, pixels, primaryColor, activeTool]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / scale);
      const y = Math.floor((e.clientY - rect.top) / scale);

      if (x < 0 || x >= width || y < 0 || y >= height) return;

      if (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line') {
        shapeStartRef.current = { x, y };
        shapePreviewRef.current = { x1: x, y1: y, x2: x, y2: y };
        isDrawingRef.current = true;
        drawCanvas();
        return;
      }

      if (activeTool === 'bucket') {
        onBucketFill(x, y);
        return;
      }

      if (activeTool === 'eyedropper') {
        onPickColor(x, y);
        return;
      }

      isDrawingRef.current = true;
      lastPositionRef.current = { x, y };

      if (activeTool === 'pencil') {
        onPixelDraw(x, y, primaryColor);
      } else if (activeTool === 'eraser') {
        onPixelErase(x, y);
      }
    },
    [scale, width, height, activeTool, primaryColor, onPixelDraw, onPixelErase, onBucketFill, onPickColor, drawCanvas]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / scale);
      const y = Math.floor((e.clientY - rect.top) / scale);

      if (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line') {
        if (shapeStartRef.current) {
          shapePreviewRef.current = {
            x1: shapeStartRef.current.x,
            y1: shapeStartRef.current.y,
            x2: x,
            y2: y,
          };
          drawCanvas();
        }
        return;
      }

      if (!isDrawingRef.current) return;
      if (x < 0 || x >= width || y < 0 || y >= height) return;

      const lastPos = lastPositionRef.current;
      if (!lastPos) return;

      if (lastPos.x !== x || lastPos.y !== y) {
        if (activeTool === 'pencil') {
          onPixelDraw(x, y, primaryColor);
        } else if (activeTool === 'eraser') {
          onPixelErase(x, y);
        }
        lastPositionRef.current = { x, y };
      }
    },
    [scale, width, height, activeTool, primaryColor, onPixelDraw, onPixelErase, drawCanvas]
  );

  const handlePointerUp = useCallback(() => {
    if (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line') {
      if (shapeStartRef.current && shapePreviewRef.current && onDrawShape) {
        const { x1, y1, x2, y2 } = shapePreviewRef.current;
        onDrawShape({
          type: activeTool,
          x1: Math.min(x1, x2),
          y1: Math.min(y1, y2),
          x2: Math.max(x1, x2),
          y2: Math.max(y1, y2),
          color: primaryColor,
        });
      }
      shapeStartRef.current = null;
      shapePreviewRef.current = null;
      isDrawingRef.current = false;
      drawCanvas();
      return;
    }

    isDrawingRef.current = false;
    lastPositionRef.current = null;
    shapeStartRef.current = null;
    shapePreviewRef.current = null;
  }, [activeTool, primaryColor, onDrawShape, drawCanvas]);

  const handlePointerLeave = useCallback(() => {
    isDrawingRef.current = false;
    lastPositionRef.current = null;
    shapeStartRef.current = null;
    shapePreviewRef.current = null;
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const cursor =
    activeTool === 'pencil' ? 'crosshair' :
    activeTool === 'eraser' ? 'cell' :
    activeTool === 'eyedropper' ? 'copy' :
    activeTool === 'bucket' ? 'pointer' : 'crosshair';

  return (
    <canvas
      ref={canvasRef}
      width={width * scale}
      height={height * scale}
      style={{
        width: `${width * scale}px`,
        height: `${height * scale}px`,
        cursor,
        imageRendering: 'pixelated',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    />
  );
}

// ============================================================================
// Hitbox Canvas Component
// ============================================================================

interface HitboxCanvasProps {
  width: number;
  height: number;
  scale: number;
  hitboxes: StudioHitbox[];
  activeHitboxId: string | null;
  onSelect: (id: string | null) => void;
  onDrawHitbox: (x: number, y: number, width: number, height: number) => void;
  defaultColor: string;
}

function HitboxCanvas({
  width,
  height,
  scale,
  hitboxes,
  activeHitboxId,
  onSelect,
  onDrawHitbox,
  defaultColor,
}: HitboxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragPreviewRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const drawHitboxes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasWidth = width * scale;
    const canvasHeight = height * scale;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(canvasWidth, y * scale);
      ctx.stroke();
    }

    for (const hitbox of hitboxes) {
      const isActive = hitbox.id === activeHitboxId;
      ctx.strokeStyle = hitbox.color;
      ctx.fillStyle = `${hitbox.color}33`;
      ctx.lineWidth = isActive ? 3 : 2;

      if (hitbox.shape === 'circle') {
        const radius = (hitbox.radius ?? 8) * scale;
        ctx.beginPath();
        ctx.arc(
          (hitbox.x + (hitbox.radius ?? 8)) * scale,
          (hitbox.y + (hitbox.radius ?? 8)) * scale,
          radius,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      } else {
        const w = (hitbox.width ?? 8) * scale;
        const h = (hitbox.height ?? 8) * scale;
        ctx.fillRect(hitbox.x * scale, hitbox.y * scale, w, h);
        ctx.strokeRect(hitbox.x * scale, hitbox.y * scale, w, h);
      }

      if (isActive) {
        ctx.fillStyle = hitbox.color;
        ctx.font = '10px monospace';
        ctx.fillText(hitbox.name, hitbox.x * scale + 2, Math.max(10, hitbox.y * scale - 4));
      }
    }

    if (dragPreviewRef.current) {
      const preview = dragPreviewRef.current;
      ctx.strokeStyle = defaultColor;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(preview.x * scale, preview.y * scale, preview.width * scale, preview.height * scale);
      ctx.setLineDash([]);
    }
  }, [width, height, scale, hitboxes, activeHitboxId, defaultColor]);

  useEffect(() => {
    drawHitboxes();
  }, [drawHitboxes]);

  const toCanvasCoords = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / scale);
      const y = Math.floor((e.clientY - rect.top) / scale);
      if (x < 0 || x >= width || y < 0 || y >= height) return null;
      return { x, y };
    },
    [scale, width, height]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      dragStartRef.current = toCanvasCoords(e);
      dragPreviewRef.current = null;
    },
    [toCanvasCoords]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const start = dragStartRef.current;
      if (!start) return;
      const current = toCanvasCoords(e);
      if (!current) return;
      dragPreviewRef.current = {
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        width: Math.abs(current.x - start.x),
        height: Math.abs(current.y - start.y),
      };
      drawHitboxes();
    },
    [toCanvasCoords, drawHitboxes]
  );

  const handlePointerUpCanvas = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const preview = dragPreviewRef.current;
      dragStartRef.current = null;
      dragPreviewRef.current = null;

      if (preview && preview.width >= 1 && preview.height >= 1) {
        onDrawHitbox(preview.x, preview.y, preview.width + 1, preview.height + 1);
        drawHitboxes();
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      for (let i = hitboxes.length - 1; i >= 0; i--) {
        const hitbox = hitboxes[i];
        if (hitbox.shape === 'circle') {
          const radius = hitbox.radius ?? 8;
          const centerX = hitbox.x + radius;
          const centerY = hitbox.y + radius;
          const dx = x - centerX;
          const dy = y - centerY;
          if (dx * dx + dy * dy <= radius * radius) {
            onSelect(hitbox.id);
            return;
          }
        } else {
          const w = hitbox.width ?? 8;
          const h = hitbox.height ?? 8;
          if (x >= hitbox.x && x <= hitbox.x + w && y >= hitbox.y && y <= hitbox.y + h) {
            onSelect(hitbox.id);
            return;
          }
        }
      }
      onSelect(null);
    },
    [scale, hitboxes, onSelect, onDrawHitbox, drawHitboxes]
  );

  const handlePointerLeaveCanvas = useCallback(() => {
    dragStartRef.current = null;
    dragPreviewRef.current = null;
    drawHitboxes();
  }, [drawHitboxes]);

  return (
    <canvas
      ref={canvasRef}
      width={width * scale}
      height={height * scale}
      style={{
        width: `${width * scale}px`,
        height: `${height * scale}px`,
        cursor: 'crosshair',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpCanvas}
      onPointerLeave={handlePointerLeaveCanvas}
    />
  );
}

// ============================================================================
// Color Picker Component
// ============================================================================

interface ColorPickerProps {
  colors: string[];
  selectedColor: string;
  onSelectColor: (color: string) => void;
  size?: number;
}

function ColorPicker({ colors, selectedColor, onSelectColor, size = 24 }: ColorPickerProps) {
  return (
    <div className="color-picker">
      {colors.map((color, index) => (
        <button
          key={`${color}-${index}`}
          className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
          style={{ backgroundColor: color, width: size, height: size }}
          onClick={() => onSelectColor(color)}
          title={color}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Frame Animation Strip Component
// ============================================================================

interface FrameStripProps {
  frames: Partial<Record<AnimationState, string[]>>;
  activeState: AnimationState;
  frameIndex: number;
  isPlaying: boolean;
  resolution: number;
  onStateChange: (state: AnimationState) => void;
  onUpload: (state: AnimationState, files: FileList | null) => void;
  onRemoveFrame: (state: AnimationState, index: number) => void;
  onTogglePlay: () => void;
}

function FrameStrip({
  frames,
  activeState,
  frameIndex,
  isPlaying,
  resolution,
  onStateChange,
  onUpload,
  onRemoveFrame,
  onTogglePlay,
}: FrameStripProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const activeFrames = frames[activeState] ?? [];
  const previewFrame = activeFrames[Math.min(frameIndex, Math.max(0, activeFrames.length - 1))];

  return (
    <div className="frame-strip">
      <div className="frame-state-tabs">
        {ANIMATION_STATES.map((state) => (
          <button
            key={state}
            className={`frame-tab ${activeState === state ? 'active' : ''}`}
            onClick={() => onStateChange(state)}
          >
            {state}
            <span className="frame-count">{(frames[state] ?? []).length}</span>
          </button>
        ))}
      </div>

      <div className="frame-strip-body">
        <div className="frame-player">
          <div
            className="frame-preview-box"
            style={{ width: resolution * 3, height: resolution * 3 }}
          >
            {previewFrame ? (
              <img
                src={previewFrame}
                alt={`${activeState} frame`}
                style={{
                  width: resolution * 3,
                  height: resolution * 3,
                  imageRendering: 'pixelated' as const,
                }}
              />
            ) : (
              <span className="frame-preview-empty">No {activeState} frames</span>
            )}
          </div>
          <div className="frame-player-controls">
            <button
              className="control-btn"
              onClick={onTogglePlay}
              disabled={activeFrames.length < 2}
            >
              {isPlaying ? '⏸ Stop' : '▶ Play'}
            </button>
            <span className="frame-position">
              {activeFrames.length > 0
                ? `${Math.min(frameIndex + 1, activeFrames.length)} / ${activeFrames.length}`
                : '0 / 0'}
            </span>
          </div>
        </div>

        <div className="frame-thumbs">
          {activeFrames.map((frameUrl, index) => (
            <div key={`${frameUrl.slice(-16)}-${index}`} className="frame-thumb">
              <img
                src={frameUrl}
                alt={`${activeState} frame ${index + 1}`}
                style={{ imageRendering: 'pixelated' as const }}
              />
              <button
                className="frame-thumb-delete"
                onClick={() => onRemoveFrame(activeState, index)}
                title="Remove frame"
                aria-label={`Remove ${activeState} frame ${index + 1}`}
              >
                ×
              </button>
            </div>
          ))}
          <label className="frame-upload" title={`Upload ${activeState} frames`}>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/gif,image/webp"
              multiple
              hidden
              onChange={(e) => {
                onUpload(activeState, e.target.files);
                if (inputRef.current) inputRef.current.value = '';
              }}
            />
            <span className="frame-upload-icon">＋</span>
            <span>Upload {activeState}</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Resolution Guard Modal
// ============================================================================

interface ResolutionGuardProps {
  fileName: string;
  width: number;
  height: number;
  expected: number;
  onResolve: (mode: 'crop' | 'downscale' | 'cancel') => void;
}

function ResolutionGuardModal({
  fileName,
  width,
  height,
  expected,
  onResolve,
}: ResolutionGuardProps) {
  return (
    <div className="modal-overlay" onClick={() => onResolve('cancel')}>
      <div className="modal resolution-guard" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Resolution Mismatch</h2>
          <button className="modal-close" onClick={() => onResolve('cancel')}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p>
            <strong>{fileName}</strong> is {width}×{height}px, but this sprite is locked to{' '}
            {expected}×{expected}px. Mismatched frames cause pixel bleed and hitbox
            misalignment in the engine.
          </p>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={() => onResolve('crop')}>
              Auto-Crop
            </button>
            <button className="btn btn-primary" onClick={() => onResolve('downscale')}>
              Downscale
            </button>
            <button className="btn btn-ghost" onClick={() => onResolve('cancel')}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Hitbox Editor Component
// ============================================================================

interface HitboxEditorProps {
  hitboxes: StudioHitbox[];
  activeHitboxId: string | null;
  resolution: number;
  onUpdate: (hitbox: StudioHitbox) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
}

function HitboxEditor({
  hitboxes,
  activeHitboxId,
  resolution,
  onUpdate,
  onDelete,
  onSelect,
  onAdd,
}: HitboxEditorProps) {
  const active = hitboxes.find((h) => h.id === activeHitboxId) ?? hitboxes[0] ?? null;

  const numberField = (
    label: string,
    value: number,
    onChange: (value: number) => void
  ) => (
    <label className="hitbox-field">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        max={resolution}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(resolution, Number(e.target.value) || 0)))}
      />
    </label>
  );

  return (
    <div className="hitbox-editor">
      <div className="hitbox-editor-row">
        <label className="hitbox-field">
          <span>Shape</span>
          <select
            value={active?.shape ?? 'rectangle'}
            onChange={(e) => {
              if (!active) return;
              const shape = e.target.value as 'rectangle' | 'circle';
              onUpdate({
                ...active,
                shape,
                color: HITBOX_TYPE_COLORS[active.type],
              });
            }}
          >
            <option value="rectangle">Rectangle</option>
            <option value="circle">Circle</option>
          </select>
        </label>
        <label className="hitbox-field">
          <span>Type</span>
          <select
            value={active?.type ?? 'hurtbox'}
            onChange={(e) => {
              if (!active) return;
              const type = e.target.value as HitboxType;
              onUpdate({ ...active, type, color: HITBOX_TYPE_COLORS[type] });
            }}
          >
            <option value="terrain">Terrain (green)</option>
            <option value="hurtbox">Hurtbox (blue)</option>
            <option value="hitbox">Hitbox (red)</option>
          </select>
        </label>
      </div>

      {active && (
        <div className="hitbox-editor-row">
          {numberField('Offset X', active.x, (v) => onUpdate({ ...active, x: v }))}
          {numberField('Offset Y', active.y, (v) => onUpdate({ ...active, y: v }))}
          {active.shape === 'circle'
            ? numberField('Radius', active.radius ?? 8, (v) =>
                onUpdate({ ...active, radius: Math.max(1, v) })
              )
            : (
              <>
                {numberField('Width', active.width ?? 8, (v) =>
                  onUpdate({ ...active, width: Math.max(1, v) })
                )}
                {numberField('Height', active.height ?? 8, (v) =>
                  onUpdate({ ...active, height: Math.max(1, v) })
                )}
              </>
            )}
        </div>
      )}

      <div className="hitbox-list">
        {hitboxes.map((hitbox) => (
          <button
            key={hitbox.id}
            className={`hitbox-list-item ${active?.id === hitbox.id ? 'active' : ''}`}
            onClick={() => onSelect(hitbox.id)}
          >
            <span
              className="hitbox-dot"
              style={{ backgroundColor: hitbox.color }}
            />
            <span>{hitbox.type}</span>
            <span className="hitbox-dims">
              {hitbox.shape === 'circle'
                ? `r${hitbox.radius ?? 8}`
                : `${hitbox.width ?? 8}×${hitbox.height ?? 8}`}
            </span>
            <span
              className="hitbox-delete"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(hitbox.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onDelete(hitbox.id);
                }
              }}
            >
              ×
            </span>
          </button>
        ))}
      </div>

      <div className="hitbox-editor-actions">
        <button className="btn btn-small btn-primary" onClick={onAdd}>
          + Add Hitbox
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main View: Pixel & Hitbox Studio (View 4)
// ============================================================================

export default function PixelHitboxStudio() {
  const {
    currentProject,
    isDirty,
    isAuthenticated,
    setCurrentProject,
    setActiveTab,
    setIsDirty,
    createNewProject,
    addSprite,
    updateSprite,
    removeSprite,
  } = useGameStore();

  const {
    studio,
    setActiveSprite,
    setActiveTool,
    setPrimaryColor,
    setSecondaryColor,
    setActivePalette,
    setShowGrid,
    drawPixel,
    erasePixel,
    drawPixels,
    fillArea,
    clearLayer,
    undo,
    redo,
    setActiveHitbox,
    setHitboxes,
    setCurrentAnimationState,
    setCurrentFrameIndex,
    playAnimation,
    stopAnimation,
    setDirty,
  } = useStudioStore();

  useEffect(() => {
    setActiveTab('art');
    return () => setDirty(false);
  }, [setActiveTab, setDirty]);

  const projectSprites = useMemo(
    () => currentProject?.project_data.sprites ?? [],
    [currentProject]
  );

  const selectedSprite = useMemo(
    () => projectSprites.find((s) => s.id === studio.activeSpriteId) ?? null,
    [projectSprites, studio.activeSpriteId]
  );

  const resolution: Resolution = selectedSprite?.resolution ?? 32;

  // UI state
  const [showNewSpriteModal, setShowNewSpriteModal] = useState(false);
  const [newSpriteName, setNewSpriteName] = useState('');
  const [newSpriteRole, setNewSpriteRole] = useState<EntityRole>('player_1');
  const [newSpriteResolution, setNewSpriteResolution] = useState<Resolution>(32);
  const [canvasScale, setCanvasScale] = useState<number>(4);
  const [pendingUpload, setPendingUpload] = useState<{
    state: AnimationState;
    file: File;
    width: number;
    height: number;
  } | null>(null);

  const entityCategories = ENTITY_CATEGORIES;
  const activePalette = getPaletteById(studio.activePalette) || ALL_PALETTES[0];
  const artLayer = studio.layers.find((l) => l.id === 'art-layer');
  const artPixels = useMemo(() => artLayer?.pixels ?? [], [artLayer]);
  const activeAnimationState = studio.currentAnimationState as AnimationState;
  const activeFrames = selectedSprite?.frames?.[activeAnimationState] ?? [];
  const isHitboxLayer = studio.activeLayerId === 'hitbox-layer';
  const canAutoGenerate = activeFrames.length > 0 || artPixels.length > 0;

  const { navigateTo } = useGuardedNavigation();
  const [isSaving, setIsSaving] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [customHex, setCustomHex] = useState(studio.primaryColor);

  const allRoles = useMemo(
    () => ENTITY_CATEGORIES.flatMap((category) => category.roles),
    []
  );

  const handleSelectColor = useCallback(
    (color: string) => {
      setPrimaryColor(color);
      setCustomHex(color);
    },
    [setPrimaryColor]
  );

  // Load the selected sprite's hitboxes into the hitbox layer when the sprite changes
  const syncedSpriteIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedSprite && selectedSprite.id !== syncedSpriteIdRef.current) {
      syncedSpriteIdRef.current = selectedSprite.id;
      setHitboxes(schemaHitboxesToStudio(selectedSprite.hitboxes ?? []));
      setCurrentAnimationState('idle');
      setCurrentFrameIndex(0);
      stopAnimation();
    }
  }, [selectedSprite, setHitboxes, setCurrentAnimationState, setCurrentFrameIndex, stopAnimation]);

  // Playback loop
  useEffect(() => {
    if (!studio.isPlaying || activeFrames.length <= 1) return;
    const timer = setInterval(() => {
      const state = useStudioStore.getState().studio;
      setCurrentFrameIndex((state.currentFrameIndex + 1) % activeFrames.length);
    }, PLAYBACK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [studio.isPlaying, activeFrames.length, setCurrentFrameIndex]);

  // ------------------------------------------------------------------------
  // Sprite management
  // ------------------------------------------------------------------------

  const handleSelectSprite = (sprite: Sprite) => {
    setActiveSprite(sprite);
  };

  const handleCreateSprite = () => {
    let project = currentProject;
    if (!project) {
      createNewProject(createDefaultProject(null, { title: 'Untitled Project' }));
      project = useGameStore.getState().currentProject;
    }
    if (!project) return;

    const roleCount = project.project_data.sprites.filter(
      (s) => s.role === newSpriteRole
    ).length;
    const half = Math.floor(newSpriteResolution / 2);
    const quarter = Math.floor(newSpriteResolution / 4);

    const newSprite: Sprite = {
      id: `sprite_${generateId()}`,
      name: newSpriteName.trim() || `${newSpriteRole.replace('_', ' ')} ${roleCount + 1}`,
      role: newSpriteRole,
      resolution: newSpriteResolution,
      frames: {},
      hitboxes: [
        {
          type: 'hurtbox',
          shape: 'rectangle',
          offset_x: quarter,
          offset_y: quarter,
          width: half,
          height: half,
        },
      ],
    };

    addSprite(newSprite);
    setActiveSprite(newSprite);
    setShowNewSpriteModal(false);
    setNewSpriteName('');
    setIsDirty(true);
  };

  const handleDeleteSprite = () => {
    if (!selectedSprite || projectSprites.length <= 1) return;
    const next = projectSprites.find((s) => s.id !== selectedSprite.id) ?? null;
    removeSprite(selectedSprite.id);
    setActiveSprite(next);
    setIsDirty(true);
  };

  const handleRenameSprite = (name: string) => {
    if (!selectedSprite) return;
    updateSprite({ ...selectedSprite, name });
    setIsDirty(true);
  };

  const handleResolutionChange = (res: Resolution) => {
    if (!selectedSprite) return;
    updateSprite({ ...selectedSprite, resolution: res });
    setIsDirty(true);
  };

  // ------------------------------------------------------------------------
  // Drawing
  // ------------------------------------------------------------------------

  const handlePixelDraw = useCallback(
    (x: number, y: number, color: string) => {
      drawPixel({ x, y, color });
      setIsDirty(true);
    },
    [drawPixel, setIsDirty]
  );

  const handlePixelErase = useCallback(
    (x: number, y: number) => {
      erasePixel({ x, y, color: '' });
      setIsDirty(true);
    },
    [erasePixel, setIsDirty]
  );

  const handleBucketFill = useCallback(
    (x: number, y: number) => {
      fillArea(x, y, studio.primaryColor);
      setIsDirty(true);
    },
    [fillArea, studio.primaryColor, setIsDirty]
  );

  const handlePickColor = useCallback(
    (x: number, y: number) => {
      const pixel = artPixels.find((p) => p.x === x && p.y === y);
      if (pixel) {
        setPrimaryColor(pixel.color);
      }
    },
    [artPixels, setPrimaryColor]
  );

  const handleDrawShape = useCallback(
    (shape: {
      type: 'rectangle' | 'circle' | 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
    }) => {
      drawPixels(rasterizeShape(shape));
      setIsDirty(true);
    },
    [drawPixels, setIsDirty]
  );

  // ------------------------------------------------------------------------
  // Frames
  // ------------------------------------------------------------------------

  const commitFrames = useCallback(
    (state: AnimationState, urls: string[]) => {
      if (!selectedSprite) return;
      const nextFrames = { ...(selectedSprite.frames ?? {}) };
      if (urls.length === 0) {
        delete nextFrames[state];
      } else {
        nextFrames[state] = urls;
      }
      updateSprite({ ...selectedSprite, frames: nextFrames });
      setIsDirty(true);
    },
    [selectedSprite, updateSprite, setIsDirty]
  );

  const handleSavePixelsAsFrame = useCallback(() => {
    if (!selectedSprite || artPixels.length === 0) return;
    const dataUrl = renderPixelsToDataUrl(artPixels, resolution);
    if (!dataUrl) return;
    commitFrames(activeAnimationState, [
      ...(selectedSprite.frames?.[activeAnimationState] ?? []),
      dataUrl,
    ]);
  }, [selectedSprite, artPixels, resolution, activeAnimationState, commitFrames]);

  const handleFrameUpload = async (
    state: AnimationState,
    files: FileList | null
  ) => {
    if (!files || files.length === 0 || !selectedSprite) return;

    const accepted: string[] = [];
    let mismatch: { file: File; width: number; height: number } | null = null;

    for (const file of Array.from(files)) {
      try {
        const dims = await getImageDimensions(file);
        if (dims.width === resolution && dims.height === resolution) {
          accepted.push(await readAsDataUrl(file));
        } else if (!mismatch) {
          mismatch = { file, width: dims.width, height: dims.height };
        }
      } catch {
        continue;
      }
    }

    if (accepted.length > 0) {
      commitFrames(state, [...(selectedSprite.frames?.[state] ?? []), ...accepted]);
    }
    if (mismatch) {
      setPendingUpload({
        state,
        file: mismatch.file,
        width: mismatch.width,
        height: mismatch.height,
      });
    }
  };

  const handleRemoveFrame = (state: AnimationState, index: number) => {
    if (!selectedSprite) return;
    const urls = [...(selectedSprite.frames?.[state] ?? [])];
    urls.splice(index, 1);
    commitFrames(state, urls);
    setCurrentFrameIndex(0);
  };

  const handleGuardResolve = async (mode: 'crop' | 'downscale' | 'cancel') => {
    const pending = pendingUpload;
    setPendingUpload(null);
    if (!pending || mode === 'cancel' || !selectedSprite) return;
    try {
      const dataUrl = await renderFileToDataUrl(pending.file, mode, resolution);
      commitFrames(pending.state, [
        ...(selectedSprite.frames?.[pending.state] ?? []),
        dataUrl,
      ]);
    } catch {
      return;
    }
  };

  const handleTogglePlay = () => {
    if (studio.isPlaying) {
      stopAnimation();
    } else {
      setCurrentFrameIndex(0);
      playAnimation();
    }
  };

  // ------------------------------------------------------------------------
  // Project save
  // ------------------------------------------------------------------------

  const handleSave = async () => {
    const project = useGameStore.getState().currentProject;
    if (!project) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        console.error(result?.error ?? 'The project could not be saved.');
        return;
      }
      setCurrentProject(result.project);
    } catch {
      console.error('The project could not be saved. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ------------------------------------------------------------------------
  // Zoom controls
  // ------------------------------------------------------------------------

  const handleZoomIn = () => {
    const idx = CANVAS_SCALE_OPTIONS.indexOf(canvasScale);
    if (idx >= 0 && idx < CANVAS_SCALE_OPTIONS.length - 1) {
      setCanvasScale(CANVAS_SCALE_OPTIONS[idx + 1]);
    }
  };

  const handleZoomOut = () => {
    const idx = CANVAS_SCALE_OPTIONS.indexOf(canvasScale);
    if (idx > 0) {
      setCanvasScale(CANVAS_SCALE_OPTIONS[idx - 1]);
    }
  };

  // ------------------------------------------------------------------------
  // Hitboxes
  // ------------------------------------------------------------------------

  const persistHitboxes = useCallback(
    (hitboxes: StudioHitbox[]) => {
      setHitboxes(hitboxes);
      if (selectedSprite) {
        updateSprite({
          ...selectedSprite,
          hitboxes: studioHitboxesToSchema(hitboxes),
        });
      }
      setIsDirty(true);
    },
    [selectedSprite, setHitboxes, updateSprite, setIsDirty]
  );

  const handleAddHitbox = () => {
    const half = Math.floor(resolution / 2);
    const quarter = Math.floor(resolution / 4);
    const hitbox: StudioHitbox = {
      id: `hb_${generateId()}`,
      name: `hitbox_${studio.hitboxLayer.hitboxes.length + 1}`,
      type: 'hurtbox',
      shape: 'rectangle',
      x: quarter,
      y: quarter,
      width: half,
      height: half,
      color: HITBOX_TYPE_COLORS.hurtbox,
    };
    persistHitboxes([...studio.hitboxLayer.hitboxes, hitbox]);
    setActiveHitbox(hitbox.id);
  };

  const handleUpdateHitbox = (hitbox: StudioHitbox) => {
    persistHitboxes(
      studio.hitboxLayer.hitboxes.map((h) => (h.id === hitbox.id ? hitbox : h))
    );
  };

  const handleDeleteHitbox = (id: string) => {
    persistHitboxes(studio.hitboxLayer.hitboxes.filter((h) => h.id !== id));
    setActiveHitbox(null);
  };

  const handleAutoGenerateHitbox = async () => {
    if (!selectedSprite) return;

    let bounds: Bounds | null = null;
    const stateFrames =
      selectedSprite.frames?.[activeAnimationState] ??
      selectedSprite.frames?.idle ??
      [];

    if (stateFrames.length > 0) {
      const imageData = await loadImageDataFromUrl(stateFrames[0]);
      if (imageData) {
        bounds = await computeBoundsFromImageData(imageData);
      }
    }

    if (!bounds) {
      bounds = calculateBounds(artPixels);
    }
    if (!bounds) return;

    const hitbox: StudioHitbox = {
      id: `hb_${generateId()}`,
      name: 'auto_bounds',
      type: 'hurtbox',
      shape: 'rectangle',
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.width,
      height: bounds.height,
      color: HITBOX_TYPE_COLORS.hurtbox,
    };
    persistHitboxes([...studio.hitboxLayer.hitboxes, hitbox]);
    setActiveHitbox(hitbox.id);
  };

  const handleSwapColors = () => {
    const temp = studio.primaryColor;
    setPrimaryColor(studio.secondaryColor);
    setSecondaryColor(temp);
  };

  const handleDrawHitbox = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const hitbox: StudioHitbox = {
        id: `hb_${generateId()}`,
        name: `brush_hitbox_${studio.hitboxLayer.hitboxes.length + 1}`,
        type: 'hurtbox',
        shape: 'rectangle',
        x,
        y,
        width,
        height,
        color: HITBOX_TYPE_COLORS.hurtbox,
      };
      persistHitboxes([...studio.hitboxLayer.hitboxes, hitbox]);
      setActiveHitbox(hitbox.id);
    },
    [studio.hitboxLayer.hitboxes, persistHitboxes, setActiveHitbox]
  );

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------

  return (
    <>
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
              {wizardStep === 0 ? (
                <>
                  <p className="wizard-step-label">Step 1 of 2 — Choose a role</p>
                  <div className="role-tile-grid">
                    {allRoles.map((role) => (
                      <button
                        key={role}
                        className={`role-tile ${newSpriteRole === role ? 'selected' : ''}`}
                        onClick={() => {
                          setNewSpriteRole(role);
                          setWizardStep(1);
                        }}
                      >
                        <span className="role-tile-icon">{getRoleIcon(role)}</span>
                        <span className="role-tile-label">{role.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="wizard-step-label">
                    Step 2 of 2 — Configure {newSpriteRole.replace('_', ' ')}
                  </p>
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
                    <label htmlFor="sprite-resolution">Resolution</label>
                    <select
                      id="sprite-resolution"
                      value={newSpriteResolution}
                      onChange={(e) =>
                        setNewSpriteResolution(Number(e.target.value) as Resolution)
                      }
                    >
                      {VALID_RESOLUTIONS.map((res) => (
                        <option key={res} value={res}>
                          {res}×{res}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-ghost" onClick={() => setWizardStep(0)}>
                      ← Back
                    </button>
                    <button className="btn btn-primary" onClick={handleCreateSprite}>
                      Create Sprite
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolution Guard Modal */}
      {pendingUpload && (
        <ResolutionGuardModal
          fileName={pendingUpload.file.name}
          width={pendingUpload.width}
          height={pendingUpload.height}
          expected={resolution}
          onResolve={handleGuardResolve}
        />
      )}

      {/* Pixel & Hitbox Studio Content */}
      <div className="view-container view-studio view-art">
        <header className="studio-header">
          <div className="studio-header-left">
            <button
              className="control-btn"
              onClick={() => navigateTo('/')}
            >
              ← Back to Hub
            </button>
            <span className="studio-project-name">
              Project: {currentProject?.title ?? 'Untitled Project'}
              {isDirty && (
                <span className="unsaved-flag" title="This project has unsaved changes">
                  *
                </span>
              )}
            </span>
          </div>
          <div className="studio-header-right">
            {isAuthenticated ? (
              <button
                className="btn btn-small btn-primary"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            ) : (
              <Link className="btn btn-small btn-primary" href="/sign-up">
                Sign Up to Save
              </Link>
            )}
            <button
              className="btn btn-small btn-ghost"
              onClick={() => navigateTo(`/play/${currentProject?.id ?? 'draft'}`)}
            >
              ▶ Playtest
            </button>
          </div>
        </header>
        <nav className="studio-tabs">
          <span className="studio-tab active">Pixel &amp; Hitbox Studio</span>
          <Link className="studio-tab" href="/rules">
            Mechanics &amp; AI Rules
          </Link>
          <span
            className="studio-tab disabled"
            title="Coming in Phase 5"
            aria-disabled="true"
          >
            Level &amp; Wave Painter
          </span>
        </nav>
        <div className="studio-layout">
          {/* Sprite Library Sidebar */}
          <aside className="sprite-library">
            <div className="library-header">
              <h2>Sprite Library</h2>
              <button
                className="btn btn-small btn-primary"
                onClick={() => {
                  setWizardStep(0);
                  setShowNewSpriteModal(true);
                }}
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
                    {category.roles.map((role) => {
                      const roleSprites = projectSprites.filter((s) => s.role === role);
                      if (roleSprites.length === 0) {
                        return (
                          <div key={role} className="entity-item empty">
                            <span className="entity-icon">{getRoleIcon(role)}</span>
                            <span className="entity-label">No {role.replace('_', ' ')}</span>
                          </div>
                        );
                      }
                      return roleSprites.map((sprite) => {
                        const thumb =
                          sprite.frames?.idle?.[0] ??
                          Object.values(sprite.frames ?? {})[0]?.[0] ??
                          null;
                        return (
                          <button
                            key={sprite.id}
                            className={`entity-item ${selectedSprite?.id === sprite.id ? 'active' : ''}`}
                            onClick={() => handleSelectSprite(sprite)}
                          >
                            {thumb ? (
                              <img className="entity-thumb" src={thumb} alt="" />
                            ) : (
                              <span className="entity-icon">{getRoleIcon(sprite.role)}</span>
                            )}
                            <span className="entity-label">{sprite.name}</span>
                            <span className="entity-res">{sprite.resolution}²</span>
                          </button>
                        );
                      });
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Main Canvas Area */}
          <main className="canvas-area">
            <div className="canvas-toolbar">
              <div className="toolbar-group">
                <h2>{selectedSprite ? selectedSprite.name : 'No sprite selected'}</h2>
                {selectedSprite && (
                  <span className="sprite-info">
                    {selectedSprite.role.replace('_', ' ')} · {resolution}×{resolution}
                  </span>
                )}
              </div>
              <div className="toolbar-group">
                <button
                  className={`toolbar-btn ${!isHitboxLayer ? 'active' : ''}`}
                  onClick={() =>
                    useStudioStore.setState((s) => ({
                      studio: { ...s.studio, activeLayerId: 'art-layer' },
                    }))
                  }
                >
                  <span className="tool-icon">🎨</span>
                  <span>Art Layer</span>
                </button>
                <button
                  className={`toolbar-btn ${isHitboxLayer ? 'active' : ''}`}
                  onClick={() =>
                    useStudioStore.setState((s) => ({
                      studio: { ...s.studio, activeLayerId: 'hitbox-layer' },
                    }))
                  }
                >
                  <span className="tool-icon hitbox-icon">🟥</span>
                  <span>Hitbox Layer</span>
                </button>
              </div>
            </div>

            {/* Canvas Viewport Controls */}
            <div className="canvas-viewport-header">
              <div className="zoom-controls">
                <span className="control-label">Zoom</span>
                <button
                  className="control-btn"
                  onClick={handleZoomOut}
                  disabled={canvasScale === CANVAS_SCALE_OPTIONS[0]}
                  aria-label="Zoom out"
                >
                  −
                </button>
                <span className="zoom-level">{canvasScale * 100}%</span>
                <button
                  className="control-btn"
                  onClick={handleZoomIn}
                  disabled={
                    canvasScale === CANVAS_SCALE_OPTIONS[CANVAS_SCALE_OPTIONS.length - 1]
                  }
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>
              <button
                className={`control-btn ${studio.canvas.showGrid ? 'active' : ''}`}
                onClick={() => setShowGrid(!studio.canvas.showGrid)}
              >
                # Grid {studio.canvas.showGrid ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Dual-Layer Canvas */}
            <div className="dual-canvas">
              {!isHitboxLayer ? (
                <PixelCanvas
                  width={resolution}
                  height={resolution}
                  scale={canvasScale}
                  showGrid={studio.canvas.showGrid}
                  pixels={artPixels}
                  onPixelDraw={handlePixelDraw}
                  onPixelErase={handlePixelErase}
                  onBucketFill={handleBucketFill}
                  onPickColor={handlePickColor}
                  onDrawShape={handleDrawShape}
                  primaryColor={studio.primaryColor}
                  activeTool={studio.activeTool}
                />
              ) : (
                <HitboxCanvas
                  width={resolution}
                  height={resolution}
                  scale={canvasScale}
                  hitboxes={studio.hitboxLayer.hitboxes}
                  activeHitboxId={studio.activeHitboxId}
                  onSelect={setActiveHitbox}
                  onDrawHitbox={handleDrawHitbox}
                  defaultColor={HITBOX_TYPE_COLORS.hurtbox}
                />
              )}
            </div>

            {/* Canvas Controls */}
            <div className="canvas-controls">
              <div className="control-group">
                <button
                  className="control-btn"
                  onClick={handleSavePixelsAsFrame}
                  disabled={artPixels.length === 0}
                  title="Commit the painted art layer as a frame in the current animation state"
                >
                  ⬒ Save as Frame
                </button>
                <button className="control-btn" onClick={() => clearLayer()}>
                  Clear
                </button>
                <button className="control-btn" onClick={() => undo()}>
                  ↩ Undo
                </button>
                <button className="control-btn" onClick={() => redo()}>
                  ↪ Redo
                </button>
              </div>
            </div>
          </main>

          {/* Toolbox & Palettes Panel */}
          <aside className="properties-panel">
            <div className="panel-header">
              <h2>Toolbox &amp; Palettes</h2>
            </div>

            {!isHitboxLayer && (
              <div className="toolbox-section">
                <h3>Tools</h3>
                <div className="toolbox-tools">
                  {(
                    [
                      'pencil',
                      'bucket',
                      'eraser',
                      'eyedropper',
                      'rectangle',
                      'circle',
                      'line',
                    ] as DrawingTool[]
                  ).map((tool) => (
                    <button
                      key={tool}
                      className={`control-btn ${studio.activeTool === tool ? 'active' : ''}`}
                      onClick={() => setActiveTool(tool)}
                    >
                      {tool === 'pencil' && '✏️'}
                      {tool === 'bucket' && '🪣'}
                      {tool === 'eraser' && '🧽'}
                      {tool === 'eyedropper' && '🎯'}
                      {tool === 'rectangle' && '▭'}
                      {tool === 'circle' && '◯'}
                      {tool === 'line' && '╱'}
                      <span className="tool-name">
                        {tool.charAt(0).toUpperCase() + tool.slice(1)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="toolbox-section">
              <h3>Palettes</h3>
              <select
                value={studio.activePalette}
                onChange={(e) =>
                  setActivePalette(e.target.value as typeof studio.activePalette)
                }
              >
                {ALL_PALETTES.map((palette) => (
                  <option key={palette.id} value={palette.id}>
                    {palette.name}
                  </option>
                ))}
              </select>
              <ColorPicker
                colors={activePalette.colors}
                selectedColor={studio.primaryColor}
                onSelectColor={handleSelectColor}
              />
              <div className="custom-color-row">
                <input
                  type="color"
                  value={
                    /^#[0-9a-fA-F]{6}$/.test(studio.primaryColor)
                      ? studio.primaryColor
                      : '#000000'
                  }
                  onChange={(e) => handleSelectColor(e.target.value)}
                  title="Pick a custom color"
                  aria-label="Custom color"
                />
                <input
                  type="text"
                  className="custom-hex-input"
                  value={customHex}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomHex(value);
                    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
                      handleSelectColor(value);
                    }
                  }}
                  placeholder="#rrggbb"
                  aria-label="Custom color hex"
                />
                <button
                  className="control-btn swap-btn"
                  onClick={handleSwapColors}
                  title="Swap colors"
                >
                  ⇄
                </button>
              </div>
            </div>

            <div className="toolbox-section">
              <h3>Generator</h3>
              <button
                className="btn btn-small btn-ghost"
                onClick={handleAutoGenerateHitbox}
                disabled={!canAutoGenerate}
                title={
                  canAutoGenerate
                    ? 'Analyze frame alpha channel to generate tight bounds'
                    : 'Upload or paint a frame first'
                }
              >
                ✏ Auto-Generate Hitbox from Alpha
              </button>
            </div>

            {selectedSprite ? (
              <div className="sprite-properties">
                <div className="property-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={selectedSprite.name}
                    onChange={(e) => handleRenameSprite(e.target.value)}
                  />
                </div>
                <div className="property-group">
                  <label>Resolution</label>
                  <select
                    value={selectedSprite.resolution}
                    onChange={(e) =>
                      handleResolutionChange(Number(e.target.value) as Resolution)
                    }
                  >
                    {VALID_RESOLUTIONS.map((res) => (
                      <option key={res} value={res}>
                        {res}×{res}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="property-group">
                  <label>Role</label>
                  <span>{selectedSprite.role.replace('_', ' ')}</span>
                </div>
                <div className="property-group">
                  <label>Hitboxes</label>
                  <HitboxEditor
                    hitboxes={studio.hitboxLayer.hitboxes}
                    activeHitboxId={studio.activeHitboxId}
                    resolution={resolution}
                    onUpdate={handleUpdateHitbox}
                    onDelete={handleDeleteHitbox}
                    onSelect={setActiveHitbox}
                    onAdd={handleAddHitbox}
                  />
                </div>
                {projectSprites.length > 1 && (
                  <div className="property-group">
                    <button className="btn btn-small btn-ghost" onClick={handleDeleteSprite}>
                      Delete Sprite
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="panel-empty">
                <span className="empty-icon">📋</span>
                <p>Select a sprite to view properties</p>
              </div>
            )}
          </aside>
        </div>

        {/* Frame Animation Strip */}
        <div className="frame-preview">
          <h3>Frame Animation Strip</h3>
          <div className="preview-area">
            {selectedSprite ? (
              <FrameStrip
                frames={selectedSprite.frames ?? {}}
                activeState={activeAnimationState}
                frameIndex={studio.currentFrameIndex}
                isPlaying={studio.isPlaying}
                resolution={resolution}
                onStateChange={(state) => {
                  setCurrentAnimationState(state);
                  setCurrentFrameIndex(0);
                  stopAnimation();
                }}
                onUpload={handleFrameUpload}
                onRemoveFrame={handleRemoveFrame}
                onTogglePlay={handleTogglePlay}
              />
            ) : (
              <span className="preview-placeholder">
                Select a sprite to preview animations
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
