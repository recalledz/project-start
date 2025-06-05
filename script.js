
import generateDeck from "./card.js";
import addLog from "./log.js";
import Enemy from "./enemy.js";
import { Boss, BossTemplates } from "./boss.js";
import { AbilityRegistry } from "./dealerabilities.js";

// If running in Node (no `document` global), bootstrap a minimal DOM.
if (typeof document === "undefined") {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!DOCTYPE html><body></body></html>");
  global.window = dom.window;
  global.document = dom.window.document;
  global.performance = dom.window.performance;
}



let drawnCards = []
let cash = 0
let cardPoints = 0
let currentEnemy = null;

const stats = {
  points: 0,
  pDamage: 0,
  pRegen: 0,
  cashMulti: 1,
  pLifeMax: 10,
  pLifeCurrent: 10,
  damageMultiplier: 1,
  cardSlots: 3, //at start max
}


let stageData = {
  world: 1,
  stage: 1,
  dealerLifeMax: 10,
  dealerLifeCurrent: 10,
  stageDamageMultiplier: 1.05,
  kills: 0,
  cardXp: 1,
  playerXp: 1,
  attackspeed: 10000, //10 sec at start
}

let pDeck = generateDeck()
let deck = [...pDeck]

const btn = document.getElementById("clickalipse")
const attackBtn = document.getElementById("attackBtn")
const nextStageBtn = document.getElementById("nextStageBtn")
const pointsDisplay = document.getElementById("pointsDisplay")
const cashDisplay = document.getElementById("cashDisplay")
const cardPointsDisplay = document.getElementById("cardPointsDisplay")
const handContainer = document.getElementsByClassName("handContainer")[0]
const dealerLifeDisplay = document.getElementsByClassName("dealerLifeDisplay")[0]
const killsDisplay = document.getElementById("kills")
const deckTabContainer = document.getElementsByClassName("deckTabContainer")[0];
const dCardContainer = document.getElementsByClassName("dCardContainer")[0]


//=========tabs==========

const mainTabButton = document.getElementsByClassName("mainTabButton")[0];
const deckTabButton = document.getElementsByClassName("deckTabButton")[0];
const mainTab = document.querySelector(".mainTab");
const deckTab = document.querySelector(".deckTab");
const tooltip = document.getElementById("tooltip");

function hideTab() {
  mainTab.style.display = "none";
  deckTab.style.display = "none";
}

function showTab(tab) {
  hideTab();
  tab.style.display = "grid";
}

mainTabButton.addEventListener("click", () => {
  showTab(mainTab)
})

deckTabButton.addEventListener("click", () => {
  showTab(deckTab);
})

showTab(mainTab);
//=========card tab==========

function renderTabCard(card) {
  // 1) Wrapper
  const wrapper = document.createElement("div");
  wrapper.classList.add("card-wrapper");

  // 2) Card pane (value / suite / HP)
  const cardPane = document.createElement("div");
  cardPane.classList.add("card");
  cardPane.innerHTML = `
    <div class="card-value" style="color: ${card.color}">${card.value}</div>
    <div class="card-suit" style="color: ${card.color}">${card.symbol}</div>
    <div class="card-hp">HP: ${card.currentHp}/${card.maxHp}</div>
  `;

  // 3) XP bar
  const xpBar = document.createElement("div");
  const xpBarFill = document.createElement("div");
  const xpLabel = document.createElement("div");
  xpBar.classList.add("xpBar");
  xpBarFill.classList.add("xpBarFill");
  xpLabel.classList.add("xpBarLabel");
  xpLabel.textContent =
    `LV: ${card.currentLevel}`;
  xpBar.append(xpBarFill, xpLabel);

  // 4) Store references on the card object for deck tab
  card.deckXpBarFill = xpBarFill;
  card.deckXpLabel = xpLabel;
  card.deckHpDisplay = cardPane.querySelector(".card-hp");

  // 5) Nest and append
  wrapper.append(cardPane, xpBar);
  deckTabContainer.appendChild(wrapper);

  wrapper.addEventListener("mouseover", e => {
    tooltip.innerHTML = `
        <strong>${card.value}${card.symbol}</strong><br>
        Level: ${card.currentLevel}<br>
        XP: ${card.XpCurrent}/${card.XpReq}<br>
        Damage: ${card.damage}<br>
      `;
    tooltip.style.display = "block";
  });

  // move with the mouse
  wrapper.addEventListener("mousemove", e => {
    // offset so the tip doesn’t sit *under* the cursor
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
  });

  // hide when you leave
  wrapper.addEventListener("mouseout", () => {
    tooltip.style.display = "none";
  });
}

