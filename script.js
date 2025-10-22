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

let level = 1;
let gameOver = false;
let playerItems = [];

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
  levelDisplay.textContent = `Level ${level}`;
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

//starting stats
function getPlayerStats() {
  let stats = {
    bonusDamage: 0,
    damageReduction: 0,
    healOnAttack: 0,
    ignoreDamageChance: 0,
    regenPerRound: 10,
  };

  playerItems.forEach(item => {
    if (item.bonusDamage) stats.bonusDamage += item.bonusDamage;
    if (item.damageReduction) stats.damageReduction += item.damageReduction;
    if (item.healOnAttack) stats.healOnAttack += item.healOnAttack;
    if (item.ignoreDamageChance) stats.ignoreDamageChance += item.ignoreDamageChance;
    if (item.regenPerRound) stats.regenPerRound += item.regenPerRound;
  });
  return stats;
}


// === DYNAMIC HEALTH CALCULATIONS ===
function getPlayerMaxHealth() {
  let bonus = 0;

  // Loop through all player items and apply bonuses dynamically
  playerItems.forEach(item => {
    if (item.bonusHP) bonus += item.bonusHP;
  });

  return BASE_PLAYER_HEALTH_COUNT + bonus;
}

function getEnemyMaxHealth() {
  // Base enemy health scales by level
  let base = BASE_ENEMY_HEALTH_COUNT;
  let bonus = 0;

  // Allow items or future effects to modify enemy HP
  playerItems.forEach(item => {
    if (item.bonusEnemyHP) bonus += item.bonusEnemyHP;
  });

  return base + bonus;
}

