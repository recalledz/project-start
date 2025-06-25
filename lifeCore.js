export class Resource {
  constructor(name) {
    this.name = name;
    this.amount = 0;
    this.total = 0;
  }
  add(val) {
    this.amount += val;
    this.total += val;
  }
}

export class Skill {
  constructor(name, displayName) {
    this.name = name;
    this.displayName = displayName;
    this.level = 0;
    this.xp = 0;
    this.threshold = 10;
  }
  addXP(val) {
    this.xp += val;
    if (this.xp >= this.threshold) {
      this.xp -= this.threshold;
      this.level += 1;
      this.threshold = Math.floor(this.threshold * 1.5);
      if (this.onLevel) this.onLevel(this.level);
    }
  }
}

export class Activity {
  constructor(
    id,
    {
      label,
      skill,
      resource,
      rate = 0,
      xpRate = null,
      tags = [],
      stamina = 0,
      unlock = () => true,
      description = '',
      flavor = ''
    }
  ) {
    this.id = id;
    this.label = label || id;
    this.skill = skill;
    this.resource = resource;
    this.rate = rate;
    this.xpRate = xpRate === null ? rate : xpRate;
    this.tags = tags;
    this.stamina = stamina; // negative to consume, positive to restore
    this.unlock = unlock;
    this.description = description;
    this.flavor = flavor;
  }
}

export class LifeGame {
  constructor() {
    this.skills = {
      mentalAcuity: new Skill('mentalAcuity', 'Mental Acuity'),
      literacy: new Skill('literacy', 'Literacy'),
      physicalCondition: new Skill('physicalCondition', 'Physical Condition'),
      mining: new Skill('mining', 'Mining'),
      craftsmanship: new Skill('craftsmanship', 'Craftsmanship')
    };
    this.resources = {
      thought: new Resource('thought'),
      knowledge: new Resource('knowledge'),
      discovery: new Resource('discovery'),
      copper: new Resource('copper'),
      components: new Resource('components'),
      stamina: new Resource('stamina')
    };
    this.staminaMax = 10;
    this.resources.stamina.amount = this.staminaMax;
    this.activities = {};
    this.current = null;
    this.intent = null;
    this.autoResume = false;
    this.discoveryProgress = 0;
    this.locations = [];
  }

  addActivity(act) {
    this.activities[act.id] = act;
  }

  start(id) {
    if (!this.activities[id] || !this.activities[id].unlock(this)) return;
    this.current = id;
    this.intent = id;
  }

  stop() {
    this.current = null;
  }

  tick(delta = 1, addCoreXP = () => {}) {
    const act = this.activities[this.current];
    if (!act) return;
    if (act.stamina < 0 && this.resources.stamina.amount <= 0) {
      this.current = this.activities.ponder ? 'ponder' : null;
      return;
    }

    if (act.stamina !== 0) {
      this.resources.stamina.amount = Math.max(0, Math.min(this.staminaMax, this.resources.stamina.amount + act.stamina * delta));
      if (act.stamina < 0 && this.resources.stamina.amount <= 0) {
        this.current = this.activities.ponder ? 'ponder' : null;
        return;
      }
    }
    const mult = this._computeMultiplier(act);
    let gain = 0;
    if (act.resource) {
      gain = act.rate * mult * delta;
      this.resources[act.resource].add(gain);
      if (act.resource === 'discovery') {
        this._handleDiscovery(gain);
      }
    }
    if (act.skill) this.skills[act.skill].addXP(act.xpRate * mult * delta);
    if (act.tags.includes('mental')) addCoreXP('mental', 0.1 * delta);
    if (act.tags.includes('body')) addCoreXP('physical', 0.1 * delta);
    if (act.tags.includes('will')) addCoreXP('will', 0.1 * delta);

    if (
      this.autoResume &&
      this.current === 'ponder' &&
      this.intent &&
      this.intent !== 'ponder' &&
      this.resources.stamina.amount >= this.staminaMax
    ) {
      this.current = this.intent;
    }
  }

  _handleDiscovery(amount) {
    this.discoveryProgress += amount;
    while (this.discoveryProgress >= 1) {
      this.discoveryProgress -= 1;
      this._attemptDiscoveryEvent();
    }
  }

  _attemptDiscoveryEvent() {
    const total = this.resources.discovery.total;
    const events = [
      { req: 1, chance: 0.001, type: 'item', key: 'pick' },
      { req: 100, chance: 0.001, type: 'location', key: 'Mystery Garden' },
      { req: 1, chance: 0.000001, type: 'item', key: 'esotericRemembrance' },
      { req: 1, chance: 0.1, type: 'item', key: 'paper' }
    ];
    events.forEach(ev => {
      if (total >= ev.req && Math.random() < ev.chance) {
        if (ev.type === 'item') {
          if (!this.resources[ev.key]) this.resources[ev.key] = new Resource(ev.key);
          this.resources[ev.key].add(1);
        } else if (ev.type === 'location') {
          if (!this.locations.includes(ev.key)) {
            this.locations.push(ev.key);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('location-discovered', { detail: { name: ev.key } }));
            }
          }
        }
      }
    });
  }

  _computeMultiplier(act) {
    let m = 1;
    if (act.tags.includes('mental')) {
      m += this.skills.mentalAcuity.level * 0.02;
    }
    return m;
  }
}
