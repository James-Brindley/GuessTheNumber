const cols = 15;
const rows = 4;

const BASE_PLAYER_ATTACK_COUNT = 10;
const BASE_ENEMY_ATTACK_COUNT = 1;

let playerAttackCount = BASE_PLAYER_ATTACK_COUNT;
let enemyAttackCount = BASE_ENEMY_ATTACK_COUNT;

const totalCells = cols * rows;

const BASE_PLAYER_HEALTH_COUNT = 100;
const BASE_ENEMY_HEALTH_COUNT = 100;

let playerHealth = BASE_PLAYER_HEALTH_COUNT;
let enemyHealth = BASE_ENEMY_HEALTH_COUNT;

let playerMaxHealth = BASE_PLAYER_HEALTH_COUNT;
let enemyMaxHealth = BASE_ENEMY_HEALTH_COUNT;

let enemyBonusHealth = 0;
let enemyBonusDamage = 0;

let playerCombo = 1.0;
let enemyCombo = 1.0;
const MAX_COMBO = 2.0; // optional cap
const COMBO_STEP = 0.2;

let totalDamageDealt = 0;
let totalDamageTaken = 0;
let totalHealingDone = 0;
let revivesUsed = 0;

let level = 1;
let gameOver = false;
let playerItems = [];

let playerGold = 0;
const GOLD_TILES_PER_ROUND = 5;     // how many gold tiles per round
const GOLD_PER_TILE = 5;            // how much each gold tile gives

function updateGoldEverywhere() {
  // top HUD
  updateGoldDisplay();

  // if shop not created yet, bail safely
  if (typeof currentShopPopup === 'undefined' || !currentShopPopup) return;

  // shop (if open)
  const shopGoldEl = currentShopPopup.querySelector('#shop-gold');
  if (shopGoldEl) shopGoldEl.textContent = playerGold;

  // enable/disable buttons based on current gold & purchased state
  currentShopPopup.querySelectorAll('button[data-cost]').forEach(btn => {
    const cost = Number(btn.dataset.cost);
    const purchased = btn.dataset.purchased === '1';
    btn.disabled = purchased || playerGold < cost;
  });
}

let currentShopPopup = null;

// === BOSS SETTINGS ===
let isBossLevel = false;

// Optional: Adjust these as you balance later
const BOSS_MULTIPLIER = {
  health: 1.5,
  damage: 2,
};

const bossSprites = {
  idle: [
    'assets/bossIdle1.png',
    'assets/bossIdle2.png',
    'assets/bossIdle3.png'
  ],
  attack: [
    'assets/bossAttack1.png',
    'assets/bossAttack2.png',
    'assets/bossAttack3.png'
  ],
  death: [
    'assets/bossDeath1.png',
    'assets/bossDeath2.png',
    'assets/bossDeath3.png'
  ]
};


// === UI ELEMENTS ===
const container = document.getElementById('grid-container');
const mainMenu = document.getElementById('main-menu');
const startButton = document.getElementById('start-game-btn');

const levelDisplay = document.createElement('div');
levelDisplay.id = 'level-display';
levelDisplay.textContent = `Level ${level}`;
document.body.appendChild(levelDisplay);

function updateHealth() {
  const playerFill = document.querySelector('.player-health-fill');
  const enemyFill = document.querySelector('.enemy-health-fill');
  const playerTip = document.querySelector('.player-tooltip');
  const enemyTip = document.querySelector('.enemy-tooltip');

  const playerPercent = Math.max(0, (playerHealth / playerMaxHealth) * 100);
  const enemyPercent = Math.max(0, (enemyHealth / enemyMaxHealth) * 100);

  playerFill.style.width = playerPercent + '%';
  enemyFill.style.width = enemyPercent + '%';

  playerTip.textContent = `${playerHealth} / ${playerMaxHealth}`;
  enemyTip.textContent = `${enemyHealth} / ${enemyMaxHealth}`;
}

function updateLevel() {
  updateGoldEverywhere();
  levelDisplay.textContent = `Level ${level}`;
}

const goldDisplay = document.createElement('div');
goldDisplay.id = 'gold-display';
goldDisplay.textContent = `💰 ${playerGold}`;
document.body.appendChild(goldDisplay);

function updateGoldDisplay() {
  goldDisplay.textContent = `💰 ${playerGold}`;
}

// === DYNAMIC HEALTH & DAMAGE CALCULATIONS ===
function getPlayerMaxHealth() {
  let bonus = 0;

  playerItems.forEach(item => {
    if (item.bonusHP) bonus += item.bonusHP;
  });

  return BASE_PLAYER_HEALTH_COUNT + bonus;
}

function getEnemyMaxHealth() {
  let base = BASE_ENEMY_HEALTH_COUNT;
  let bonus = 0;
  playerItems.forEach(item => {
    if (item.bonusEnemyHP) bonus += item.bonusEnemyHP;
  });
  return base + bonus;
}

function getPlayerStats() {
  let stats = {
    bonusDamage: 0,
    damageReduction: 0,
    healOnAttack: 0,
    ignoreDamageChance: 0,
    regenPerRound: 10,
    comboBoost: 0,     // 🆕 new stat for combo gain
    burnDamage: 0,     // 🆕 new stat for burn/poison effect
  };

  playerItems.forEach(item => {
    if (item.bonusDamage) stats.bonusDamage += item.bonusDamage;
    if (item.damageReduction) stats.damageReduction += item.damageReduction;
    if (item.healOnAttack) stats.healOnAttack += item.healOnAttack;
    if (item.ignoreDamageChance) stats.ignoreDamageChance += item.ignoreDamageChance;
    if (item.regenPerRound) stats.regenPerRound += item.regenPerRound;
    if (item.comboBoost) stats.comboBoost += item.comboBoost;
    if (item.burnDamage) stats.burnDamage += item.burnDamage;
  });

  return stats;
}

