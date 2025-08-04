# 21 – Metamorphosis UI Expansion

These notes outline the planned interface for visualizing a disciple's frog-like metamorphosis. The layout relies on layered SVG elements and ritual metaphors.

## Layered Layout

- **Segment-based frog icon** – an SVG divided into segments representing Egg, Tail, Limbs, Body and Crown. Each segment lights up as its threshold is met.
- **Circular XP progress ring** – surrounds the frog icon showing % toward breakthrough.
- **Inner mastery ring** – sits between the progress ring and frog icon, filling as disciples gain metamorph and other experience. Combat encounters feed mastery directly.
- **Ambient aura/pond layer** – subtle ripples or glow in the background.
- **Floating stat overlays** – displays XP, assigned disciple and cultivation method.

## Stage Thresholds

Egg → Tail → Limbs → Body → Crown. Hovering near a threshold causes the icon to glow or ripple. At 100% the frog morphs to the next form by swapping shapes.

## Animation

- Ripple or glow when hovering over segments.
- Morphing animation on breakthrough.
- Live update overlays for XP, disciple and method.

## Optional Modifiers Panel

A collapsible stats panel can be toggled from the right edge of the metamorphosis screen. Click the arrow handle to slide the panel in or out. It lists the season, room and weather multipliers that affect the growth formula and shows the resulting XP per second. **Hover over any stat** to view a tooltip detailing how that value is calculated.

## Formula

Once a disciple is on a Path, XP accrues every second:

```
metamorphosis XP/sec = 0.4
                     × method_multiplier
                     × building_multiplier
                     × room_multiplier
                     × path_match_multiplier
                     × stability_factor
                     × cultivation_speed_bonus
                     × season_multiplier
```

## Taino‑styled Glyph

Integrate a Taino‑inspired frog glyph around the icon for ambient feedback.

## Styling

- The metamorphosis panel now uses a parchment texture background at 30% opacity.
- Progress rings feature a lilac to teal gradient with a subtle glow.
- Progress numbers appear on semi-transparent parchment panels.
- Training rooms unlock after obtaining Undead Nectar, letting disciples be assigned from this panel.
- When mastery levels are ready, a Level Up button appears beneath the rings to choose from three random upgrades.