for (let i = 0; i < deck.length; i++) {
  renderTabCard(deck[i]);
}

function updateDeckDisplay() {
  // Update ALL cards in the original deck, including those that have been drawn
  pDeck.forEach(card => {
    // Skip if card doesn't have deck tab elements
    if (!card.deckXpBarFill || !card.deckXpLabel) return;

    // 1) XP bar for deck tab
    const pct = (card.XpCurrent / card.XpReq) * 100;
    card.deckXpBarFill.style.width = `${Math.min(pct, 100)}%`;

    // 2) XP/Level/Damage label for deck tab
    card.deckXpLabel.textContent =
      `LV: ${card.currentLevel} ` +
      `XP: ${card.XpCurrent}/${Math.floor(card.XpReq)}`;

    // 3) Update HP in deck tab
    if (card.deckHpDisplay) {
      card.deckHpDisplay.textContent =
        `HP: ${card.currentHp}/${card.maxHp}`;
    }

    // 4) If this card is currently on the field, update its HP too
    if (card.hpDisplay) {
      card.hpDisplay.textContent =
        `HP: ${card.currentHp}/${card.maxHp}`;
    }
  });
}

//========render functions==========
document.addEventListener("DOMContentLoaded", () => {
  // now the DOM is in, and lucide.js has run, so window.lucide is defined
  renderDealerCard(); 
  requestAnimationFrame(gameLoop)
});

// life
function renderDealerLifeBar() {

  if (document.querySelector(".dealerLifeContainer")) return;
  const dealerContainerLife = document.createElement("div");
  const dealerBarFill = document.createElement("div")

  dealerContainerLife.classList.add("dealerLifeContainer");
  dealerBarFill.id = "dealerBarFill";

  dealerContainerLife.appendChild(dealerBarFill);
  dealerLifeDisplay.insertAdjacentElement("afterend", dealerContainerLife);
  dealerLifeDisplay.textContent = `Life: ${currentEnemy.maxHp}`;
}

function renderDealerLifeBarFill() {
  const dealerBarFill = document.getElementById("dealerBarFill")
  dealerBarFill.style.width = `${currentEnemy.currentHp / currentEnemy.maxHp * 100}%`
} //red fill gauge render

//stage

function renderStageInfo() {
  const stageDisplay = document.getElementById("stage");
  stageDisplay.textContent = `Stage ${stageData.stage} World ${stageData.world}`
}

function renderPlayerStats(stats) {
  const damageDisplay = document.getElementById("damageDisplay");
  const cashMultiDisplay = document.getElementById("cashMultiDisplay");
  const regenDisplay = document.getElementById("regenDisplay");

  damageDisplay.textContent = `Damage: ${Math.floor(stats.pDamage)}`;
  cashMultiDisplay.textContent = `Cash Multi: ${Math.floor(stats.cashMulti)}`;
  regenDisplay.textContent = `Regen: ${stats.pRegen}`;
  pointsDisplay.textContent = `Points: ${stats.points}`;
  cardPointsDisplay.textContent = `Card Points: ${cardPoints}`;

}

