import { Hitbox } from '@/schemas/projectSchemas';
import { StudioHitbox, HitboxType, HITBOX_TYPE_COLORS } from '../types';

export function studioToSchemaHitbox(hitbox: StudioHitbox): Hitbox {
  if (hitbox.shape === 'circle') {
    return {
      type: hitbox.type,
      shape: 'circle',
      offset_x: hitbox.x,
      offset_y: hitbox.y,
      radius: hitbox.radius ?? 8,
    };
  }
  return {
    type: hitbox.type,
    shape: 'rectangle',
    offset_x: hitbox.x,
    offset_y: hitbox.y,
    width: hitbox.width ?? 8,
    height: hitbox.height ?? 8,
  };
}

export function schemaToStudioHitbox(hitbox: Hitbox, index: number): StudioHitbox {
  const base = {
    id: `hb_${index}`,
    name: `${hitbox.type}_${hitbox.shape}_${index}`,
    type: hitbox.type as HitboxType,
    color: HITBOX_TYPE_COLORS[hitbox.type as HitboxType],
  };

  if (hitbox.shape === 'circle') {
    return {
      ...base,
      shape: 'circle',
      x: hitbox.offset_x,
      y: hitbox.offset_y,
      radius: hitbox.radius,
    };
  }
  return {
    ...base,
    shape: 'rectangle',
    x: hitbox.offset_x,
    y: hitbox.offset_y,
    width: hitbox.width,
    height: hitbox.height,
  };
}

export function schemaHitboxesToStudio(hitboxes: Hitbox[]): StudioHitbox[] {
  return hitboxes.map(schemaToStudioHitbox);
}

export function studioHitboxesToSchema(hitboxes: StudioHitbox[]): Hitbox[] {
  return hitboxes.map(studioToSchemaHitbox);
}