function applyBurnEffect() {
  const stats = getPlayerStats();
  if (stats.burnDamage > 0 && enemyHealth > 0) {
    const burn = Math.round(stats.burnDamage);
    enemyHealth = Math.max(0, enemyHealth - burn);
    totalDamageDealt += burn;
    showHitPopup(false, `-${burn}`, false);

    const enemyEl = document.querySelector('.enemy-container');
    enemyEl.classList.add('burn-flash');
    setTimeout(() => enemyEl.classList.remove('burn-flash'), 150);

    updateHealth();
    return enemyHealth <= 0;
  }
  return false;
}



// === RARITY SYSTEM ===
const RARITY = {
  COMMON: { color: "#4CAF50", chance: 0.55 },
  RARE: { color: "#2196F3", chance: 0.25 },
  EPIC: { color: "#9C27B0", chance: 0.15 },
  LEGENDARY: { color: "#FFD700", chance: 0.05 },
};

const RARITY_COST = {
  COMMON: 10,
  RARE: 25,
  EPIC: 50,
  LEGENDARY: 100,
};


// === ALL ITEMS (fully compatible with new stat system) ===
const allItems = [
  // COMMON
  { id: "smallSword", name: "Small Sword", description: "Gain +1 Attack Square", rarity: RARITY.COMMON,
    bonusAttackCount: 1, applyEffect() { playerAttackCount += 1; } },
  { id: "leatherShield", name: "Leather Shield", description: "+20 Max HP", rarity: RARITY.COMMON,
    bonusHP: 20, applyEffect() {} },
  { id: "vitalLeaf", name: "Vital Leaf", description: "Heal +2 HP Per Attack Dealt", rarity: RARITY.COMMON,
    healOnAttack: 2, applyEffect() {} },
  { id: "tinyRing", name: "Tiny Lucky Ring", description: "5% Chance To Ignore Damage", rarity: RARITY.COMMON,
    ignoreDamageChance: 0.05, applyEffect() {} },
  { id: "scoutGem", name: "Scout Gem", description: "1 Safe Number Between 35–40", rarity: RARITY.COMMON,
    range: [35, 40], applyEffect() {} },
  { id: "steadyBoots", name: "Steady Boots", description: "Take -3 Damage", rarity: RARITY.COMMON,
    damageReduction: 3, applyEffect() {} },
  { id: "minorFocus", name: "Minor Focus", description: "Deal +5 damage", rarity: RARITY.COMMON,
    bonusDamage: 5, applyEffect() {} },
  { id: "lightArmor", name: "Light Armor", description: "Heal +5 HP Per Round", rarity: RARITY.COMMON,
    regenPerRound: 5, applyEffect() {} },
  { id: "comboCharm", name: "Combo Charm", description: "Increases combo gain by +0.1", rarity: RARITY.COMMON,
    comboBoost: 0.1, applyEffect() {} },
  { id: "crudePotion", name: "Crude Potion", description: "Heal +40 HP", rarity: RARITY.COMMON,
    isConsumable: true, applyEffect() {
      playerHealth = Math.min(playerHealth + 40, getPlayerMaxHealth());
      updateHealth();
    }},
  { id: "swiftCharm", name: "Swift Charm", description: "Gain +1 Extra Attack Square Every Even Level", rarity: RARITY.COMMON,
    bonusEvenLevelAttack: 1, applyEffect() {} },

  // RARE
  { id: "ironSword", name: "Iron Sword", description: "Gain +2 Attack Squares", rarity: RARITY.RARE,
    bonusAttackCount: 2, applyEffect() { playerAttackCount += 2; } },
  { id: "ironShield", name: "Iron Shield", description: "+30 Max HP", rarity: RARITY.RARE,
    bonusHP: 30, applyEffect() {} },
  { id: "luckyRing", name: "Lucky Ring", description: "10% Chance To Ignore Damage", rarity: RARITY.RARE,
    ignoreDamageChance: 0.1, applyEffect() {} },
  { id: "bloodCharm", name: "Blood Charm", description: "Heal +5 HP Per Attack Dealt", rarity: RARITY.RARE,
    healOnAttack: 5, applyEffect() {} },
  { id: "radarGem", name: "Radar Gem", description: "1 Safe Number Between 20–25", rarity: RARITY.RARE,
    range: [20, 25], applyEffect() {} },
  { id: "strongBoots", name: "Strong Boots", description: "Take -5 Damage", rarity: RARITY.RARE,
    damageReduction: 5, applyEffect() {} },
  { id: "bronzeArmor", name: "Bronze Armor", description: "Heal +10 HP Per Round", rarity: RARITY.RARE,
    regenPerRound: 10, applyEffect() {} },
  { id: "flamePendant", name: "Flame Pendant", description: "Inflicts 1 burn damage every tile clicked", rarity: RARITY.RARE,
    burnDamage: 1, applyEffect() {} },
  { id: "lifeAmulet", name: "Life Amulet", description: "Revive Once With 25% HP", rarity: RARITY.RARE,
    reviveAtPercent: 0.25, applyEffect() {} },

  // EPIC
  { id: "crystalSword", name: "Crystal Sword", description: "Gain +5 Attack Squares", rarity: RARITY.EPIC,
    bonusAttackCount: 5, applyEffect() { playerAttackCount += 5; } },
  { id: "holyCharm", name: "Holy Charm", description: "Heal +8 HP Per Attack Dealt", rarity: RARITY.EPIC,
    healOnAttack: 8, applyEffect() {} },
  { id: "divineRadar", name: "Divine Radar", description: "2 Safe Numbers Between 10-15", rarity: RARITY.EPIC,
    range: [10, 15], safeNumbers: 2, applyEffect() {} },
  { id: "adamantArmor", name: "Adamant Armor", description: "Take -10 Damage", rarity: RARITY.EPIC,
    damageReduction: 10, applyEffect() {} },
  { id: "focusTalisman", name: "Focus Talisman", description: "Deal +10 Damage", rarity: RARITY.EPIC,
    bonusDamage: 10, applyEffect() {} },
  { id: "fireBrand", name: "Firebrand", description: "Combo gain +0.2 and 2 burn damage per tile", rarity: RARITY.EPIC,
    comboBoost: 0.2, burnDamage: 2, applyEffect() {} },

  // LEGENDARY
  { id: "phoenixHeart", name: "Phoenix Heart", description: "Revive Once With 100% HP", rarity: RARITY.LEGENDARY,
    reviveAtPercent: 1, applyEffect() {} },
  { id: "infernoSoul", name: "Inferno Soul", description: "Combo gain +0.3 and 3 burn damage per tile", rarity: RARITY.LEGENDARY,
    comboBoost: 0.3, burnDamage: 3, applyEffect() {} },
  { id: "godblade", name: "Godblade", description: "Gain +5 Attack Square, Deal +10 Damage", rarity: RARITY.LEGENDARY,
    bonusAttackCount: 5, bonusDamage: 10, applyEffect() { playerAttackCount += 5; } },
  { id: "omnigem", name: "Omni Gem", description: "5 Safe Numbers Between 1–10", rarity: RARITY.LEGENDARY,
    range: [1, 10], safeNumbers: 5, applyEffect() {} },
  { id: "heavySword", name: "Heavy Sword", description: "Combo gain +0.5", rarity: RARITY.LEGENDARY,
    comboBoost: 0.5, applyEffect() {} },
  { id: "emberCore", name: "Ember Core", description: "5 burn damage per tile", rarity: RARITY.LEGENDARY,
      burnDamage: 5, applyEffect() {} },
];


