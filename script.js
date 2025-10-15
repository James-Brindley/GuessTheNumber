const cols = 15;
const rows = 4;

const playerAttackCount = 5;
const enemyAttackCount = 5;

const totalCells = cols * rows;

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
        const cellNumber = parseInt(cell.textContent); // get the number inside the box
          
        if (enemyAttackNumbers.includes(cellNumber)) {
            cell.classList.toggle('eAttack'); // enemy attack class
        } else if (playerAttackNumbers.includes(cellNumber)) {
            cell.classList.toggle('attack'); // player attack class
        } else {
            cell.classList.toggle('active'); // normal active highlight
        }
          
        console.log(`Clicked box number: ${cell.textContent}`);
    });

    container.appendChild(cell);
  }
}