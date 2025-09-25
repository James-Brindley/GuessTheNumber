//Range of numbers
let range = 20;
document.getElementById("range").textContent = range;

//The number to guess
let randomNumber = Math.floor(Math.random() * range) + 1;

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
    if (hp === 0) {
        feedback.textContent = "Game Over! You have no lives left.";
    } else {
        hp -= 1;
        hpDisplay.textContent = hp;
    }

    //if a bad number is guessed you loose another life
    if (badNumbers.includes(userGuess)) {
        if (hp === 0) {
            feedback.textContent = "Game Over! You have no lives left.";
        } else {
            feedback.textContent = "Bad Number! You Lose a life!";
            hp -= 1;
            hpDisplay.textContent = hp;
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