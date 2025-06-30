# Construct Reality Sliding Panel

This document describes the user interface layout and entrance animation for the **Construct Reality** panel. It supplements `phrase-system.md` with guidance for the new pot based construct interface.

---

## Sliding Panel Layout

* **Trigger**: Clicking the **Construct** button toggles the panel.
* **Position**: The panel slides in from the **right** on desktop. On narrow screens it may slide down from the **top**.
* **Focus**: When open, the panel partially covers the main UI. Core orbs shift slightly left and down to make space, indicating the player has entered a focused construction mode.
* **Sections**:
  1. **Header**
     * `Construct Reality` title
     * `Close` button (❌)
  2. **Construct Pot**
     * Displays the resources placed inside.
  3. **Resource Buttons**
     * Shows each unlocked resource that can be added to the pot.
  4. **Construct Cards**
     * Completed constructs appear here and can be slotted for use.

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

