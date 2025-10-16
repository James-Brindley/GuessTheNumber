const cols = 15;
const rows = 4;

// --- CHANGED: make these mutable so we can increase them each level ---
const BASE_PLAYER_ATTACK_COUNT = 12; // base values to reset on death
const BASE_ENEMY_ATTACK_COUNT = 8;

let playerAttackCount = BASE_PLAYER_ATTACK_COUNT; // was const before
let enemyAttackCount = BASE_ENEMY_ATTACK_COUNT;   // was const before

const totalCells = cols * rows;

// === HEALTH ===
const BASE_PLAYER_HEALTH_COUNT = 100;
const BASE_ENEMY_HEALTH_COUNT = 100;

let playerHealth = BASE_PLAYER_HEALTH_COUNT;
let enemyHealth = BASE_ENEMY_HEALTH_COUNT;

// === LEVEL ===
let level = 1; // ✅ added

// === UI ELEMENTS ===
const playerHealthDisplay = document.getElementById('player-health-display');
const enemyHealthDisplay = document.getElementById('enemy-health-display');
const container = document.getElementById('grid-container');

// ✅ NEW: level display element (keeps changes minimal — created dynamically)
const levelDisplay = document.createElement('div');
levelDisplay.id = 'level-display';
levelDisplay.textContent = `Level ${level}`;
document.body.appendChild(levelDisplay);

function updateHealth() {
  playerHealthDisplay.textContent = `Player Health: ${playerHealth}`;
  enemyHealthDisplay.textContent = `Enemy Health: ${enemyHealth}`;
}

// ✅ NEW: update level display
function updateLevel() {
  levelDisplay.textContent = `Level ${level}`;
}

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

// === CREATE CHARACTERS ===
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

let gameOver = false;

// === BUILD GRID ===
function buildGrid() {
  container.innerHTML = ''; // clear old grid
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  // generate new random attack numbers using current mutable counts
  playerAttackNumbers = getRandomUniqueNumbers(playerAttackCount, totalCells);
  enemyAttackNumbers = getRandomUniqueNumbers(enemyAttackCount, totalCells, playerAttackNumbers);

  console.log(`Player Attack Count: ${playerAttackCount}`);
  console.log(`Enemy Attack Count: ${enemyAttackCount}`);

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
          playerHealth -= 20;
          updateHealth();
          enemy.playAttack();
          checkGameOver();
        } else if (playerAttackNumbers.includes(cellNumber)) {
          cell.classList.add('attack');
          enemyHealth -= 20;
          updateHealth();
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

buildGrid();

// === CHARACTER CREATION FUNCTION ===
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
      playAnimation(false); // no loop — play once and hold last frame
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

// === END SCREEN POPUP ===
function showEndScreen(playerWon) {
  gameOver = true;

  const popup = document.createElement('div');
  popup.className = 'end-screen';
  popup.innerHTML = `
    <div class="end-screen-content">
      <h1>${playerWon ? 'You Win!' : 'Game Over'}</h1>
      <button id="next-level-btn">${playerWon ? 'Next Level' : 'Retry'}</button>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('next-level-btn').addEventListener('click', () => {
    popup.remove();

    if (playerWon) {
      level++; // increase level on win
    } else {
      level = 1; // reset level on loss
      // reset attack counts to base when player loses
      playerAttackCount = BASE_PLAYER_ATTACK_COUNT;
      enemyAttackCount = BASE_ENEMY_ATTACK_COUNT;
      enemyHealth = BASE_ENEMY_HEALTH_COUNT
      // optionally reset enemyHealth to base (we'll set health in nextLevel)
    }

    nextLevel();
  });
}

// === NEXT LEVEL FUNCTION ===
function nextLevel() {
  gameOver = false;

  // If level > 1 apply scaling; if level === 1 we've already reset counts above on loss
  if (level > 1) {
    // increase enemy attack count by 1 and enemy health by 10 each level
    enemyAttackCount += 1;
    enemyHealth += 10;

    // every 2nd level give player +1 attack
    if (level % 2 === 0) {
      playerAttackCount += 1;
    }

    console.log(`Level ${level} — Player Attack Count: ${playerAttackCount}, Enemy Attack Count: ${enemyAttackCount}`);
  }

  // reset health each level (player and enemy)
  playerHealth = 100;
  enemyHealth = Math.max(100, enemyHealth); // ensure enemyHealth is at least 100 if not increased

  updateHealth();
  updateLevel(); // refresh display
  hero.playIdle();
  enemy.playIdle();
  buildGrid();
}
