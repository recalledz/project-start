# Sect Overview Screen

[ Sect ]    [ Stats ]
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Season • Calendar • Weather │          disciple #1 name ( life bar/fill)
                               |          task (bar with task progress fill)
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────┬───────────────────────────────────┬───────────────────────────────────┐
│ Resource / Items     │                                   │ Navigation                        │
│ • Fruit 10/10        │        Cultivation Zone           │ ○ Research                        │
│ • Softwood 10/10     │      ┌───────────────────────┐    │ ○ Chanting                        │
│                      │      │                       │    │ ○ Tasks                           │
│                      │      │     [Cultivation]      │    │ ○ Map                             │
│                      │      │                       │    │ ○ Influence                       │
│                      │      └───────────────────────┘    │                               │
│                      │                                   │                                   │
│                      │  ┌───────────────────────┐        │                                   │
│                      │  │  Industrial Zone      │        │                                   │
│                      │  │       (crafting,      │        │                                   │
│                      │  │      workshops…)      │        │                                   │
│                      │  └───────────────────────┘        │                                   │
│                      │                                   │                                   │
│                      │        [   Water Orb: 3.34 Water/s   ]  │                                   │
│                      │        (current Water rate here)    │                                   │
│                      │                                   │                                   │
│                      │  ┌───────────────────────┐        │                                   │
│                      │  │  Storage / Items      │        │                                   │
│                      │  └───────────────────────┘        │                                   │
│                      │                                   │                                   │
│                      │  ┌───────────────────────┐        │                                   │
│                      │  │  Research Zone        │        │                                   │
│                      │  │  (tree + library UI)  │        │                                   │
│                      │  └───────────────────────┘        │                                   │
└──────────────────────┴───────────────────────────────────┴───────────────────────────────────┘
                                   [ Gate → Map / Exploration / Tasks ] (located at the bottom of the sect map)


                                   Notes on each region

Header

“Sect” & “Stats” buttons/tabs.

inside sect tab:

left top: current season, date, weather.

center top: disciple list with name, task and fill for each bar.
This row appears above the sect map. The previous row of disciple cards beneath the map has been removed for clarity.

Left panel (Resource / Items)

Shows stackable resources (fruit, wood, stone, etc.).


Right panel (Navigation)

Quick-jump icons for your major screens (Research, Chanting, Tasks, Map, Influence…).


Main canvas (green)

Zones curve around the Water Orb in an ellipse:

- Cultivation Zone
- Industrial Zone
- Storage / Items
- Research Zone
- Housing Zone (between the upper zones)
- Soft misty trails link each zone back to the Water Orb

Zones are sized to **26%** of the main canvas so they no longer overlap.

The Water Orb now sits at the exact center, with the housing zone forming the tip
of a loose triangle above the lower zones.

Water Orb displays its regen rate within the orb itself and glows softly at night.


Footer

“Gate” button to open the full map/exploration/tasks overlay.
* Exploration and sect disciple lists now use a unified bamboo-colored badge showing the disciple's name, mood, HP bar and current task.

#dicsiple overlay card on pressing disciple

Here’s the updated **Disciple Overlay UI wireframe** with the added `Cultivation` tab and clean layout for all six tabs:

---

## 🧘‍♂️ Disciple Overlay – Tabbed Interface Wireframe

```plaintext
┌────────────────────────────────────────────────────────────────────────────┐
│ ○ General  ○ Proficiency  ○ Constructs  ○ Moodlets  ○ Stats  ○ Cultivation │
├────────────────────────────────────────────────────────────────────────────┤

[Content based on selected tab shown below]

```

---

### 🧍 **General Tab**

```plaintext
┌────────────────────────────────────────────────────┐
│ [Portrait]         disciple                        │
│ Path:  🔥          Core Stage: egg  │
├────────────────────────────────────────────────────┤
│ **Attributes**                                     │
│ DEX: 8   – (affects movement, crit rate, evade)    │
│ END: 6   – (affects building and farming speed)    │
│ STR: 5   – (physical damage, mining power)         │
│ INT: 9   – (learning rate, spell potency)          │
│ CHA: 4   – (affects persuasion, mood sharing)      │
│ POT: 4   – (breakthrough success chance)           │
└────────────────────────────────────────────────────┘
```

---

### 📚 **Proficiency Tab**

```plaintext
┌────────────────────────────────────────────────────┐
│ **Proficiency Levels & XP Rates**                 │
│ • Gathering     Lv 15   → 25 XP/s   (+3× affinity) │
│ • Chanting      Lv 8    → 0.6 XP/s                 │
│ • Building      Lv 6    → 0.8 XP/s                 │
│ • Research      Lv 8    → 1.2 XP/s                 │
│ • Exploration   Lv 4    → 0.4 XP/s                 │
└────────────────────────────────────────────────────┘
```

---

### 🔮 **Constructs Tab**


┌────────────────────────────────────────────────────┐
│ Sort by [ School ▼ | Passive | Spell ]             │
├────────────────────────────────────────────────────┤
│ **Learned Constructs**                             │
│ [🔥 Fireball]    [💧 Max Water Upgrade]             │
│ [🌿 Verdant Pulse] [🌀 Wind Barrier]                │
│ (Hover for tags, XP, effects)                      │
└────────────────────────────────────────────────────┘
```

---

### 😊 **Moodlets Tab**


┌────────────────────────────────────────────────────┐
│ **Active Moodlets**                                │
│ 🙂 Inspired      (+10% cultivation speed)           │
│ 😴 Tired         (–20% work speed)                  │
│ 🍽 Hungry        (–50% happiness; seeks food)       │
│ ⚡ Energized     (faster stamina regen)             │
└────────────────────────────────────────────────────┘
```

---

### 📊 **Stats Tab**


