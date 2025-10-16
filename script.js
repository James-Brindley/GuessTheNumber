const cols = 15;
const rows = 4;

const playerAttackCount = 12;
const enemyAttackCount = 8;
const totalCells = cols * rows;

// === HEALTH ===
let playerHealth = 100;
let enemyHealth = 100;

// === UI ELEMENTS ===
const playerHealthDisplay = document.getElementById('player-health-display');
const enemyHealthDisplay = document.getElementById('enemy-health-display');
const container = document.getElementById('grid-container');

function updateHealth() {
  playerHealthDisplay.textContent = `Player Health: ${playerHealth}`;
  enemyHealthDisplay.textContent = `Enemy Health: ${enemyHealth}`;
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

let gameOver = false;

// === BUILD GRID ===
function buildGrid() {
  container.innerHTML = ''; // clear old grid
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  // generate new random attack numbers
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

buildGrid();

// === CHARACTER CREATION FUNCTION ===
function createCharacter(id, idleFrames, attackFrames, deathFrames, containerSelector, speed = 250) {
  const el = document.getElementById(id);
  const container = document.querySelector(containerSelector);
  let frames = idleFrames;
  let frameIndex = 0;
  let animInterval = null;

  function playAnimation() {
    clearInterval(animInterval);
    animInterval = setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      el.src = frames[frameIndex];
    }, speed);
  }

  const character = {
    playIdle() {
      frames = idleFrames;
      frameIndex = 0;
      playAnimation();
    },
    playAttack() {
      frames = attackFrames;
      frameIndex = 0;
      playAnimation();
      container.classList.add('attacking');
      setTimeout(() => {
        container.classList.remove('attacking');
        character.playIdle();
      }, 600);
    },
    playDeath() {
      clearInterval(animInterval);
      frames = deathFrames;
      frameIndex = 0;
      playAnimation();
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
    <h1>${playerWon ? 'You Win!' : 'Game Over'}</h1>
    <button id="next-level-btn">${playerWon ? 'Next Level' : 'Retry'}</button>
  `;
  document.body.appendChild(popup);

  document.getElementById('next-level-btn').addEventListener('click', () => {
    popup.remove();
    nextLevel();
  });
}

// === NEXT LEVEL FUNCTION ===
function nextLevel() {
  gameOver = false;
  playerHealth = 100;
  enemyHealth = 100;
  updateHealth();
  hero.playIdle();
  enemy.playIdle();
  buildGrid();
}