function renderDealerCard() {
    const { minDamage, maxDamage } = calculateEnemyBasicDamage(stageData.stage, stageData.world) //calculate damage for the current stage min and max
  
  
    // define d container wrapper
  const dCardWrapper = document.createElement("div");
  dCardWrapper.classList.add("dCardWrapper");
    
  const dCardPane = document.createElement("div");
  dCardPane.classList.add("dCardPane");
  const typeClass = currentEnemy instanceof Boss ? "boss" : "dealer";
  dCardPane.classList.add(typeClass);
  
  const dCardAbilityPane = document.createElement("div");
  dCardAbilityPane.classList.add("dCardAbilityPane");
  
    
   if (currentEnemy instanceof Boss) {
  
  
     let abilitiesHTML = `<div class="dCard_abilities">`;
        for (const ability of currentEnemy.abilities) {
          const icon = ability.icon || "sparkles";
          const label = ability.label || "Ability";
          const isOnCooldown = ability.timer < ability.cooldown;
          const cooldownRatio = ability.timer / ability.cooldown;
          const typeClass = ability.colorClass || "";
          const cooldownClass = (ability.timer && ability.cooldown && ability.timer < ability.cooldown)
          ? "onCooldown"
          : "";
  
          abilitiesHTML += `<div class="dCard_ability ${cooldownClass} ${typeClass}" title="${label}">
              <i data-lucide="${icon}"></i>
              ${isOnCooldown ? `<div class="cooldown-overlay" style="--cooldown:${cooldownRatio}"></div>` : ""}
            </div>`;
        }
      abilitiesHTML += `</div>`;
      
      dCardPane.innerHTML = `
        <i data-lucide="${currentEnemy.icon}" class="dCard__icon"></i>
        <span class="dCard__text">
          ${currentEnemy.name}<br>
          Damage: ${minDamage} - ${maxDamage}
        </span>
      `;
  
     //add abilities to the card
     dCardAbilityPane.innerHTML = abilitiesHTML;
     // apend card pane data and ability data to wrapper
     dCardWrapper.appendChild(dCardPane);
      dCardWrapper.appendChild(dCardAbilityPane);
   // append wrapper to container
     dCardContainer.appendChild(dCardWrapper);
      lucide.createIcons();
      
    } else  {
      /*let dCardAdder = document.createElement("span");
      let cardEffect = null;
      dCardAdder.classList.add("dCard");
  
      dCardAdder.innerHTML = `
        <i data-lucide="skull" class="dCard__icon"></i>
        <span class="dCard__text">
          Damage: ${minDamage} - ${maxDamage}
        </span>`
  
      dCardContainer.appendChild(dCardAdder);
      dCardAdder.textContent = `Damage: ${dDamage} D ${stageData.stage}`
      lucide.createIcons();*/
     let abilitiesHTML = `<div class="dCard_abilities">`;
           for (const ability of currentEnemy.abilities) {
             const icon = ability.icon || "sparkles";
             const label = ability.label || "Ability";

             abilitiesHTML += `<div class="dCard_ability" title="${label}">
               <i data-lucide="${icon}"></i>
               </div>`;
           }
         abilitiesHTML += `</div>`;

         dCardPane.innerHTML = `
           <i data-lucide="skull" class="dCard__icon"></i>
           <span class="dCard__text">
             ${currentEnemy.name}<br>
             Damage: ${minDamage} - ${maxDamage}
           </span>
         `;

        //add abilities to the card
        dCardAbilityPane.innerHTML = abilitiesHTML;
        // apend card pane data and ability data to wrapper
        dCardWrapper.appendChild(dCardPane);
         dCardWrapper.appendChild(dCardAbilityPane);
      // append wrapper to container
        dCardContainer.appendChild(dCardWrapper);
         lucide.createIcons();
     }
  }

function animateCardHit(card) {
  const w = card.wrapperElement;
  w.classList.add("hit-animate");
  w.addEventListener("animationend", () => w.classList.remove("hit-animate"), { once: true });
}



//=========stage functions===========

// stage and world
function nextStage() {
  stageData.stage += 1;
  stageData.kills = 0;
  killsDisplay.textContent = `Kills: ${stageData.kills}`
  nextStageChecker();
  renderStageInfo();
  respawnDealerStage();
}

function nextWorld() {
  stageData.world += 1;
  stageData.stage = 1;
  stageData.kills = 0;
  killsDisplay.textContent = `Kills: ${stageData.kills}`
  nextStageChecker();
  renderStageInfo();
}

function nextStageChecker() {
  nextStageBtn.disabled = stageData.kills < 1;
  nextStageBtn.style.background = stageData.kills < 1 ? "grey" : "green"
}

