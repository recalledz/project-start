class Enemy  {
  constructor(stage, world, config = {}) {
    this.stage = stage;
    this.world = world;
    this.name = config.name || "dealer";

    // rarity tier for styling
    this.rarity = config.rarity || "basic";

    // We expect the caller to supply these values
    this.maxHp = config.maxHp;
    this.currentHp = this.maxHp;
    this.damage = config.damage || 1;
    // establish a damage range around the base amount
    this.minDamage = config.minDamage ?? Math.max(1, Math.floor(this.damage * 0.5));
    this.maxDamage = config.maxDamage ?? Math.ceil(this.damage * 1.5);
    this.xp = config.xp;
    this.attackInterval = config.attackInterval || 10000;
    this.abilities = config.abilities || [];
    this.attackTimer = 0;

    this.onAttack = config.onAttack || null;
    this.onDefeat = config.onDefeat || null;
  }

  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
    if (this.currentHp === 0) this.die();
  }

  die() {
    if (this.onDefeat) this.onDefeat(this);
  }

  isDefeated() {
    return this.currentHp <= 0;
  }

  tick(deltaTime) {
    this.attackTimer += deltaTime;
    this.abilities.forEach(ability => ability.tick(deltaTime, this));
    if (this.attackTimer >= this.attackInterval) {
      if (this.onAttack) this.onAttack(this);
      this.attackTimer = 0;
    }
  }

  
}

export default Enemy;
