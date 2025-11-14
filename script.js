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

const GAP_PX = 5;
const BASE_CELL_PX = 80;   // <- your desired starting tile size (was ~80px)
const MIN_CELL_PX  = 28;   // floor for readability

let gridBoxW = 0; // pixels
let gridBoxH = 0; // pixels

function initGridBox(baseCols = cols, baseRows = rows) {
  // What box size would we need to show baseCols x baseRows at BASE_CELL_PX?
  let wantedW = baseCols * BASE_CELL_PX + (baseCols - 1) * GAP_PX;
  let wantedH = baseRows * BASE_CELL_PX + (baseRows - 1) * GAP_PX;

  // Respect viewport caps (same visual frame as before)
  const capW = Math.min(window.innerWidth * 1);
  const capH = Math.min(window.innerHeight * 0.90, 900);

  // If the wanted box is too big for the caps, shrink proportionally
  const scale = Math.min(capW / wantedW, capH / wantedH, 1);
  gridBoxW = Math.floor(wantedW * scale);
  gridBoxH = Math.floor(wantedH * scale);

  // Push to CSS vars
  container.style.setProperty('--grid-box-w', `${gridBoxW}px`);
  container.style.setProperty('--grid-box-h', `${gridBoxH}px`);
}

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

let currentGridCols = cols;
let currentGridRows = rows;

function sizeGridBox(cols, rows) {
  // ensure box is initialised
  if (!gridBoxW || !gridBoxH) initGridBox();

  const cellW = (gridBoxW - (cols - 1) * GAP_PX) / cols;
  const cellH = (gridBoxH - (rows - 1) * GAP_PX) / rows;
  const cell  = Math.max(MIN_CELL_PX, Math.floor(Math.min(cellW, cellH)));

  container.style.setProperty('--grid-cols', cols);
  container.style.setProperty('--cell-size', `${cell}px`);
}


// === UI ELEMENTS ===
const container = document.getElementById('grid-container');
const mainMenu = document.getElementById('main-menu');
const startButton = document.getElementById('start-game-btn');

initGridBox();

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
  if (level > meta.highestLevel) { meta.highestLevel = level; saveMeta(); }
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
    comboBoost: 0,
    burnDamage: 0,
    extraGoldPerTile: 0,
    extraGoldTiles: 0,
    passiveGoldPerRound: 0,
  };

  playerItems.forEach(item => {
    if (item.bonusDamage) stats.bonusDamage += item.bonusDamage;
    if (item.damageReduction) stats.damageReduction += item.damageReduction;
    if (item.healOnAttack) stats.healOnAttack += item.healOnAttack;
    if (item.ignoreDamageChance) stats.ignoreDamageChance += item.ignoreDamageChance;
    if (item.regenPerRound) stats.regenPerRound += item.regenPerRound;
    if (item.comboBoost) stats.comboBoost += item.comboBoost;
    if (item.burnDamage) stats.burnDamage += item.burnDamage;
    if (item.extraGoldPerTile) stats.extraGoldPerTile   += item.extraGoldPerTile;
    if (item.extraGoldTiles) stats.extraGoldTiles     += item.extraGoldTiles;
    if (item.passiveGoldPerRound)stats.passiveGoldPerRound+= item.passiveGoldPerRound;
  });

  return stats;
}

function applyBurnEffect() {
  const stats = getPlayerStats();
  if (stats.burnDamage > 0 && enemyHealth > 0) {
    const burn = Math.round(stats.burnDamage);
    enemyHealth = Math.max(0, enemyHealth - burn);
    totalDamageDealt += burn;
    meta.totalDamageDealtAllRuns += burn;
    saveMeta();
    showHitPopup(false, `-${burn}`, false);

    const enemyEl = document.querySelector('.enemy-container');
    enemyEl.classList.add('burn-flash');
    setTimeout(() => enemyEl.classList.remove('burn-flash'), 150);

    updateHealth();
    return enemyHealth <= 0;
  }
  return false;
}

// === LOCAL SAVE KEYS ===
const SAVE_KEY_RUN  = 'gtd_run_v1';
const SAVE_KEY_META = 'gtd_meta_v1';

// === META (persists across runs) ===
let meta = {
  wins: 0,
  runsStarted: 0,
  bossesDefeated: 0,
  highestLevel: 0,
  totalGoldEarned: 0,
  totalDamageDealtAllRuns: 0,
  totalDamageTakenAllRuns: 0,
  totalTilesClicked: 0
};

// === ACHIEVEMENTS (progressive: Bronze, Silver, Gold, Platinum) ===
const TIERS = [
  { name: 'Bronze',   color: '#cd7f32' },
  { name: 'Silver',   color: '#c0c0c0' },
  { name: 'Gold',     color: '#ffd700' },
  { name: 'Platinum', color: '#e5e4e2' },
];