// === RANDOM NUMBERS ===
function getRandomUniqueNumbers(count, max, exclude = []) {
  const numbers = new Set();
  while (numbers.size < count) {
    const randomNum = Math.floor(Math.random() * max) + 1;
    if (!exclude.includes(randomNum)) numbers.add(randomNum);
  }
  return Array.from(numbers);
}

let playerAttackNumbers = [];
let enemyAttackNumbers = [];

const hero = createCharacter(
  'hero',
  ['assets/ready_1.png', 'assets/ready_2.png', 'assets/ready_3.png'],
  ['assets/attack_2.png', 'assets/attack_4.png', 'assets/attack_6.png'],
  ['assets/death_1.png', 'assets/death_2.png', 'assets/death_3.png'],
  '.hero-container'
);

const enemy = createCharacter(
  'enemy',
  ['assets/eReady_1.png', 'assets/eReady_2.png', 'assets/eReady_3.png'],
  ['assets/eAttack_2.png', 'assets/eAttack_4.png', 'assets/eAttack_6.png'],
  ['assets/eDeath_1.png', 'assets/eDeath_2.png', 'assets/eDeath_3.png'],
  '.enemy-container'
);

updateHealth();
updateLevel();

function applyPassiveItemEffectsOnAttack(isPlayerAttack) {
  const stats = getPlayerStats();

  if (isPlayerAttack) {
    // ✅ Base player damage and combo multiplier
    let totalDamage = (20 + (stats.bonusDamage || 0)) * playerCombo;
    totalDamage = Math.round(totalDamage); // round to whole number

    enemyHealth = Math.max(0, enemyHealth - totalDamage);
    totalDamageDealt += totalDamage;

    // ✅ Heal if player has healing effects
    if (stats.healOnAttack > 0) {
      const healAmount = Math.round(stats.healOnAttack);
      playerHealth = Math.min(playerHealth + healAmount, getPlayerMaxHealth());
      showHitPopup(true, `+${healAmount}`, true);
      totalHealingDone += healAmount;
    }

    // ✅ Show hit popup for damage dealt
    showHitPopup(false, `-${totalDamage}`);

    // ✅ Show combo popup *only if boosted*
    if (playerCombo > 1.0) showComboPopup(true);

    // ✅ Increase combo
    playerCombo = Math.min(playerCombo + COMBO_STEP + (stats.comboBoost || 0), MAX_COMBO);
    enemyCombo = 1.0;

    updateHealth();


  } else {
    // ✅ Enemy attack phase
    let baseEnemyDamage = (10 + enemyBonusDamage) * (isBossLevel ? BOSS_MULTIPLIER.damage : 1);
    let totalDamage = baseEnemyDamage * enemyCombo;
    totalDamage = Math.round(totalDamage);
    totalDamage -= Math.round(stats.damageReduction || 0);
    totalDamageTaken += totalDamage;
    if (totalDamage < 0) totalDamage = 0;

    // ✅ Check ignore chance (MISS)
    if (Math.random() < (stats.ignoreDamageChance || 0)) {
      showHitPopup(true, "MISS");
      updateHealth();
      return;
    }

    playerHealth = Math.max(0, playerHealth - totalDamage);
    showHitPopup(true, `-${totalDamage}`);

    if (enemyCombo > 1.0) showComboPopup(false);

    enemyCombo = Math.min(enemyCombo + COMBO_STEP, MAX_COMBO);
    playerCombo = 1.0;

    updateHealth();
  }
}

