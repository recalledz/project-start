
export const AbilityRegistry = {
  healing: {
    heal: () => {
      const ability = {
        name: "Heal",
        icon: "cross",
        cooldown: 10000,
        timer: 0,
        colorClass: "green",
        maxTimer: 10000,

        tick(deltaTime, enemy) {
          this.timer += deltaTime;
          if (this.timer >= this.cooldown) {
            const healAmount = Math.floor(enemy.maxHp * 0.1);
            enemy.currentHp = Math.min(enemy.currentHp + healAmount, enemy.maxHp);
            this.timer = 0;
          }
        }
      };

      return ability;
    }
  },

  defense: {
    shield: () => {
      let cooldown = 5000;
      let timer = 0;

      return {
        name: "Shield",
        icon: "shield",
        cooldown,
        tick: (deltaTime, enemy) => {
          timer += deltaTime;
          if (timer >= cooldown) {
            enemy.isShielded = true;
            timer = 0;
          }
        }
      };
    }
  }

  // Add more groups like fireCaster, poisoner, etc.
};
