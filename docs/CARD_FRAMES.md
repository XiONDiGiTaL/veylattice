# Elemental Card Frames and UI Art Direction

**Status:** Art/UX specification. Frames should be original and readable at small sizes.

## Shared frame structure
Every card frame should preserve the same hierarchy:
1. Cost badge in a fixed, consistent location.
2. Name area with sufficient contrast.
3. Art/model viewport.
4. Element indicator and subtype label.
5. Attack and Guard displayed in separate, unmistakable stat areas.
6. Ability text with readable line spacing.
7. Flavor text in a secondary but legible style.
8. Optional bond/set indicator for official cards only.

Do not rely on color alone. Use a unique emblem, material texture, silhouette language, and accessible text label for every element. Keep text contrast high and avoid ornate borders behind rules text.

## Elemental frame direction
- **Wood:** carved living-wood border, leaf/root corner motifs, jade accent light, warm parchment-like inner panel.
- **Fire:** obsidian border with ember seams, angular flame insignia, restrained copper/brass highlights.
- **Earth:** layered stone frame, mineral inlays, broad grounded corners, ochre/gold insignia.
- **Metal:** brushed steel border, crisp bevels, geometric insignia, cool silver highlights.
- **Water:** deep-blue glass/ceramic border, flowing engraved lines, pearl highlights, wave insignia.

## Rarity and accessibility
Rarity may add small trim details but must not obscure the element's identity or card information. Support reduced motion and a non-glowing/high-contrast mode. Never encode rarity or element solely through hue.

## Custom cards
The Vessel Forge previews the frame for the chosen element. Mark custom cards with a small, clear custom-made indicator. Custom frame decorations must not imply official Lore Bond eligibility. The frame is a UI skin, not a gameplay authority.

## Implementation
Keep frame theme tokens in CSS variables or a data-driven theme map. Avoid five separately duplicated card components. Use one card component with element-specific class/data attributes and shared accessible markup. Add visual regression/manual checks for desktop and narrow mobile widths before considering frames complete.