const ACHIEVEMENTS = [
  {
    id: 'boss_slayer',
    title: 'Boss Slayer',
    desc: 'Defeat bosses over all runs',
    // boss every 10th level → thresholds tuned for long-term play
    thresholds: [10, 25, 50, 100],
    getProgress: () => meta.bossesDefeated
  },
  {
    id: 'victor',
    title: 'Victories',
    desc: 'Complete a full run (reach Level 100)',
    thresholds: [1, 3, 10, 25],
    getProgress: () => meta.wins
  },
  {
    id: 'gold_digger',
    title: 'Gold Collector',
    desc: 'Accumulate gold across all runs',
    thresholds: [500, 2000, 10000, 50000],
    getProgress: () => meta.totalGoldEarned
  },
  {
    id: 'click_master',
    title: 'Relentless Clicker',
    desc: 'Click total tiles across all runs',
    thresholds: [500, 2000, 8000, 25000],
    getProgress: () => meta.totalTilesClicked
  },
  {
    id: 'heavy_hitter',
    title: 'Heavy Hitter',
    desc: 'Deal total damage across all runs',
    thresholds: [2000, 10000, 50000, 200000],
    getProgress: () => meta.totalDamageDealtAllRuns
  },
  {
    id: 'survivor',
    title: 'Survivor',
    desc: 'Total damage taken across all runs (you lived!)',
    thresholds: [2000, 10000, 50000, 200000],
    getProgress: () => meta.totalDamageTakenAllRuns
  },
];

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
// === ALL ITEMS (no consumables; purchase-heal items are repeatable & skip inventory) ===
const allItems = [
  // =====================================================================
  // ============================ COMMON =================================
  // =====================================================================
  { id: "smallSword", name: "Small Sword", description: "Gain +1 Attack Square", rarity: RARITY.COMMON,
    bonusAttackCount: 1, applyEffect() { playerAttackCount += 1; } },
  { id: "leatherShield", name: "Leather Shield", description: "+20 Max HP", rarity: RARITY.COMMON,
    bonusHP: 20, applyEffect() {} },
  { id: "vitalLeaf", name: "Vital Leaf", description: "Heal +2 HP Per Attack Dealt", rarity: RARITY.COMMON,
    healOnAttack: 2, applyEffect() {} },
  { id: "tinyRing", name: "Tiny Lucky Ring", description: "5% Chance To Ignore Damage", rarity: RARITY.COMMON,
    ignoreDamageChance: 0.05, applyEffect() {} },
  { id: "scoutGem", name: "Scout Gem", description: "1 Attack Number Between 35–40", rarity: RARITY.COMMON,
    range: [35, 40], applyEffect() {} },
  { id: "steadyBoots", name: "Steady Boots", description: "Take -3 Damage", rarity: RARITY.COMMON,
    damageReduction: 3, applyEffect() {} },
  { id: "minorFocus", name: "Minor Focus", description: "Deal +5 Damage", rarity: RARITY.COMMON,
    bonusDamage: 5, applyEffect() {} },
  { id: "lightArmor", name: "Light Armor", description: "Heal +5 HP Per Round", rarity: RARITY.COMMON,
    regenPerRound: 5, applyEffect() {} },
  { id: "coinPouch", name: "Coin Pouch", description: "+1 Gold Per Square", rarity: RARITY.COMMON,
    extraGoldPerTile: 1, applyEffect() {} },
  { id: "minersMap", name: "Miner's Map", description: "+1 Gold Tiles", rarity: RARITY.COMMON,
    extraGoldTiles: 1, applyEffect() {} },
  { id: "streetTithe", name: "Street Tithe", description: "+5 Gold Per Level", rarity: RARITY.COMMON,
    passiveGoldPerRound: 5, applyEffect() {} },
  { id: "comboCharm", name: "Combo Charm", description: "Increases Combo +0.1", rarity: RARITY.COMMON,
    comboBoost: 0.1, applyEffect() {} },
  { id: "crudePotion", name: "Crude Potion", description: "Instantly heal 40 HP on purchase (repeatable)", rarity: RARITY.COMMON,
    onPurchaseHeal: 40, repeatable: true, noInventory: true },
  { id: "sturdyBuckle", name: "Sturdy Buckle", description: "+10 Max HP", rarity: RARITY.COMMON,
    bonusHP: 10, applyEffect() {} },
  { id: "whetstone", name: "Whetstone", description: "Deal +3 Damage", rarity: RARITY.COMMON,
    bonusDamage: 3, applyEffect() {} },
  { id: "woolCloak", name: "Wool Cloak", description: "Take -2 Damage", rarity: RARITY.COMMON,
    damageReduction: 2, applyEffect() {} },
  { id: "rabbitFoot", name: "Rabbit’s Foot", description: "2% Chance To Ignore Damage", rarity: RARITY.COMMON,
    ignoreDamageChance: 0.02, applyEffect() {} },
  { id: "trailMap", name: "Trail Map", description: "1 Attack Number Between 28–32", rarity: RARITY.COMMON,
    range: [28, 32], applyEffect() {} },
  { id: "quickstep", name: "Quickstep Anklet", description: "Combo Gain +0.1", rarity: RARITY.COMMON,
    comboBoost: 0.1, applyEffect() {} },
  { id: "sawbonesKit", name: "Sawbones Kit", description: "Heal +1 HP Per Attack Dealt", rarity: RARITY.COMMON,
    healOnAttack: 1, applyEffect() {} },
  { id: "campRations", name: "Camp Rations", description: "Heal +4 HP Per Round", rarity: RARITY.COMMON,
    regenPerRound: 4, applyEffect() {} },
  { id: "tinderSpark", name: "Tinder Spark", description: "1 Burn Per Square", rarity: RARITY.COMMON,
    burnDamage: 1, applyEffect() {} },
  { id: "purseStrings", name: "Purse Strings", description: "+1 Gold Per Square", rarity: RARITY.COMMON,
    extraGoldPerTile: 1, applyEffect() {} },
  { id: "scavengerSatchel", name: "Scavenger Satchel", description: "+1 Gold Tile", rarity: RARITY.COMMON,
    extraGoldTiles: 1, applyEffect() {} },
  { id: "streetTips", name: "Street Tips", description: "+3 Gold Per Level", rarity: RARITY.COMMON,
    passiveGoldPerRound: 3, applyEffect() {} },
  { id: "practiceBlade", name: "Practice Blade", description: "Gain +1 Attack Square", rarity: RARITY.COMMON,
    bonusAttackCount: 1, applyEffect() { playerAttackCount += 1; } },
  { id: "bandage", name: "Bandage", description: "Instantly heal 25 HP on purchase (repeatable)", rarity: RARITY.COMMON,
    onPurchaseHeal: 25, repeatable: true, noInventory: true },
  { id: "ironRations", name: "Iron Rations", description: "Instantly heal 35 HP on purchase (repeatable)", rarity: RARITY.COMMON,
    onPurchaseHeal: 35, repeatable: true, noInventory: true },
  { id: "barkShield", name: "Bark Shield", description: "+15 Max HP", rarity: RARITY.COMMON,
    bonusHP: 15, applyEffect() {} },
  { id: "paddedVambrace", name: "Padded Vambrace", description: "Take -1 Damage", rarity: RARITY.COMMON,
    damageReduction: 1, applyEffect() {} },
  { id: "clearMind", name: "Clear Mind", description: "Combo Gain +0.1", rarity: RARITY.COMMON,
    comboBoost: 0.1, applyEffect() {} },
  { id: "luckyPenny", name: "Lucky Penny", description: "3% Chance To Ignore Damage", rarity: RARITY.COMMON,
    ignoreDamageChance: 0.03, applyEffect() {} },
  { id: "lantern", name: "Miner’s Lantern", description: "1 Attack Number Between 41–45", rarity: RARITY.COMMON,
    range: [41, 45], applyEffect() {} },
  { id: "aloeSalve", name: "Aloe Salve", description: "Instantly heal 20 HP on purchase (repeatable)", rarity: RARITY.COMMON,
    onPurchaseHeal: 20, repeatable: true, noInventory: true },
  { id: "woodenHammer", name: "Wooden Hammer", description: "Deal +4 Damage", rarity: RARITY.COMMON,
    bonusDamage: 4, applyEffect() {} },
  { id: "corkCharm", name: "Cork Charm", description: "Take -1 Damage", rarity: RARITY.COMMON,
    damageReduction: 1, applyEffect() {} },
  { id: "copperRing", name: "Copper Ring", description: "+1 Gold Per Square", rarity: RARITY.COMMON,
    extraGoldPerTile: 1, applyEffect() {} },
  { id: "gamblerToken", name: "Gambler’s Token", description: "4% Chance To Ignore Damage", rarity: RARITY.COMMON,
    ignoreDamageChance: 0.04, applyEffect() {} },
  { id: "ashSmudge", name: "Ash Smudge", description: "1 Burn Per Square", rarity: RARITY.COMMON,
    burnDamage: 1, applyEffect() {} },
  { id: "threadbareCloak", name: "Threadbare Cloak", description: "Heal +3 HP Per Round", rarity: RARITY.COMMON,
    regenPerRound: 3, applyEffect() {} },
  { id: "brightTally", name: "Bright Tally", description: "1 Attack Number Between 12–16", rarity: RARITY.COMMON,
    range: [12, 16], applyEffect() {} },
  { id: "tinyTonic", name: "Tiny Tonic", description: "Instantly heal 15 HP on purchase (repeatable)", rarity: RARITY.COMMON,
    onPurchaseHeal: 15, repeatable: true, noInventory: true },
  { id: "spareBlade", name: "Spare Blade", description: "Gain +1 Attack Square", rarity: RARITY.COMMON,
    bonusAttackCount: 1, applyEffect() { playerAttackCount += 1; } },
  { id: "leadCharm", name: "Lead Charm", description: "Deal +2 Damage", rarity: RARITY.COMMON,
    bonusDamage: 2, applyEffect() {} },

  // =====================================================================
  // ============================== RARE =================================
  // =====================================================================
  { id: "ironSword", name: "Iron Sword", description: "Gain +2 Attack Squares", rarity: RARITY.RARE,
    bonusAttackCount: 2, applyEffect() { playerAttackCount += 2; } },
  { id: "ironShield", name: "Iron Shield", description: "+30 Max HP", rarity: RARITY.RARE,
    bonusHP: 30, applyEffect() {} },
  { id: "luckyRing", name: "Lucky Ring", description: "10% Chance To Ignore Damage", rarity: RARITY.RARE,
    ignoreDamageChance: 0.1, applyEffect() {} },
  { id: "bloodCharm", name: "Blood Charm", description: "Heal +5 HP Per Attack Dealt", rarity: RARITY.RARE,
    healOnAttack: 5, applyEffect() {} },
  { id: "radarGem", name: "Radar Gem", description: "1 Attack Number Between 20–25", rarity: RARITY.RARE,
    range: [20, 25], applyEffect() {} },
  { id: "strongBoots", name: "Strong Boots", description: "Take -5 Damage", rarity: RARITY.RARE,
    damageReduction: 5, applyEffect() {} },
  { id: "huntersRing", name: "Treasure Hunter's Ring", description: "+2 Gold Per Square", rarity: RARITY.RARE,
    extraGoldPerTile: 2, applyEffect() {} },
  { id: "prospectorsPick", name: "Prospector's Pick", description: "+2 Gold Tiles", rarity: RARITY.RARE,
    extraGoldTiles: 2, applyEffect() {} },
  { id: "guildStipend", name: "Guild Stipend", description: "+7 Gold Per Level", rarity: RARITY.RARE,
    passiveGoldPerRound: 7, applyEffect() {} },
  { id: "bronzeArmor", name: "Bronze Armor", description: "Heal +10 HP Per Round", rarity: RARITY.RARE,
    regenPerRound: 10, applyEffect() {} },
  { id: "flamePendant", name: "Flame Pendant", description: "Inflicts 1 Burn Per Square", rarity: RARITY.RARE,
    burnDamage: 1, applyEffect() {} },
  { id: "lifeAmulet", name: "Life Amulet", description: "Revive Once With 25% HP", rarity: RARITY.RARE,
    reviveAtPercent: 0.25, applyEffect() {} },
  { id: "steelEdge", name: "Steel Edge", description: "Deal +8 Damage", rarity: RARITY.RARE,
    bonusDamage: 8, applyEffect() {} },
  { id: "soldierMail", name: "Soldier’s Mail", description: "Take -6 Damage", rarity: RARITY.RARE,
    damageReduction: 6, applyEffect() {} },
  { id: "vigorCharm", name: "Vigor Charm", description: "Heal +3 HP Per Attack Dealt", rarity: RARITY.RARE,
    healOnAttack: 3, applyEffect() {} },
  { id: "eagleGem", name: "Eagle Gem", description: "1 Attack Number Between 18–22", rarity: RARITY.RARE,
    range: [18, 22], applyEffect() {} },
  { id: "guardianBand", name: "Guardian Band", description: "12% Chance To Ignore Damage", rarity: RARITY.RARE,
    ignoreDamageChance: 0.12, applyEffect() {} },
  { id: "warmCloak", name: "Warm Cloak", description: "Heal +8 HP Per Round", rarity: RARITY.RARE,
    regenPerRound: 8, applyEffect() {} },
  { id: "glowingBrand", name: "Glowing Brand", description: "2 Burn Per Square", rarity: RARITY.RARE,
    burnDamage: 2, applyEffect() {} },
  { id: "duelistGrip", name: "Duelist’s Grip", description: "Combo Gain +0.2", rarity: RARITY.RARE,
    comboBoost: 0.2, applyEffect() {} },
  { id: "steelBrooch", name: "Steel Brooch", description: "+25 Max HP", rarity: RARITY.RARE,
    bonusHP: 25, applyEffect() {} },
  { id: "silverPouch", name: "Silver Pouch", description: "+2 Gold Per Square", rarity: RARITY.RARE,
    extraGoldPerTile: 2, applyEffect() {} },
  { id: "townLedgers", name: "Town Ledgers", description: "+8 Gold Per Level", rarity: RARITY.RARE,
    passiveGoldPerRound: 8, applyEffect() {} },
  { id: "tealCompass", name: "Teal Compass", description: "+2 Gold Tiles", rarity: RARITY.RARE,
    extraGoldTiles: 2, applyEffect() {} },
  { id: "secondWind", name: "Second Wind", description: "Instantly heal 55 HP on purchase (repeatable)", rarity: RARITY.RARE,
    onPurchaseHeal: 55, repeatable: true, noInventory: true },
  { id: "honedEdge", name: "Honed Edge", description: "Gain +2 Attack Squares", rarity: RARITY.RARE,
    bonusAttackCount: 2, applyEffect() { playerAttackCount += 2; } },
  { id: "riverStone", name: "River Stone", description: "Take -4 Damage", rarity: RARITY.RARE,
    damageReduction: 4, applyEffect() {} },
  { id: "hunterSigil", name: "Hunter’s Sigil", description: "1 Attack Number Between 22–26", rarity: RARITY.RARE,
    range: [22, 26], applyEffect() {} },
  { id: "amberRing", name: "Amber Ring", description: "Combo Gain +0.2", rarity: RARITY.RARE,
    comboBoost: 0.2, applyEffect() {} },
  { id: "emberVial", name: "Ember Vial", description: "Instantly heal 25 HP on purchase (repeatable)", rarity: RARITY.RARE,
    onPurchaseHeal: 25, repeatable: true, noInventory: true },
  { id: "scoutCharm", name: "Scout’s Charm", description: "+20 Max HP & Heal +5/round", rarity: RARITY.RARE,
    bonusHP: 20, regenPerRound: 5, applyEffect() {} },
  { id: "strikeBelt", name: "Strike Belt", description: "Deal +6 Damage & +0.1 Combo", rarity: RARITY.RARE,
    bonusDamage: 6, comboBoost: 0.1, applyEffect() {} },

  // =====================================================================
  // =============================== EPIC ================================
  // =====================================================================
  { id: "crystalSword", name: "Crystal Sword", description: "Gain +5 Attack Squares", rarity: RARITY.EPIC,
    bonusAttackCount: 5, applyEffect() { playerAttackCount += 5; } },
  { id: "holyCharm", name: "Holy Charm", description: "Heal +8 HP Per Attack Dealt", rarity: RARITY.EPIC,
    healOnAttack: 8, applyEffect() {} },
  { id: "divineRadar", name: "Divine Radar", description: "2 Attack Numbers Between 10–15", rarity: RARITY.EPIC,
    range: [10, 15], safeNumbers: 2, applyEffect() {} },
  { id: "adamantArmor", name: "Adamant Armor", description: "Take -10 Damage", rarity: RARITY.EPIC,
    damageReduction: 10, applyEffect() {} },
  { id: "focusTalisman", name: "Focus Talisman", description: "Deal +10 Damage", rarity: RARITY.EPIC,
    bonusDamage: 10, applyEffect() {} },
  { id: "fireBrand", name: "Firebrand", description: "Combo Gain +0.2 And 2 Burn per Square", rarity: RARITY.EPIC,
    comboBoost: 0.2, burnDamage: 2, applyEffect() {} },
  { id: "goldenTouch", name: "Golden Touch", description: "+3 Gold Per Square", rarity: RARITY.EPIC,
    extraGoldPerTile: 3, applyEffect() {} },
  { id: "royalCharter", name: "Royal Charter", description: "+10 Gold Per Level", rarity: RARITY.EPIC,
    passiveGoldPerRound: 10, applyEffect() {} },
  { id: "gildedCompass", name: "Gilded Compass", description: "+3 Gold Tiles", rarity: RARITY.EPIC,
    extraGoldTiles: 3, applyEffect() {} },
  { id: "swiftCharm", name: "Swift Charm", description: "Gain +1 Attack Square & +0.1 Combo Gain", rarity: RARITY.EPIC,
    bonusAttackCount: 1, comboBoost: 0.1, applyEffect() { playerAttackCount += 1; } },
  { id: "runedBlade", name: "Runed Blade", description: "Gain +3 Attack Squares & +8 Damage", rarity: RARITY.EPIC,
    bonusAttackCount: 3, bonusDamage: 8, applyEffect() { playerAttackCount += 3; } },
  { id: "titanPlate", name: "Titan Plate", description: "Take -12 Damage", rarity: RARITY.EPIC,
    damageReduction: 12, applyEffect() {} },
  { id: "vampTalisman", name: "Vampiric Talisman", description: "Heal +10 HP Per Attack Dealt", rarity: RARITY.EPIC,
    healOnAttack: 10, applyEffect() {} },
  { id: "seerStone", name: "Seer Stone", description: "2 Attack Numbers Between 8–12", rarity: RARITY.EPIC,
    range: [8, 12], safeNumbers: 2, applyEffect() {} },
  { id: "stormBand", name: "Storm Band", description: "Combo Gain +0.3", rarity: RARITY.EPIC,
    comboBoost: 0.3, applyEffect() {} },
  { id: "pyreHeart", name: "Pyre Heart", description: "3 Burn Per Square", rarity: RARITY.EPIC,
    burnDamage: 3, applyEffect() {} },
  { id: "kingsPurse", name: "King’s Purse", description: "+4 Gold Per Square", rarity: RARITY.EPIC,
    extraGoldPerTile: 4, applyEffect() {} },
  { id: "royalDecree", name: "Royal Decree", description: "+12 Gold Per Level", rarity: RARITY.EPIC,
    passiveGoldPerRound: 12, applyEffect() {} },
  { id: "orienteerKit", name: "Orienteer Kit", description: "+4 Gold Tiles", rarity: RARITY.EPIC,
    extraGoldTiles: 4, applyEffect() {} },
  { id: "ironWill", name: "Iron Will", description: "+40 Max HP & Heal +8/round", rarity: RARITY.EPIC,
    bonusHP: 40, regenPerRound: 8, applyEffect() {} },

  // =====================================================================
  // ============================= LEGENDARY ==============================
  // =====================================================================
  { id: "phoenixHeart", name: "Phoenix Heart", description: "Revive Once With 100% HP", rarity: RARITY.LEGENDARY,
    reviveAtPercent: 1, applyEffect() {} },
  { id: "infernoSoul", name: "Inferno Soul", description: "Combo Gain +0.3 And 3 Burn Per Square", rarity: RARITY.LEGENDARY,
    comboBoost: 0.3, burnDamage: 3, applyEffect() {} },
  { id: "godblade", name: "Godblade", description: "Gain +5 Attack Squares, Deal +10 Damage", rarity: RARITY.LEGENDARY,
    bonusAttackCount: 5, bonusDamage: 10, applyEffect() { playerAttackCount += 5; } },
  { id: "omnigem", name: "Omni Gem", description: "5 Attack Numbers Between 1–10", rarity: RARITY.LEGENDARY,
    range: [1, 10], safeNumbers: 5, applyEffect() {} },
  { id: "heavySword", name: "Heavy Sword", description: "Combo Gain +0.5", rarity: RARITY.LEGENDARY,
    comboBoost: 0.5, applyEffect() {} },
  { id: "emberCore", name: "Ember Core", description: "5 Burn Per Square", rarity: RARITY.LEGENDARY,
    burnDamage: 5, applyEffect() {} },
  { id: "dragonsHoard", name: "Dragon's Hoard", description: "+5 Gold Per Square & +2 Gold Tiles", rarity: RARITY.LEGENDARY,
    extraGoldPerTile: 5, extraGoldTiles: 2, applyEffect() {} },
  { id: "ancientBank", name: "Bank of the Ancients", description: "+20 Gold Per Level", rarity: RARITY.LEGENDARY,
    passiveGoldPerRound: 20, applyEffect() {} },
  { id: "secondLife", name: "Second Life", description: "Revive Once With 50% HP", rarity: RARITY.LEGENDARY,
    reviveAtPercent: 0.5, applyEffect() {} },
  { id: "blazingCrown", name: "Blazing Crown", description: "4 Burn Per Square & +0.2 Combo", rarity: RARITY.LEGENDARY,
    burnDamage: 4, comboBoost: 0.2, applyEffect() {} },
  { id: "warDrum", name: "War Drum", description: "Gain +4 Attack Squares", rarity: RARITY.LEGENDARY,
    bonusAttackCount: 4, applyEffect() { playerAttackCount += 4; } },
  { id: "goldenSceptre", name: "Golden Sceptre", description: "+6 Gold Per Square & +2 Gold Tiles", rarity: RARITY.LEGENDARY,
    extraGoldPerTile: 6, extraGoldTiles: 2, applyEffect() {} },
  { id: "colossusHeart", name: "Colossus Heart", description: "+80 Max HP & Heal +12/round", rarity: RARITY.LEGENDARY,
    bonusHP: 80, regenPerRound: 12, applyEffect() {} },
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

function getGoldStats() {
  const s = getPlayerStats();
  return {
    extraGoldPerTile: s.extraGoldPerTile || 0,
    extraGoldTiles: s.extraGoldTiles || 0,
    passiveGoldPerRound: s.passiveGoldPerRound || 0,
  };
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
    meta.totalDamageDealtAllRuns += totalDamage;
    saveMeta();

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

    // Clamp before anything else
    if (totalDamage < 0) totalDamage = 0;

    // ✅ Check ignore chance (MISS) before applying damage
    if (Math.random() < (stats.ignoreDamageChance || 0)) {
      showHitPopup(true, "MISS");
      enemyCombo = 1.0;
      updateHealth();
      return;
    }

    // Apply damage & track stats
    playerHealth = Math.max(0, playerHealth - totalDamage);
    totalDamageTaken += totalDamage;
    meta.totalDamageTakenAllRuns += totalDamage;
    saveMeta();

    showHitPopup(true, `-${totalDamage}`);

    if (enemyCombo > 1.0) showComboPopup(false);

    enemyCombo = Math.min(enemyCombo + COMBO_STEP, MAX_COMBO);
    playerCombo = 1.0;

    updateHealth();
}

}

