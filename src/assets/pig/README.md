# Pig character assets

This directory contains visual assets for the reusable `Pig` component.

## Current state

- Level 1 has three approved poses:
  - `idle` at `level-1/pig-level-1-idle.png`;
  - `workout-complete` at `level-1/pig-level-1-workout-complete.png`;
  - `sleep-complete` at `level-1/pig-level-1-sleep-complete.png`.
- All Level 1 production assets are square RGBA PNGs with transparent backgrounds and built-in
  cream sticker edges.
- The original square concept sheet is preserved at
  `reference/pig-level-1-concept.png` for visual reference only.
- Levels 2–5 have approved idle assets used by the HomePage growth system.
- Level 2 intentionally uses `pig-level-2-idle-v2.png`, whose minimal dot eyes have no
  highlights and remain consistent with the default pig face.
- Missing level assets resolve to the matching Level 1 pose when available, then to Level 1
  `idle`.
- A fallback is exposed by the component through `data-asset-fallback="true"`.

Components must not rely on a background, shadow, notebook texture, or framing baked into the
production character asset.

## Directory and file convention

```text
pig/
├── index.ts
├── README.md
├── reference/
│   └── pig-level-1-concept.png
├── level-1/
│   ├── pig-level-1-idle.png
│   ├── pig-level-1-workout-complete.png
│   └── pig-level-1-sleep-complete.png
├── level-2/
│   └── pig-level-2-idle-v2.png
├── level-3/
│   └── pig-level-3-idle-v2.png
├── level-4/
│   └── pig-level-4-idle-v2.png
└── level-5/
    └── pig-level-5-idle-v2.png
```

Create level directories only when their approved assets exist. Register every new asset in `index.ts`; do not infer paths at runtime.

## Asset rules

- Preserve the same pig identity, proportions, folded ear, face, palette, and line style.
- Export production character assets with transparency; keep the cream sticker edge as part of
  the character.
- Growth changes only pose, limited accessories, and notebook environment.
- Do not bake UI text, level numbers, progress, logos, or buttons into images.
- Keep a square master and generous safe space around the ears and feet.
- Do not silently reuse a different image as a completed growth asset; keep the explicit fallback until the real asset is approved.
