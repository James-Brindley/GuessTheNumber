rows = 15
cols = 4

document.getElementById('generate').addEventListener('click', () => {
    const cols = parseInt(document.getElementById('cols').value);
    const rows = parseInt(document.getElementById('rows').value);
    const container = document.getElementById('grid-container');
  
    // Clear previous grid
    container.innerHTML = '';
  
    // Set grid layout
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  
    // Generate grid items
    let number = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-item';
        cell.textContent = number++;
        cell.addEventListener('click', () => {
          cell.classList.toggle('active');
          console.log(`Clicked box number: ${cell.textContent}`);
        });
        container.appendChild(cell);
      }
    }
  });