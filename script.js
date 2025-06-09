import generateDeck, { shuffleArray, Card} from "./card.js";
import addLog from "./log.js";
import Enemy from "./enemy.js";
import { Boss, BossTemplates } from "./boss.js";
import { AbilityRegistry } from "./dealerabilities.js";
import { AllJokerTemplates } from "./jokerTemplates.js";
import { initStarChart } from "./starChart.js";
import { JSDOM } from "jsdom";

if (typeof window === "undefined" || typeof document === "undefined") {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.performance = dom.window.performance;
}


let drawnCards = [];
let discardPile = [];
const cardBackImages = {
    "basic-red": "img/basic deck.png"
};
let cash = 0;
let cardPoints = 0;
let currentEnemy = null;

const stats = {
    points: 0,
    pDamage: 0,
    pRegen: 0,
    cashMulti: 1,
    pLifeMax: 10,
    pLifeCurrent: 10,
    damageMultiplier: 1,
    upgradeDamageMultiplier: 1,
    cardSlots: 3, //at start max
    attackSpeed: 5000, //ms between automatic attacks
    hpPerKill: 1
};

let stageData = {
    world: 1,
    stage: 1,
    dealerLifeMax: 10,
    dealerLifeCurrent: 10,
    stageDamageMultiplier: 1.05,
    kills: 0,
    cardXp: 1,
    playerXp: 1,
    attackspeed: 10000 //10 sec at start
};

const upgrades = {
    cardSlots: {
        name: "Card Slots",
        level: 0,
        baseValue: 3,
        costFormula: level => 100000 * level ** 3,
        effect: player => {
            player.cardSlots =
                upgrades.cardSlots.baseValue + upgrades.cardSlots.level;
        }
    },
    globalDamage: {
        name: "Global Damage Multiplier",
        level: 0,
        baseValue: 1.0,
        costFormula: level => 200 * level ** 2,
        effect: player => {
            player.upgradeDamageMultiplier =
                upgrades.globalDamage.baseValue +
                0.1 * upgrades.globalDamage.level;
        }
    },
    autoAttackSpeed: {
        name: "Auto-Attack Speed",
        level: 0,
        baseValue: 10000,
        costFormula: level => Math.floor(300 * level ** 2.2),
        effect: player => {
            player.attackSpeed = Math.max(
                2000,
                upgrades.autoAttackSpeed.baseValue -
                    100 * upgrades.autoAttackSpeed.level
            );
        }
    },
    cardHpPerKill: {
        name: "Card HP per Kill",
        level: 0,
        baseValue: 1,
        costFormula: level => 150 * level ** 2,
        effect: player => {
            player.hpPerKill =
                upgrades.cardHpPerKill.baseValue + upgrades.cardHpPerKill.level;
            pDeck.forEach(card => (card.hpPerKill = player.hpPerKill));
        }
    }
};

function getDealerIconStyle(stage) {
    const capped = Math.max(1, Math.min(10, stage));
    const t = (capped - 1) / 9; // 0 → 1
    const saturation = 30 + t * 70; // 30% → 100%
    const lightness = 55 - t * 35; // 55% → 20%
    const color = `hsl(0, ${saturation}%, ${lightness}%)`;
    const blur = 1 + t * 4; // 1px → 5px
    return { color, blur };
}

let pDeck = generateDeck();
let deck = [...pDeck];

const btn = document.getElementById("clickalipse");
const redrawBtn = document.getElementById("redrawBtn");
const nextStageBtn = document.getElementById("nextStageBtn");
const pointsDisplay = document.getElementById("pointsDisplay");
const cashDisplay = document.getElementById("cashDisplay");
const cardPointsDisplay = document.getElementById("cardPointsDisplay");
const handContainer = document.getElementsByClassName("handContainer")[0];
const discardContainer = document.getElementsByClassName("discardContainer")[0];
const dealerLifeDisplay =
    document.getElementsByClassName("dealerLifeDisplay")[0];
const killsDisplay = document.getElementById("kills");
const deckTabContainer = document.getElementsByClassName("deckTabContainer")[0];
const dCardContainer = document.getElementsByClassName("dCardContainer")[0];
const jokerContainers = document.querySelectorAll(".jokerContainer");

