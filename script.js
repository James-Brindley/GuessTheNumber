// Grid dimensions - 15 columns by 4 rows gives us 60 tiles to work with
const cols = 15;
const rows = 4;


// How many attack tiles spawn for player vs enemy each round
const BASE_PLAYER_ATTACK_COUNT = 10;
const BASE_ENEMY_ATTACK_COUNT = 1;


// These can change as the player gets items that add more attack tiles
let playerAttackCount = BASE_PLAYER_ATTACK_COUNT;
let enemyAttackCount = BASE_ENEMY_ATTACK_COUNT;

const totalCells = cols * rows;


// Starting health for both player and enemy
const BASE_PLAYER_HEALTH_COUNT = 100;
const BASE_ENEMY_HEALTH_COUNT = 100;


// Current health values (go up and down during combat)
let playerHealth = BASE_PLAYER_HEALTH_COUNT;
let enemyHealth = BASE_ENEMY_HEALTH_COUNT;


// Max health can increase with items
let playerMaxHealth = BASE_PLAYER_HEALTH_COUNT;
let enemyMaxHealth = BASE_ENEMY_HEALTH_COUNT;


// Enemies get tougher as you progress through levels
let enemyBonusHealth = 0;
let enemyBonusDamage = 0;


// Combo system - hit the right tiles in a row to multiply your damage
// Maxes out at 2.0x, resets to 1.0 if you hit a wrong tile
let playerCombo = 1.0;
let enemyCombo = 1.0;
const MAX_COMBO = 2.0; 
const COMBO_STEP = 0.2;


// Track stats for the current run to show at the end
let totalDamageDealt = 0;
let totalDamageTaken = 0;
let totalHealingDone = 0;
let revivesUsed = 0;


// Core game state
let level = 1;
let gameOver = false;
let playerItems = [];


// Gold system - earn gold from gold tiles, spend it in the shop
let playerGold = 0;
const GOLD_TILES_PER_ROUND = 5;     
const GOLD_PER_TILE = 5;            


// Visual sizing for the grid - makes it responsive to different screen sizes
const GAP_PX = 5;
const BASE_CELL_PX = 80;   
const MIN_CELL_PX  = 28;   

let gridBoxW = 0; 
let gridBoxH = 0; 

// --- NEW GLOBAL SCALE VARIABLE ---
let globalScale = 1.0;
const BASE_GAME_WIDTH = 1280; // Assuming a base design width for the game's UI elements
const BASE_GAME_HEIGHT = 720; // Assuming a base design height

// After beating level 100, you can keep going in endless mode
let endlessMode = false;


// Figure out how big the grid should be based on screen size
function initGridBox(baseCols = cols, baseRows = rows) {
  
  // 1. Calculate the desired size of the grid based on BASE_CELL_PX
  let wantedW = baseCols * BASE_CELL_PX + (baseCols - 1) * GAP_PX;
  let wantedH = baseRows * BASE_CELL_PX + (baseRows - 1) * GAP_PX;

  
  // 2. Determine the available space for the game
  const capW = window.innerWidth;
  const capH = window.innerHeight;

  // 3. Calculate the global scale factor based on the entire viewport
  // We want the whole game to fit, so we use the smaller of the two ratios (width or height)
  const scaleX = capW / BASE_GAME_WIDTH;
  const scaleY = capH / BASE_GAME_HEIGHT;
  globalScale = Math.min(scaleX, scaleY, 1.0); // Cap at 1.0 to prevent upscaling on large screens

  // 4. Apply the global scale to the grid's wanted size
  const scaledWantedW = wantedW * globalScale;
  const scaledWantedH = wantedH * globalScale;

  // 5. Calculate the final grid box size, ensuring it fits within the available space
  // This part is a bit tricky because the original code seems to calculate a scale for the grid itself.
  // Let's simplify: the grid container should be sized based on the scaled BASE_CELL_PX
  
  // Recalculate the grid's scale based on the available space for the grid only (e.g., 90% of height)
  const gridCapH = Math.min(window.innerHeight * 0.90, 900);
  const gridScale = Math.min(capW / wantedW, gridCapH / wantedH, 1);
  
  // The original logic for grid scaling is fine, but we need to ensure the UI elements scale with `globalScale`.
  // Let's keep the original grid scaling logic for the grid itself, but use the `globalScale` for the main game wrapper.
  
  // Reverting to original grid scaling logic for the grid container size:
  const capW_orig = Math.min(window.innerWidth * 1);
  const capH_orig = Math.min(window.innerHeight * 0.90, 900);
  const scale_orig = Math.min(capW_orig / wantedW, capH_orig / wantedH, 1);
  
  gridBoxW = Math.floor(wantedW * scale_orig);
  gridBoxH = Math.floor(wantedH * scale_orig);

  
  container.style.setProperty('--grid-box-w', `${gridBoxW}px`);
  container.style.setProperty('--grid-box-h', `${gridBoxH}px`);
  
  // --- NEW: Set the global scale for the CSS to use ---
  document.documentElement.style.setProperty('--global-scale', globalScale);
}


