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
│                      │        [   Qi Orb: 3.34 Qi/s   ]  │                                   │
│                      │        (current Qi rate here)    │                                   │
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
                                   [ Gate → Map / Exploration / Tasks ]


                                   Notes on each region

Header

“Sect” & “Stats” buttons/tabs.

inside sect tab:

left top: current season, date, weather.

center top: disciple list with name, task and fill for each bar.

Left panel (Resource / Items)

Shows stackable resources (fruit, wood, stone, etc.).


Right panel (Navigation)

Quick-jump icons for your major screens (Research, Chanting, Tasks, Map, Influence…).


Main canvas (green)

Four zones laid out roughly in a cross:

Cultivation Zone (upper-left)

Industrial Zone (upper-right)

Storage / Items (lower-left)

Research Zone (lower-right)



Center

Qi Orb widget showing current Qi per second.


Footer

“Gate” button to open the full map/exploration/tasks overlay.

#dicsiple overlay card on pressing disciple

- general tab
┌────────────────────────────────────────────────────┐
│ ○ General  ○ Proficiency  ○ Constructs  ○ Moodlets  ○ Stats │
├────────────────────────────────────────────────────┤
│ [Portrait]     Li Xuan            Path: Ember 🔥       │
│ Core Stage: Qi Shaping       │
├────────────────────────────────────────────────────┤
│ **Attributes**                                  │
│ DEX: 8   (effect description)                     │
│ END: 6   (effect description)                     │
│ STR: 5   (effect description)                     │
│ INT: 9   (effect description)                     │
│ CHA: 4   (effect description)
  POT: 4   (effect description)               │
└────────────────────────────────────────────────────┘

- proficiency tab
┌────────────────────────────────────────────────────┐
│ ○ General  ○ Proficiency  ○ Constructs  ○ Moodlets  ○ Stats │
├────────────────────────────────────────────────────┤
│ **Proficiency Levels & XP Rates**                │
│ • Gathering     Lv 15   → 25 XP/s  (+3× affinity) │
│ • Chanting      Lv 8    → 0.6 XP/s                │
│ • Building      Lv 6    → 0.8 XP/s                │
│ • Research      Lv 8    → 1.2 XP/s                │
│ • Exploration   Lv 4    → 0.4 XP/s                │
└────────────────────────────────────────────────────┘

-constructs tab
┌────────────────────────────────────────────────────┐
│ ○ General  ○ Proficiency  ○ Constructs  ○ Moodlets  ○ Stats │
├────────────────────────────────────────────────────┤
│ sort by [school, passive, spell]
  **learned Constructs**                          │
│ [spell: fireball]   [passive:max Qi upgrade]       │
│                                                  │
│
└────────────────────────────────────────────────────┘

-moodlets tab

┌────────────────────────────────────────────────────┐
│ ○ General  ○ Proficiency  ○ Constructs  ○ Moodlets  ○ Stats │
├────────────────────────────────────────────────────┤
│ **Active Moodlets**                              │
│ 🙂 Inspired    (+10% cultivation speed)           │
│ 😴 Tired       (–20% work speed)                  │
│ 🍽️ Hungry       (–50% happiness; seeks food)       │
│ ⚡ Energized   (+5 stamina/sec regen)             │
└────────────────────────────────────────────────────┘

-stats tab
┌────────────────────────────────────────────────────┐
│ ○ General  ○ Proficiency  ○ Constructs  ○ Moodlets  ○ Stats │
├────────────────────────────────────────────────────┤
│ **Derived Stats & Multipliers**                   │
│ • Travel Speed: 1.2 units/s                       │
│ • Woodcut Multiplier: 1.05×                       │
│ • Chanting Multiplier: 1.20×                      │
│ • Learning Speed: 1.5×                            │
│ • Exploration Speed: 0.8×                         │
│ • Qi Regen Rate: 3.34 Qi/s                        │
│ • Health: 80 / 100                                │
│ • Defense: 15                                    │
└────────────────────────────────────────────────────┘

# Exploration overlay

-show img/Map.png alongside the following overlays
┌───────────────────────────────────────────────────────────────────┐
│ ○ Exploration   ○ Woodcutting Locations   ○ Mining Locations     │
├───────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────┐  ┌────────────────────────────┐ │
│ │ **Regions to Explore**       │  │ **Selection: Verdantia**   │ │
│ │                               │  │                            │ │
│ │ • Verdantia       35%         │  │ Distance: 0.5 units        │ │
│ │ • Greenridge      12%         │  │ Danger: Low                │ │
│ │ • Stoneveil       0%          │  │ Discovery: 35 / 75 pts     │ │
│ │ • Frostvale       0%          │  │                            │ │
│ │ …                             │  │ Send Disciples: [ 1 [-] [+] Max ] │ │
│ │                               │  │ STA Cost: 25               │ │
│ │ (scrollable list)             │  │                            │ │
│ └───────────────────────────────┘  │ [ Send ▶ ]  [ Back ]       │ │
│                                    └────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘


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
│ │       Body Figure     │   │     Progress:          │   │ Assigned to     │ │
│ │   (disciple silhouette │   │   25 000 / 25 000      │   │   Li Xuan       │ │
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

Center‐left: disciple “body” silhouette with fill overlay showing cultivation progress.

Center‐middle: numeric & bar progress (current/target).

Right: which disciple is assigned.

Below main: two‐column stats panel (room vs. cultivation).

Footer: method buttons plus a “Path Progress” link to open path menu.

