const cols = 15;
const rows = 4;

const playerAttackCount = 12;
const enemyAttackCount = 8;

const totalCells = cols * rows;

const hero = createCharacter('hero', ['assets/ready_1.png', 'assets/ready_2.png', 'assets/ready_3.png'], ['assets/attack_1.png', 'assets/attack_3.png', 'assets/attack_5.png'],
  '.hero-container');
const enemy = createCharacter('enemy', ['assets/eReady_1.png', 'assets/eReady_2.png', 'assets/eReady_3.png'], ['assets/eAttack_1.png', 'assets/eAttack_3.png', 'assets/eAttack_5.png'],
  '.enemy-container');

let playerHealth = 100;
let enemyHealth = 100;

const playerHealthDisplay = document.getElementById('player-health-display');
const enemyHealthDisplay = document.getElementById('enemy-health-display');

function updateHealth() {
  playerHealthDisplay.textContent = `Player Health: ${playerHealth}`;
  enemyHealthDisplay.textContent = `Enemy Health: ${enemyHealth}`;
}

updateHealth();

// Function to get unique random numbers
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

const playerAttackNumbers = getRandomUniqueNumbers(playerAttackCount, totalCells);

const enemyAttackNumbers = getRandomUniqueNumbers(enemyAttackCount, totalCells, playerAttackNumbers);

const container = document.getElementById('grid-container');

// Set the grid layout
container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

// Create numbered boxes
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
            cell.classList.toggle('eAttack');
            playerHealth -= 20;
            updateHealth();
            enemy.playAttack();

        } else if (playerAttackNumbers.includes(cellNumber)) {
            cell.classList.toggle('attack');
            enemyHealth -= 20;
            updateHealth();
            hero.playAttack();

        } else {
            cell.classList.toggle('active');
        }
    });

    container.appendChild(cell);
  }
}

function createCharacter(elementId, idleFrames, attackFrames, containerSelector, speed = 250) {
  const el = document.getElementById(elementId);
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

      // add movement
      container.classList.add('attacking');

      // stop animation and return to idle
      setTimeout(() => {
        container.classList.remove('attacking');
        character.playIdle();
      }, 600); // same as CSS animation time
    }
  };

  character.playIdle();
  return character;
}