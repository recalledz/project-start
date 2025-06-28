# Construct Reality Sliding Panel

This document describes the user interface layout and entrance animation for the **Construct Reality** panel. It supplements `phrase-system.md` with guidance for implementing the new freeform phrase builder and animated panel.

---

## Sliding Panel Layout

* **Trigger**: Clicking the **Construct** button toggles the panel.
* **Position**: The panel slides in from the **right** on desktop. On narrow screens it may slide down from the **top**.
* **Focus**: When open, the panel partially covers the main UI. Core orbs shift slightly left and down to make space, indicating the player has entered a focused construction mode.
* **Sections**:
  1. **Header**
     * `Construct Reality` title
     * `Close` button (❌)
  2. **Phrase Builder Row**
     * Horizontal list where words can be placed in any order
     * Scrollable if the phrase exceeds the visible width
  3. **Capacity Meter**
     * Shows current capacity usage, e.g. `🧠 ▮▮▮▯▯ (3 / 5)`
  4. **Word Tile Bank**
     * Grouped subsections for **Verbs**, **Targets**, and **Modifiers**
     * Clicking a tile adds it to the row; clicking a tile in the row removes it
  5. **Etched Phrases**
     * Scrollable list on the right side of the panel displaying saved phrases
     * Each entry includes an `Equip` or `Cast` button and shows a tooltip with effect details
  6. **Action Buttons**
     * `Save Phrase` (enabled only when the phrase is valid)
     * `Clear Phrase`

## Entrance Animation

1. **Panel Slide**
   * Duration: ~300ms
   * Eases out from off-screen to its final position using a cubic-bezier curve (`ease-out`)
   * While sliding in, the panel's opacity fades from 0 to 1
2. **Orb Shift**
   * At the start of the panel animation, the orb container translates left by 40px and down by 20px
   * The orbs maintain this offset while the panel is open
   * When the panel closes, the orbs animate back to their original position in sync with the panel slide-out

The goal is to create a smooth transition that draws attention to the phrase-building workflow without disorienting the player. The animation is subtle but reinforces that the Construct mode is a specialized interface layered over the main game view.