// === RARITY SYSTEM ===
const RARITY = {
  COMMON: { color: "#4CAF50", chance: 0.55 },
  RARE: { color: "#2196F3", chance: 0.25 },
  EPIC: { color: "#9C27B0", chance: 0.15 },
  LEGENDARY: { color: "#FFD700", chance: 0.05 },
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
  { id: "lifeAmulet", name: "Life Amulet", description: "Revive Once With 25% HP", rarity: RARITY.RARE,
    reviveAtPercent: 0.25, applyEffect() {} },

  // EPIC
  { id: "crystalSword", name: "Crystal Sword", description: "Gain +3 Attack Squares", rarity: RARITY.EPIC,
    bonusAttackCount: 3, applyEffect() { playerAttackCount += 3; } },
  { id: "holyCharm", name: "Holy Charm", description: "Heal +8 HP Per Attack Dealt", rarity: RARITY.EPIC,
    healOnAttack: 8, applyEffect() {} },
  { id: "divineRadar", name: "Divine Radar", description: "2 Safe Numbers Between 10–20", rarity: RARITY.EPIC,
    range: [10, 20], safeNumbers: 2, applyEffect() {} },
  { id: "adamantArmor", name: "Adamant Armor", description: "Take -10 Damage", rarity: RARITY.EPIC,
    damageReduction: 10, applyEffect() {} },
  { id: "focusTalisman", name: "Focus Talisman", description: "Deal +10 Damage", rarity: RARITY.EPIC,
    bonusDamage: 10, applyEffect() {} },

  // LEGENDARY
  { id: "phoenixHeart", name: "Phoenix Heart", description: "Revive Once With 100% HP", rarity: RARITY.LEGENDARY,
    reviveAtPercent: 1, applyEffect() {} },
  { id: "godblade", name: "Godblade", description: "Gain +5 Attack Square, Deal +10 Damage", rarity: RARITY.LEGENDARY,
    bonusAttackCount: 5, bonusDamage: 10, applyEffect() { playerAttackCount += 5; } },
  { id: "omnigem", name: "Omni Gem", description: "3 Safe Numbers Between 1–15", rarity: RARITY.LEGENDARY,
    range: [1, 15], safeNumbers: 3, applyEffect() {} },
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

    // ✅ Heal if player has healing effects
    if (stats.healOnAttack > 0) {
      const healAmount = Math.round(stats.healOnAttack);
      playerHealth = Math.min(playerHealth + healAmount, getPlayerMaxHealth());
      showHitPopup(true, `+${healAmount}`, true);
    }

    // ✅ Show hit popup for damage dealt
    showHitPopup(false, `-${totalDamage}`);

    // ✅ Show combo popup *only if boosted*
    if (playerCombo > 1.0) showComboPopup(true);

    // ✅ Increase combo
    playerCombo = Math.min(playerCombo + COMBO_STEP, MAX_COMBO);
    enemyCombo = 1.0;

    updateHealth();

  } else {
    // ✅ Enemy attack phase
    let baseEnemyDamage = (10 + enemyBonusDamage) * (isBossLevel ? BOSS_MULTIPLIER.damage : 1);
    let totalDamage = baseEnemyDamage * enemyCombo;
    totalDamage = Math.round(totalDamage);
    totalDamage -= Math.round(stats.damageReduction || 0);
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
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  playerAttackNumbers = getRandomUniqueNumbers(playerAttackCount, totalCells);
  enemyAttackNumbers = getRandomUniqueNumbers(enemyAttackCount, totalCells, playerAttackNumbers);

  // ✅ Radar-type items guarantee safe numbers
  playerItems
  .filter(i => i.range)
  .forEach(i => {
    const [min, max] = i.range;
    const rangeNums = Array.from({ length: max - min + 1 }, (_, x) => min + x);
    const available = rangeNums.filter(n => !playerAttackNumbers.includes(n) && !enemyAttackNumbers.includes(n));
    const count = i.safeNumbers || 1; // default 1, can scale up
    const chosen = getRandomUniqueNumbers(Math.min(count, available.length), available.length);
    chosen.forEach(index => playerAttackNumbers.push(available[index]));
  });

  let number = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'grid-item';
      cell.textContent = number++;

      cell.addEventListener('click', () => {
        if (cell.classList.contains('clicked') || gameOver || isPaused) return;

        cell.classList.add('clicked');
        const cellNumber = parseInt(cell.textContent);

        if (enemyAttackNumbers.includes(cellNumber)) {
          cell.classList.add('eAttack');
          enemy.playAttack();
          applyPassiveItemEffectsOnAttack(false);
          checkGameOver();

        } else if (playerAttackNumbers.includes(cellNumber)) {
          cell.classList.add('attack');
          hero.playAttack();
          applyPassiveItemEffectsOnAttack(true);
          checkGameOver();

        } else {
          cell.classList.add('active');
          // Reset both combos when a non-attack tile is clicked
          playerCombo = 1.0;
          enemyCombo = 1.0;
        }
      });

      container.appendChild(cell);
    }
  }
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
  if (playerHealth <= 0) {
    // Try revive first
    if (tryRevive()) return; // revival successful, continue playing

    // No revive available → true death
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


// === SHOP SYSTEM ===
function showShop() {
  const popup = document.createElement('div');
  popup.className = 'end-screen';

  const available = allItems.filter(item => !playerItems.some(pi => pi.id === item.id));
  const weightedPool = available.flatMap(item => Array(Math.floor(item.rarity.chance * 100)).fill(item));

  const shopChoices = [];
  const count = Math.min(3, weightedPool.length);
  const indexes = new Set();
  while (indexes.size < count) {
    indexes.add(Math.floor(Math.random() * weightedPool.length));
  }
  indexes.forEach(i => shopChoices.push(weightedPool[i]));

  popup.innerHTML = `
    <div class="end-screen-content">
      <h1>Item Shop</h1>
      <p>Choose one item to aid your journey</p>
      <div id="shop-items" style="display:flex;flex-direction:column;gap:20px;align-items:center;"></div>
    </div>
  `;
  document.body.appendChild(popup);

  const itemContainer = popup.querySelector('#shop-items');

  if (shopChoices.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = "No more items available!";
    msg.style.fontSize = "30px";
    itemContainer.appendChild(msg);

    const btn = document.createElement('button');
    btn.textContent = "Continue";
    btn.addEventListener('click', () => {
      popup.remove();
      nextLevel();
    });
    itemContainer.appendChild(btn);
    return;
  }

  shopChoices.forEach(item => {
    const btn = document.createElement('button');
    btn.textContent = `${item.name} - ${item.description}`;
    btn.style.fontSize = '28px';
    btn.style.padding = '20px 40px';
    btn.style.border = `4px solid ${item.rarity.color}`;
    btn.style.borderRadius = '15px';
    btn.style.background = 'rgba(0,0,0,0.6)';
    btn.style.color = item.rarity.color;
    btn.style.textShadow = '2px 2px 0 black';
    btn.addEventListener('click', () => {
      popup.remove();
      playerItems.push(item);
      item.applyEffect();
      nextLevel();
    });
    itemContainer.appendChild(btn);
  });
}

// === END SCREEN ===
function showEndScreen(playerWon) {
  gameOver = true;

  const popup = document.createElement('div');
  popup.className = 'end-screen';
  popup.innerHTML = `
    <div class="end-screen-content">
      <h1>${playerWon ? 'You Win!' : 'Game Over'}</h1>
      <p>${playerWon ? 'Prepare for the next battle...' : 'Try again from Level 1'}</p>
      <button id="next-level-btn">${playerWon ? 'Next Level' : 'Retry'}</button>
      <br><br>
      <button id="main-menu-btn">Main Menu</button>
    </div>
  `;
  document.body.appendChild(popup);

  // === Button handlers ===
  document.getElementById('next-level-btn').addEventListener('click', () => {
    popup.remove();

    if (playerWon) {
      level++;

      // ✅ Every 3rd level → show shop before next battle
      if ((level - 1) % 3 === 0) {
        showShop();
      } else {
        // === Normal scaling ===
        enemyAttackCount += 1;    // +1 attack number each level
        if (level % 2 === 0) playerAttackCount += 1; // +1 player attack every 2 levels
        nextLevel();
      }

    } else {
      // === Proper full reset ===
      resetGame();     // ✅ Call your existing reset function
      nextLevel();     // ✅ Start fresh
    }
  });

  // ✅ New: Main Menu Button
  document.getElementById('main-menu-btn').addEventListener('click', () => {
    // === Create confirmation popup ===
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
  
    // ✅ Yes → go to main menu
    document.getElementById('confirm-main-menu-yes').addEventListener('click', () => {
      popup.remove();
      confirmPopup.remove();
      mainMenu.style.display = 'flex';
      container.innerHTML = '';
      resetGame();
    });
  
    // ❌ No → close confirmation
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
    enemyBonusHealth += 30;
  }

  // Every level immediately after a boss (11,21,31,41...) → +10 enemy damage
  if ((level - 1) % 10 === 0 && level > 10) {
    enemyBonusDamage += 10;
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
  level = 1;
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