// === BUILD GRID ===
function buildGrid() {
  // === Auto-adjust grid size based on attack numbers ===
  let currentCols = cols;
  let currentRows = rows;
  let totalCells = currentCols * currentRows;
  const requiredCells = playerAttackCount + enemyAttackCount + 5; // buffer

  // 🧮 Expand grid dynamically:
  // - +1 column until 3 added
  // - then +1 row, repeat
  let addedCols = 0;
  while (totalCells < requiredCells) {
    currentCols++;
    addedCols++;
    if (addedCols >= 3) {
      currentRows++;
      addedCols = 0;
    }
    totalCells = currentCols * currentRows;
  }

  // === Build the grid ===
  container.innerHTML = '';
  // Animate when grid expands
  container.classList.remove('grid-grow');
  void container.offsetWidth; // force reflow for re-triggering animation
  container.style.gridTemplateColumns = `repeat(${currentCols}, 1fr)`;
  container.classList.add('grid-grow');


  // ✅ Recalculate attack numbers based on new total cell count
  playerAttackNumbers = getRandomUniqueNumbers(playerAttackCount, totalCells);
  enemyAttackNumbers = getRandomUniqueNumbers(enemyAttackCount, totalCells, playerAttackNumbers);

  // 🪙 Pick gold tiles from cells not used by either side
  const used = new Set([...playerAttackNumbers, ...enemyAttackNumbers]);
  const pool = [];
  for (let i = 1; i <= totalCells; i++) {
    if (!used.has(i)) pool.push(i);
  }
  const goldCount = Math.min(GOLD_TILES_PER_ROUND, pool.length);
  const goldNumbers = [];
  while (goldNumbers.length < goldCount) {
    const i = Math.floor(Math.random() * pool.length);
    const n = pool.splice(i, 1)[0];
    goldNumbers.push(n);
  }


  let number = 1;
  for (let r = 0; r < currentRows; r++) {
    for (let c = 0; c < currentCols; c++) {
      if (number > totalCells) break;

      const cell = document.createElement('div');
      cell.className = 'grid-item';
      cell.textContent = number++;

      cell.addEventListener('click', () => {
        if (cell.classList.contains('clicked') || gameOver || isPaused) return;
      
        cell.classList.add('clicked');
        const cellNumber = parseInt(cell.textContent);
        cell.classList.remove('safe-range');
      
        if (enemyAttackNumbers.includes(cellNumber)) {
          cell.classList.add('eAttack');
          enemy.playAttack();
          applyPassiveItemEffectsOnAttack(false);
        
        } else if (playerAttackNumbers.includes(cellNumber)) {
          cell.classList.add('attack');
          hero.playAttack();
          applyPassiveItemEffectsOnAttack(true);
        
        } else if (goldNumbers.includes(cellNumber)) {
          // 🪙 Gold tile: safe, no combo reset
          cell.classList.add('gold');
          playerGold += GOLD_PER_TILE;
          updateGoldEverywhere();
          showHitPopup(true, `+${GOLD_PER_TILE}🪙`, true); // reuse green popup
        
        } else {
          // Plain grey tile: safe; no gold, and we keep your existing combo reset behavior
          cell.classList.add('active');
          playerCombo = 1.0;
          enemyCombo = 1.0;
        }        
      
        // Burn triggers on every click
        applyBurnEffect();
      
        // ✅ Resolve deaths exactly once (covers ties, revive, wins, losses)
        resolveDeaths();
      });      

      container.appendChild(cell);
    }
  }

  // === Highlight safe number ranges ===
  const gridItems = container.querySelectorAll('.grid-item');

  playerItems
    .filter(i => i.range)
    .forEach(i => {
      const [min, max] = i.range;

      gridItems.forEach(cell => {
        const num = parseInt(cell.textContent);
        if (num >= min && num <= max) {
          cell.classList.add('safe-range');
        }
      });

      const rangeNums = Array.from({ length: max - min + 1 }, (_, x) => min + x);
      const available = rangeNums.filter(
        n => !playerAttackNumbers.includes(n) && !enemyAttackNumbers.includes(n)
      );
      const count = i.safeNumbers || 1;

      if (available.length > 0) {
        const chosen = [];
        while (chosen.length < Math.min(count, available.length)) {
          const randomIndex = Math.floor(Math.random() * available.length);
          const num = available[randomIndex];
          if (!chosen.includes(num)) chosen.push(num);
        }
        chosen.forEach(num => playerAttackNumbers.push(num));
      }
    });
}

function createCharacter(id, idleFrames, attackFrames, deathFrames, containerSelector, speed = 250) {
  const el = document.getElementById(id);
  const container = document.querySelector(containerSelector);
  let frameIndex = 0;
  let animInterval = null;

  const character = {
    idleFrames,
    attackFrames,
    deathFrames,
    currentFrames: idleFrames,

    playAnimation(loop = true) {
      clearInterval(animInterval);
      frameIndex = 0;
      const frames = character.currentFrames;
      animInterval = setInterval(() => {
        frameIndex++;
        if (!loop && frameIndex >= frames.length - 1) {
          frameIndex = frames.length - 1;
          el.src = frames[frameIndex];
          clearInterval(animInterval);
          return;
        }
        frameIndex = frameIndex % frames.length;
        el.src = frames[frameIndex];
      }, speed);
    },

    playIdle() {
      character.currentFrames = character.idleFrames;
      character.playAnimation(true);
    },
    playAttack() {
      character.currentFrames = character.attackFrames;
      character.playAnimation(true);
      container.classList.add('attacking');
      setTimeout(() => {
        container.classList.remove('attacking');
        character.playIdle();
      }, 600);
    },
    playDeath() {
      character.currentFrames = character.deathFrames;
      character.playAnimation(false);
    }
  };

  character.playIdle();
  return character;
}

