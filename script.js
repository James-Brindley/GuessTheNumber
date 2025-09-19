const randomNumber = Math.floor(Math.random() * 100) + 1;

function checkGuess() {
    let userGuess = parseInt(document.getElementById("userGuess").value);
    let feedback = document.getElementById("feedback");

    if (userGuess < randomNumber) {
        feedback.textContent = "Too low! Try again.";
    } else if (userGuess > randomNumber) {
        feedback.textContent = "Too high! Try again.";
    } else {
        feedback.textContent = "Correct! You guessed the number!";
    }
}
