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

function buildGrid() {
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  playerAttackNumbers = getRandomUniqueNumbers(playerAttackCount, totalCells);
  enemyAttackNumbers = getRandomUniqueNumbers(enemyAttackCount, totalCells, playerAttackNumbers);

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

// === END SCREEN POPUP ===
function showEndScreen(playerWon) {
  gameOver = true;

  const popup = document.createElement('div');
  popup.className = 'end-screen';
  popup.innerHTML = `
    <div class="end-screen-content">
      <h1>${playerWon ? 'You Win!' : 'Game Over'}</h1>
      <p>${(level - 1 % 2) === 0 ? 'Enemy +1 Attack Square' : 'Enemy & Player +1 Attack Square'}</p>
      <p>Enemy +10 HP</p>
      <button id="next-level-btn">${playerWon ? 'Next Level' : 'Restart'}</button>
      <br><br>
      <button id="main-menu-btn">Main Menu</button>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('next-level-btn').addEventListener('click', () => {
    popup.remove();
    if (playerWon) level++;
    else resetGameToBase();
    nextLevel();
  });

  document.getElementById('main-menu-btn').addEventListener('click', () => {
    popup.remove();
    showMainMenu();
  });
}

// === NEXT LEVEL FUNCTION ===
function nextLevel() {
  gameOver = false;
  if (level > 1) {
    enemyAttackCount += 1;
    if ((level - 1) % 2 === 0) playerAttackCount += 1;
  }
  playerHealth = BASE_PLAYER_HEALTH_COUNT;
  enemyHealth = BASE_ENEMY_HEALTH_COUNT + (10 * (level - 1));
  updateHealth();
  updateLevel();
  hero.playIdle();
  enemy.playIdle();
  buildGrid();
}

// === MAIN MENU HANDLING ===
startButton.addEventListener('click', () => {
  mainMenu.style.display = 'none';
  startNewGame();
});

function startNewGame() {
  resetGameToBase();
  buildGrid();
  updateHealth();
  updateLevel();
  hero.playIdle();
  enemy.playIdle();
}

function showMainMenu() {
  mainMenu.style.display = 'flex';
  container.innerHTML = '';
  resetGameToBase();
}

function resetGameToBase() {
  playerHealth = BASE_PLAYER_HEALTH_COUNT;
  enemyHealth = BASE_ENEMY_HEALTH_COUNT;
  playerAttackCount = BASE_PLAYER_ATTACK_COUNT;
  enemyAttackCount = BASE_ENEMY_ATTACK_COUNT;
  level = 1;
  updateHealth();
  updateLevel();
  gameOver = false;
}