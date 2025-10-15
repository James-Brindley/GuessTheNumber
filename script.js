const cols = 15;
const rows = 4;

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

    // Add click functionality
    cell.addEventListener('click', () => {
      cell.classList.toggle('active');
      console.log(`Clicked box number: ${cell.textContent}`);
    });

    container.appendChild(cell);
  }
}