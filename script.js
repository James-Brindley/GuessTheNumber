const cols = 15;
const rows = 4;

const BASE_PLAYER_ATTACK_COUNT = 10;
const BASE_ENEMY_ATTACK_COUNT = 5;

let playerAttackCount = BASE_PLAYER_ATTACK_COUNT;
let enemyAttackCount = BASE_ENEMY_ATTACK_COUNT;

const totalCells = cols * rows;

const BASE_PLAYER_HEALTH_COUNT = 100;
const BASE_ENEMY_HEALTH_COUNT = 100;

let playerHealth = BASE_PLAYER_HEALTH_COUNT;
let enemyHealth = BASE_ENEMY_HEALTH_COUNT;

let level = 1;
let gameOver = false;
let playerItems = [];

// === UI ELEMENTS ===
const playerHealthDisplay = document.getElementById('player-health-display');
const enemyHealthDisplay = document.getElementById('enemy-health-display');
const container = document.getElementById('grid-container');
const mainMenu = document.getElementById('main-menu');
const startButton = document.getElementById('start-game-btn');

const levelDisplay = document.createElement('div');
levelDisplay.id = 'level-display';
levelDisplay.textContent = `Level ${level}`;
document.body.appendChild(levelDisplay);

// === INVENTORY BUTTON & POPUP ===
const inventoryButton = document.createElement('div');
inventoryButton.id = 'inventory-button';
inventoryButton.textContent = '📜 Items';
document.body.appendChild(inventoryButton);

const inventoryPopup = document.createElement('div');
inventoryPopup.id = 'inventory-popup';
document.body.appendChild(inventoryPopup);

inventoryButton.addEventListener('mouseenter', showInventory);
inventoryButton.addEventListener('mouseleave', hideInventory);
inventoryPopup.addEventListener('mouseenter', showInventory);
inventoryPopup.addEventListener('mouseleave', hideInventory);

function showInventory() {
  inventoryPopup.innerHTML = `<h3>Your Items</h3>`;
  if (playerItems.length === 0) {
    inventoryPopup.innerHTML += `<p>No items collected yet.</p>`;
  } else {
    playerItems.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'inventory-item';
      itemDiv.innerHTML = `<strong style="color:${item.rarity?.color || 'white'}">${item.name || item.id}</strong><br><small>${item.description || ''}</small>`;
      inventoryPopup.appendChild(itemDiv);
    });
  }
  inventoryPopup.style.display = 'block';
}
function hideInventory() {
  inventoryPopup.style.display = 'none';
}

function updateHealth() {
  playerHealthDisplay.textContent = `Player Health: ${playerHealth}`;
  enemyHealthDisplay.textContent = `Enemy Health: ${enemyHealth}`;
}

function updateLevel() {
  levelDisplay.textContent = `Level ${level}`;
}

// === RARITY SYSTEM ===
const RARITY = {
  COMMON: { color: "#4CAF50", chance: 0.55 },
  RARE: { color: "#2196F3", chance: 0.25 },
  EPIC: { color: "#9C27B0", chance: 0.15 },
  LEGENDARY: { color: "#FFD700", chance: 0.05 },
};