function resolveDeaths() {
  if (gameOver) return true;

  // Attempt revive once if needed
  if (playerHealth <= 0) {
    const revived = tryRevive();
    if (revived) revivesUsed++;
  }

  updateHealth();

  // Tie rule: player loses ties (after possible revive)
  if (playerHealth <= 0 && enemyHealth <= 0) {
    playerHealth = 0;
    hero.playDeath();
    showEndScreen(false);
    return true;
  }
  if (playerHealth <= 0) {
    playerHealth = 0;
    hero.playDeath();
    showEndScreen(false);
    return true;
  }
  if (enemyHealth <= 0) {
    enemyHealth = 0;
    enemy.playDeath();
    showEndScreen(true);
    return true;
  }
  return false;
}


function tryRevive() {
  const reviveItemIndex = playerItems.findIndex(i => i.reviveAtPercent);

  if (reviveItemIndex === -1) return false; // no revive item found

  const reviveItem = playerItems[reviveItemIndex];
  const revivePercent = reviveItem.reviveAtPercent;

  // Revive player
  playerHealth = Math.floor(getPlayerMaxHealth() * revivePercent);
  updateHealth();

  // Remove the used item (one-time use)
  playerItems.splice(reviveItemIndex, 1);

  // Optional: small animation flash or popup
  const revivePopup = document.createElement("div");
  revivePopup.className = "revive-popup";
  revivePopup.textContent = `${reviveItem.name} activated!`;
  document.body.appendChild(revivePopup);
  setTimeout(() => revivePopup.remove(), 1500);

  return true;
}

// === GAME END CHECK ===
function checkGameOver() {
  if (gameOver) return;

  if (playerHealth <= 0) {
    // Try revive first
    if (tryRevive()) {
      revivesUsed++;
      return;
    }
    playerHealth = 0;
    updateHealth();
    hero.playDeath();
    showEndScreen(false);
  } else if (enemyHealth <= 0) {
    enemyHealth = 0;
    updateHealth();
    enemy.playDeath();
    showEndScreen(true);
  }
}


function getDynamicRarityChances(level) {
  // Linear interpolation between base and max values
  const progress = Math.min(level / 50, 1);

  return {
    COMMON: 0.55 - 0.20 * progress,    // 55% → 35%
    RARE: 0.25 + 0.10 * progress,      // 25% → 35%
    EPIC: 0.15 + 0.05 * progress,      // 15% → 20%
    LEGENDARY: 0.05 + 0.05 * progress, // 5% → 10%
  };
}


function showShop() {
  const popup = document.createElement('div');
  popup.className = 'end-screen';
  currentShopPopup = popup; // set global ref

  // Weighted pool by rarity
  const chances = getDynamicRarityChances(level);
  const weightedPool = allItems.flatMap(item => {
    let rarityChance = 0.01;
    if (item.rarity === RARITY.COMMON) rarityChance = chances.COMMON;
    else if (item.rarity === RARITY.RARE) rarityChance = chances.RARE;
    else if (item.rarity === RARITY.EPIC) rarityChance = chances.EPIC;
    else if (item.rarity === RARITY.LEGENDARY) rarityChance = chances.LEGENDARY;
    return Array(Math.floor(rarityChance * 100)).fill(item);
  });

  // pick 5
  const available = weightedPool.filter(item => !playerItems.some(pi => pi.id === item.id));
  const shopChoices = [];
  const count = Math.min(5, available.length);
  const usedIdx = new Set();
  while (usedIdx.size < count && available.length > 0) {
    usedIdx.add(Math.floor(Math.random() * available.length));
  }
  usedIdx.forEach(i => shopChoices.push(available[i]));

  popup.innerHTML = `
    <div class="end-screen-content">
      <h1>Item Shop</h1>
      <p>You have <strong style="color:gold;">💰 <span id="shop-gold">${playerGold}</span></strong></p>
      <div id="shop-items" style="display:flex;flex-direction:column;gap:20px;align-items:center;"></div>
      <br>
      <button id="continue-btn">Continue</button>
    </div>
  `;
  document.body.appendChild(popup);

  const itemContainer = popup.querySelector('#shop-items');
  const continueBtn = popup.querySelector('#continue-btn');

  if (shopChoices.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = "No items available.";
    itemContainer.appendChild(msg);
  } else {
    shopChoices.forEach(item => {
      // price by rarity
      const rarityKey = Object.keys(RARITY).find(k => RARITY[k] === item.rarity);
      const cost = (rarityKey && RARITY_COST[rarityKey]) || 10;

      const btn = document.createElement('button');
      btn.textContent = `${item.name} — ${item.description}  (Cost: ${cost}💰)`;
      btn.style.fontSize = '28px';
      btn.style.padding = '20px 40px';
      btn.style.border = `4px solid ${item.rarity.color}`;
      btn.style.borderRadius = '15px';
      btn.style.background = 'rgba(0,0,0,0.6)';
      btn.style.color = item.rarity.color;
      btn.style.textShadow = '2px 2px 0 black';

      // mark metadata for live enabling/disabling
      btn.dataset.cost = String(cost);
      btn.dataset.purchased = '0';

      btn.addEventListener('click', () => {
        const price = Number(btn.dataset.cost);
        if (btn.dataset.purchased === '1') return;        // already bought
        if (playerGold < price) return;                   // can't afford

        // buy
        playerGold -= price;
        playerItems.push(item);
        item.applyEffect?.();

        // reflect UI
        btn.dataset.purchased = '1';
        btn.textContent = `${item.name} — Purchased`;
        updateGoldEverywhere(); // will also disable/enable other buttons
      });

      itemContainer.appendChild(btn);
    });
  }

  // Close & go next level
  continueBtn.addEventListener('click', () => {
    popup.remove();
    currentShopPopup = null;
    nextLevel();
  });

  // initial sync (sets correct disabled state)
  updateGoldEverywhere();
}



