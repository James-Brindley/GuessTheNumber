//Range of numbers
let range = 50;
document.getElementById("range").textContent = range;

//The number to guess
const randomNumber = Math.floor(Math.random() * range) + 1;

//Number of bad numbers
let badNumberCount = 5;
document.getElementById("badNumberCount").textContent = badNumberCount;

//Numbers that cause you to lose a life
const badNumbers = [];
while (badNumbers.length < badNumberCount) {
    let newBadNumber = Math.floor(Math.random() * range) + 1;
    if (newBadNumber !== randomNumber && !badNumbers.includes(newBadNumber)) {
        badNumbers.push(newBadNumber);
    }
}

//Players HP
let hp = 10;
document.getElementById("hpDisplay").textContent = hp;

function checkGuess() {
    let userGuess = parseInt(document.getElementById("userGuess").value);
    let feedback = document.getElementById("feedback");
    let hpDisplay = document.getElementById("hpDisplay");

    //loose a life every guess
    hp -= 1;
        hpDisplay.textContent = hp;
        if (hp === 0) {
            feedback.textContent = "Game Over! You have no lives left.";
        }

    //if a bad number is guessed you loose another life
    if (badNumbers.includes(userGuess)) {
        feedback.textContent = "Bad Number! You Lose a life!";
        hp -= 1;
        hpDisplay.textContent = hp;
        if (hp === 0) {
            feedback.textContent = "Game Over! You have no lives left.";
        }
        return;
    } else if (userGuess > randomNumber) {
        feedback.textContent = "Lower! Try again.";
    } else if (userGuess < randomNumber) {
        feedback.textContent = "Higer! Try again.";
    } else {
        feedback.textContent = "Correct! You guessed the number!";
    }
}
