/**
 * Shared model-authoring helpers.
 *
 * Arguments are positional and short on purpose: a model definition reads as a
 * stack of boxes. `box(group, x, y, z, w, h, d, colour, material, rotation)`.
 *
 * `y` is the *bottom* of the box above the tile surface, so anatomy is authored
 * upwards from the feet. Rotations are degrees around the box centre and are
 * used for angled limbs, fins, banners and weapons.
 */

export const box = (g, x, y, z, w, h, d, c, m = "matte", r) => ({
  g,
  x,
  y,
  z,
  w,
  h,
  d,
  c,
  m,
  ...r,
});

/** Mirrored pair in *different* animation groups (left/right limbs). */
export const pair = (gL, gR, x, y, z, w, h, d, c, m, r) => [
  box(gL, x, y, z, w, h, d, c, m, r),
  box(gR, -x, y, z, w, h, d, c, m, r),
];

/** Mirrored pair that shares one animation group (armour, flanks, horns). */
export const both = (g, x, y, z, w, h, d, c, m, r) => [
  box(g, x, y, z, w, h, d, c, m, r),
  box(g, -x, y, z, w, h, d, c, m, r),
];