//dealer

function spawnDealer() {
  const stage = stageData.stage;
  const world = stageData.world;
  const maxHp = calculateEnemyHp(stage, world);

  currentEnemy = new Enemy(stage, world, {
    maxHp,
    onAttack: (Enemy) => {
      const { minDamage, maxDamage } = calculateEnemyBasicDamage(stage, world)
      const damage = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
      cDealerDamage(damage, null, Enemy.name);
    },
    onDefeat: () => {
      onDealerDefeat();
    }
  });

  updateDealerLifeDisplay();
  dealerDeathAnimation();
}

function updateDealerLifeBar(enemy) {
  const barFill = document.getElementById("dealerBarFill");
  if (!barFill || !enemy) return;

  const hpRatio = enemy.currentHp / enemy.maxHp;
  barFill.style.width = `${Math.max(0, Math.min(1, hpRatio)) * 100}%`;
} // for healing bosses

function removeDealerLifeBar() {
  const bar = document.querySelector(".dealerLifeContainer");
  if (bar) bar.remove();
  dealerLifeDisplay.textContent = '';
}

function respawnDealerStage() {
  removeDealerLifeBar();
  if (stageData.stage % 10 === 0) {
    spawnBoss();
  } else {
    spawnDealer();
  }
}

function animateGoldBorder(isBoss = false) {
  document.querySelectorAll('.casino-section').forEach(el => {
    el.classList.remove('gold-sweep', 'boss-sweep');
    // force reflow to restart animation
    void el.offsetWidth;
    const cls = isBoss ? 'boss-sweep' : 'gold-sweep';
    el.classList.add(cls);
    el.addEventListener('animationend', () => {
      el.classList.remove(cls);
    }, { once: true });
  });
}

function onDealerDefeat() {

  cardXp(stageData.stage ** 1.2 * stageData.world);
  cashOut();
  healCardsOnKill();
  stageData.kills += 1;
  killsDisplay.textContent = `Kills: ${stageData.kills}`;
  dealerDeathAnimation();
  animateGoldBorder(false);
  nextStageChecker();
  respawnDealerStage();
} // need to define xp formula

function onBossDefeat(boss) {
  cardXp(boss.xp);
  //awardJokerCard();
  //nextWorld(); // or stageData.world++
  addLog(`${boss.name} was defeated!`);
  currentEnemy = null;

  healCardsOnKill();
  animateGoldBorder(true);
  nextWorld();
  respawnDealerStage();
}

function spawnBoss() {
  const stage = stageData.stage;
  const world = stageData.world;
  const template = BossTemplates[world];

  const abilities = template.abilityKeys.map(key => {
    const [group, fn] = key.split(".");
    return AbilityRegistry[group][fn]();
  });


  currentEnemy = new Boss(stage, world, {
    maxHp: calculateEnemyHp(stage, world, true), // true for boss
    name: template.name,
    icon: template.icon,
    abilities,
    onAttack: (boss) => {
      const { minDamage, maxDamage } = calculateEnemyBasicDamage(stage, world)
      const damage = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
      cDealerDamage(damage, null, boss.name);
    },
    onDefeat: () => {
      onBossDefeat(currentEnemy);
    }
  });

  updateDealerLifeDisplay();
  dealerDeathAnimation()
} 

function updateDealerLifeDisplay() {
  dealerLifeDisplay.textContent =
    `Life: ${currentEnemy.currentHp}/${currentEnemy.maxHp}`;
  renderDealerLifeBar();
  renderDealerLifeBarFill();
}

function calculateEnemyHp(stage, world, isBoss = false) {
  const baseHp = 10 + stage + (world -1) * 100;
  return Math.floor(baseHp * (isBoss ? 10 : Math.pow(stage, 0.5)))
}


function calculateEnemyBasicDamage(stage, world) {
  let baseDamage;

  if (stage === 10) {
    baseDamage = stage * 2;
  } else if (stage <= 10) {
    baseDamage = stage
  } else {
    baseDamage = Math.floor(0.1 * stage * stage)
  }

  const scaledDamage = baseDamage * (world ** 2);
  const maxDamage = Math.max(scaledDamage, 1);
  const minDamage = Math.floor(0.5 * maxDamage) + 1;

  return { minDamage, maxDamage };
}

