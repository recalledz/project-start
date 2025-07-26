# 17 – Water Orb Mechanics

**Saturday, July 12, 2025 • 3:07 PM**

- Central map Water Orb gathers Water from disciples (1 Water/s each when not incapacitated).
- Low‑food disciples divert to orb to replenish (+0.383 food/s) at cost of Water input.
- Orb distributes Water as global energy; buildings can boost its output.
- Disciples can direct % of personal Water to orb.
- The orb is now larger and displays its regeneration rate centered within.
- The orb fill displays the current Water against its maximum capacity.
- SlowBlob raiders display a small life bar above them as they approach.
- At night the orb glows with a bright blue hue, illuminating nearby terrain using a Pixi.js GlowFilter (radius ~30, outer strength ~4, inner strength ~1).
- The glow color is `#7fd9ff` and brightness is doubled at night to help the orb stand out against the dimmed map.
- Soft light particles swirl around the orb at night, further brightening the surrounding darkness.
- A radial light mask darkens the map at night while leaving a bright gradient around the orb.
- The orb now holds up to 20 Water and regenerates at a flat 0.1 Water per second.
- Orb Revival research grants access to an Orb Management panel for the Water Orb.
- Word of Haste orb spell speeds up work tasks for one minute at the cost of 15 Water.
- Orb Spell Strength buildings raise the Water Orb's attack damage by 20% per level.
- Orb Reverberation grants a toggled effect that increases disciple attack speed by 30% while draining 1 Water each second.