window.addEventListener('resize', () => {
  initGridBox(); // recompute the fixed box from viewport caps
  sizeGridBox(currentGridCols, currentGridRows);
});


// === BUILD GRID ===
function buildGrid() {
  let currentCols = cols;
  let currentRows = rows;
  let totalCells  = currentCols * currentRows;

  const goldExtras = getGoldStats().extraGoldTiles || 0;
  const requiredCells = playerAttackCount + enemyAttackCount + (GOLD_TILES_PER_ROUND + goldExtras) + 5;

  let addedCols = 0;
  while (totalCells < requiredCells) {
    currentCols++;
    addedCols++;
    if (addedCols >= 3) { currentRows++; addedCols = 0; }
    totalCells = currentCols * currentRows;
  }

  currentGridCols = currentCols;
  currentGridRows = currentRows;

  sizeGridBox(currentCols, currentRows);

  container.innerHTML = '';
  container.classList.remove('grid-grow');
  void container.offsetWidth; // reflow

  container.classList.add('grid-grow');

  playerAttackNumbers = getRandomUniqueNumbers(playerAttackCount, totalCells);
  enemyAttackNumbers  = getRandomUniqueNumbers(enemyAttackCount,  totalCells, playerAttackNumbers);

  const taken = new Set([...playerAttackNumbers, ...enemyAttackNumbers]);
  playerItems
    .filter(i => i.range)
    .forEach(i => {
      const [min, max] = i.range;
      const rangeNums = Array.from({ length: max - min + 1 }, (_, x) => min + x);
      const available = rangeNums.filter(n => !taken.has(n) && n >= 1 && n <= totalCells);
      const count = i.safeNumbers || 1;

      for (let k = 0; k < Math.min(count, available.length); k++) {
        const idx = Math.floor(Math.random() * available.length);
        const n = available.splice(idx, 1)[0];
        playerAttackNumbers.push(n);
        taken.add(n);
      }
    });

  // === Pick gold tiles from cells not used by either side ===
  const pool = [];
  for (let i = 1; i <= totalCells; i++) if (!taken.has(i)) pool.push(i);

  const gstats = getGoldStats();
  const goldCount = Math.min(GOLD_TILES_PER_ROUND + (gstats.extraGoldTiles || 0), pool.length);
  const goldNumbers = [];
  while (goldNumbers.length < goldCount && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    goldNumbers.push(pool.splice(i, 1)[0]);
  }

  // === Render cells ===
  let number = 1;
  for (let r = 0; r < currentRows; r++) {
    for (let c = 0; c < currentCols; c++) {
      if (number > totalCells) break;

      const cell = document.createElement('div');
      cell.className = 'grid-item';
      cell.textContent = number;

      // click handler
      cell.addEventListener('click', () => {

        meta.totalTilesClicked++;
        saveMeta();

        if (cell.classList.contains('clicked') || gameOver || isPaused) return;

        cell.classList.add('clicked');
        const cellNumber = parseInt(cell.textContent, 10);
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
          cell.classList.add('gold');
          const gstats = getGoldStats();
          const gain = GOLD_PER_TILE + (gstats.extraGoldPerTile || 0);
          playerGold += gain;
          meta.totalGoldEarned += gain;
          saveMeta();

          updateGoldEverywhere();
          showHitPopup(true, `+${gain}🪙`, true);
          playerCombo = 1.0;
          enemyCombo = 1.0;        

        } else {
          cell.classList.add('active');
          playerCombo = 1.0;
          enemyCombo = 1.0;
        }

        // Burn triggers on every click
        applyBurnEffect();

        // Resolve deaths (ties, revive, wins, losses)
        resolveDeaths();
      });

      container.appendChild(cell);
      number++;
    }
  }

  // === Highlight safe number ranges (visual only) ===
  const gridItems = container.querySelectorAll('.grid-item');
  playerItems
    .filter(i => i.range)
    .forEach(i => {
      const [min, max] = i.range;
      gridItems.forEach(cell => {
        const num = parseInt(cell.textContent);
        if (num >= min && num <= max) cell.classList.add('safe-range');
      });
    });

  saveRun();
}