// Update the gold display everywhere (HUD and shop)
// Also disable shop buttons if you can't afford them
function updateGoldEverywhere() {
  
  updateGoldDisplay();

  
  if (typeof currentShopPopup === 'undefined' || !currentShopPopup) return;

  
  const shopGoldEl = currentShopPopup.querySelector('#shop-gold');
  if (shopGoldEl) shopGoldEl.textContent = playerGold;

  
  currentShopPopup.querySelectorAll('button[data-cost]').forEach(btn => {
    const cost = Number(btn.dataset.cost);
    const purchased = btn.dataset.purchased === '1';
    btn.disabled = purchased || playerGold < cost;
  });
}

let currentShopPopup = null;


// Boss battles happen every 10 levels - they're tougher with more health and damage
let isBossLevel = false;

const BOSS_MULTIPLIER = {
  health: 1.5,
  damage: 2,
};


// Different sprite images for boss animations
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


// Grid can expand if we need more tiles (like when you have lots of attack tiles)
let currentGridCols = cols;
let currentGridRows = rows;


// Calculate the actual pixel size for each grid cell
function sizeGridBox(cols, rows) {
  
  if (!gridBoxW || !gridBoxH) initGridBox();

  const cellW = (gridBoxW - (cols - 1) * GAP_PX) / cols;
  const cellH = (gridBoxH - (rows - 1) * GAP_PX) / rows;
  const cell  = Math.max(MIN_CELL_PX, Math.floor(Math.min(cellW, cellH)));

  container.style.setProperty('--grid-cols', cols);
  container.style.setProperty('--cell-size', `${cell}px`);
}


// Grab references to the main HTML elements we'll be using
const container = document.getElementById('grid-container');
const mainMenu = document.getElementById('main-menu');
const startButton = document.getElementById('start-game-btn');

initGridBox();

// --- NEW: Add event listener for window resize to re-calculate scale ---
window.addEventListener('resize', () => {
    initGridBox();
    sizeGridBox(currentGridCols, currentGridRows);
    // Re-position the main game wrapper if needed, though CSS should handle it
});

// Create the level display that shows what level you're on
const levelDisplay = document.createElement('div');
levelDisplay.id = 'level-display';
levelDisplay.textContent = `Level ${level}`;
document.body.appendChild(levelDisplay);


// Update the health bars for player and enemy
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


// Update the level display and save if it's a new record
function updateLevel() {
  updateGoldEverywhere();
  levelDisplay.textContent = `Level ${level}`;
  if (level > meta.highestLevel) { meta.highestLevel = level; metaUpdated(); }
}


// Create the gold counter display
const goldDisplay = document.createElement('div');
goldDisplay.id = 'gold-display';
goldDisplay.textContent = `💰 ${playerGold}`;
document.body.appendChild(goldDisplay);


// Refresh the gold counter in the HUD
function updateGoldDisplay() {
  goldDisplay.textContent = `💰 ${playerGold}`;
}


// Calculate max health including bonuses from items
function getPlayerMaxHealth() {
  let bonus = 0;

  playerItems.forEach(item => {
    if (item.bonusHP) bonus += item.bonusHP;
  });

  return BASE_PLAYER_HEALTH_COUNT + bonus;
}


// Calculate enemy max health with progression bonuses
function getEnemyMaxHealth() {
  let base = BASE_ENEMY_HEALTH_COUNT;
  let bonus = 0;
  playerItems.forEach(item => {
    if (item.bonusEnemyHP) bonus += item.bonusEnemyHP;
  });
  return base + bonus;
}


// Add up all the stat bonuses from your items
// Returns things like bonus damage, damage reduction, healing, etc.
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


// Some items cause burn damage - this applies it each turn
function applyBurnEffect() {
  const stats = getPlayerStats();
  if (stats.burnDamage > 0 && enemyHealth > 0) {
    const burn = Math.round(stats.burnDamage);
    enemyHealth = Math.max(0, enemyHealth - burn);
    totalDamageDealt += burn;
    meta.totalDamageDealtAllRuns += burn;
    metaUpdated();
    showHitPopup(false, `-${burn}`, false);

    const enemyEl = document.querySelector('.enemy-container');
    enemyEl.classList.add('burn-flash');
    setTimeout(() => enemyEl.classList.remove('burn-flash'), 150);

    updateHealth();
    return enemyHealth <= 0;
  }
  return false;
}


// Keys for saving game data to browser localStorage
const SAVE_KEY_RUN  = 'gtd_run_v1';
const SAVE_KEY_META = 'gtd_meta_v1';