const unlockedJokers = [];

// Load saved state if available
loadGame();
window.addEventListener("beforeunload", saveGame);
setInterval(saveGame, 30000);

// attack progress bars
let playerAttackFill = null;
let enemyAttackFill = null;
let playerAttackTimer = 0;

//=========tabs==========

const mainTabButton = document.getElementsByClassName("mainTabButton")[0];
const deckTabButton = document.getElementsByClassName("deckTabButton")[0];
const starChartTabButton = document.getElementsByClassName("starChartTabButton")[0];
const mainTab = document.querySelector(".mainTab");
const deckTab = document.querySelector(".deckTab");
const starChartTab = document.querySelector(".starChartTab");
const tooltip = document.getElementById("tooltip");

function hideTab() {
    mainTab.style.display = "none";
    deckTab.style.display = "none";
    if (starChartTab) starChartTab.style.display = "none";
}

function showTab(tab) {
    hideTab();
    // Reset display so CSS controls layout
    tab.style.display = "";
}

mainTabButton.addEventListener("click", () => {
    showTab(mainTab);
});

deckTabButton.addEventListener("click", () => {
    showTab(deckTab);
});

if (starChartTabButton) {
    starChartTabButton.addEventListener("click", () => {
        initStarChart();
        showTab(starChartTab);
    });
}

showTab(mainTab); // Start with main tab visible

function initVignetteToggles() {
    document.querySelectorAll(".vignette-toggle").forEach(btn => {
        btn.addEventListener("click", () => {
            const v = btn.parentElement;
            v.classList.toggle("open");
        });
    });
}

function renderUpgrades() {
    const container = document.querySelector(".upgrade-list");
    if (!container) return;
    container.innerHTML = "";

    Object.entries(upgrades).forEach(([key, up]) => {
        const row = document.createElement("div");
        row.classList.add("upgrade-item");
        row.dataset.key = key;

        const label = document.createElement("span");
        label.textContent = `${up.name} (Lv. ${up.level})`;

        const cost = up.costFormula(up.level + 1);
        const btn = document.createElement("button");
        btn.textContent = `Buy $${cost}`;
        if (cash < cost) btn.disabled = true;
        btn.addEventListener("click", () => purchaseUpgrade(key));

        row.append(label, btn);
        container.appendChild(row);
    });
}

function updateUpgradeButtons() {
    document.querySelectorAll(".upgrade-item").forEach(row => {
        const key = row.dataset.key;
        const btn = row.querySelector("button");
        if (!key || !btn) return;
        const up = upgrades[key];
        const cost = up.costFormula(up.level + 1);
        btn.disabled = cash < cost;
        btn.textContent = `Buy $${cost}`;
    });
}

function purchaseUpgrade(key) {
    const up = upgrades[key];
    const cost = up.costFormula(up.level + 1);
    if (cash < cost) return;
    cash -= cost;
    cashDisplay.textContent = `Cash: $${cash}`;
    up.level += 1;
    up.effect(stats);
    if (key === "cardSlots") {
        while (drawnCards.length < stats.cardSlots && deck.length > 0) {
            drawCard();
        }
    }
    renderUpgrades();
    updateDrawButton();
    renderPlayerStats(stats);
}
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
    xpLabel.textContent = `LV: ${card.currentLevel}`;
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
            card.deckHpDisplay.textContent = `HP: ${card.currentHp}/${card.maxHp}`;
        }

        // 4) If this card is currently on the field, update its HP too
        if (card.hpDisplay) {
            card.hpDisplay.textContent = `HP: ${card.currentHp}/${card.maxHp}`;
        }
    });
}

//========render functions==========
document.addEventListener("DOMContentLoaded", () => {
    // now the DOM is in, and lucide.js has run, so window.lucide is defined
    renderDealerCard();
    initVignetteToggles();
    Object.values(upgrades).forEach(u => u.effect(stats));
    renderUpgrades();
    renderJokers();
    renderPlayerAttackBar();
    requestAnimationFrame(gameLoop);
});

