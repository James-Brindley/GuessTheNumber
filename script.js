const randomNumber = Math.floor(Math.random() * 100) + 1;

let randomBadNumber = Math.floor(Math.random() * 100) + 1;
while (randomBadNumber === randomNumber) {
    randomBadNumber = Math.floor(Math.random() * 100) + 1;
}

let hp = 6;
document.getElementById("hpDisplay").textContent = hp;

function checkGuess() {
    let userGuess = parseInt(document.getElementById("userGuess").value);
    let feedback = document.getElementById("feedback");
    let hpDisplay = document.getElementById("hpDisplay");

    if (userGuess === randomBadNumber) {
        feedback.textContent = "You Loose a life!";
        hp -= 1;
        hpDisplay.textContent = hp;
        return;
    } else if (userGuess > randomNumber) {
        feedback.textContent = "Too high! Try again.";
    } else if (userGuess < randomNumber) {
        feedback.textContent = "Too low! Try again.";
    } else {
        feedback.textContent = "Correct! You guessed the number!";
    }
}