// === END SCREEN ===
function showEndScreen(playerWon) {
  if (gameOver) return;
  gameOver = true;

  const popup = document.createElement('div');
  popup.className = 'end-screen';

  if (!playerWon) {

    popup.innerHTML = `
      <div class="end-screen-content">
        <h1>Game Over</h1>
        <p>You reached <strong>Level ${level}</strong></p>
        <h2 style="margin-top:40px;">🏹 Run Summary</h2>
        <p>
          ❤️ Max Health: ${getPlayerMaxHealth()}<br>
          ⚔️ Attack Squares: ${playerAttackCount}<br>
          💥 Total Damage Dealt: ${totalDamageDealt}<br>
          💢 Total Damage Taken: ${totalDamageTaken}<br>
          🌀 Combo Gain: +${(getPlayerStats().comboBoost || 0).toFixed(1)} / hit<br>
          💚 Total Healing Done: ${totalHealingDone}<br>
          🔁 Revives Used: ${revivesUsed}<br>
          🧩 Items Collected: ${playerItems.length}
        </p>
        <br>
        <button id="retry-btn">Retry</button>
        <br><br>
        <button id="main-menu-btn">Main Menu</button>
      </div>
    `;
  } else {
    // 🏆 Player won — keep as before
    popup.innerHTML = `
      <div class="end-screen-content">
        <h1>You Win!</h1>
        <p>Prepare for the next battle...</p>
        <button id="next-level-btn">Next Level</button>
        <br><br>
        <button id="main-menu-btn">Main Menu</button>
      </div>
    `;
  }

  document.body.appendChild(popup);

  // === Button handlers ===
  if (playerWon) {

    document.getElementById('next-level-btn').addEventListener('click', () => {
      popup.remove();
      level++;
      enemyAttackCount += 1;
      if (level % 2 === 0) playerAttackCount += 1;
      showShop(); // 🏪 always show shop after each win
    });
  } else {
    document.getElementById('retry-btn').addEventListener('click', () => {
      popup.remove();
      resetGame();
      nextLevel();
    });
  }

  document.getElementById('main-menu-btn').addEventListener('click', () => {
    const confirmPopup = document.createElement('div');
    confirmPopup.className = 'end-screen';
    confirmPopup.innerHTML = `
      <div class="end-screen-content">
        <h1>Return to Main Menu?</h1>
        <p>Your current run will be lost.</p>
        <div style="display:flex;gap:30px;justify-content:center;margin-top:20px;">
          <button id="confirm-main-menu-yes">Yes</button>
          <button id="confirm-main-menu-no" style="background:#E53935;">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmPopup);

    document.getElementById('confirm-main-menu-yes').addEventListener('click', () => {
      confirmPopup.remove();
      popup.remove();
      mainMenu.style.display = 'flex';
      container.innerHTML = '';
      resetGame();
    });

    document.getElementById('confirm-main-menu-no').addEventListener('click', () => {
      confirmPopup.remove();
    });
  });
}

// === PAUSE MENU ===
const pauseBtn = document.getElementById("pause-btn");
let isPaused = false;

function showPauseMenu() {
  if (gameOver || isPaused) return; // don't double open or pause during game over
  isPaused = true;

  const pausePopup = document.createElement('div');
  pausePopup.className = 'end-screen'; // reuse styling
  pausePopup.innerHTML = `
    <div class="end-screen-content">
      <h1>Game Paused</h1>
      <p>Take a breather before continuing your dungeon battle.</p>
      <button id="resume-btn">Resume</button>
      <br><br>
      <button id="pause-main-menu-btn">Main Menu</button>
    </div>
  `;
  document.body.appendChild(pausePopup);

  // Resume button
  document.getElementById('resume-btn').addEventListener('click', () => {
    pausePopup.remove();
    isPaused = false;
  });

  // Main Menu button with confirmation
  document.getElementById('pause-main-menu-btn').addEventListener('click', () => {
    const confirmPopup = document.createElement('div');
    confirmPopup.className = 'end-screen';
    confirmPopup.innerHTML = `
      <div class="end-screen-content">
        <h1>Return to Main Menu?</h1>
        <p>Your current run will be lost.</p>
        <div style="display:flex;gap:30px;justify-content:center;margin-top:20px;">
          <button id="confirm-main-menu-yes">Yes</button>
          <button id="confirm-main-menu-no" style="background:#E53935;">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmPopup);

    document.getElementById('confirm-main-menu-yes').addEventListener('click', () => {
      confirmPopup.remove();
      pausePopup.remove();
      isPaused = false;
      mainMenu.style.display = 'flex';
      container.innerHTML = '';
      resetGame();
    });

    document.getElementById('confirm-main-menu-no').addEventListener('click', () => {
      confirmPopup.remove();
    });
  });
}