// === UTIL: map saved item ids back to data objects ===
function itemsFromIds(ids) {
  const byId = new Map(allItems.map(i => [i.id, i]));
  return (ids || [])
    .map(id => byId.get(id))
    .filter(Boolean);
}

// === Recompute any derived counts from items (safe for load) ===
function recomputeDerivedStats() {
  // Attack squares derived from items you own that add attacks
  const bonusAtt = playerItems.reduce((a, i) => a + (i.bonusAttackCount || 0), 0);
  playerAttackCount = BASE_PLAYER_ATTACK_COUNT + bonusAtt;
  // enemyAttackCount is scaled by gameplay, so keep as-is (loaded)
  playerMaxHealth = getPlayerMaxHealth();
  enemyMaxHealth = getEnemyMaxHealth() + enemyBonusHealth;
}

// === RUN SAVE ===
function saveRun() {
  const data = {
    level,
    gameOver,
    isBossLevel,
    enemyBonusHealth,
    enemyBonusDamage,
    playerHealth,
    enemyHealth,
    playerAttackCount,        // stored but recomputed on load too
    enemyAttackCount,
    playerGold,
    playerItems: playerItems.map(i => i.id),
    totalDamageDealt,
    totalDamageTaken,
    totalHealingDone,
    revivesUsed,
    playerCombo,
    enemyCombo
  };
  try { localStorage.setItem(SAVE_KEY_RUN, JSON.stringify(data)); } catch(e) {}
}