function cDealerDamage(damageAmount = null, ability = null, source = "dealer") {

  // if there’s no card, nothing to do
  if (drawnCards.length === 0) {
    respawnPlayer();
    return;
  }

  const { minDamage, maxDamage } = calculateEnemyBasicDamage(stageData.stage, stageData.world);
  const dDamage = damageAmount ?? Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;


  // target the front‐line card
  const card = drawnCards[0];

  // subtract **one** hit’s worth
  card.currentHp = Math.max(0, card.currentHp - dDamage);
  addLog(`${source} hit ${card.value}${card.symbol} for ${dDamage} damage!`, "damage")

  // update its specific HP display
  card.hpDisplay.textContent =
    `HP: ${card.currentHp}/${card.maxHp}`;
  updateDeckDisplay()
  animateCardHit(card)
  // if it’s dead, remove it
  if (card.currentHp === 0) {
    // 1) from your data
    drawnCards.shift();
    // 2) from the DOM
    card.wrapperElement.remove();
  }
  // Optional ability logic (e.g., healing, fireball
}

  function dealerDeathAnimation() {
    const dCardWrapper = document.querySelector(".dCardWrapper:last-child");
    const dCardPane = document.querySelector(".dCardPane")
  
    if (!dCardWrapper) return;
    
      dCardWrapper.classList.add("dealer-dead");
    dCardPane.classList.add("dealer-dead")

    dCardWrapper.addEventListener("animationend", () => {
       dCardContainer.innerHTML = "";
      renderDealerCard()
    }, { once: true });
  }

//========deck functions===========

function cardXp(xpAmount) {
  drawnCards.forEach(card => {
    if (!card) return;

    const leveled = card.gainXp(xpAmount);
    if (leveled) {
      cardPoints += 1;
      animateCardLevelUp(card);
      addLog(`${card.value}${card.symbol} leveled up to level ${card.currentLevel}!`, "level");
    }
  });
  // refresh both UIs
  updateHandDisplay();    // paints hand bars & HP
  updateDeckDisplay();    // paints deck tab bars
}

/**
 * Draws the top card from `Deck` into `intoHand`.
 * Renders it with `renderFn` and then calls `updateFn`.
 * Returns the drawn card, or null if the deck was empty.
 */
function drawCard() {
  // 1) Nothing to draw?
  if (deck.length === 0) return null;

  // 2) Take the *same* object out of deck…
  const card = deck.shift();

  // 3) …put it into your hand…
  drawnCards.push(card);

  // 4) render just that one card in the hand…
  renderCard(card);

  // 5) refresh any other UI that shows the deck
  updateDeckDisplay();

  // 6) return the drawn card

  return card;
}

function updateDrawButton() {
  if (stats.cardSlots === drawnCards.length) {
    btn.disabled = true;
    btn.style.background = "grey";
  } else {
    btn.disabled = false;
    btn.style.background = "green";
  }
}

function updateHandDisplay() {
  drawnCards.forEach(card => {
    if (!card || !card.hpDisplay) return; // Skip if card or elements are missing
    card.hpDisplay.textContent = `HP: ${card.currentHp}/${card.maxHp}`;
    card.xpLabel.textContent = `LV: ${card.currentLevel}`;
    card.xpBarFill.style.width = `${card.XpCurrent / card.XpReq * 100}%`;
  });
}