// Pause button click
pauseBtn.addEventListener('click', showPauseMenu);


function nextLevel() {
  gameOver = false;

  playerCombo = 1.0;
  enemyCombo = 1.0;

  // ✅ Determine if this is a boss level
  isBossLevel = (level % 10 === 0);

  // ✅ Scaling system
  // Every 10th level starting from 5 (5,15,25,35...) → +40 enemy HP
  if (level >= 5 && (level - 5) % 10 === 0) {
    enemyBonusHealth += 25;
  }

  // Every level immediately after a boss (11,21,31,41...) → +10 enemy damage
  if ((level - 1) % 10 === 0 && level > 10) {
    enemyBonusDamage += 5;
  }

  // ✅ Get player stats once
  const stats = getPlayerStats();

  // ✅ Apply dynamic max HP and regen
  playerMaxHealth = getPlayerMaxHealth();
  enemyMaxHealth = getEnemyMaxHealth() + enemyBonusHealth;

  if (isBossLevel) {
    // === Boss stats ===
    enemyMaxHealth *= BOSS_MULTIPLIER.health;
    enemyHealth = enemyMaxHealth;

    // === Swap enemy animation to boss ===
    enemy.idleFrames = bossSprites.idle;
    enemy.attackFrames = bossSprites.attack;
    enemy.deathFrames = bossSprites.death;
    enemy.playIdle();

    // === Boss popup ===
    const bossPopup = document.createElement("div");
    bossPopup.className = "revive-popup";
    bossPopup.style.background = "rgba(200, 0, 0, 0.9)";
    bossPopup.style.color = "white";
    bossPopup.textContent = "⚔️ Boss Appears!";
    document.body.appendChild(bossPopup);
    setTimeout(() => bossPopup.remove(), 2000);

    // ✅ Optional: make enemy bar glow red
    document.querySelector('.enemy-health-fill').style.boxShadow = "0 0 25px #ff0000";
  } else {
    // === Normal enemy ===
    enemyHealth = enemyMaxHealth;

    enemy.idleFrames = ['assets/eReady_1.png', 'assets/eReady_2.png', 'assets/eReady_3.png'];
    enemy.attackFrames = ['assets/eAttack_2.png', 'assets/eAttack_4.png', 'assets/eAttack_6.png'];
    enemy.deathFrames = ['assets/eDeath_1.png', 'assets/eDeath_2.png', 'assets/eDeath_3.png'];
    enemy.playIdle();

    // ✅ Remove boss glow when back to normal
    document.querySelector('.enemy-health-fill').style.boxShadow = "none";
  }

  // ✅ Always restore player regen and full HP setup
  playerHealth = Math.min(playerMaxHealth, playerHealth + stats.regenPerRound);

  updateHealth();
  updateLevel();

  hero.playIdle();
  enemy.playIdle();
  buildGrid();
}

startButton.addEventListener("click", () => {
  const buttons = document.querySelector("#main-menu .menu-buttons");

  // ✅ Instantly hide buttons for clean zoom animation
  buttons.style.opacity = "0";
  buttons.style.pointerEvents = "none";

  // Add zoom-out animation
  mainMenu.classList.add("menu-zoom-out");

  // Wait for animation to finish before starting the game
  setTimeout(() => {
    mainMenu.style.display = "none";
    mainMenu.classList.remove("menu-zoom-out");

    // Reset button visibility when menu returns later
    buttons.style.opacity = "1";
    buttons.style.pointerEvents = "auto";

    resetGame();
    nextLevel();
  }, 1200); // match CSS animation duration
});

function resetGame() {
  playerItems = [];
  playerGold = 0;
  updateGoldEverywhere();


  level = 1;
  totalDamageDealt = 0;
  totalDamageTaken = 0;
  totalHealingDone = 0;
  revivesUsed = 0;
  enemyBonusHealth = 0;
  enemyBonusDamage = 0;
  playerAttackCount = BASE_PLAYER_ATTACK_COUNT;
  enemyAttackCount = BASE_ENEMY_ATTACK_COUNT;
  playerHealth = getPlayerMaxHealth();
  enemyHealth = getEnemyMaxHealth();

  updateHealth();
  updateLevel();
  gameOver = false;

  playerCombo = 1.0;
  enemyCombo = 1.0;
}

// === INVENTORY PANEL HANDLING ===
const inventoryButton = document.getElementById('inventory-button');
const inventoryPanel = document.getElementById('inventory-panel');

// Function to refresh inventory list
function updateInventoryPanel() {
  // Only show real collectible items (those with name & description)
  const displayableItems = playerItems.filter(i => i.name && i.description);

  if (displayableItems.length === 0) {
    inventoryPanel.innerHTML = "<p>No items collected yet.</p>";
    return;
  }

  inventoryPanel.innerHTML = displayableItems.map(item => `
    <div class="inventory-item" style="border-color:${item.rarity?.color || '#ccc'};">
      <strong style="color:${item.rarity?.color || '#fff'};">${item.name}</strong><br>
      <span>${item.description}</span>
    </div>
  `).join('');
}

// Show panel when hovered
inventoryButton.addEventListener('mouseenter', () => {
  updateInventoryPanel();
  inventoryPanel.style.display = 'block';
});

