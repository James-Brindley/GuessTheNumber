const cols = 15;
const rows = 4;

const playerAttackCount = 12;
const enemyAttackCount = 8;

const totalCells = cols * rows;

const hero = createCharacter('hero', ['assets/ready_1.png', 'assets/ready_2.png', 'assets/ready_3.png'], ['assets/attack1.png', 'assets/attack2.png', 'assets/attack3.png', 'assets/attack4.png', 'assets/attack5.png', 'assets/attack6.png']);
const enemy = createCharacter('enemy', ['assets/eReady_1.png', 'assets/eReady_2.png', 'assets/eReady_3.png'], ['assets/eAttack1.png', 'assets/eAttack2.png', 'assets/eAttack3.png', 'assets/eAttack4.png', 'assets/eAttack5.png', 'assets/eAttack6.png']);

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

function createCharacter(elementId, idleFrames, attackFrames, speed = 250) {
  const el = document.getElementById(elementId);
  let frames = idleFrames;
  let frameIndex = 0;
  let animInterval = null;

  // internal animation loop
  function playAnimation() {
    clearInterval(animInterval);
    animInterval = setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      el.src = frames[frameIndex];
    }, speed);
  }

  // public methods
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

      // after one cycle, go back to idle
      setTimeout(() => character.playIdle(), attackFrames.length * speed);
    }
  };

  character.playIdle(); // start idle by default
  return character;
}