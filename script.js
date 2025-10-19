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
  { id: "vitalLeaf", name: "Vital Leaf", description: "Recover +3 HP per player attack", rarity: RARITY.COMMON, applyEffect() { playerItems.push({ id: "vitalLeafEffect" }); } },
  { id: "tinyRing", name: "Tiny Lucky Ring", description: "5% chance to ignore enemy damage", rarity: RARITY.COMMON, applyEffect() { playerItems.push({ id: "tinyRingEffect" }); } },
  { id: "scoutGem", name: "Scout Gem", description: "Guarantees 1 safe number from 35–40", rarity: RARITY.COMMON, range: [35, 40], applyEffect() { playerItems.push(this); } },
  { id: "steadyBoots", name: "Steady Boots", description: "Take -2 damage from enemy attacks", rarity: RARITY.COMMON, applyEffect() { playerItems.push({ id: "steadyBootsEffect" }); } },
  { id: "minorFocus", name: "Minor Focus", description: "+2 Enemy HP damage per hit", rarity: RARITY.COMMON, applyEffect() { playerItems.push({ id: "minorFocusEffect" }); } },
  { id: "lightArmor", name: "Light Armor", description: "+1 HP regen each round", rarity: RARITY.COMMON, applyEffect() { playerItems.push({ id: "lightArmorEffect" }); } },
  { id: "crudePotion", name: "Crude Potion", description: "+10 HP instantly", rarity: RARITY.COMMON, applyEffect() { playerHealth = Math.min(playerHealth + 10, BASE_PLAYER_HEALTH_COUNT); updateHealth(); } },
  { id: "swiftCharm", name: "Swift Charm", description: "+1 extra player attack each even level", rarity: RARITY.COMMON, applyEffect() { playerItems.push({ id: "swiftCharmEffect" }); } },

  // RARE
  { id: "ironSword", name: "Iron Sword", description: "+2 Player Attack Count", rarity: RARITY.RARE, applyEffect() { playerAttackCount += 2; } },
  { id: "ironShield", name: "Iron Shield", description: "+15 Player HP", rarity: RARITY.RARE, applyEffect() { playerHealth += 15; updateHealth(); } },
  { id: "luckyRing", name: "Lucky Ring", description: "10% chance to ignore enemy damage", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "luckyRingEffect" }); } },
  { id: "bloodCharm", name: "Blood Charm", description: "Heal +5 HP when you damage enemy", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "bloodCharmEffect" }); } },
  { id: "radarGem", name: "Radar Gem", description: "Guarantees 1 safe number from 20–25", rarity: RARITY.RARE, range: [20, 25], applyEffect() { playerItems.push(this); } },
  { id: "strongBoots", name: "Strong Boots", description: "Take -5 damage from enemy attacks", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "strongBootsEffect" }); } },
  { id: "keenEye", name: "Keen Eye", description: "Shows one random enemy number", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "keenEyeEffect" }); } },
  { id: "bronzeArmor", name: "Bronze Armor", description: "+2 HP regen each round", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "bronzeArmorEffect" }); } },
  { id: "ragePotion", name: "Rage Potion", description: "+10 Player Attack for next round", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "ragePotionEffect" }); } },
  { id: "lifeAmulet", name: "Life Amulet", description: "Revive once with 50% HP", rarity: RARITY.RARE, applyEffect() { playerItems.push({ id: "lifeAmuletEffect" }); } },

  // EPIC
  { id: "crystalSword", name: "Crystal Sword", description: "+3 Player Attack Count", rarity: RARITY.EPIC, applyEffect() { playerAttackCount += 3; } },
  { id: "holyCharm", name: "Holy Charm", description: "Heal +10 HP when damaging enemy", rarity: RARITY.EPIC, applyEffect() { playerItems.push({ id: "holyCharmEffect" }); } },
  { id: "divineRadar", name: "Divine Radar", description: "Guarantees 2 safe numbers from 10–20", rarity: RARITY.EPIC, range: [10, 20], applyEffect() { playerItems.push(this); } },
  { id: "adamantArmor", name: "Adamant Armor", description: "Take -8 damage per enemy hit", rarity: RARITY.EPIC, applyEffect() { playerItems.push({ id: "adamantArmorEffect" }); } },
  { id: "focusTalisman", name: "Focus Talisman", description: "+5 damage to enemy HP per hit", rarity: RARITY.EPIC, applyEffect() { playerItems.push({ id: "focusTalismanEffect" }); } },

  // LEGENDARY
  { id: "phoenixHeart", name: "Phoenix Heart", description: "Revive once with full HP", rarity: RARITY.LEGENDARY, applyEffect() { playerItems.push({ id: "phoenixHeartEffect" }); } },
  { id: "godblade", name: "Godblade", description: "+5 Attack Count, +10 damage per hit", rarity: RARITY.LEGENDARY, applyEffect() { playerAttackCount += 5; playerItems.push({ id: "godbladeEffect" }); } },
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

