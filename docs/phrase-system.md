# Codex Phrase Construction System

This document outlines the updated rules for constructing phrases in the Codex game. It reflects the refined principle:

> **Verbs are utterances. Targets (and Modifiers) represent intent and effect.**
> **Murmur is free expression that grants Speech experience.**
> **Reality is shaped only once intent is paired with capacity.**

---

## 1. Verb: `Murmur`

* **No cooldown**
* **Consumes:** 5 Insight
* **Effect:** +1 Speech XP
* **Unlocked at start**

## 2. Unlock: Construct Reality Panel

* **Trigger:** Speech Level ≥ 2 (10 Speech XP)
* Upon unlocking, display the message:
  > “You feel your words press outward. You may now construct meaning.”
* Enables a **Construct** button that opens the panel.

## 3. Construct Reality Panel

* Provides an interface to build phrases from unlocked words.
* Phrase format:

```
[ VERB ] + [ TARGET ] + ( MODIFIER )
```

* Capacity counter enforces a maximum total cost. Capacity grows with Speech Level and upgrades.
* Saving a valid phrase places it on the main hotbar as a clickable button.

### Word Costs

| Type     | Capacity Cost |
| -------- | ------------- |
| Verb     | 1             |
| Target   | 1–3           |
| Modifier | 1             |

## 4. Phrase Saving Rules

* Requires at least one Verb and one Target.
* The phrase must fit within current capacity and use only unlocked words.
* Invalid phrases are blocked from saving.

## 5. Main UI Hotbar

* Saved phrases appear as buttons that consume resources and trigger cooldowns when clicked.
* Cooldowns apply only to targets or modifiers – verbs like `Murmur` remain free of cooldowns.
* The number of phrases is unlimited (screen space permitting).

## 6. Example Phrases

### `Murmur + Thinking`

* Capacity: 3
* Cost: 5 Insight
* Effect: +3 Thought
* Cooldown: based on the Thinking target

### `Speak + Form + Accelerated`

* Capacity: 4
* Cost: 7 Insight, 1 Thought, 1 Body
* Effect: +3 Structure with faster casting
* Cooldown: 2s

## Modifier Words

| Modifier | Effect | Orb Cost | Cooldown | Capacity | Potency | Complexity | Unlock Condition |
| -------- | ------ | -------- | -------- | -------- | ------- | ---------- | ---------------- |
| Inwardly | Self-target only; small focus boost | −1 total (min 1) | No change | +0 | ×1.1 | +0.5 | Cast any phrase with Self as the target 3 times |
| Sharply | Doubles output | +2 total | +2s | +1 | ×2 | +1.5 | Cast 3 different phrases with total orb cost ≥ 6 |
| Persistently | Repeats once after 5 seconds | +1 total | +1s | +1 | ×1 | +1.0 | Cast the same phrase 3 times in a row |

## 7. Speech Level Scaling

| Level | Unlock                              |
| ----- | ----------------------------------- |
| 1     | Speech XP bar visible               |
| 2     | Construct Reality panel             |
| 3     | +1 Capacity                         |
| 4     | Unlock Modifier slot                |
| 5     | Unlock Memory Slot system           |
| 6     | Unlock new Verb: `Speak`            |