// Meta progression - stats that persist across all your runs
// Used for achievements and tracking overall progress
let meta = {
  wins: 0,
  runsStarted: 0,
  bossesDefeated: 0,
  highestLevel: 0,
  totalGoldEarned: 0,
  totalDamageDealtAllRuns: 0,
  totalDamageTakenAllRuns: 0,
  totalTilesClicked: 0,
  achievementTiers: {}
};


// Load saved meta progression when the game starts
loadMeta();


// Achievement tiers - you progress from Bronze -> Silver -> Gold -> Platinum
const TIERS = [
  { name: 'Bronze',   color: '#cd7f32' },
  { name: 'Silver',   color: '#c0c0c0' },
  { name: 'Gold',     color: '#ffd700' },
  { name: 'Platinum', color: '#e5e4e2' },
];


// All the achievements you can unlock - each has thresholds for the different tiers
const ACHIEVEMENTS = [
  {
    id: 'boss_slayer',
    title: 'Boss Slayer',
    desc: 'Defeat bosses over all runs',
    
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
    thresholds: [1000, 5000, 10000, 25000],
    getProgress: () => meta.totalGoldEarned
  },
  {
    id: 'damage_dealer',
    title: 'Damage Dealer',
    desc: 'Deal damage across all runs',
    thresholds: [10000, 50000, 100000, 250000],
    getProgress: () => meta.totalDamageDealtAllRuns
  },
  {
    id: 'tank',
    title: 'Tank',
    desc: 'Take damage across all runs',
    thresholds: [5000, 25000, 50000, 100000],
    getProgress: () => meta.totalDamageTakenAllRuns
  },
  {
    id: 'tile_master',
    title: 'Tile Master',
    desc: 'Click tiles across all runs',
    thresholds: [1000, 5000, 10000, 25000],
    getProgress: () => meta.totalTilesClicked
  },
  {
    id: 'level_climber',
    title: 'Level Climber',
    desc: 'Reach a high level in a single run',
    thresholds: [10, 25, 50, 100],
    getProgress: () => meta.highestLevel
  }
];


// Check if any achievement has been unlocked or upgraded
function checkAchievements() {
  ACHIEVEMENTS.forEach(ach => {
    const progress = ach.getProgress();
    let currentTier = meta.achievementTiers[ach.id] || -1;

    for (let i = currentTier + 1; i < TIERS.length; i++) {
      if (progress >= ach.thresholds[i]) {
        meta.achievementTiers[ach.id] = i;
        showAchievementToast(ach, TIERS[i]);
        currentTier = i;
      } else {
        break;
      }
    }
  });
}