// life
function renderDealerLifeBar() {
    if (document.querySelector(".dealerLifeContainer")) return;
    const dealerContainerLife = document.createElement("div");
    const dealerBarFill = document.createElement("div");

    dealerContainerLife.classList.add("dealerLifeContainer");
    dealerBarFill.id = "dealerBarFill";

    dealerContainerLife.appendChild(dealerBarFill);
    dealerLifeDisplay.insertAdjacentElement("afterend", dealerContainerLife);
    dealerLifeDisplay.textContent = `Life: ${currentEnemy.maxHp}`;
}

function renderEnemyAttackBar() {
    const existing = document.querySelector(".enemyAttackBar");
    if (existing) existing.remove();
    const bar = document.createElement("div");
    const fill = document.createElement("div");
    bar.classList.add("enemyAttackBar");
    fill.classList.add("enemyAttackFill");
    bar.appendChild(fill);
    enemyAttackFill = fill;
    const lifeContainer = document.querySelector(".dealerLifeContainer");
    if (lifeContainer) lifeContainer.insertAdjacentElement("afterend", bar);
}

function renderPlayerAttackBar() {
    const container = document.querySelector(".buttonsContainer");
    if (!container) return;
    const bar = document.getElementById("playerAttackBar");
    if (!bar) return;
    playerAttackFill = bar.querySelector(".playerAttackFill");
}

function renderDealerLifeBarFill() {
    const dealerBarFill = document.getElementById("dealerBarFill");
    dealerBarFill.style.width = `${
        (currentEnemy.currentHp / currentEnemy.maxHp) * 100
    }%`;
} //red fill gauge render

//stage

function renderStageInfo() {
    const stageDisplay = document.getElementById("stage");
    stageDisplay.textContent = `Stage ${stageData.stage} World ${stageData.world}`;
}

function renderPlayerStats(stats) {
    const damageDisplay = document.getElementById("damageDisplay");
    const cashMultiDisplay = document.getElementById("cashMultiDisplay");
    const hpPerKillDisplay = document.getElementById("hpPerKillDisplay");
    const attackSpeedDisplay = document.getElementById("attackSpeedDisplay");

    damageDisplay.textContent = `Damage: ${Math.floor(stats.pDamage)}`;
    cashMultiDisplay.textContent = `Cash Multi: ${Math.floor(stats.cashMulti)}`;
    pointsDisplay.textContent = `Points: ${stats.points}`;
    cardPointsDisplay.textContent = `Card Points: ${cardPoints}`;
    attackSpeedDisplay.textContent = `Attack Speed: ${Math.floor(stats.attackSpeed / 1000)}s`;

    // Update HP per kill display
    if (hpPerKillDisplay) {
        hpPerKillDisplay.textContent = `HP per Kill: ${stats.hpPerKill}`;
    }
}

function renderDealerCard() {
    const { minDamage, maxDamage } = calculateEnemyBasicDamage(
        stageData.stage,
        stageData.world
    ); //calculate damage for the current stage min and max

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
            const cooldownClass =
                ability.timer &&
                ability.cooldown &&
                ability.timer < ability.cooldown
                    ? "onCooldown"
                    : "";

            abilitiesHTML += `<div class="dCard_ability ${cooldownClass} ${typeClass}" title="${label}">
              <i data-lucide="${icon}"></i>
              ${
                  isOnCooldown
                      ? `<div class="cooldown-overlay" style="--cooldown:${cooldownRatio}"></div>`
                      : ""
              }
            </div>`;
        }
        abilitiesHTML += `</div>`;

        const iconColor = currentEnemy.iconColor || "#a04444";
        dCardPane.innerHTML = `
        <i data-lucide="${currentEnemy.icon}" class="dCard__icon" style="color:${iconColor}"></i>
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
    } else {
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

        const { color, blur } = getDealerIconStyle(stageData.stage);
        dCardPane.innerHTML = `
           <i data-lucide="skull" class="dCard__icon" style="stroke:${color}; filter: drop-shadow(0 0 ${blur}px ${color});"></i>
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
    if (!w) return;

    const target = card.cardElement || w;
    target.classList.remove("hit-animate");
    void target.offsetWidth;
    target.classList.add("hit-animate");
    target.addEventListener(
        "animationend",
        () => target.classList.remove("hit-animate"),

        { once: true }
    );
}