function renderCard(card) {
  // 1) Wrapper
  const wrapper = document.createElement("div");
  wrapper.classList.add("card-wrapper");

  // 2) Card pane (value / suite / HP)
  const cardPane = document.createElement("div");
  cardPane.classList.add("card");
  cardPane.innerHTML = `
    <div class="card-value" style="color: ${card.color}">${card.value}</div>
    <div class="card-suit" style="color: ${card.color}">${card.symbol}</div>
    <div class="card-hp">HP: ${card.currentHp}/${card.maxHp}</div>
  `;

  // 3) XP bar
  const xpBar = document.createElement("div");
  const xpBarFill = document.createElement("div");
  const xpLabel = document.createElement("div");
  xpBar.classList.add("xpBar");
  xpBarFill.classList.add("xpBarFill");
  xpLabel.classList.add("xpBarLabel");
  xpLabel.textContent =
    `LV: ${card.currentLevel}`;
  xpBar.append(xpBarFill, xpLabel);

  // 4) Nest and append
  wrapper.append(cardPane, xpBar);
  handContainer.appendChild(wrapper);

  // 5) Save references for later updates
  card.wrapperElement = wrapper;
  card.hpDisplay = cardPane.querySelector(".card-hp");
  card.xpBar = xpBar;
  card.xpBarFill = xpBarFill;
  card.xpLabel = xpLabel;
}

function heartHeal() {
  if (drawnCards.length === 0) return;

  const target = drawnCards[0];
  if (target.currentHp === target.maxHp) return;

  drawnCards.forEach(card => {
    if (card.suit === "Hearts") {
      target.currentHp = Math.min
        (target.currentHp + card.currentLevel, target.maxHp
        );
      animateCardHeal(target);
    }
  });
  target.hpDisplay.textContent =
    `HP: ${target.currentHp}/${target.maxHp}`;
}

function animateCardHeal(card) {
  const w = card.wrapperElement;
  w.classList.add("heal-animate");
  w.addEventListener("animationend", () => w.classList.remove("heal-animate"), { once: true });
}

function animateCardLevelUp(card) {
  const w = card.wrapperElement;
  w.classList.add("levelup-animate");
  w.addEventListener("animationend", () => w.classList.remove("levelup-animate"), { once: true });
}

function healCardsOnKill() {
  drawnCards.forEach(card => {
    if (!card) return;
    card.healFromKill();
  });
  updateHandDisplay();
  updateDeckDisplay();
}

//=========player functions===========


function spawnPlayer() {
  for (let i = 0; i < stats.cardSlots; i++) {
    drawCard();
  }
}

function respawnPlayer() {
  drawnCards = [];
  deck = [...pDeck];
  handContainer.innerHTML = "";
  stats.points = 0;
  pointsDisplay.textContent = stats.points;
  spawnPlayer();
  stageData.stage = 1;
}

function attack() {

  if (!currentEnemy) return;

  currentEnemy.takeDamage(stats.pDamage);

  stageData.dealerLifeCurrent = currentEnemy.currentHp;

  if (currentEnemy.isDefeated()) {
    currentEnemy.onDefeat?.()
  } else {
    dealerLifeDisplay.textContent = `Life: ${Math.floor(currentEnemy.currentHp)}/${currentEnemy.maxHp}`;
    renderDealerLifeBarFill();
  }
}
/*if (currentEnemy instanceof Boss) {
  // Handle boss damage
  currentEnemy.takeDamage(stats.pDamage);
  stageData.dealerLifeCurrent = currentEnemy.currentHp;
  
  if (currentEnemy.currentHp <= 0) {
    onBossDefeat(currentEnemy);
    respawnDealer();
    dealerLifeBar();
    cashOut();
    nextWorld();
    nextStageChecker();
    dealerDeathAnimation();
  } else {
    dealerLifeDisplay.textContent = `Life: ${Math.floor(currentEnemy.currentHp)}/${currentEnemy.maxHp}`;
    dealerLifeBar();
  }
} else {
  // Handle regular enemy damage
  if (stageData.dealerLifeCurrent - stats.pDamage <= 0) {
    stageData.kills += 1;
    killsDisplay.textContent = `Kills: ${stageData.kills}`;
    respawnDealer();
    dealerLifeBar();
    cardXp(stageData.stage ** 1.2); 
    cashOut();
    nextStageChecker();
    dealerDeathAnimation();
  } else {
    stageData.dealerLifeCurrent = stageData.dealerLifeCurrent - stats.pDamage;
    dealerLifeDisplay.textContent = `Life: ${Math.floor(stageData.dealerLifeCurrent)}/${stageData.dealerLifeMax}`;
    dealerLifeBar();
  }
}*/