// === RUN LOAD ===
function loadRun() {
  try {
    const raw = localStorage.getItem(SAVE_KEY_RUN);
    if (!raw) return false;
    const d = JSON.parse(raw);

    level = d.level ?? 1;
    gameOver = !!d.gameOver;
    isBossLevel = !!d.isBossLevel;
    enemyBonusHealth = d.enemyBonusHealth || 0;
    enemyBonusDamage = d.enemyBonusDamage || 0;
    playerGold = d.playerGold || 0;
    playerItems = itemsFromIds(d.playerItems);

    // Use saved counts/health but recompute derived caps
    playerAttackCount = d.playerAttackCount ?? BASE_PLAYER_ATTACK_COUNT;
    enemyAttackCount  = d.enemyAttackCount  ?? BASE_ENEMY_ATTACK_COUNT;

    recomputeDerivedStats();

    playerHealth = Math.min(d.playerHealth ?? playerMaxHealth, playerMaxHealth);
    enemyMaxHealth = getEnemyMaxHealth() + enemyBonusHealth;
    enemyHealth = Math.min(d.enemyHealth ?? enemyMaxHealth, enemyMaxHealth);

    totalDamageDealt = d.totalDamageDealt || 0;
    totalDamageTaken = d.totalDamageTaken || 0;
    totalHealingDone = d.totalHealingDone || 0;
    revivesUsed = d.revivesUsed || 0;

    playerCombo = d.playerCombo ?? 1.0;
    enemyCombo  = d.enemyCombo  ?? 1.0;

    // Refresh UI
    updateGoldEverywhere();
    updateHealth();
    updateLevel();
    hero.playIdle();
    enemy.playIdle();
    buildGrid();

    return true;
  } catch (e) {
    return false;
  }
}

