const cols = 15;
const rows = 4;

const playerAttackCount = 12;
const enemyAttackCount = 8;

const totalCells = cols * rows;

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
        } else if (playerAttackNumbers.includes(cellNumber)) {
            cell.classList.toggle('attack');
            enemyHealth -= 20;
            updateHealth();
        } else {
            cell.classList.toggle('active');
        }
          
        console.log(`Clicked box number: ${cell.textContent}`);
    });

    container.appendChild(cell);
  }
}