function cashOut() {
  cash = Math.floor(cash + stats.points * (1 + Math.pow(stageData.stage, 0.5)) * stats.cashMulti);
  cashDisplay.textContent = `Cash: $${cash}`
  return cash
}

function updatePlayerStats() {
  // Reset base stats
  stats.pDamage = 0;
  stats.damageMultiplier = 1;
  stats.pRegen = 0;
  stats.cashMulti = 1;
  stats.pLifeMax = 100;
  stats.points = 0;

  for (const card of drawnCards) {
    if (!card) continue;

    if (card.suit === "Spades") stats.damageMultiplier += 0.1 * card.currentLevel;
    if (card.suit === "Hearts") stats.pRegen += card.currentLevel;
    if (card.suit === "Diamonds") stats.cashMulti += Math.floor(Math.pow(card.currentLevel, 0.5));
    if (card.suit === "Clubs") stats.pLifeMax = stats.pLifeMax * 1.1 + card.currentLevel / 100;

    card.damage = card.baseDamage * card.currentLevel;
    stats.pDamage += card.damage;
    stats.points += card.value;
  }

  stats.pDamage *= stats.damageMultiplier;
  renderPlayerStats(stats);
}


//=========game start===========

spawnDealer();
renderStageInfo();
spawnPlayer();
nextStageChecker();


btn.addEventListener("click", drawCard)
attackBtn.addEventListener("click", attack)
nextStageBtn.addEventListener("click", nextStage)

/*function retry() {
  points =0
  pointsDisplay.textContent = points;
  suite = [1,2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  drawnCards = []
  handContainer.innerHTML = ""
}*/

//=========game loop===========


/*setInterval(updateUi(), 1000);*/

setInterval(() => {  //healerinterval
  heartHeal();
}, 20000)

/*setInterval(() => {
  if (currentEnemy) {
    currentEnemy.tick(100);
  }
  updateDrawButton();
  updatePlayerStats(stats);


}, 100)

setInterval(() => {
  if (!(currentEnemy instanceof Boss)) {
    cDealerDamage();
  }
}, stageData.attackspeed);*/

let lastFrameTime = performance.now();

function gameLoop(currentTime) {
  const deltaTime = currentTime - lastFrameTime;
  lastFrameTime = currentTime;

  if (currentEnemy) {
    currentEnemy.tick(deltaTime);
    updateDealerLifeBar(currentEnemy);

    // Update cooldown overlays
    const overlays = document.querySelectorAll(".cooldown-overlay");
    overlays.forEach((overlay, i) => {
      const ability = currentEnemy.abilities[i];

      // Defensive check: ensure ability has timer + maxTimer
      if (ability && typeof ability.timer === "number" && typeof ability.maxTimer === "number") {
        const ratio = Math.min(1, Math.max(0, ability.timer / ability.maxTimer));
        overlay.style.setProperty('--cooldown', ratio);
      }
    });
  }

  updateDrawButton();
  updatePlayerStats(stats);
  requestAnimationFrame(gameLoop);
}


//devtools

document.addEventListener("keydown", (e) => {
  if (e.shiftKey && e.key === "D") {
    const panel = document.getElementById("debugPanel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  }
});

window.devTools = {
  spawnBoss,
  spawnDealer,
  cDealerDamage,
  killEnemy: () => currentEnemy?.takeDamage?.(currentEnemy.maxHp),
  logEnemy: () => console.log(currentEnemy),
  advanceStage: () => nextStage(),

  giveCash: () => {
    const amount = parseInt(document.getElementById("debugCash").value) || 0;
    cash += amount;
  },

  setStageWorld: () => {
    const stage = parseInt(document.getElementById("debugStage").value);
    const world = parseInt(document.getElementById("debugWorld").value);
    if (!isNaN(stage)) stageData.stage = stage;
    if (!isNaN(world)) stageData.world = world;
    renderStage();
    respawnDealerStage();
  },

  setDamageMult: () => {
    const mult = parseFloat(document.getElementById("debugDamageMult").value);
    if (!isNaN(mult)) {
      stats.damageMultiplier = mult;
      renderPlayerStats(stats);
    }
  },
};