// Show a small notification when an achievement is unlocked
function showAchievementToast(ach, tier) {
  const container = document.getElementById('achievement-toast-container');
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <span class="achievement-tier" style="color: ${tier.color};">${tier.name}</span>
    <span class="achievement-title">${ach.title} Unlocked!</span>
  `;
  container.appendChild(toast);

  // Remove the toast after a few seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 5000);
}


// Save the meta progression to localStorage
function metaUpdated() {
  localStorage.setItem(SAVE_KEY_META, JSON.stringify(meta));
  checkAchievements();
}


// Load the meta progression from localStorage
function loadMeta() {
  const savedMeta = localStorage.getItem(SAVE_KEY_META);
  if (savedMeta) {
    meta = JSON.parse(savedMeta);
  }
}


// Save the current game state (run) to localStorage
function saveGame() {
  const gameState = {
    playerHealth,
    enemyHealth,
    playerMaxHealth,
    enemyMaxHealth,
    playerCombo,
    enemyCombo,
    level,
    playerItems,
    playerGold,
    totalDamageDealt,
    totalDamageTaken,
    totalHealingDone,
    revivesUsed,
    endlessMode,
    enemyBonusHealth,
    enemyBonusDamage,
    isBossLevel,
    currentGridCols,
    currentGridRows,
  };
  localStorage.setItem(SAVE_KEY_RUN, JSON.stringify(gameState));
}


// Load the game state from localStorage
function loadGame() {
  const savedGame = localStorage.getItem(SAVE_KEY_RUN);
  if (savedGame) {
    const gameState = JSON.parse(savedGame);
    playerHealth = gameState.playerHealth;
    enemyHealth = gameState.enemyHealth;
    playerMaxHealth = gameState.playerMaxHealth;
    enemyMaxHealth = gameState.enemyMaxHealth;
    playerCombo = gameState.playerCombo;
    enemyCombo = gameState.enemyCombo;
    level = gameState.level;
    playerItems = gameState.playerItems;
    playerGold = gameState.playerGold;
    totalDamageDealt = gameState.totalDamageDealt;
    totalDamageTaken = gameState.totalDamageTaken;
    totalHealingDone = gameState.totalHealingDone;
    revivesUsed = gameState.revivesUsed;
    endlessMode = gameState.endlessMode;
    enemyBonusHealth = gameState.enemyBonusHealth;
    enemyBonusDamage = gameState.enemyBonusDamage;
    isBossLevel = gameState.isBossLevel;
    currentGridCols = gameState.currentGridCols;
    currentGridRows = gameState.currentGridRows;

    // Update UI elements after loading
    updateHealth();
    updateLevel();
    updateGoldDisplay();
    // Re-initialize the grid size based on loaded state
    initGridBox(currentGridCols, currentGridRows);
    sizeGridBox(currentGridCols, currentGridRows);
    
    return true;
  }
  return false;
}


// Clear the saved game state
function clearGameSave() {
  localStorage.removeItem(SAVE_KEY_RUN);
}


// The core data structure for a single tile on the grid
class Tile {
  constructor(index, type, value = 0) {
    this.index = index;
    this.type = type; // 'attack', 'eAttack', 'gold', 'blank'
    this.value = value;
    this.element = null; // HTML element reference
    this.clicked = false;
  }
}

let grid = []; // Array to hold all the Tile objects
let currentRoundTiles = []; // Tiles for the current round
let isPlayerTurn = true; // Flag to track whose turn it is
let isProcessingClick = false; // Prevent double-clicks

// Item definitions
const ITEMS = [
  {
    id: 'small_sword',
    name: 'Small Sword',
    desc: '+5 Damage',
    rarity: 'Common',
    cost: 100,
    bonusDamage: 5,
  },
  {
    id: 'leather_armor',
    name: 'Leather Armor',
    desc: '5% Damage Reduction',
    rarity: 'Common',
    cost: 150,
    damageReduction: 0.05,
  },
  {
    id: 'healing_potion',
    name: 'Healing Potion',
    desc: '+1 HP on every attack',
    rarity: 'Rare',
    cost: 300,
    healOnAttack: 1,
  },
  {
    id: 'lucky_charm',
    name: 'Lucky Charm',
    desc: '10% chance to ignore enemy damage',
    rarity: 'Rare',
    cost: 400,
    ignoreDamageChance: 0.1,
  },
  {
    id: 'gold_magnet',
    name: 'Gold Magnet',
    desc: '+1 Gold per Gold Tile',
    rarity: 'Common',
    cost: 50,
    extraGoldPerTile: 1,
  },
  {
    id: 'fire_ring',
    name: 'Ring of Fire',
    desc: 'Applies 5 Burn Damage per round',
    rarity: 'Epic',
    cost: 800,
    burnDamage: 5,
  },
  {
    id: 'revive_feather',
    name: 'Phoenix Feather',
    desc: 'Automatically revives you once per run',
    rarity: 'Legendary',
    cost: 1500,
    revive: true,
  },
  {
    id: 'health_amulet',
    name: 'Amulet of Vitality',
    desc: '+25 Max HP',
    rarity: 'Rare',
    cost: 500,
    bonusHP: 25,
  },
  {
    id: 'combo_glove',
    name: 'Combo Glove',
    desc: 'Combo increases by 0.3 instead of 0.2',
    rarity: 'Epic',
    cost: 700,
    comboBoost: 0.1, // Adds 0.1 to the base 0.2
  },
  {
    id: 'gold_pouch',
    name: 'Gold Pouch',
    desc: '+10 Passive Gold per round',
    rarity: 'Common',
    cost: 100,
    passiveGoldPerRound: 10,
  },
  {
    id: 'extra_gold_map',
    name: 'Treasure Map',
    desc: '+1 Extra Gold Tile per round',
    rarity: 'Rare',
    cost: 350,
    extraGoldTiles: 1,
  }
];


// Helper to get an item by its ID
function getItemById(id) {
  return ITEMS.find(item => item.id === id);
}


// Add an item to the player's inventory
function addItem(item) {
  playerItems.push(item);
  playerMaxHealth = getPlayerMaxHealth();
  updateHealth();
  updateInventoryDisplay();
  saveGame();
}


// Update the inventory panel content
function updateInventoryDisplay() {
  const panel = document.getElementById('inventory-panel');
  panel.innerHTML = ''; // Clear previous content

  if (playerItems.length === 0) {
    panel.innerHTML = '<p>Inventory is empty.</p>';
    return;
  }

  const list = document.createElement('ul');
  playerItems.forEach(item => {
    const listItem = document.createElement('li');
    listItem.className = `rarity-${item.rarity.toLowerCase()}`;
    listItem.innerHTML = `<strong>${item.name}</strong>: ${item.desc}`;
    list.appendChild(listItem);
  });
  panel.appendChild(list);
}


// Show the shop popup
function showShop() {
  const shopScreen = document.getElementById('shop-screen');
  const shopItemsContainer = document.getElementById('shop-items');
  shopItemsContainer.innerHTML = ''; // Clear previous items

  // Get 3 random items that the player doesn't already have (unless they are stackable)
  const availableItems = ITEMS.filter(item => {
    // Check if the item is already owned and if it's a unique item (like revive)
    const isOwned = playerItems.some(ownedItem => ownedItem.id === item.id);
    if (item.revive && isOwned) return false; // Only one revive feather
    return true;
  });

  // Simple random selection (can be improved with rarity weighting)
  const shopSelection = [];
  while (shopSelection.length < 3 && availableItems.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableItems.length);
    const item = availableItems.splice(randomIndex, 1)[0];
    shopSelection.push(item);
  }

  shopSelection.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = `shop-item rarity-${item.rarity.toLowerCase()}`;
    itemEl.innerHTML = `
      <h3>${item.name}</h3>
      <p>${item.desc}</p>
      <button data-cost="${item.cost}" data-item-id="${item.id}">Buy (${item.cost} 💰)</button>
    `;
    shopItemsContainer.appendChild(itemEl);
  });

  shopScreen.style.display = 'flex';
  currentShopPopup = shopScreen;
  updateGoldEverywhere(); // Update gold display and button states
}


// Handle buying an item from the shop
document.addEventListener('click', (e) => {
  if (e.target.matches('#shop-items button')) {
    const button = e.target;
    const cost = Number(button.dataset.cost);
    const itemId = button.dataset.itemId;

    if (playerGold >= cost) {
      playerGold -= cost;
      const item = getItemById(itemId);
      addItem(item);
      button.textContent = 'Purchased!';
      button.dataset.purchased = '1';
      updateGoldEverywhere();
    }
  }
});


// Hide the shop and continue the game
document.getElementById('continue-game-btn').addEventListener('click', () => {
  document.getElementById('shop-screen').style.display = 'none';
  currentShopPopup = null;
  startRound();
});


// Handle the pause button
document.getElementById('pause-btn').addEventListener('click', togglePause);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    togglePause();
  }
});

function togglePause() {
  const pauseScreen = document.getElementById('pause-screen');
  if (pauseScreen.style.display === 'flex') {
    pauseScreen.style.display = 'none';
    // Resume game logic (if any)
  } else {
    pauseScreen.style.display = 'flex';
    // Pause game logic (if any)
  }
}


// Create the initial grid structure (but don't populate tiles yet)
function createGrid() {
  container.innerHTML = ''; // Clear existing grid
  grid = [];
  
  // Set the number of columns and rows for the CSS grid
  container.style.gridTemplateColumns = `repeat(${currentGridCols}, var(--cell-size))`;
  
  for (let i = 0; i < currentGridCols * currentGridRows; i++) {
    const tile = new Tile(i, 'blank');
    grid.push(tile);

    const cell = document.createElement('div');
    cell.className = 'grid-item';
    cell.dataset.index = i;
    cell.addEventListener('click', handleTileClick);
    
    tile.element = cell;
    container.appendChild(cell);
  }
  
  // Trigger the grow-in animation
  setTimeout(() => container.classList.add('grid-grow'), 50);
}


// Populate the grid with tiles for the current round
function populateGrid() {
  // Reset all tiles to blank
  grid.forEach(tile => {
    tile.type = 'blank';
    tile.value = 0;
    tile.clicked = false;
    tile.element.className = 'grid-item'; // Reset classes
    tile.element.textContent = ''; // Clear text
  });

  // Calculate the number of tiles to spawn
  const stats = getPlayerStats();
  const playerTiles = playerAttackCount + stats.bonusDamage;
  const enemyTiles = enemyAttackCount;
  const goldTiles = GOLD_TILES_PER_ROUND + stats.extraGoldTiles;
  
  // Create a list of all tile types to place
  const tileTypes = [];
  for (let i = 0; i < playerTiles; i++) tileTypes.push('attack');
  for (let i = 0; i < enemyTiles; i++) tileTypes.push('eAttack');
  for (let i = 0; i < goldTiles; i++) tileTypes.push('gold');
  
  // Shuffle the tile types
  for (let i = tileTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tileTypes[i], tileTypes[j]] = [tileTypes[j], tileTypes[i]];
  }
  
  // Place the tiles on the grid
  currentRoundTiles = [];
  const availableIndices = Array.from({ length: grid.length }, (_, i) => i);
  
  tileTypes.forEach(type => {
    if (availableIndices.length === 0) return; // Grid is full

    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    const gridIndex = availableIndices.splice(randomIndex, 1)[0];
    
    const tile = grid[gridIndex];
    tile.type = type;
    tile.element.classList.add(type);
    currentRoundTiles.push(tile);
  });
  
  // Add safe numbers to the grid
  // This is a placeholder for the item logic that adds safe numbers
  // For now, let's just add a safe number to a random blank tile
  const blankTiles = grid.filter(t => t.type === 'blank');
  if (blankTiles.length > 0) {
    const safeTile = blankTiles[Math.floor(Math.random() * blankTiles.length)];
    safeTile.value = 3; // Example: 3 safe squares
    safeTile.element.textContent = safeTile.value;
    safeTile.element.classList.add('safe-range');
  }
  
  isPlayerTurn = true;
  isProcessingClick = false;
}


// Handle a tile click event
function handleTileClick(e) {
  if (gameOver || !isPlayerTurn || isProcessingClick) return;

  const index = Number(e.currentTarget.dataset.index);
  const tile = grid[index];

  if (tile.clicked) return;

  isProcessingClick = true;
  tile.clicked = true;
  tile.element.classList.add('active');
  meta.totalTilesClicked++;
  metaUpdated();

  switch (tile.type) {
    case 'attack':
      handlePlayerAttack(tile);
      break;
    case 'eAttack':
      handleEnemyAttack(tile);
      break;
    case 'gold':
      handleGoldTile(tile);
      break;
    case 'blank':
      handleBlankTile(tile);
      break;
  }
  
  // After processing, check for game end conditions
  if (playerHealth <= 0 || enemyHealth <= 0) {
    endGame();
    return;
  }

  // Check if all tiles have been clicked
  if (grid.every(t => t.clicked)) {
    endRound();
    return;
  }

  // Allow the next click after a short delay
  setTimeout(() => {
    isProcessingClick = false;
  }, 300);
}


// Player hits an attack tile
function handlePlayerAttack(tile) {
  const stats = getPlayerStats();
  const baseDamage = 10;
  let damage = Math.round((baseDamage + stats.bonusDamage) * playerCombo);
  
  // Apply combo boost
  playerCombo = Math.min(MAX_COMBO, playerCombo + COMBO_STEP + stats.comboBoost);
  
  // Deal damage
  enemyHealth = Math.max(0, enemyHealth - damage);
  totalDamageDealt += damage;
  meta.totalDamageDealtAllRuns += damage;
  metaUpdated();
  
  // Heal on attack
  if (stats.healOnAttack > 0) {
    playerHealth = Math.min(playerMaxHealth, playerHealth + stats.healOnAttack);
    totalHealingDone += stats.healOnAttack;
    showHitPopup(true, `+${stats.healOnAttack}`, true);
  }
  
  // Visual feedback
  showHitPopup(false, `-${damage}`);
  
  // Animate hero attack
  const heroEl = document.querySelector('.hero-container');
  heroEl.classList.add('attacking');
  setTimeout(() => heroEl.classList.remove('attacking'), 600);
  
  updateHealth();
}


// Player hits an enemy attack tile
function handleEnemyAttack(tile) {
  const stats = getPlayerStats();
  const baseDamage = 15;
  let damage = Math.round(baseDamage * enemyCombo);
  
  // Apply damage reduction
  damage = Math.round(damage * (1 - stats.damageReduction));
  
  // Check for ignore damage chance
  if (Math.random() < stats.ignoreDamageChance) {
    damage = 0;
    showHitPopup(true, 'MISS', false);
  }
  
  // Reset player combo
  playerCombo = 1.0;
  
  // Take damage
  playerHealth = Math.max(0, playerHealth - damage);
  totalDamageTaken += damage;
  meta.totalDamageTakenAllRuns += damage;
  metaUpdated();
  
  // Visual feedback
  showHitPopup(true, `-${damage}`);
  
  // Animate enemy attack
  const enemyEl = document.querySelector('.enemy-container');
  enemyEl.classList.add('attacking');
  setTimeout(() => enemyEl.classList.remove('attacking'), 600);
  
  updateHealth();
}


// Player hits a gold tile
function handleGoldTile(tile) {
  const stats = getPlayerStats();
  const gold = GOLD_PER_TILE + stats.extraGoldPerTile;
  playerGold += gold;
  meta.totalGoldEarned += gold;
  metaUpdated();
  
  // Reset player combo
  playerCombo = 1.0;
  
  // Visual feedback
  showHitPopup(true, `+${gold} 💰`, true);
  
  updateGoldDisplay();
}


// Player hits a blank tile
function handleBlankTile(tile) {
  // Reset player combo
  playerCombo = 1.0;
  
  // Handle safe number logic
  if (tile.value > 0) {
    // Reveal nearby tiles
    revealNearbyTiles(tile.index, tile.value);
    tile.element.textContent = '';
    tile.element.classList.remove('safe-range');
  }
  
  // Visual feedback
  showHitPopup(true, 'Safe', true);
}


// Reveal a number of unclicked tiles around the safe tile
function revealNearbyTiles(centerIndex, count) {
  const indices = [];
  const centerCol = centerIndex % currentGridCols;
  const centerRow = Math.floor(centerIndex / currentGridCols);
  
  // Get all 8 neighbors
  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      if (r === 0 && c === 0) continue;
      
      const newRow = centerRow + r;
      const newCol = centerCol + c;
      
      if (newRow >= 0 && newRow < currentGridRows && newCol >= 0 && newCol < currentGridCols) {
        const index = newRow * currentGridCols + newCol;
        if (grid[index] && !grid[index].clicked) {
          indices.push(index);
        }
      }
    }
  }
  
  // Shuffle and select 'count' number of tiles to reveal
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  const tilesToReveal = indices.slice(0, count);
  
  tilesToReveal.forEach(index => {
    const tile = grid[index];
    tile.element.classList.add('revealed');
    // Show the tile type temporarily
    tile.element.textContent = getTileSymbol(tile.type);
    
    setTimeout(() => {
      tile.element.classList.remove('revealed');
      tile.element.textContent = '';
    }, 1000);
  });
}


// Helper to get a symbol for a tile type
function getTileSymbol(type) {
  switch (type) {
    case 'attack': return '⚔️';
    case 'eAttack': return '💥';
    case 'gold': return '💰';
    default: return '';
  }
}


// Show a floating damage/heal/gold popup
function showHitPopup(isPlayer, text, isPositive = false) {
  const containerEl = isPlayer ? document.querySelector('.hero-container') : document.querySelector('.enemy-container');
  const popup = document.createElement('div');
  popup.className = `hit-popup ${isPositive ? 'positive' : 'negative'}`;
  popup.textContent = text;
  
  // Position the popup relative to the character container
  const rect = containerEl.getBoundingClientRect();
  popup.style.left = `${rect.left + rect.width / 2}px`;
  popup.style.top = `${rect.top}px`;
  
  document.body.appendChild(popup);
  
  // Animate and remove
  setTimeout(() => {
    popup.classList.add('fade-out');
    popup.addEventListener('transitionend', () => popup.remove());
  }, 1000);
}


// End of the current round (all tiles clicked)
function endRound() {
  // Apply passive effects (burn, regen, passive gold)
  let enemyDiedFromBurn = applyBurnEffect();
  if (enemyDiedFromBurn) {
    endGame();
    return;
  }
  
  const stats = getPlayerStats();
  
  // Regen
  playerHealth = Math.min(playerMaxHealth, playerHealth + stats.regenPerRound);
  updateHealth();
  
  // Passive Gold
  playerGold += stats.passiveGoldPerRound;
  meta.totalGoldEarned += stats.passiveGoldPerRound;
  metaUpdated();
  updateGoldDisplay();
  
  // Advance to the next level
  level++;
  updateLevel();
  
  // Check for boss level
  isBossLevel = level % 10 === 0;
  
  // Show shop every 5 levels (or after a boss)
  if (level % 5 === 1 || isBossLevel) {
    showShop();
  } else {
    // Start the next round immediately
    startRound();
  }
  
  saveGame();
}


// Start a new round (new level)
function startRound() {
  // Reset enemy health and stats
  enemyMaxHealth = getEnemyMaxHealth();
  enemyHealth = enemyMaxHealth;
  enemyCombo = 1.0;
  
  // Increase enemy difficulty based on level
  enemyBonusHealth = Math.floor(level / 5) * 10;
  enemyBonusDamage = Math.floor(level / 10) * 5;
  
  // Apply boss multiplier
  if (isBossLevel) {
    enemyMaxHealth = Math.round(enemyMaxHealth * BOSS_MULTIPLIER.health);
    enemyHealth = enemyMaxHealth;
    enemyBonusDamage = Math.round(enemyBonusDamage * BOSS_MULTIPLIER.damage);
    // Update enemy sprite to boss
    document.getElementById('enemy').src = bossSprites.idle[0];
    document.querySelector('.enemy-health-fill').classList.add('boss-health');
  } else {
    // Reset enemy sprite
    document.getElementById('enemy').src = 'assets/eReady_1.png';
    document.querySelector('.enemy-health-fill').classList.remove('boss-health');
  }
  
  updateHealth();
  
  // Populate the grid with new tiles
  populateGrid();
}


// Game over or victory
function endGame() {
  gameOver = true;
  clearGameSave();
  
  const endScreen = document.getElementById('end-screen');
  const titleEl = document.getElementById('end-screen-title');
  const messageEl = document.getElementById('end-screen-message');
  
  if (playerHealth <= 0) {
    // Check for revive item
    const reviveItem = playerItems.find(item => item.revive && revivesUsed === 0);
    if (reviveItem) {
      revivesUsed++;
      playerHealth = playerMaxHealth; // Full heal
      gameOver = false; // Continue game
      updateHealth();
      showHitPopup(true, 'REVIVED!', true);
      // Remove the revive item from inventory display
      updateInventoryDisplay();
      // Allow the game to continue
      setTimeout(() => {
        isProcessingClick = false;
      }, 500);
      return;
    }
    
    // Actual Game Over
    titleEl.textContent = 'Game Over';
    messageEl.innerHTML = `
      You were defeated at <strong>Level ${level}</strong>.
      <br>
      Damage Dealt: ${totalDamageDealt}
      <br>
      Damage Taken: ${totalDamageTaken}
      <br>
      Gold Earned: ${playerGold}
    `;
  } else if (enemyHealth <= 0) {
    // Victory
    titleEl.textContent = 'VICTORY!';
    messageEl.innerHTML = `
      You defeated the enemy at <strong>Level ${level}</strong>!
      <br>
      You earned <strong>${playerGold}</strong> gold this run.
    `;
    
    if (isBossLevel) {
      meta.bossesDefeated++;
      metaUpdated();
    }
    
    if (level >= 100) {
      meta.wins++;
      metaUpdated();
      endlessMode = true;
      messageEl.innerHTML += '<br>You have entered <strong>Endless Mode</strong>!';
    }
  }
  
  endScreen.style.display = 'flex';
}


// Start a new game
function startGame() {
  // Reset all game state variables
  playerHealth = BASE_PLAYER_HEALTH_COUNT;
  enemyHealth = BASE_ENEMY_HEALTH_COUNT;
  playerMaxHealth = BASE_PLAYER_HEALTH_COUNT;
  enemyMaxHealth = BASE_ENEMY_HEALTH_COUNT;
  playerCombo = 1.0;
  enemyCombo = 1.0;
  level = 1;
  gameOver = false;
  playerItems = [];
  playerGold = 0;
  totalDamageDealt = 0;
  totalDamageTaken = 0;
  totalHealingDone = 0;
  revivesUsed = 0;
  endlessMode = false;
  enemyBonusHealth = 0;
  enemyBonusDamage = 0;
  isBossLevel = false;
  currentGridCols = cols;
  currentGridRows = rows;
  
  meta.runsStarted++;
  metaUpdated();
  
  // Hide all screens
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('end-screen').style.display = 'none';
  document.getElementById('how-to-play-screen').style.display = 'none';
  document.getElementById('achievements-screen').style.display = 'none';
  
  // Show game elements
  document.getElementById('pause-btn').style.display = 'block';
  document.getElementById('inventory-container').style.display = 'block';
  
  // Create and start the game
  createGrid();
  updateInventoryDisplay();
  startRound();
}


// Event listeners for menu buttons
startButton.addEventListener('click', startGame);
document.getElementById('restart-game-btn').addEventListener('click', startGame);
document.getElementById('how-to-play-btn').addEventListener('click', () => {
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('how-to-play-screen').style.display = 'flex';
});
document.getElementById('back-to-menu-btn').addEventListener('click', () => {
  document.getElementById('how-to-play-screen').style.display = 'none';
  document.getElementById('main-menu').style.display = 'flex';
});
document.getElementById('achievements-btn').addEventListener('click', () => {
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('achievements-screen').style.display = 'flex';
  renderAchievements();
});
document.getElementById('achievements-back-btn').addEventListener('click', () => {
  document.getElementById('achievements-screen').style.display = 'none';
  document.getElementById('main-menu').style.display = 'flex';
});


// Render the achievements screen content
function renderAchievements() {
  const content = document.getElementById('achievements-content');
  content.innerHTML = '';
  
  ACHIEVEMENTS.forEach(ach => {
    const currentTierIndex = meta.achievementTiers[ach.id] || -1;
    const nextTierIndex = currentTierIndex + 1;
    const currentTier = currentTierIndex >= 0 ? TIERS[currentTierIndex] : null;
    const nextTier = nextTierIndex < TIERS.length ? TIERS[nextTierIndex] : null;
    const progress = ach.getProgress();
    
    const achEl = document.createElement('div');
    achEl.className = 'achievement-card';
    
    let tierHtml = '';
    if (currentTier) {
      tierHtml += `<span class="tier-label" style="color: ${currentTier.color};">${currentTier.name}</span>`;
    } else {
      tierHtml += '<span class="tier-label">Locked</span>';
    }
    
    let progressHtml = '';
    if (nextTier) {
      const threshold = ach.thresholds[nextTierIndex];
      const percent = Math.min(100, (progress / threshold) * 100);
      progressHtml = `
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${percent}%; background-color: ${nextTier.color};"></div>
        </div>
        <p class="progress-text">${progress} / ${threshold} (${nextTier.name})</p>
      `;
    } else {
      progressHtml = '<p class="progress-text">Max Tier Reached!</p>';
    }
    
    achEl.innerHTML = `
      <div class="achievement-header">
        <h2>${ach.title}</h2>
        ${tierHtml}
      </div>
      <p class="achievement-desc">${ach.desc}</p>
      ${progressHtml}
    `;
    
    content.appendChild(achEl);
  });
}


// Initial load check
if (loadGame()) {
  // If a game was loaded, hide the main menu and show the game
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('pause-btn').style.display = 'block';
  document.getElementById('inventory-container').style.display = 'block';
  createGrid();
  sizeGridBox(currentGridCols, currentGridRows);
  updateInventoryDisplay();
} else {
  // If no game was loaded, show the main menu
  document.getElementById('main-menu').style.display = 'flex';
  document.getElementById('pause-btn').style.display = 'none';
  document.getElementById('inventory-container').style.display = 'none';
}