// === META SAVE/LOAD ===
function saveMeta() {
  try { localStorage.setItem(SAVE_KEY_META, JSON.stringify(meta)); } catch(e) {}
}

function loadMeta() {
  try {
    const raw = localStorage.getItem(SAVE_KEY_META);
    if (!raw) return;
    const d = JSON.parse(raw);
    meta = { ...meta, ...d };
  } catch(e) {}
}

loadMeta();

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
    saveRun();
    return true;
  }
  if (playerHealth <= 0) {
    playerHealth = 0;
    hero.playDeath();
    showEndScreen(false);
    saveRun();
    return true;
  }
  if (enemyHealth <= 0) {
    enemyHealth = 0;
    enemy.playDeath();
    showEndScreen(true);
    saveRun();
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

function buildShopUI(intoPopup) {
  currentShopPopup = intoPopup;

  // Build a weighted pool from items you don't already own (but keep repeatables available)
  const chances = getDynamicRarityChances(level);

  const available = allItems.filter(item => {
    // repeatables always available
    if (item.repeatable) return true;
    // non-repeatables: hide if already owned
    return !playerItems.some(pi => pi.id === item.id);
  });

  const weightedPool = available.flatMap(item => {
    let rarityChance = 0.01;
    if (item.rarity === RARITY.COMMON) rarityChance = chances.COMMON;
    else if (item.rarity === RARITY.RARE) rarityChance = chances.RARE;
    else if (item.rarity === RARITY.EPIC) rarityChance = chances.EPIC;
    else if (item.rarity === RARITY.LEGENDARY) rarityChance = chances.LEGENDARY;
    return Array(Math.max(1, Math.floor(rarityChance * 100))).fill(item);
  });

  // Sample up to 5 unique items by id
  const shopChoices = [];
  const chosenIds = new Set();
  const count = Math.min(5, available.length);

  let attempts = 0;
  while (shopChoices.length < count && weightedPool.length > 0 && attempts < 1000) {
    const idx = Math.floor(Math.random() * weightedPool.length);
    const candidate = weightedPool[idx];
    if (!chosenIds.has(candidate.id)) {
      chosenIds.add(candidate.id);
      shopChoices.push(candidate);
      // remove all instances of this id from pool
      for (let i = weightedPool.length - 1; i >= 0; i--) {
        if (weightedPool[i].id === candidate.id) weightedPool.splice(i, 1);
      }
    }
    attempts++;
  }

  const itemContainer = intoPopup.querySelector('#shop-items');
  itemContainer.innerHTML = "";

  if (shopChoices.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = "No items available.";
    itemContainer.appendChild(msg);
    return;
  }

  // Group by rarity visually (already grouped in data, but we add a subtle badge)
  const rarityOrder = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
  shopChoices.sort((a, b) => {
    const ra = rarityOrder.indexOf(Object.keys(RARITY).find(k => RARITY[k] === a.rarity));
    const rb = rarityOrder.indexOf(Object.keys(RARITY).find(k => RARITY[k] === b.rarity));
    return ra - rb;
  });

  shopChoices.forEach(item => {
    const rarityKey = Object.keys(RARITY).find(k => RARITY[k] === item.rarity);
    const cost = (rarityKey && RARITY_COST[rarityKey]) || 10;

    const div = document.createElement('div');
    div.className = 'shop-item';
    div.style.borderColor = item.rarity.color;

    const repeatableBadge = item.repeatable ? `<div style="font-size:14px;color:#ffd54f;margin-top:6px;">Repeatable</div>` : ``;

    div.innerHTML = `
      <strong style="color:${item.rarity.color}; font-size:28px;">${item.name}</strong>
      <p style="font-size:18px; margin:10px 0;">${item.description}</p>
      ${repeatableBadge}
      <p style="font-size:20px; color:gold;">Cost: ${cost}💰</p>
    `;

    div.addEventListener('click', () => {
      // If non-repeatable and already purchased in this shop view
      if (!item.repeatable && div.classList.contains('purchased')) return;

      if (playerGold < cost) return;

      // Pay cost
      playerGold -= cost;

      // Purchase-heal (for former consumables)
      if (item.onPurchaseHeal) {
        const heal = Math.round(Number(item.onPurchaseHeal));
        if (heal > 0) {
          playerHealth = Math.min(getPlayerMaxHealth(), playerHealth + heal);
          updateHealth();
          showHitPopup(true, `+${heal}`, true);
        }
      }

      // Apply permanent stats for normal items (only once) and add to inventory unless told not to
      if (!item.repeatable && !item.noInventory) {
        playerItems.push(item);
        item.applyEffect?.();
        div.classList.add('purchased');
        div.innerHTML = `
          <strong style="color:${item.rarity.color}; font-size:28px;">${item.name}</strong>
          <p>Purchased!</p>
          <p style="font-size:20px; color:gold;">Cost: ${cost}💰</p>
        `;
      }

      // Repeatables or no-inventory items: apply their effect (if any) but do NOT mark purchased
      if (item.repeatable || item.noInventory) {
        item.applyEffect?.(); // usually unused for healers
        // nice little flash
        div.style.transform = 'scale(1.08)';
        setTimeout(() => (div.style.transform = ''), 120);
      }

      updateGoldEverywhere();
    });

    itemContainer.appendChild(div);
  });

  updateGoldEverywhere();
  saveRun();
}

// === ACHIEVEMENTS MENU HANDLERS ===
const achievementsBtn = document.getElementById('achievements-btn');
const achievementsScreen = document.getElementById('achievements-screen');
const achievementsBackBtn = document.getElementById('achievements-back-btn');
const achievementsContent = document.getElementById('achievements-content');

function getTier(progress, thresholds) {
  let tierIdx = -1;
  for (let i = 0; i < thresholds.length; i++) {
    if (progress >= thresholds[i]) tierIdx = i;
  }
  return tierIdx; // -1 = none, 0..3 = Bronze..Platinum
}

function renderAchievements() {
  achievementsContent.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const progress = a.getProgress();
    const tierIdx = getTier(progress, a.thresholds);
    const nextTarget =
      tierIdx < a.thresholds.length - 1
        ? a.thresholds[tierIdx + 1]
        : a.thresholds[a.thresholds.length - 1];  // at max tier, show the platinum cap
    const currentTarget = tierIdx >= 0 ? a.thresholds[tierIdx] : 0;

    // progress ratio to next tier (if already max, 100%)
    const denom = (tierIdx < a.thresholds.length - 1) ? (nextTarget - currentTarget) : 1;
    const numer = (tierIdx < a.thresholds.length - 1) ? (progress - currentTarget) : 1;
    const pct = Math.max(0, Math.min(100, Math.floor((numer / denom) * 100)));

    const tierName = tierIdx >= 0 ? TIERS[tierIdx].name : 'None';
    const tierColor = tierIdx >= 0 ? TIERS[tierIdx].color : '#bbb';

    const el = document.createElement('div');
    el.className = 'achievement-card';
    el.innerHTML = `
      <h3>${a.title}</h3>
      <div class="achievement-tier" style="color:${tierColor};">Tier: ${tierName}</div>
      <div style="font-size:20px;opacity:0.9;">${a.desc}</div>
      <div style="font-size:18px;margin-top:6px;">
        Progress: ${progress} / ${nextTarget}
      </div>
      <div class="achievement-progress">
        <div class="achievement-progress-fill" style="width:${pct}%;"></div>
      </div>
    `;
    achievementsContent.appendChild(el);
  });
}

