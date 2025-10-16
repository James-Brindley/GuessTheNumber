const cols = 15;
const rows = 4;
const playerAttackCount = 12;
const enemyAttackCount = 8;
const totalCells = cols * rows;

let playerHealth = 100;
let enemyHealth = 100;
let level = 1;

const playerHealthDisplay = document.getElementById('player-health-display');
const enemyHealthDisplay = document.getElementById('enemy-health-display');
const levelDisplay = document.getElementById('level-display');

const overlay = document.getElementById('overlay');
const overlayMessage = document.getElementById('overlay-message');
const nextBtn = document.getElementById('next-level-btn');
const retryBtn = document.getElementById('retry-btn');

nextBtn.addEventListener('click', () => {
  level++;
  startGame();
  overlay.classList.add('hidden');
});

retryBtn.addEventListener('click', () => {
  level = 1;
  startGame();
  overlay.classList.add('hidden');
});

function updateHealth() {
  playerHealthDisplay.textContent = `Player Health: ${playerHealth}`;
  enemyHealthDisplay.textContent = `Enemy Health: ${enemyHealth}`;
}

function updateLevelDisplay() {
  levelDisplay.textContent = `Level ${level}`;
}

function getRandomUniqueNumbers(count, max, exclude = []) {
  const numbers = new Set();
  while (numbers.size < count) {
    const randomNum = Math.floor(Math.random() * max) + 1;
    if (!exclude.includes(randomNum)) {
      numbers.add(randomNum);
    }
  }
  return Array.from(numbers);
}

function createCharacter(elementId, idleFrames, attackFrames, deathFrames, containerSelector, speed = 250) {
  const el = document.getElementById(elementId);
  const container = document.querySelector(containerSelector);
  let frames = idleFrames;
  let frameIndex = 0;
  let animInterval = null;
  let isDead = false;

  function playAnimation(loop = true) {
    clearInterval(animInterval);
    animInterval = setInterval(() => {
      frameIndex++;
      if (frameIndex >= frames.length) {
        if (loop) frameIndex = 0;
        else frameIndex = frames.length - 1; // stay on last frame
      }
      el.src = frames[frameIndex];
    }, speed);
  }

  const character = {
    playIdle() {
      if (isDead) return;
      frames = idleFrames;
      frameIndex = 0;
      playAnimation(true);
    },
    playAttack() {
      if (isDead) return;
      frames = attackFrames;
      frameIndex = 0;
      playAnimation(true);
      container.classList.add('attacking');
      setTimeout(() => {
        container.classList.remove('attacking');
        character.playIdle();
      }, 600);
    },
    playDeath() {
      isDead = true;
      clearInterval(animInterval);
      frames = deathFrames;
      frameIndex = 0;
      playAnimation(false);
    },
    reset() {
      isDead = false;
      this.playIdle();
    }
  };

  character.playIdle();
  return character;
}

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

function startGame() {
  playerHealth = 100;
  enemyHealth = 100;
  updateHealth();
  updateLevelDisplay();
  hero.reset();
  enemy.reset();

  const container = document.getElementById('grid-container');
  container.innerHTML = '';
  const playerAttackNumbers = getRandomUniqueNumbers(playerAttackCount, totalCells);
  const enemyAttackNumbers = getRandomUniqueNumbers(enemyAttackCount, totalCells, playerAttackNumbers);

  let number = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'grid-item';
      cell.textContent = number++;

      cell.addEventListener('click', () => {
        if (cell.classList.contains('clicked')) return;
        cell.classList.add('clicked');

        const cellNumber = parseInt(cell.textContent);
        if (enemyAttackNumbers.includes(cellNumber)) {
          cell.classList.add('eAttack');
          playerHealth -= 20;
          updateHealth();
          enemy.playAttack();
        } else if (playerAttackNumbers.includes(cellNumber)) {
          cell.classList.add('attack');
          enemyHealth -= 20;
          updateHealth();
          hero.playAttack();
        } else {
          cell.classList.add('active');
        }

        checkGameOver();
      });

      container.appendChild(cell);
    }
  }
}

function checkGameOver() {
  if (playerHealth <= 0) {
    hero.playDeath();
    showOverlay('You Lost!', false);
  } else if (enemyHealth <= 0) {
    enemy.playDeath();
    showOverlay('You Won!', true);
  }
}

function showOverlay(message, win) {
  overlay.classList.remove('hidden');
  overlayMessage.textContent = message;
  nextBtn.style.display = win ? 'inline-block' : 'none';
  retryBtn.style.display = win ? 'none' : 'inline-block';
}

startGame();