// Hide panel when not hovered
inventoryContainer = document.getElementById('inventory-container');
inventoryContainer.addEventListener('mouseleave', () => {
  inventoryPanel.style.display = 'none';
});

// === HOW TO PLAY MENU HANDLING ===
const howToPlayBtn = document.getElementById("how-to-play-btn");
const howToPlayScreen = document.getElementById("how-to-play-screen");
const backToMenuBtn = document.getElementById("back-to-menu-btn");

howToPlayBtn.addEventListener("click", () => {
  // Start fading out the main menu
  mainMenu.classList.add("menu-fade-out");

  // Show how-to menu immediately but invisible, so fade can overlap
  howToPlayScreen.style.display = "flex";
  howToPlayScreen.classList.add("menu-fade-in");

  // After fade, clean up classes and hide the main menu
  setTimeout(() => {
    mainMenu.style.display = "none";
    mainMenu.classList.remove("menu-fade-out");
    howToPlayScreen.classList.remove("menu-fade-in");
  }, 400); // matches animation duration
});

backToMenuBtn.addEventListener("click", () => {
  // Fade out How-To menu
  howToPlayScreen.classList.add("menu-fade-out");

  // Show main menu immediately for cross fade
  mainMenu.style.display = "flex";
  mainMenu.classList.add("menu-fade-in");

  // After fade, clean up and hide How-To
  setTimeout(() => {
    howToPlayScreen.style.display = "none";
    howToPlayScreen.classList.remove("menu-fade-out");
    mainMenu.classList.remove("menu-fade-in");
  }, 500);
});

function showHitPopup(isPlayer, text, isHeal = false) {
  const popup = document.createElement('div');
  popup.className = 'hit-popup';
  popup.textContent = text;

  if (isHeal) {
    popup.style.color = '#00ff66'; // 🟢 Healing
  } else if (text === 'MISS') {
    popup.style.color = '#cccccc'; // ⚪ Miss
  } else {
    popup.style.color = '#ff4444'; // 🔴 Damage
  }

  // Position above hero or enemy
  const target = isPlayer ? document.querySelector('.hero-container') : document.querySelector('.enemy-container');
  const rect = target.getBoundingClientRect();

  popup.style.left = `${rect.left + rect.width / 2}px`;
  popup.style.top = `${rect.top - 20}px`;

  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}


function showComboPopup(isPlayer) {
  const comboValue = isPlayer ? playerCombo : enemyCombo;
  if (comboValue <= 1.0) return;

  const popup = document.createElement('div');
  popup.className = 'combo-popup';
  popup.style.color = isPlayer ? '#4CAF50' : '#E53935';
  popup.textContent = `x${comboValue.toFixed(1)} Combo!`;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') showPauseMenu();
});

// === PLAYER & ENEMY TOOLTIP HANDLING ===
const playerTooltipEl = document.getElementById("player-stats-tooltip");
const enemyTooltipEl = document.getElementById("enemy-stats-tooltip");

function getEnemyBaseDamage() {
  return Math.round((10 + enemyBonusDamage) * (isBossLevel ? BOSS_MULTIPLIER.damage : 1));
}

// Helper: Build player tooltip text dynamically
function buildPlayerTooltip() {
  const stats = getPlayerStats();
  return `
    <strong style="font-size:28px;color:#4CAF50;">PLAYER STATS</strong><br>
    ❤️ Max Health: ${getPlayerMaxHealth()}<br>
    ⚔️ Base Attack: 20<br>
    💪 Bonus Damage: ${stats.bonusDamage}<br>
    🛡️ Damage Reduction: ${stats.damageReduction}<br>
    💉 Heal On Attack: ${stats.healOnAttack}<br>
    ♻️ Regen Per Round: ${stats.regenPerRound}<br>
    🎲 Ignore Chance: ${(stats.ignoreDamageChance * 100).toFixed(0)}%<br>
    🌀 Combo Gain: +${(stats.comboBoost || 0).toFixed(1)} / hit<br>
    ☠️ Burn per Click: ${stats.burnDamage || 0}<br>
    🔢 Attack Squares: ${playerAttackCount}
  `;
}

// Helper: Build enemy tooltip text
function buildEnemyTooltip() {
  return `
    <strong style="font-size:28px;color:#E53935;">ENEMY STATS</strong><br>
    ❤️ Max Health: ${enemyMaxHealth}<br>
    ⚔️ Attack Damage: ${getEnemyBaseDamage()}<br>
    🔢 Attack Squares: ${enemyAttackCount}
  `;
}

// Show tooltip near target
function showStatsTooltip(el, tooltipEl, content) {
  tooltipEl.innerHTML = content;
  const rect = el.getBoundingClientRect();
  tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
  tooltipEl.style.top = `${rect.top - 100}px`;
  tooltipEl.classList.add("show");
}

// Hide tooltip
function hideStatsTooltip(tooltipEl) {
  tooltipEl.classList.remove("show");
}

// Player hover
const heroEl = document.querySelector(".hero-container");
heroEl.addEventListener("mouseenter", () => {
  showStatsTooltip(heroEl, playerTooltipEl, buildPlayerTooltip());
});
heroEl.addEventListener("mouseleave", () => hideStatsTooltip(playerTooltipEl));

// Enemy hover
const enemyEl = document.querySelector(".enemy-container");
enemyEl.addEventListener("mouseenter", () => {
  showStatsTooltip(enemyEl, enemyTooltipEl, buildEnemyTooltip());
});
enemyEl.addEventListener("mouseleave", () => hideStatsTooltip(enemyTooltipEl));