function showDamageFloat(card, amount) {
    const hp = card.hpDisplay;
    if (!hp) return;
    const dmg = document.createElement("div");
    dmg.classList.add("damage-float");
    dmg.textContent = `-${amount}`;
    hp.appendChild(dmg);
    // ensure the element is removed even if the animationend event doesn't fire
    dmg.addEventListener("animationend", () => dmg.remove(), { once: true });
    setTimeout(() => dmg.remove(), 1000);
}

//=========stage functions===========

// stage and world
function nextStage() {
    stageData.stage += 1;
    stageData.kills = 0;
    killsDisplay.textContent = `Kills: ${stageData.kills}`;
    nextStageChecker();
    renderStageInfo();
    respawnDealerStage();
}

function nextWorld() {
    stageData.world += 1;
    stageData.stage = 1;
    stageData.kills = 0;
    killsDisplay.textContent = `Kills: ${stageData.kills}`;
    nextStageChecker();
    renderStageInfo();
}

function nextStageChecker() {
    nextStageBtn.disabled = stageData.kills < 1;
    nextStageBtn.style.background = stageData.kills < 1 ? "grey" : "green";
}

//dealer

function spawnDealer() {
    const stage = stageData.stage;
    const world = stageData.world;
    const maxHp = calculateEnemyHp(stage, world);

    currentEnemy = new Enemy(stage, world, {
        maxHp,
        onAttack: Enemy => {
            const { minDamage, maxDamage } = calculateEnemyBasicDamage(
                stage,
                world
            );
            const damage =
                Math.floor(Math.random() * (maxDamage - minDamage + 1)) +
                minDamage;
            cDealerDamage(damage, null, Enemy.name);
        },
        onDefeat: () => {
            onDealerDefeat();
        }
    });

    // Ensure the dealer gets an initial hit off immediately
    if (typeof currentEnemy.onAttack === "function") {
        currentEnemy.onAttack(currentEnemy);
        currentEnemy.attackTimer = 0;
    }

    updateDealerLifeDisplay();
    renderEnemyAttackBar();
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
    const atk = document.querySelector(".enemyAttackBar");
    if (atk) atk.remove();
    dealerLifeDisplay.textContent = "";
}

function respawnDealerStage() {
    removeDealerLifeBar();
    if (stageData.stage % 10 === 0) {
        spawnBoss();
    } else {
        spawnDealer();
    }
}

function onDealerDefeat() {
    cardXp(stageData.stage ** 1.2 * stageData.world);
    cashOut();
    healCardsOnKill();
    stageData.kills += 1;
    killsDisplay.textContent = `Kills: ${stageData.kills}`;
    dealerDeathAnimation();
    dealerBarDeathAnimation(() => {
        nextStageChecker();
        respawnDealerStage();
    });
} // need to define xp formula

function onBossDefeat(boss) {
    cardXp(boss.xp);
    awardJokerCard();
    addLog(`${boss.name} was defeated!`);
    currentEnemy = null;

    healCardsOnKill();
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
        iconColor: template.iconColor,
        abilities,
        onAttack: boss => {
            const { minDamage, maxDamage } = calculateEnemyBasicDamage(
                stage,
                world
            );
            const damage =
                Math.floor(Math.random() * (maxDamage - minDamage + 1)) +
                minDamage;
            cDealerDamage(damage, null, boss.name);
        },
        onDefeat: () => {
            onBossDefeat(currentEnemy);
        }
    });

    // Ensure the boss gets an initial hit off immediately
    if (typeof currentEnemy.onAttack === "function") {
        currentEnemy.onAttack(currentEnemy);
        currentEnemy.attackTimer = 0;
    }

    updateDealerLifeDisplay();
    renderEnemyAttackBar();
    dealerDeathAnimation();
}

