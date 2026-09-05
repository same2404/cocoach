export interface FieldPoint {
  x: number;
  y: number;
}

export function rotateFieldCW(p: FieldPoint): FieldPoint {
  return { x: p.y, y: 100 - p.x };
}

export function rotateFieldCWCoords(x: number, y: number): FieldPoint {
  return { x: y, y: 100 - x };
}

export interface FormationPosition {
  xPercent: number;
  yPercent: number;
  offensivX?: number;
  offensivY?: number;
  defensivX?: number;
  defensivY?: number;
  umschaltX?: number;
  umschaltY?: number;
}

export function rotateFormationPos(pos: FormationPosition): FormationPosition {
  const base = rotateFieldCWCoords(pos.xPercent, pos.yPercent);
  const result: FormationPosition = { xPercent: base.x, yPercent: base.y };
  if (pos.offensivX != null && pos.offensivY != null) {
    const off = rotateFieldCWCoords(pos.offensivX, pos.offensivY);
    result.offensivX = off.x;
    result.offensivY = off.y;
  }
  if (pos.defensivX != null && pos.defensivY != null) {
    const def = rotateFieldCWCoords(pos.defensivX, pos.defensivY);
    result.defensivX = def.x;
    result.defensivY = def.y;
  }
  if (pos.umschaltX != null && pos.umschaltY != null) {
    const um = rotateFieldCWCoords(pos.umschaltX, pos.umschaltY);
    result.umschaltX = um.x;
    result.umschaltY = um.y;
  }
  return result;
}
