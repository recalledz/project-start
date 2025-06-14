
## ✅ Completed Tasks
- Initial card draw system implemented
- Boss and enemy ability registry with cooldown logic
- Dealer death animation and rerender cycle
- Ability icons styled with cooldown pie shadow effect
- Lucide icons integrated
- Dealer HP system and healing logic for abilities
- Game loop updated for real-time cooldown tracking
- GitHub repository connected and Replit integration enabled
- Finalize card visual polish for dealers
- Create Card class to unify structure
  - Store HP, attack, level, XP, job, suit, traits
  - Define methods for leveling, XP gain, and combat damage
  - Include references to job affinity and trait bonuses
-Add appropriate icons to each dealer/boss card
-Increase size/intensity of icons depending on stage
-Add fast mode toggle to debug panel
-Implement Node-based GameSimulator with simulation tests
-Add restart option in stats screen to begin a new run

---

## 🚧 Upcoming Goals
- Fix dev tools: spawn boss does not update stage stats properly

## fixes

-synchronize dealer bar life and card death animation, they are happening in different frames at times
## UI

- buttons in middle take too much space, make them more compact, consider cicle buttons with only icons instead
- 
### 🃏 Card System Overhaul
-implement card xp system that scales with stages
- Implement affinities: each card has a job alignment
  - Types: Strength, Dexterity, Mind, Chaos, Holy
  - Influence stat scaling, ability unlocks, and synergy bonuses

### 🔁 Game Progression
- Implement start screen:
  - Triggered when all cards die, all cards on hand are defeated, or player prestiges
  - Player selects deck loadout and Joker cards
  - deck lodout selection is locked until defeating world boss 2. before this, a screen just appears saying you are defeated. player may select to start by pressing a button, or after a timer, it automatically progresses.
  -all deck hp cards is reset to maximium. player is bought to stage 1 of current world. upgardes are reset. card levels are reset. 
- Redraw mechanic:
  - Player may redraw hand for escalating cost
  - Cost resets on start screen or clearing world

### 🧙 Joker System
- Player abilities triggered by clicking Joker card
- Limited slots for Joker cards
- Unique art per Joker
- Unlocked after defeating world boss (first one heals)
- Use mana, goes on cooldown after use
- Implement Joker file/object registry

### 🔼 Upgrade System
- Card-based upgrades: HP, damage, regen
- Deck-wide or passive boosts

### 🔮 Mana System
- Mana bar unlocked after first boss
- Regenerates over time or from actions
- Required for Joker card use

### ✨ Prestige & Reincarnation
- Prestige unlocks global upgrades & new systems
- Reincarnation resets card jobs, retains traits and core bonuses
- Jobs grant XP towards skill trees (Strength, Dexterity, Mind, Chaos, Holy)

### 🌾 Resource Roles & Jobs
- Assign cards to non-combat jobs: mining, farming, conjuring
- Resource jobs prevent card use in combat
- Cards level in jobs to gain traits and unlock skill trees

### skilll trees

**Skill Tree - Star Chart Notes**

---

### Notables

#### Mind - Combat

* % Increase to ability power
* % Increase joker ability power
* Joker ability cooldown reduction
* % Global ailment accumulation and chance
* +X Max Mana
* +Base Mana Regen
* % Increase Mana Regen
* % Status effect duration *(New)*

> *Suggestion: Consider clustering "joker-specific" stats under a sub-branch like “Jester’s Cunning” if more joker mechanics are introduced.*

#### Mind - Life Skills

* % Divining Speed
* +Astral Slots *(suggest adding tooltip in-game to clarify long-term function)*
* % Conjuring Speed
* +1 Parallel Conjuring Slot *(New)*

#### Strength - Combat

* +X Max HP
* +X HP per kill
* % Increase player damage *(Consider rewording for clarity: “base player damage” or “non-ability damage”)*
* +X Shield
* % Crit Damage
* % Stun Bar Accumulation
* % Bonus damage against stunned enemies *(New)*

#### Strength - Life Skills

* % Mining Efficiency
* % Digging Efficiency

#### Dexterity - Combat

* % Attack Speed Increase
* +X Evasion
* % Increase Evasion
* % Crit Chance
* +Accuracy
* % Chance to draw an extra card on kill *(New)*

#### Dexterity - Life Skills

* % Foraging Speed
* % Farming Efficiency

#### Holy - Combat

* % Increase in Healing Abilities
* % Card Casting Speed
* % Resist Ailments

> *Keystone idea: “Divine Sacrifice” — every 5th ability heals allies and purges one negative effect but costs 2x mana.*

#### General

* +X Card Slots
* Reduce Card Mana Casting Cost
* Reduce Mana Reserved
* % Increase XP Gain
* % Chance not to consume mana *(New)*
* +1 Random card drawn at start of each fight *(New)*
* First time a card dies, it revives with 20% HP (once per round) *(New)*

---

### Keystones

* **Jester's Domain**: 5 joker slots. Cannot auto attack.
* **Sacrificial Pawns**: 30% more ability power. Each time a card is drawn, 1 is also discarded.
* **Bountiful**: Enemies provide 5x-10x cash, but have 20x more health.
* **Ravenous Hunger**: Heal cards for 5% of damage dealt, consume same amount in mana.
* **Prodigious Hand**: First 30% towards mana reserved do not count as reserved.
* **Blood Sacrifice**: Cards consume health instead of mana when casting.
* **Sacrilegious Mending**: Card healing also damages enemies.
* **Eat the Rich**: High suit cards provide 2x bonus points but do not contribute to combat.
* **Strategic Truce**: Clubs cannot be drawn. 2x effect for other suit bonuses.
* **Rise of the Mass**: 1-4 suit cards level 2x faster, disables XP gain for others.
* **Deafening Screech**: Increased stun buildup. Attack bar is reset when hit.
* **Ghost Step** *(New)*: While above 80% evasion, dodge incoming abilities entirely.
* **Divine Sacrifice** *(New)*: Every 5th ability heals allies and purges one debuff but costs 2x mana.

> *Suggestion: Aim for some keystones that synergize across trees (e.g., Mind + Dex) to reward hybrid builds.*


---

## 🔄 Migration Status
- Codebase successfully committed to GitHub
- Replit connected and live-editable
- Preparing for Codex-based task and documentation management

## Notes
- Ability registry is in `dealerabilities.js`.
- Cards render in `renderDealerCard()`.
- Lucide icons are used for visual consistency.
- All UI logic is JS-based; no framework.

