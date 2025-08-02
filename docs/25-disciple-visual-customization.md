# 25 – Disciple Visual Customization

This section outlines tasks for making each disciple sprite visually distinct through scars and special markings.

## Usage

Each disciple sprite supports two new data attributes:

- **`data-scar`** – displays small icons in the upper left corner using the `::before` pseudo-element. Icons are chosen from the `SCAR_ICONS` map and are applied automatically when an injury reaches the `destroyed` tier.
- **`data-mark`** – applies a special style or emblem based on the disciple’s unique background. Currently `shellwarden` adds a golden outline.

These attributes are managed by `initDiscipleVisual` and `updateDiscipleVisual` which read `d.injuries` and `d.mark` to update the DOM.

Modders can extend `SCAR_ICONS` and `MARK_ICONS` in `game/constants.js` to introduce additional visuals.