┌────────────────────────────────────────────────────┐
│ **Derived Stats & Multipliers**                   │
│ • Travel Speed: 1.2 units/s                       │
│ • Woodcut Multiplier: 1.05×                       │
│ • Chanting Multiplier: 1.20×                      │
│ • Learning Speed: 1.5×                            │
│ • Exploration Speed: 0.8×                         │
│ • Water Regen Rate: 3.34 Water/s                  │
│ • Health: 80 / 100                                │
│ • Defense: 15                                     │
└────────────────────────────────────────────────────┘
```


### 🌱 **Cultivation Tab (NEW)**

```plaintext
┌────────────────────────────────────────────────────┐
│        🧘‍♂️ Cultivation Progress Display             │
├────────────────────────────────────────────────────┤
│ • Body Figure UI → [Center visual silhouette]      │
│ • Cultivation Room → Room 1                        │
│ • Progress Bar: [██████████░░░░░░░░] 2500 / 5000 XP │
│ • Estimated Completion: 1m 20s                     │
│ • Bonus from room: +10% speed (Phoenix Ornament)   │
│ • Seasonal Mod: Spring +5%                         │
└────────────────────────────────────────────────────┘



# Exploration overlay

-show img/Map.png alongside the following overlays
┌───────────────────────────────────────────────────────────────────┐
│ ○ Exploration   ○ Woodcutting Locations   ○ Mining Locations     │
├───────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────┐  ┌────────────────────────────┐ │
│ │ **Regions to Explore**       │  │ **Selection: Verdantia**   │ │
│ │                               │  │                            │ │
│ │ • esoteric dungeon 100%
    • Verdantia       35%         │  │ Distance: 0.5 units        │ │
│ │ • Greenridge      12%         │  │ Danger: Low                │ │
│ │ • Stoneveil       0%          │  │ Discovery: 35 / 75 pts     │ │
│ │ • Frostvale       0%          │  │                            │ │
│ │ …                             │  │ Send Disciples: [ 1 [-] [+] Max ] │ │
│ │                               │  │ STA Cost: 25               │ │
│ │ (scrollable list)             │  │                            │ │
│ └───────────────────────────────┘  │ [ Send ▶ ]  [ Back ]       │ │
│                                    └────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
- Selecting the new *Exoteric Dungeon* entry opens a world screen displaying
  progress bars for each unlocked world. From there you choose which disciples
  to send and begin combat.


# Woodcutting Locations Tab

┌───────────────────────────────────────────────────────────────────┐
│ ○ Exploration   ○ Woodcutting Locations   ○ Mining Locations     │
├───────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────┐  ┌────────────────────────────┐ │
│ │ **Woodcutting Spots**        │  │ **Selection: Scrubland**   │ │
│ │                               │  │ Trees                       │ │
│ │ • Scrubland Trees    (T1)     │  │ ─────────────────────────   │ │
│ │ • Broadleaf Thicket  (T2)     │  │ Resource: Softwood          │ │
│ │ • Ironbark Forest    (T3)     │  │ Base Yield: 0.09/s          │ │
│ │ • Ghostgrove         (T4)     │  │ XP Rate: 1.0 XP/s           │ │
│ │ • Petrified Hollow   (T5)     │  │ Distance: 0.5 units         │ │
│ │ …                             │  │ Danger: Low (🌲)            │ │
│ │ (scrollable list)             │  │ Special Loot: Basic Bark    │ │
│ └───────────────────────────────┘  ├────────────────────────────┤ │
│                                    │ **Select Disciples**         │ │
│                                    │ [ ] Li Xuan (STR 7)          │ │
│                                    │ [ ] Mei Yue (STR 5)          │ │
│                                    │ [ ] Chen Wei (STR 9)         │ │
│                                    │ [ Send ▶️ ]  [ Back ]        │ │
│                                    └────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
Notes:

Top tabs let you switch between Exploration, Woodcutting or Mining views.

Left panel is a scrollable list of regions with current progress.

Right panel shows details for the selected region and lets you assign disciples.

You can adjust button labels, add icons, or tweak layout widths to fit your final UI.


# Cultivation Room Overlay

┌───────────────────────────────────────────────────────────────────────────────┐
│ [Room 1]   [Room 2]   [Room 3]        Room 1 Selected                        │
│                                                                              │
│ ┌───────────────────────┐   ┌─────────────────────────┐   ┌─────────────────┐ │
│ │     Tadpole Figure    │   │     Progress:          │   │ Assigned to     │ │
│ │   (tadpole silhouette │   │   25 000 / 25 000      │   │   Li Xuan       │ │
│ │    with fill overlay) │   │   (fill bar here)      │   │                 │ │
│ └───────────────────────┘   └─────────────────────────┘   └─────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐  │
│ │ **Room Stats**       **Cultivation Stats**                              │  │
│ │ - Materials Used     - Speed: 1.2× base                                │  │
│ │ - Ornaments: 3 × Jade   - Season: Solaria (×1.0)                        │  │
│ │ - Comfort: 75/100       - Stability: 68/100                            │  │
│ │                         - Breakthrough Chance: 6%                      │  │
│ └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ Methods:   [ Meditate ]   [ Ponder ]   [ Quiet ]   [ Path Progress ▶︎ ]     │
└──────────────────────────────────────────────────────────────────────────────┘

Top: room‐selector tabs & currently selected label.

Center‐left: disciple “tadpole” silhouette with fill overlay showing metamorphosis progress.

Center‐middle: numeric & bar progress (current/target).

Right: which disciple is assigned.

Below main: two‐column stats panel (room vs. cultivation).

Footer: method buttons plus a “Path Progress” link to open path menu.

Rooms are unlocked further in the game and can be assigned as they are created. For now no rooms are available to select.