// === PASSIVE ITEM EFFECTS ===
function applyPassiveItemEffectsOnAttack(isPlayerAttack) {
  if (isPlayerAttack) {
    if (playerItems.find(i => i.id === "minorFocusEffect")) enemyHealth -= 2;
    if (playerItems.find(i => i.id === "focusTalismanEffect")) enemyHealth -= 5;
    if (playerItems.find(i => i.id === "godbladeEffect")) enemyHealth -= 10;

    if (playerItems.find(i => i.id === "bloodCharmEffect")) playerHealth = Math.min(playerHealth + 5, BASE_PLAYER_HEALTH_COUNT);
    if (playerItems.find(i => i.id === "holyCharmEffect")) playerHealth = Math.min(playerHealth + 10, BASE_PLAYER_HEALTH_COUNT);
    if (playerItems.find(i => i.id === "vitalLeafEffect")) playerHealth = Math.min(playerHealth + 3, BASE_PLAYER_HEALTH_COUNT);

    updateHealth();
  } else {
    let damage = 20;
    if (playerItems.find(i => i.id === "steadyBootsEffect")) damage -= 2;
    if (playerItems.find(i => i.id === "strongBootsEffect")) damage -= 5;
    if (playerItems.find(i => i.id === "adamantArmorEffect")) damage -= 8;

    const lucky = playerItems.find(i => i.id === "luckyRingEffect") && Math.random() < 0.1;
    const tinyLucky = playerItems.find(i => i.id === "tinyRingEffect") && Math.random() < 0.05;

    if (!lucky && !tinyLucky) playerHealth -= damage;
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
      const count = i.id === "divineRadar" ? 2 : i.id === "omnigem" ? 3 : 1;
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
        if (cell.classList.contains('clicked') || gameOver) return;
        cell.classList.add('clicked');
        const cellNumber = parseInt(cell.textContent);

        if (enemyAttackNumbers.includes(cellNumber)) {
          cell.classList.add('eAttack');
          applyPassiveItemEffectsOnAttack(false);
          enemy.playAttack();
          checkGameOver();
        } else if (playerAttackNumbers.includes(cellNumber)) {
          cell.classList.add('attack');
          enemyHealth -= 20;
          applyPassiveItemEffectsOnAttack(true);
          hero.playAttack();
          checkGameOver();
        } else {
          cell.classList.add('active');
        }
      });

      container.appendChild(cell);
    }
  }
}

// === CHARACTER CREATION ===
function createCharacter(id, idleFrames, attackFrames, deathFrames, containerSelector, speed = 250) {
  const el = document.getElementById(id);
  const container = document.querySelector(containerSelector);
  let frames = idleFrames;
  let frameIndex = 0;
  let animInterval = null;

  function playAnimation(loop = true) {
    clearInterval(animInterval);
    frameIndex = 0;
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
  }

  const character = {
    playIdle() {
      frames = idleFrames;
      playAnimation(true);
    },
    playAttack() {
      frames = attackFrames;
      playAnimation(true);
      container.classList.add('attacking');
      setTimeout(() => {
        container.classList.remove('attacking');
        character.playIdle();
      }, 600);
    },
    playDeath() {
      frames = deathFrames;
      playAnimation(false);
    }
  };

  character.playIdle();
  return character;
}

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
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('next-level-btn').addEventListener('click', () => {
    popup.remove();
    if (playerWon) {
      level++;
      // === Difficulty scaling ===
      enemyAttackCount += 1;    // +1 attack number each level
      enemyHealth += 10;        // +10 HP each level
      if (level % 2 === 0) {
        playerAttackCount += 1; // +1 player attack every 2 levels
      }
      // After scaling, go to item shop
      showShop();
    } else {
      // === Reset everything on loss ===
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
  enemyHealth = BASE_ENEMY_HEALTH_COUNT + (level - 1) * 10; // keep scaling visible
  updateHealth();
  updateLevel();
  hero.playIdle();
  enemy.playIdle();
  buildGrid();
}