function updateDealerLifeDisplay() {
    dealerLifeDisplay.textContent = `Life: ${currentEnemy.currentHp}/${currentEnemy.maxHp}`;
    renderDealerLifeBar();
    renderDealerLifeBarFill();
}

function calculateEnemyHp(stage, world, isBoss = false) {
    const baseHp = 10 + stage + (world - 1) * 100;
    return Math.floor(baseHp * (isBoss ? 10 : Math.pow(stage, 0.5)));
}

function calculateEnemyBasicDamage(stage, world) {
    let baseDamage;

    if (stage === 10) {
        baseDamage = stage * 2;
    } else if (stage <= 10) {
        baseDamage = stage;
    } else {
        baseDamage = Math.floor(0.1 * stage * stage);
    }

    const scaledDamage = baseDamage * world ** 2;
    const maxDamage = Math.max(scaledDamage, 1);
    const minDamage = Math.floor(0.5 * maxDamage) + 1;

    return { minDamage, maxDamage };
}

function cDealerDamage(damageAmount = null, ability = null, source = "dealer") {
    // if there’s no card, nothing to do
    if (drawnCards.length === 0 || drawnCards.length === 0) {
        respawnPlayer();
        return;
    }

    const { minDamage, maxDamage } = calculateEnemyBasicDamage(
        stageData.stage,
        stageData.world
    );
    const dDamage =
        damageAmount ??
        Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;

    // target the front‐line card
    const card = drawnCards[0];

    // subtract **one** hit’s worth
    card.currentHp = Math.max(0, card.currentHp - dDamage);
    addLog(
        `${source} hit ${card.value}${card.symbol} for ${dDamage} damage!`,
        "damage"
    );

    // update its specific HP display
    card.hpDisplay.textContent = `HP: ${card.currentHp}/${card.maxHp}`;
    updateDeckDisplay();
    if (card.wrapperElement) {
        animateCardHit(card);
        showDamageFloat(card, dDamage);
    }
    // if it’s dead, remove it
    if (card.currentHp === 0) {
        // immediately remove from data so new draws don't shift the wrong card
        drawnCards.shift();

        animateCardDeath(card, () => {
            // 1) from the DOM
            card.wrapperElement?.remove();

            discardCard(card);
            updatePlayerStats(stats);
            updateDrawButton();
            updateDeckDisplay();
        });
    }
    // Optional ability logic (e.g., healing, fireball
}

function dealerDeathAnimation() {
    const dCardWrapper = document.querySelector(".dCardWrapper:last-child");
    const dCardPane = document.querySelector(".dCardPane");
    if (!dCardWrapper) return;

    dCardWrapper.classList.add("dealer-dead");
    dCardPane.classList.add("dealer-dead");

    dCardWrapper.addEventListener(
        "animationend",
        () => {
            dCardContainer.innerHTML = "";
            renderDealerCard();
        },
        { once: true }
    );
}

function dealerBarDeathAnimation(callback) {
    const bar = document.querySelector(".dealerLifeContainer");
    if (!bar) {
        if (callback) callback();
        return;
    }
    bar.classList.add("bar-dead");
    bar.addEventListener(
        "animationend",
        () => {
            removeDealerLifeBar();
            if (callback) callback();
        },
        { once: true }
    );
}

//========deck functions===========

function cardXp(xpAmount) {
    drawnCards.forEach(card => {
        if (!card) return;

        const leveled = card.gainXp(xpAmount);
        if (leveled) {
            cardPoints += 1;
            animateCardLevelUp(card);
            addLog(
                `${card.value}${card.symbol} leveled up to level ${card.currentLevel}!`,
                "level"
            );
        }
    });
    // refresh both UIs
    updateHandDisplay(); // paints hand bars & HP
    updateDeckDisplay(); // paints deck tab bars
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
        card.xpBarFill.style.width = `${(card.XpCurrent / card.XpReq) * 100}%`;
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
    xpLabel.textContent = `LV: ${card.currentLevel}`;
    xpBar.append(xpBarFill, xpLabel);

    // 4) Nest and append
    wrapper.append(cardPane, xpBar);
    handContainer.appendChild(wrapper);

    // 5) Save references for later updates
    card.wrapperElement = wrapper;
    card.cardElement = cardPane;
    card.hpDisplay = cardPane.querySelector(".card-hp");
    card.xpBar = xpBar;
    card.xpBarFill = xpBarFill;
    card.xpLabel = xpLabel;
}