achievementsBtn.addEventListener('click', () => {
  mainMenu.classList.add("menu-fade-out");
  achievementsScreen.style.display = "flex";
  achievementsScreen.classList.add("menu-fade-in");
  setTimeout(() => {
    mainMenu.style.display = "none";
    mainMenu.classList.remove("menu-fade-out");
    achievementsScreen.classList.remove("menu-fade-in");
  }, 400);
  renderAchievements();
});

achievementsBackBtn.addEventListener('click', () => {
  achievementsScreen.classList.add("menu-fade-out");
  mainMenu.style.display = "flex";
  mainMenu.classList.add("menu-fade-in");
  setTimeout(() => {
    achievementsScreen.style.display = "none";
    achievementsScreen.classList.remove("menu-fade-out");
    mainMenu.classList.remove("menu-fade-in");
  }, 500);
});

function showEndScreen(playerWon) {
  if (gameOver) return;
  gameOver = true;

  const popup = document.createElement('div');
  popup.className = 'end-screen';

  if (!playerWon) {
    // === LOSS SCREEN ===
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
    document.body.appendChild(popup);

    document.getElementById('retry-btn').addEventListener('click', () => {
      popup.remove();
      resetGame();
      nextLevel();
    });

  } else {
    // === WIN SCREEN ===

    // Boss reward
    if (isBossLevel) {
      const bossReward = 50;
      playerGold += bossReward;
      updateGoldEverywhere();
      meta.bossesDefeated++;
      saveMeta();
    }

    const runCompleted = (level >= 100);

    if (runCompleted) {
      // === FULL RUN COMPLETE (LEVEL 100) ===
      meta.wins++;
      saveMeta();

      const summaryHtml = `
        ❤️ Max Health: ${getPlayerMaxHealth()}<br>
        ⚔️ Attack Squares: ${playerAttackCount}<br>
        💥 Total Damage Dealt: ${totalDamageDealt}<br>
        💢 Total Damage Taken: ${totalDamageTaken}<br>
        💚 Total Healing Done: ${totalHealingDone}<br>
        🔁 Revives Used: ${revivesUsed}<br>
        🧩 Items Collected: ${playerItems.length}<br>
        🏆 Total Wins: ${meta.wins}
      `;

      popup.innerHTML = `
        <div class="end-screen-content">
          <h1>🏆 Run Complete!</h1>
          <p>You reached <strong>Level 100</strong>. Amazing!</p>
          <h2 style="margin-top:24px;">📊 Run Summary</h2>
          <p>${summaryHtml}</p>

          <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;">
            <button id="continue-endless-btn">Continue (Endless)</button>
            <button id="new-run-btn">New Run</button>
            <button id="main-menu-btn">Main Menu</button>
          </div>
        </div>
      `;
      document.body.appendChild(popup);

      // Continue into endless mode
      popup.querySelector('#continue-endless-btn').addEventListener('click', () => {
        popup.remove();
        currentShopPopup = null;
        level++;                 // go beyond 100
        enemyAttackCount += 1;
        if (level % 2 === 0) playerAttackCount += 1;
        saveRun();
        nextLevel();
      });

      // Start a brand new run
      popup.querySelector('#new-run-btn').addEventListener('click', () => {
        popup.remove();
        currentShopPopup = null;
        startNewRun();
      });

    } else {
      // === NORMAL LEVEL CLEAR (INTER-LEVEL SHOP) ===
      popup.innerHTML = `
        <div class="end-screen-content">
          <h1>You Win!</h1>
          <p>Level ${level} cleared. Spend your gold, then continue.</p>

          <p>You have <strong style="color:gold;">💰 <span id="shop-gold">${playerGold}</span></strong></p>
          <div id="shop-items"></div>

          <br>
          <button id="continue-btn">Continue</button>
          <br><br>
          <button id="main-menu-btn">Main Menu</button>
        </div>
      `;
      document.body.appendChild(popup);

      buildShopUI(popup);

      popup.querySelector('#continue-btn').addEventListener('click', () => {
        popup.remove();
        currentShopPopup = null;
        level++;
        enemyAttackCount += 1;
        if (level % 2 === 0) playerAttackCount += 1;
        saveRun();
        nextLevel();
      });
    }
  }

  // === Main Menu (shared for both win & loss) ===
  const mainMenuBtn = document.getElementById('main-menu-btn');
  if (mainMenuBtn) {
    mainMenuBtn.addEventListener('click', () => {
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
        localStorage.removeItem(SAVE_KEY_RUN);
        resetGame();
      });

      document.getElementById('confirm-main-menu-no').addEventListener('click', () => {
        confirmPopup.remove();
      });
    });
  }
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
      localStorage.removeItem(SAVE_KEY_RUN);
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
  
  // Passive gold income each level start
  const gstats = getGoldStats();
  if (gstats.passiveGoldPerRound > 0) {
    playerGold += gstats.passiveGoldPerRound;
    meta.totalGoldEarned += gstats.passiveGoldPerRound;
    saveMeta();
    updateGoldEverywhere();
  }


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
  buttons.style.opacity = "0";
  buttons.style.pointerEvents = "none";
  mainMenu.classList.add("menu-zoom-out");

  setTimeout(() => {
    mainMenu.style.display = "none";
    mainMenu.classList.remove("menu-zoom-out");
    buttons.style.opacity = "1";
    buttons.style.pointerEvents = "auto";

    // Try resume saved run; if none, start fresh
    if (!loadRun()) {
      startNewRun();
    }
  }, 1200);
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

function startNewRun() {
  resetGame();
  meta.runsStarted++;
  saveMeta();
  saveRun();      // clean slate saved
  nextLevel();
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
const inventoryContainer = document.getElementById('inventory-container');
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
  const g = getGoldStats();
  const goldPerTile = GOLD_PER_TILE + (g.extraGoldPerTile || 0);
  const goldTilesPerRound = GOLD_TILES_PER_ROUND + (g.extraGoldTiles || 0);

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
    🔢 Attack Squares: ${playerAttackCount}<br>
    🪙 Gold per Tile: ${goldPerTile}<br>
    🟨 Gold Tiles: ${goldTilesPerRound}
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