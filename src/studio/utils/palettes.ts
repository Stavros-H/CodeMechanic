/**
 * Color Palettes for Pixel Art
 * 
 * Predefined color palettes for different retro aesthetics:
 * - PICO-8: 16-color palette from the PICO-8 fantasy console
 * - Game Boy: Original Game Boy 4-color palette (with extended colors)
 * - NES: NES color palette
 * - Cyber Neon: Cyberpunk/neon aesthetic palette
 */

// ============================================================================
// Types
// ============================================================================

export interface Palette {
  id: string;
  name: string;
  description: string;
  colors: string[];
  background?: string;
}

// ============================================================================
// PICO-8 Palette (16 colors)
// ============================================================================
// Official PICO-8 color palette
// Source: https://neilb.net/pico-8-color-palette/
export const PICO8_PALETTE: Palette = {
  id: 'pico8',
  name: 'PICO-8',
  description: 'Official 16-color palette from the PICO-8 fantasy console',
  colors: [
    '#000000', // 0: Black
    '#1D2B53', // 1: Dark Blue
    '#7E2553', // 2: Dark Purple
    '#008751', // 3: Dark Green
    '#AB5236', // 4: Brown
    '#5F574F', // 5: Dark Gray
    '#C2C3C7', // 6: Light Gray
    '#FFF1E8', // 7: White
    '#FF004D', // 8: Red
    '#FFA300', // 9: Orange
    '#FFEC27', // 10: Yellow
    '#00E436', // 11: Green
    '#29ADFF', // 12: Blue
    '#83769C', // 13: Lavender
    '#FF77A8', // 14: Pink
    '#FFCCAA', // 15: Peach
  ],
  background: '#000000',
};

// ============================================================================
// Game Boy Palette (Extended)
// ============================================================================
// Original Game Boy had 4 shades of green-gray, but we extend it with
// colors that would be achievable through palette changes
export const GAMEBOY_PALETTE: Palette = {
  id: 'gameboy',
  name: 'Game Boy',
  description: 'Extended Game Boy color palette with retro green tones',
  colors: [
    '#0F380F', // Darkest green (almost black)
    '#306230', // Dark green
    '#8BAC0F', // Medium green
    '#9BCA0F', // Light green
    '#000000', // Black
    '#565656', // Dark gray
    '#7B7B7B', // Medium gray
    '#A5A5A5', // Light gray
    '#D6D6D6', // Lighter gray
    '#FFFFFF', // White
    '#FF4D4D', // Red (for sprites)
    '#FF994D', // Orange
    '#FFD64D', // Yellow
    '#4DFF4D', // Bright green
    '#4D99FF', // Blue
    '#994DFF', // Purple
  ],
  background: '#0F380F',
};

// ============================================================================
// NES Palette (Simplified)
// ============================================================================
// NES had 54 colors, we select a representative subset
export const NES_PALETTE: Palette = {
  id: 'nes',
  name: 'NES',
  description: 'Representative colors from the NES palette',
  colors: [
    '#000000', // Black
    '#FFFFFF', // White
    '#4A4A4A', // Dark Gray
    '#888888', // Light Gray
    '#FF0000', // Red
    '#FF4A4A', // Light Red
    '#FF8800', // Orange
    '#FFCC00', // Yellow
    '#00FF00', // Green
    '#00A800', // Dark Green
    '#0088FF', // Blue
    '#004AFF', // Dark Blue
    '#8800FF', // Purple
    '#FF00FF', // Magenta
    '#FF88FF', // Pink
    '#884A00', // Brown
  ],
  background: '#000000',
};

// ============================================================================
// Cyber Neon Palette
// ============================================================================
// Futuristic cyberpunk/neon aesthetic
export const CYBER_NEON_PALETTE: Palette = {
  id: 'cyber-neon',
  name: 'Cyber Neon',
  description: 'Futuristic cyberpunk palette with vibrant neon colors',
  colors: [
    '#000000', // Black
    '#1A1A2E', // Dark background
    '#16213E', // Slightly lighter
    '#0F3460', // Deep blue
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FF0040', // Neon Red
    '#00FF40', // Neon Green
    '#FFFF00', // Neon Yellow
    '#FF4000', // Orange
    '#4000FF', // Electric Blue
    '#8000FF', // Purple
    '#FF0080', // Hot Pink
    '#FFFFFF', // White
    '#C0C0C0', // Silver
    '#404040', // Dark Gray
  ],
  background: '#1A1A2E',
};

// ============================================================================
// All Palettes
// ============================================================================

export const ALL_PALETTES: Palette[] = [
  PICO8_PALETTE,
  GAMEBOY_PALETTE,
  NES_PALETTE,
  CYBER_NEON_PALETTE,
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a palette by ID
 */
export function getPaletteById(id: string): Palette | undefined {
  return ALL_PALETTES.find((p) => p.id === id);
}

/**
 * Get default palette
 */
export function getDefaultPalette(): Palette {
  return PICO8_PALETTE;
}

/**
 * Check if a color is in a palette
 */
export function isColorInPalette(color: string, palette: Palette): boolean {
  return palette.colors.includes(color.toLowerCase());
}

/**
 * Get closest color in palette to a given color
 */
export function getClosestColorInPalette(
  color: string,
  palette: Palette
): string {
  // Simple implementation: return first color if exact match not found
  // In a real implementation, this would calculate color distance
  if (isColorInPalette(color, palette)) {
    return color;
  }
  return palette.colors[0];
}

// ============================================================================
// RGBA Color Utilities
// ============================================================================

/**
 * Convert hex color to RGBA
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse r, g, b values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get RGB components from hex
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  };
}