function renderDiscardCard(card) {
    discardContainer.innerHTML = "";
    const img = document.createElement("img");
    img.alt = "Card Back";
    img.src = cardBackImages[card.backType] || cardBackImages["basic-red"];
    img.classList.add("card-back", card.backType);
    discardContainer.appendChild(img);
    card.discardElement = img;
}

function discardCard(card) {
    discardPile.push(card);
    renderDiscardCard(card);
}

function heartHeal() {
    if (drawnCards.length === 0) return;

    const target = drawnCards[0];
    if (target.currentHp === target.maxHp) return;

    drawnCards.forEach(card => {
        if (card.suit === "Hearts") {
            target.currentHp = Math.min(
                target.currentHp + card.currentLevel,
                target.maxHp
            );
            animateCardHeal(target);
        }
    });
    target.hpDisplay.textContent = `HP: ${target.currentHp}/${target.maxHp}`;
}

function animateCardHeal(card) {
    const w = card.wrapperElement;
    w.classList.add("heal-animate");
    w.addEventListener(
        "animationend",
        () => w.classList.remove("heal-animate"),
        { once: true }
    );
}

function animateCardLevelUp(card) {
    const w = card.wrapperElement;
    w.classList.add("levelup-animate");
    w.addEventListener(
        "animationend",
        () => w.classList.remove("levelup-animate"),
        { once: true }
    );
}

function animateCardDeath(card, callback) {
    const w = card.wrapperElement;
    if (!w) {
        callback?.();
        return;
    }
    const onEnd = () => {
        w.classList.remove("card-death");
        w.removeEventListener("animationend", onEnd);
        callback?.();
    };

    w.addEventListener("animationend", onEnd, { once: true });
    w.classList.add("card-death");

    // Fallback: ensure removal even if animation events don't fire
    setTimeout(onEnd, 600);
}

function healCardsOnKill() {
    drawnCards.forEach(card => {
        if (!card) return;
        card.healFromKill();
    });
    updateHandDisplay();
    updateDeckDisplay();
}

function renderJokers() {
    if (!jokerContainers.length) return;

    jokerContainers.forEach(container => {
        container.innerHTML = "";
        unlockedJokers.forEach(joker => {
            const wrapper = document.createElement("div");
            wrapper.classList.add("card-wrapper", "joker-wrapper");

            const card = document.createElement("div");
            card.classList.add("card");

            const img = document.createElement("img");
            img.classList.add("joker-image");
            img.src = joker.image;
            img.alt = joker.name;

            card.appendChild(img);
            wrapper.appendChild(card);
            container.appendChild(wrapper);
        });
    });
}

function openJokerDetails(joker) {
    // Legacy overlay display no longer used
}

function awardJokerCard() {
    const template = AllJokerTemplates[stageData.world - 1];
    if (!template) return;
    if (unlockedJokers.find(j => j.id === template.id)) return;
    unlockedJokers.push(template);
    addLog(`${template.name} unlocked!`, "info");
    renderJokers();
}

//=========player functions===========

function spawnPlayer() {
    for (let i = 0; i < stats.cardSlots; i++) {
        drawCard();
    }
}

function respawnPlayer() {
    deck = pDeck.filter(c => c.currentHp > 0);
    handContainer.innerHTML = "";
    discardContainer.innerHTML = "";
    discardPile = [];
    stats.points = 0;
    pointsDisplay.textContent = stats.points;
    spawnPlayer();
    stageData.stage = 1;
}

function redrawHand() {
    deck.push(...drawnCards);
    drawnCards = [];
    handContainer.innerHTML = "";
    shuffleArray(deck);
    for (let i = 0; i < stats.cardSlots && deck.length > 0; i++) {
        drawCard();
    }
    updateDrawButton();
    updateDeckDisplay();
    updatePlayerStats(stats);
}