// === ALL ITEMS ===
const allItems = [
  // COMMON
  { id: "smallSword", name: "Small Sword", description: "+1 Player Attack Count", rarity: RARITY.COMMON, applyEffect() { playerAttackCount += 1; } },
  { id: "leatherShield", name: "Leather Shield", description: "+5 Player HP", rarity: RARITY.COMMON, applyEffect() { playerHealth += 5; updateHealth(); } },
  { id: "vitalLeaf", name: "Vital Leaf", description: "Recover +3 HP per player attack", rarity: RARITY.COMMON, applyEffect() { playerItems.push({ id: "vitalLeafEffect", name: "Vital Leaf", description: "Recover +3 HP per player attack" }); } },
  { id: "tinyRing", name: "Tiny Lucky Ring", description: "5% chance to ignore enemy damage", rarity: RARITY.COMMON, applyEffect() { playerItems.push({ id: "tinyRingEffect", name: "Tiny Lucky Ring", description: "5% chance to ignore enemy damage" }); } },
  { id: "scoutGem", name: "Scout Gem", description: "Guarantees 1 safe number from 35–40", rarity: RARITY.COMMON, range: [35, 40], applyEffect() { playerItems.push(this); } },
  { id: "steadyBoots", name: "Steady Boots", description: "Take -2 damage from enemy attacks", rarity: RARITY.COMMON, applyEffect() { playerItems.push({ id: "steadyBootsEffect", name: "Steady Boots", description: "Take -2 damage from enemy attacks" }); } },
  { id: "minorFocus", name: "Minor Focus", description: "+2 Enemy HP damage per hit", rarity: RARITY.COMMON, applyEffect() { playerItems.push({ id: "minorFocusEffect", name: "Minor Focus", description: "+2 Enemy HP damage per hit" }); } },
  { id: "lightArmor", name: "Light Armor", description: "+1 HP regen each round", rarity: RARITY.COMMON, applyEffect() { playerItems.push({ id: "lightArmorEffect", name: "Light Armor", description: "+1 HP regen each round" }); } },
  { id: "crudePotion", name: "Crude Potion", description: "+10 HP instantly", rarity: RARITY.COMMON, applyEffect() { playerHealth = Math.min(playerHealth + 10, BASE_PLAYER_HEALTH_COUNT); updateHealth(); } },
  { id: "swiftCharm", name: "Swift Charm", description: "+1 extra player attack each even level", rarity: RARITY.COMMON, applyEffect() { playerItems.push({ id: "swiftCharmEffect", name: "Swift Charm", description: "+1 extra player attack each even level" }); } },

  // RARE
  { id: "ironSword", name: "Iron Sword", description: "+2 Player Attack Count", rarity: RARITY.RARE, applyEffect() { playerAttackCount += 2; } },
  { id: "ironShield", name: "Iron Shield", description: "+15 Player HP", rarity: RARITY.RARE, applyEffect() { playerHealth += 15; updateHealth(); } },
  { id: "luckyRing", name: "Lucky Ring", description: "10% chance to ignore enemy damage", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "luckyRingEffect", name: "Lucky Ring", description: "10% chance to ignore enemy damage" }); } },
  { id: "bloodCharm", name: "Blood Charm", description: "Heal +5 HP when you damage enemy", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "bloodCharmEffect", name: "Blood Charm", description: "Heal +5 HP when you damage enemy" }); } },
  { id: "radarGem", name: "Radar Gem", description: "Guarantees 1 safe number from 20–25", rarity: RARITY.RARE, range: [20, 25], applyEffect() { playerItems.push(this); } },
  { id: "strongBoots", name: "Strong Boots", description: "Take -5 damage from enemy attacks", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "strongBootsEffect", name: "Strong Boots", description: "Take -5 damage from enemy attacks" }); } },
  { id: "keenEye", name: "Keen Eye", description: "Shows one random enemy number", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "keenEyeEffect", name: "Keen Eye", description: "Shows one random enemy number" }); } },
  { id: "bronzeArmor", name: "Bronze Armor", description: "+2 HP regen each round", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "bronzeArmorEffect", name: "Bronze Armor", description: "+2 HP regen each round" }); } },
  { id: "ragePotion", name: "Rage Potion", description: "+10 Player Attack for next round", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "ragePotionEffect", name: "Rage Potion", description: "+10 Player Attack for next round" }); } },
  { id: "lifeAmulet", name: "Life Amulet", description: "Revive once with 50% HP", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "lifeAmuletEffect", name: "Life Amulet", description: "Revive once with 50% HP" }); } },

  // EPIC
  { id: "crystalSword", name: "Crystal Sword", description: "+3 Player Attack Count", rarity: RARITY.EPIC, applyEffect() { playerAttackCount += 3; } },
  { id: "holyCharm", name: "Holy Charm", description: "Heal +10 HP when damaging enemy", rarity: RARITY.EPIC, applyEffect() { playerItems.push({ id: "holyCharmEffect", name: "Holy Charm", description: "Heal +10 HP when damaging enemy" }); } },
  { id: "divineRadar", name: "Divine Radar", description: "Guarantees 2 safe numbers from 10–20", rarity: RARITY.EPIC, range: [10, 20], applyEffect() { playerItems.push(this); } },
  { id: "adamantArmor", name: "Adamant Armor", description: "Take -8 damage per enemy hit", rarity: RARITY.EPIC, applyEffect() { playerItems.push({ id: "adamantArmorEffect", name: "Adamant Armor", description: "Take -8 damage per enemy hit" }); } },
  { id: "focusTalisman", name: "Focus Talisman", description: "+5 damage to enemy HP per hit", rarity: RARITY.EPIC, applyEffect() { playerItems.push({ id: "focusTalismanEffect", name: "Focus Talisman", description: "+5 damage to enemy HP per hit" }); } },

  // LEGENDARY
  { id: "phoenixHeart", name: "Phoenix Heart", description: "Revive once with full HP", rarity: RARITY.LEGENDARY, applyEffect() { playerItems.push({ id: "phoenixHeartEffect", name: "Phoenix Heart", description: "Revive once with full HP" }); } },
  { id: "godblade", name: "Godblade", description: "+5 Attack Count, +10 damage per hit", rarity: RARITY.LEGENDARY, applyEffect() { playerAttackCount += 5; playerItems.push({ id: "godbladeEffect", name: "Godblade", description: "+10 damage per hit" }); } },
  { id: "omnigem", name: "Omni Gem", description: "Guarantees 3 safe numbers from 1–15", rarity: RARITY.LEGENDARY, range: [1, 15], applyEffect() { playerItems.push(this); } },
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

