import Enemy from './enemy.js';
import { Boss, BossTemplates } from './boss.js';
import { AbilityRegistry } from './dealerabilities.js';
import { calculateKillXp, effectiveLevel } from './utils/xp.js';

export function calculateEnemyHp(stage, world, isBoss = false) {
  const baseHp = 10 + stage;
  const effectiveStage = stage + 10 * (world - 1);
  let hp = baseHp * Math.pow(effectiveStage, 1.1);
  if (isBoss) hp *= 5;
  return Math.floor(hp);
}

export function calculateEnemyBasicDamage(stage, world, opts = {}) {
  const { damage } = calculateRelativeEnemyStats(stage, world, opts);
  const maxDamage = Math.max(damage, 1);
  const minDamage = Math.floor(0.5 * maxDamage) + 1;
  return { minDamage, maxDamage };
}

// Expected player multipliers for each world. These model how much stronger a
// typical player might be after unlocking world-based upgrades such as the
// "real" tab in world two.
export const EXPECTED_PLAYER_MULTIPLIERS = {
  1: { attack: 1, hp: 1 },
  2: { attack: 2, hp: 2 }
};

/**
 * Determine enemy HP and damage based on stage, world and player multipliers.
 * @param {number} stage - Current stage number.
 * @param {number} world - Current world number.
 * @param {object} [opts] - Optional overrides.
 * @param {object} [opts.worldMultipliers] - Mapping of world -> {attack, hp} multipliers.
 * @returns {{ hp:number, damage:number }} Enemy stats.
 */
export function calculateRelativeEnemyStats(stage, world, opts = {}) {
  const mults = opts.playerMultipliers || EXPECTED_PLAYER_MULTIPLIERS;
  const { attack = 1, hp = 1 } = mults[world] || mults[1];
  const level = effectiveLevel(stage, world);
  const expectedStat = 5 * level + 2.5;
  const expectedDamage = expectedStat * attack;
  const expectedHp = expectedStat * hp;
  return {
    hp: Math.round(expectedDamage * 3),
    damage: Math.round(expectedHp / 3)
  };
}

/**
 * Assign calculated HP and damage directly onto an enemy object.
 * This does not read player stats; it only applies the expected scaling
 * based on stage, world and optional multipliers.
 *
 * @param {Enemy} enemy - Enemy instance to modify.
 * @param {number} stage - Current stage number.
 * @param {number} world - Current world number.
 * @param {object} [opts] - Optional override values.
 * @returns {Enemy} The modified enemy instance.
 */
export function assignEnemyStats(enemy, stage, world, opts = {}) {
  const { hp, damage } = calculateRelativeEnemyStats(stage, world, opts);
  const { minDamage, maxDamage } = calculateEnemyBasicDamage(stage, world, opts);
  enemy.maxHp = hp;
  enemy.currentHp = hp;
  enemy.minDamage = minDamage;
  enemy.maxDamage = maxDamage;
  enemy.damage = Math.round((minDamage + maxDamage) / 2);
  return enemy;
}

export function spawnDealer(stageData, enemyAttackProgress, onAttack, onDefeat) {
  const stage = stageData.stage;
  const world = stageData.world;
  const enemy = new Enemy(stage, world, {
    // maxHp: calculateEnemyHp(stage, world),
    rarity: 'basic',
    onAttack,
    onDefeat
  });
  assignEnemyStats(enemy, stage, world);
  enemy.attackTimer = enemy.attackInterval * enemyAttackProgress;
  return enemy;
}

export function spawnBoss(stageData, enemyAttackProgress, onAttack, onDefeat) {
  const stage = stageData.stage;
  const world = stageData.world;
  const template = BossTemplates[world];
  const abilities = template.abilityKeys.map(key => {
    const [group, fn] = key.split('.');
    return AbilityRegistry[group][fn]();
  });
  const boss = new Boss(stage, world, {
    // maxHp: calculateEnemyHp(stage, world, true),
    name: template.name,
    icon: template.icon,
    iconColor: template.iconColor,
    xp: calculateKillXp(stage, world),
    abilities,
    rarity: 'legendary',
    onAttack,
    onDefeat
  });
  assignEnemyStats(boss, stage, world);
  boss.maxHp *= 5;
  boss.currentHp = boss.maxHp;
  boss.attackTimer = boss.attackInterval * enemyAttackProgress;
  return boss;
}

export function spawnSpeaker(stageData, enemyAttackProgress, onAttack, onDefeat) {
  const stage = stageData.stage;
  const world = stageData.world;
  const enemy = new Enemy(stage, world, {
    name: "The Speaker",
    // maxHp: calculateEnemyHp(stage, world) * 3,
    rarity: 'rare',
    onAttack,
    onDefeat
  });
  assignEnemyStats(enemy, stage, world);
  enemy.maxHp *= 3;
  enemy.currentHp = enemy.maxHp;
  enemy.minDamage *= 3;
  enemy.maxDamage *= 3;
  enemy.damage = Math.round((enemy.minDamage + enemy.maxDamage) / 2);
  enemy.attackTimer = enemy.attackInterval * enemyAttackProgress;
  enemy.isSpeaker = true;
  return enemy;
}

export function spawnEnemy(kind, stageData, enemyAttackProgress, onDefeat) {
  const { stage, world } = stageData;
  let spawner = spawnDealer;
  if (kind === 'boss') {
    spawner = spawnBoss;
  } else if (kind === 'speaker') {
    spawner = spawnSpeaker;
  }

  const onAttack = enemy => {
    const dmg = Math.floor(Math.random() * (enemy.maxDamage - enemy.minDamage + 1)) + enemy.minDamage;
    const finalDmg = dmg;
    if (typeof globalThis.cDealerDamage === 'function') {
      globalThis.cDealerDamage(finalDmg, null, enemy.name);
    }
  };

  return spawner(stageData, enemyAttackProgress, onAttack, onDefeat);
}