function attack() {
    if (!currentEnemy) return;

    currentEnemy.takeDamage(stats.pDamage);

    stageData.dealerLifeCurrent = currentEnemy.currentHp;

    if (currentEnemy.isDefeated()) {
        currentEnemy.onDefeat?.();
    } else {
        dealerLifeDisplay.textContent = `Life: ${Math.floor(
            currentEnemy.currentHp
        )}/${currentEnemy.maxHp}`;
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
    cash = Math.floor(
        cash +
            stats.points *
                (1 + Math.pow(stageData.stage, 0.5)) *
                stats.cashMulti
    );
    cashDisplay.textContent = `Cash: $${cash}`;
    updateUpgradeButtons();
    return cash;
}

function updatePlayerStats() {
    // Reset base stats
    stats.pDamage = 0;
    stats.damageMultiplier = stats.upgradeDamageMultiplier;
    stats.pRegen = 0;
    stats.cashMulti = 1;
    stats.pLifeMax = 100;
    stats.points = 0;

    for (const card of drawnCards) {
        if (!card) continue;

        if (card.suit === "Spades")
            stats.damageMultiplier += 0.1 * card.currentLevel;
        if (card.suit === "Hearts") stats.pRegen += card.currentLevel;
        if (card.suit === "Diamonds")
            stats.cashMulti += Math.floor(Math.pow(card.currentLevel, 0.5));
        if (card.suit === "Clubs")
            stats.pLifeMax = stats.pLifeMax * 1.1 + card.currentLevel / 100;

        card.damage = card.baseDamage * card.currentLevel;
        stats.pDamage += card.damage;
        stats.points += card.value;
    }

    stats.pDamage *= stats.damageMultiplier;
    renderPlayerStats(stats);
}

//=========save/load functions===========
function saveGame() {
    if (typeof localStorage === "undefined") return;

    const deckData = pDeck.map(card => ({
        suit: card.suit,
        value: card.value,
        backType: card.backType,
        currentLevel: card.currentLevel,
        XpCurrent: card.XpCurrent,
        XpReq: card.XpReq,
        baseDamage: card.baseDamage,
        damage: card.damage,
        maxHp: card.maxHp,
        currentHp: card.currentHp,
        hpPerKill: card.hpPerKill,
        job: card.job,
        traits: card.traits
    }));

    const upgradeLevels = Object.fromEntries(
        Object.entries(upgrades).map(([k, u]) => [k, u.level])
    );

    const state = {
        stats,
        stageData,
        cash,
        cardPoints,
        deck: deckData,
        upgrades: upgradeLevels,
        unlockedJokers: unlockedJokers.map(j => j.id)
    };

    try {
        localStorage.setItem("gameSave", JSON.stringify(state));
        addLog("Game saved!", "info");
    } catch (e) {
        console.error("Save failed", e);
    }
}

function loadGame() {
    if (typeof localStorage === "undefined") return;
    const json = localStorage.getItem("gameSave");
    if (!json) return;

    try {
        const state = JSON.parse(json);
        cash = state.cash || 0;
        cardPoints = state.cardPoints || 0;
        Object.assign(stats, state.stats || {});
        Object.assign(stageData, state.stageData || {});

        if (state.upgrades) {
            Object.entries(state.upgrades).forEach(([k, lvl]) => {
                if (upgrades[k]) upgrades[k].level = lvl;
            });
        }

        if (Array.isArray(state.deck)) {
            pDeck = state.deck.map(data => {
                const c = new Card(data.suit, data.value, data.backType);
                Object.assign(c, {
                    currentLevel: data.currentLevel,
                    XpCurrent: data.XpCurrent,
                    XpReq: data.XpReq,
                    baseDamage: data.baseDamage,
                    damage: data.damage,
                    maxHp: data.maxHp,
                    currentHp: data.currentHp,
                    hpPerKill: data.hpPerKill,
                    job: data.job,
                    traits: data.traits
                });
                return c;
            });
            deck = [...pDeck];
        }

        unlockedJokers.length = 0;
        if (Array.isArray(state.unlockedJokers)) {
            state.unlockedJokers.forEach(id => {
                const j = AllJokerTemplates.find(t => t.id === id);
                if (j) unlockedJokers.push(j);
            });
        }

        Object.values(upgrades).forEach(u => u.effect(stats));

        cashDisplay.textContent = `Cash: $${cash}`;
        cardPointsDisplay.textContent = `Card Points: ${cardPoints}`;

        renderUpgrades();
        renderJokers();
        updateUpgradeButtons();
        renderPlayerStats(stats);
        renderStageInfo();

        addLog("Game loaded!", "info");
    } catch (e) {
        console.error("Load failed", e);
    }
}

//=========game start===========

// Spawn the player's cards before the enemy so the initial
// first strike doesn't trigger a full respawn
spawnPlayer();
spawnDealer();
renderStageInfo();
nextStageChecker();

btn.addEventListener("click", drawCard);
redrawBtn.addEventListener("click", redrawHand);
nextStageBtn.addEventListener("click", nextStage);

/*function retry() {
  points =0
  pointsDisplay.textContent = points;
  suite = [1,2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  drawnCards = []
  handContainer.innerHTML = ""
}*/

//=========game loop===========

/*setInterval(updateUi(), 1000);*/

setInterval(() => {
    //healerinterval
    heartHeal();
}, 20000);

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

        if (enemyAttackFill) {
            const eratio = Math.min(
                1,
                currentEnemy.attackTimer / currentEnemy.attackInterval
            );
            enemyAttackFill.style.width = `${eratio * 100}%`;
        }

        // Update cooldown overlays
        const overlays = document.querySelectorAll(".cooldown-overlay");
        overlays.forEach((overlay, i) => {
            const ability = currentEnemy.abilities[i];

            // Defensive check: ensure ability has timer + maxTimer
            if (
                ability &&
                typeof ability.timer === "number" &&
                typeof ability.maxTimer === "number"
            ) {
                const ratio = Math.min(
                    1,
                    Math.max(0, ability.timer / ability.maxTimer)
                );
                overlay.style.setProperty("--cooldown", ratio);
            }
        });
    }

    updateDrawButton();
    updatePlayerStats(stats);
    playerAttackTimer += deltaTime;
    if (playerAttackFill) {
        const pratio = Math.min(1, playerAttackTimer / stats.attackSpeed);
        playerAttackFill.style.width = `${pratio * 100}%`;
    }
    if (playerAttackTimer >= stats.attackSpeed) {
        attack();
        playerAttackTimer = 0;
        if (playerAttackFill) playerAttackFill.style.width = "0%";
    }
    requestAnimationFrame(gameLoop);
}