// CHARACTER CREATION OMITTED FOR BREVITY — same as your version...

// === GAME END CHECK ===
function checkGameOver() {
  if (playerHealth <= 0) {
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
function showShop(afterShopCallback = nextLevel) {
  const popup = document.createElement('div');
  popup.className = 'end-screen';

  const available = allItems.filter(item => !playerItems.some(pi => pi.id === item.id));
  const weightedPool = available.flatMap(item => Array(Math.floor(item.rarity.chance * 100)).fill(item));

  const shopChoices = [];
  const count = Math.min(3, weightedPool.length);
  const indexes = new Set();
  while (indexes.size < count) indexes.add(Math.floor(Math.random() * weightedPool.length));
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
      afterShopCallback();
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
      afterShopCallback();
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
      <div style="display:flex;flex-direction:column;gap:20px;">
        <button id="next-level-btn">${playerWon ? 'Next Level' : 'Retry'}</button>
        <button id="main-menu-btn">Main Menu</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('main-menu-btn').addEventListener('click', () => {
    popup.remove();
    mainMenu.style.display = 'flex';
  });

  document.getElementById('next-level-btn').addEventListener('click', () => {
    popup.remove();
    if (playerWon) {
      level++;
      enemyAttackCount += 1;
      enemyHealth += 10;
      if (level % 2 === 0) playerAttackCount += 1;

      if (level % 3 === 0) {
        showShop(() => nextLevel());
      } else {
        nextLevel();
      }
    } else {
      level = 1;
      enemyAttackCount = BASE_ENEMY_ATTACK_COUNT;
      enemyHealth = BASE_ENEMY_HEALTH_COUNT;
      playerAttackCount = BASE_PLAYER_ATTACK_COUNT;
      playerHealth = BASE_PLAYER_HEALTH_COUNT;
      playerItems = [];
      nextLevel();
    }
  });
}

// === NEXT LEVEL FUNCTION ===
function nextLevel() {
  gameOver = false;
  playerHealth = BASE_PLAYER_HEALTH_COUNT;
  enemyHealth = BASE_ENEMY_HEALTH_COUNT + (level - 1) * 10;
  updateHealth();
  updateLevel();
  hero.playIdle();
  enemy.playIdle();
  buildGrid();
}

// === START GAME BUTTON ===
startButton.addEventListener('click', () => {
  mainMenu.style.display = 'none';
  level = 1;
  playerAttackCount = BASE_PLAYER_ATTACK_COUNT;
  enemyAttackCount = BASE_ENEMY_ATTACK_COUNT;
  playerHealth = BASE_PLAYER_HEALTH_COUNT;
  enemyHealth = BASE_ENEMY_HEALTH_COUNT;
  playerItems = [];
  updateHealth();
  updateLevel();
  nextLevel();
});
