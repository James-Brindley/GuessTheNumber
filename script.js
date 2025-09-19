//The number to guess
const randomNumber = Math.floor(Math.random() * 100) + 1;

//Number of bad numbers
let badNumberCount = 5;
document.getElementById("badNumberCount").textContent = badNumberCount;

//Numbers that cause you to lose a life
const badNumbers = [];
while (badNumbers.length < badNumberCount) {
    let newBadNumber = Math.floor(Math.random() * 100) + 1;
    if (newBadNumber !== randomNumber && !badNumbers.includes(newBadNumber)) {
        badNumbers.push(newBadNumber);
    }
}

//Players HP
let hp = 6;
document.getElementById("hpDisplay").textContent = hp;

function checkGuess() {
    let userGuess = parseInt(document.getElementById("userGuess").value);
    let feedback = document.getElementById("feedback");
    let hpDisplay = document.getElementById("hpDisplay");

    if (badNumbers.includes(userGuess)) {
        feedback.textContent = "You Lose a life!";
        hp -= 1;
        hpDisplay.textContent = hp;
        if (hp === 0) {
            feedback.textContent = "Game Over! You have no lives left.";
        }
        return;
    } else if (userGuess > randomNumber) {
        feedback.textContent = "Too high! Try again.";
    } else if (userGuess < randomNumber) {
        feedback.textContent = "Too low! Try again.";
    } else {
        feedback.textContent = "Correct! You guessed the number!";
    }
}