//devtools

function toggleDebug() {
    const panel = document.getElementById("debugPanel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
}

document.addEventListener("keydown", e => {
    if (e.shiftKey && e.key === "D") {
        toggleDebug();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("debugToggle");
    if (btn) btn.addEventListener("click", toggleDebug);
});

window.devTools = {
    spawnBoss,
    spawnDealer,
    cDealerDamage,
    killEnemy: () => {
        if (!currentEnemy) return;
        currentEnemy.takeDamage(currentEnemy.maxHp);
        if (currentEnemy instanceof Boss) {
            currentEnemy.onDefeat?.();
        }
    },
    killBoss: () => {
        if (currentEnemy instanceof Boss) {
            currentEnemy.takeDamage(currentEnemy.maxHp);
            currentEnemy.onDefeat?.();
        }
    },
    logEnemy: () => console.log(currentEnemy),
    advanceStage: () => nextStage(),

    giveCash: () => {
        const amount =
            parseInt(document.getElementById("debugCash").value) || 0;
        cash += amount;
        cashDisplay.textContent = `Cash: $${cash}`;
        updateUpgradeButtons();
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
        const mult = parseFloat(
            document.getElementById("debugDamageMult").value
        );
        if (!isNaN(mult)) {
            stats.damageMultiplier = mult;
            renderPlayerStats(stats);
        }
    },
    save: saveGame,
    load: loadGame
};
