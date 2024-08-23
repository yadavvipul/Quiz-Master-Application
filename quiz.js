class Quiz {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.timer = null;
    this.timeLimit = 30; // seconds
    this.userAnswers = [];
    this.optionStates = [];
    this.isAnswered = [];
    this.startTimes = [];
    this.remainingTime = [];
    this.quizStartTime = null;
    this.totalTimeTaken = 0;
  }

  //   * Fetches quiz questions from the provided API URL.
  async fetchQuestions(category, difficulty) {
    try {
      const response = await fetch(
        `${this.apiUrl}&category=${category}&difficulty=${difficulty}`
      );
      const data = await response.json();
      this.questions = data.results;
      if (this.questions.length > 0) {
        this.showQuiz();
        this.renderNavigationButtons();
        this.loadQuestion();
      } else {
        alert(
          "No questions available for the selected category and difficulty."
        );
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  }

  //Initializes the quiz by adding event listeners for navigation, submission, and quiz start.

  startQuiz() {
    document.getElementById("start-quiz").addEventListener("click", () => {
      const category = document.getElementById("category-select").value;
      const difficulty = document.getElementById("difficulty-select").value;
      // this.quizStartTime = Date.now();
      this.fetchQuestions(category, difficulty);
    });

    document
      .getElementById("prev-question")
      .addEventListener("click", () => this.prevQuestion());
    document
      .getElementById("next-question")
      .addEventListener("click", () => this.nextQuestion());
    document
      .getElementById("submit-quiz")
      .addEventListener("click", () => this.showResults());
    document
      .getElementById("download-scorecard")
      .addEventListener("click", () => this.downloadScoreCard());
    document
      .getElementById("retry-quiz")
      .addEventListener("click", () => this.retakeQuiz());
  }

  // Displays the quiz content and hides the start screen.
  showQuiz() {
    document.querySelector(".quiz-header").classList.add("hidden");
    document.getElementById("quiz-content").classList.remove("hidden");
    document.getElementById("current-score").classList.remove("hidden");
    document.getElementById("timer").classList.remove("hidden");
  }

  /* Loads and displays the current question and its options.
     Manages the quiz timer, progress, and navigation buttons.
   */
  loadQuestion() {
    const questionData = this.questions[this.currentQuestionIndex];
    document.getElementById("question-container").innerHTML =
      questionData.question;

    this.displayOptions(questionData);
    this.updateProgress();
    this.highlightCurrentNavButton();

    if (this.isAnswered[this.currentQuestionIndex]) {
      this.stopTimer();
      document.getElementById("timer").innerText = "Answered";
    } else {
      if (this.remainingTime[this.currentQuestionIndex] === undefined) {
        this.remainingTime[this.currentQuestionIndex] = this.timeLimit;
      }
      this.startTimes[this.currentQuestionIndex] = Date.now();
      this.startTimer();
    }

    const prevButton = document.getElementById("prev-question");
    const nextButton = document.getElementById("next-question");
    const submitButton = document.getElementById("submit-quiz");

    if (prevButton) {
      prevButton.classList.toggle("hidden", this.currentQuestionIndex === 0);
      prevButton.disabled = this.currentQuestionIndex === 0;
    }

    if (nextButton) {
      if (this.currentQuestionIndex === this.questions.length - 1) {
        nextButton.classList.add("hidden");
        nextButton.disabled = true;
      } else {
        nextButton.classList.remove("hidden");
        nextButton.disabled = false;
      }
    }

    if (submitButton) {
      submitButton.classList.toggle(
        "hidden",
        this.currentQuestionIndex !== this.questions.length - 1
      );
    }

    if (nextButton && this.currentQuestionIndex === this.questions.length - 1) {
      nextButton.innerText = "Submit";
    } else if (nextButton) {
      nextButton.innerText = "Next";
    }
  }

  /**
     Handles the display of answer options and their interaction.
     Highlights options based on user selection and quiz state.
   */
  displayOptions(questionData) {
    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = "";

    function decodeHTMLEntities(text) {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = text;
      return textarea.value;
    }

    const decodedCorrectAnswer = decodeHTMLEntities(
      questionData.correct_answer
    );
    const decodedIncorrectAnswers =
      questionData.incorrect_answers.map(decodeHTMLEntities);

    const allOptions = [...decodedIncorrectAnswers, decodedCorrectAnswer];
    allOptions.sort(() => Math.random() - 0.5);

    if (!this.optionStates[this.currentQuestionIndex]) {
      this.optionStates[this.currentQuestionIndex] = allOptions.map(
        (option) => ({
          option,
          isSelected: false,
          isCorrect: option === decodedCorrectAnswer,
        })
      );
      this.isAnswered[this.currentQuestionIndex] = false;
    }

    this.optionStates[this.currentQuestionIndex].forEach((optionState) => {
      const optionButton = document.createElement("button");
      optionButton.classList.add("option");
      optionButton.innerText = optionState.option;

      if (this.isAnswered[this.currentQuestionIndex]) {
        if (optionState.isSelected) {
          if (optionState.isCorrect) {
            optionButton.style.backgroundColor = "#d4edda"; // Light green
            optionButton.innerHTML +=
              ' <i class="fas fa-check-circle" style="color: #28a745;"></i>'; // Green check icon
          } else {
            optionButton.style.backgroundColor = "#f8d7da"; // Light red
            optionButton.innerHTML +=
              ' <i class="fas fa-times-circle" style="color: #dc3545;"></i>'; // Red cross icon
          }
        } else if (optionState.isCorrect) {
          optionButton.style.backgroundColor = "#d4edda"; // Light green
          optionButton.innerHTML +=
            ' <i class="fas fa-check-circle" style="color: #28a745;"></i>'; // Green check icon
        }
        optionButton.disabled = true; // Lock the button for previously answered questions
      } else {
        optionButton.addEventListener("click", () =>
          this.checkAnswer(optionState.option, decodedCorrectAnswer)
        );
      }

      optionsContainer.appendChild(optionButton);
    });
  }

  /**
     Checks the selected answer and updates the quiz state.
     Handles the answer feedback and automatically moves to the next question.
   */

  checkAnswer(selectedAnswer, correctAnswer) {
    clearInterval(this.timer);
    const questionData = this.questions[this.currentQuestionIndex];
    const optionState = this.optionStates[this.currentQuestionIndex].find(
      (state) => state.option === selectedAnswer
    );
    optionState.isSelected = true;
    this.isAnswered[this.currentQuestionIndex] = true;

    if (selectedAnswer === correctAnswer) {
      this.score += 10;
      this.updateScore();
    }

    this.optionStates[this.currentQuestionIndex].forEach((option) => {
      const button = Array.from(document.querySelectorAll(".option")).find(
        (btn) => btn.innerText === option.option
      );
      if (button) {
        if (option.option === selectedAnswer) {
          if (option.option === correctAnswer) {
            button.style.backgroundColor = "#d4edda"; // Light green
            button.innerHTML +=
              ' <i class="fas fa-check-circle" style="color: #28a745;"></i>'; // Green check icon
          } else {
            button.style.backgroundColor = "#f8d7da"; // Light red
            button.innerHTML +=
              ' <i class="fas fa-times-circle" style="color: #dc3545;"></i>'; // Red cross icon
          }
          button.disabled = true; // Lock the button after selection
        } else if (option.option === correctAnswer) {
          button.style.backgroundColor = "#d4edda"; // Light green
          button.innerHTML +=
            ' <i class="fas fa-check-circle" style="color: #28a745;"></i>'; // Green check icon
          button.disabled = true; // Ensure the correct option is also locked
        } else {
          button.disabled = true; // Lock all other options
        }
      }
    });

    this.userAnswers.push({
      question: questionData.question,
      correctAnswer: correctAnswer,
      userAnswer: selectedAnswer,
    });

    const endTime = Date.now();
    const startTime = this.startTimes[this.currentQuestionIndex];
    this.totalTimeTaken += Math.floor((endTime - startTime) / 1000);

    setTimeout(() => {
      this.nextQuestion();
    }, 1000);
  }

  // Updates the quiz progress indicator.
  updateProgress() {
    document.getElementById("progress").innerText = `Question ${
      this.currentQuestionIndex + 1
    } of ${this.questions.length}`;
  }
  //  Updates the current score display.
  updateScore() {
    document.getElementById("current-score-value").innerText = this.score;
    if (this.currentQuestionIndex >= this.questions.length - 1) {
      document.getElementById("current-score").classList.add("hidden");
    } else {
      document.getElementById("current-score").classList.remove("hidden");
    }
  }

  /**
    Starts the quiz timer and updates the display every second.
    Handles time expiration and disabling of options.
   */

  startTimer() {
    // Clear any existing timer
    if (this.timer) {
      clearInterval(this.timer);
    }

    let timeRemaining = this.remainingTime[this.currentQuestionIndex];

    // If the question has already timed out, display 0 and stop the timer
    if (timeRemaining <= 0) {
      document.getElementById("timer").innerText = "Time's up!";
      this.disableOptions(); // Disable everything immediately
      return;
    }

    document.getElementById("timer").innerText = timeRemaining;

    this.timer = setInterval(() => {
      timeRemaining--;
      this.remainingTime[this.currentQuestionIndex] = timeRemaining;

      // Prevent the timer from going negative
      if (timeRemaining <= 0) {
        clearInterval(this.timer);
        timeRemaining = 0; // Ensure it stays at zero
        this.showTimeUpMessage();
      }

      document.getElementById("timer").innerText = timeRemaining;
    }, 1000);
  }

  /*
     Displays a "Time's up!" message and disables options.
     Moves to the next question or shows the results based on quiz state.
   */

  showTimeUpMessage() {
    // Ensure the timer element shows 0
    const timerElement = document.getElementById("timer");
    timerElement.innerText = "Time's up!";

    // Disable all options by calling the new method
    this.disableOptions();

    // Check if there is a next question
    if (this.currentQuestionIndex < this.questions.length - 1) {
      // Optionally move to the next question after a delay
      setTimeout(() => {
        this.nextQuestion();
      }, 1000); // Adjust delay as needed
    } else {
      // If it's the last question, show results instead
      setTimeout(() => {
        this.showResults();
      }, 1000);
    }
  }

  // Disables all option buttons to prevent further interaction.

  disableOptions() {
    const optionsContainer = document.getElementById("options-container");
    const optionButtons = optionsContainer.querySelectorAll(".option");
    optionButtons.forEach((button) => {
      button.disabled = true;
    });

    // Disable any other interactive elements here if needed
    // For example, disabling the previous button:
    document.getElementById("previous-button").disabled = true;
  }

  //  Stops the quiz timer.
  stopTimer() {
    clearInterval(this.timer);
  }

  // Loads the next question if available, or shows the quiz results.
  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.loadQuestion();
    } else {
      this.showResults();
    }
  }

  // Loads the previous question if available.
  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.loadQuestion();
    }
  }

  // Function to render the question navigation buttons dynamically

  renderNavigationButtons() {
    const navContainer = document.getElementById("question-navigation");
    navContainer.innerHTML =
      '<span style="color: white; font-size: 30px; font-weight: bold; padding: 4px 4px">Questions:</span>';

    // Loop through each question to create a corresponding navigation button
    this.questions.forEach((_, index) => {
      const navButton = document.createElement("button");
      navButton.innerText = index + 1;
      navButton.classList.add("nav-button");

      // Highlight the active button
      if (index === this.currentQuestionIndex) {
        navButton.classList.add("active");
      }

      navButton.addEventListener("click", () => this.jumpToQuestion(index));
      navContainer.appendChild(navButton);
    });
  }

  // Function to jump to a specific question when a navigation button is clicked
  jumpToQuestion(index) {
    this.currentQuestionIndex = index;
    this.loadQuestion();
  }

  highlightCurrentNavButton() {
    const navButtons = document.querySelectorAll(".nav-button");
    navButtons.forEach((button, idx) => {
      button.classList.toggle("active", idx === this.currentQuestionIndex);
    });
  }

  // Function to display quiz results after the last question is answered
  showResults() {
    document.getElementById("question-navigation").classList.add("hidden");
    document.getElementById("quiz-content").classList.add("hidden");
    document.getElementById("results").classList.remove("hidden");
    document.getElementById("score").innerHTML = `
  <span class="score-summary">${this.score / 10} out of ${
      this.questions.length
    }</span><br>
  <span class="total-points">Total Points: ${this.score}</span>
`;

    document.getElementById("current-score").classList.add("hidden");
    document.getElementById("download-scorecard").classList.remove("hidden");
    document.getElementById("question-navigation").innerHTML = "";
    document.getElementById("question-navigation").classList.add("hidden");
  }

  // Function to allow the user to download their scorecard as a text file
  downloadScoreCard() {
    let scorecardContent = `Score: ${this.score} out of ${this.questions.length}\n`;

    // Loop through each question and append the user's answer and the correct answer to the scorecard content
    this.questions.forEach((questionData, index) => {
      const userAnswer = this.userAnswers.find(
        (answer) => answer.question === questionData.question
      );
      const optionStates = this.optionStates[index] || [];
      let selectedOption = null;
      let correctOption = null;

      optionStates.forEach((optionState) => {
        if (optionState.isSelected) {
          selectedOption = optionState.option;
        }
        if (optionState.isCorrect) {
          correctOption = optionState.option;
        }
      });

      scorecardContent += `Question ${index + 1}: ${questionData.question}\n`;
      scorecardContent += `Your Answer: ${selectedOption || "Not answered"}\n`;
      scorecardContent += `Correct Answer: ${
        correctOption || "Not available"
      }\n`;
      scorecardContent += "\n";
    });

    // Create and trigger the download of the scorecard as a text file
    const blob = new Blob([scorecardContent], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "scorecard.txt";
    link.click();
  }

  // Function to reset and retake the quiz
  retakeQuiz() {
    // Store the currently selected category and difficulty
    const selectedCategory = document.getElementById("category-select").value;
    const selectedDifficulty =
      document.getElementById("difficulty-select").value;

    // Reset quiz state
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.userAnswers = [];
    this.optionStates = [];
    this.isAnswered = [];
    this.startTimes = [];
    this.totalTimeTaken = 0;

    // Reset the displayed score to 0
    document.getElementById("current-score-value").innerText = "0";

    // Hide the quiz content and results sections
    document.getElementById("quiz-content").classList.add("hidden");
    document.getElementById("results").classList.add("hidden");

    // Show the quiz header and ensure category and difficulty selectors remain visible
    document.querySelector(".quiz-header").classList.remove("hidden");
    document.getElementById("start-quiz").classList.remove("hidden");

    // Reapply the previously selected values
    document.getElementById("category-select").value = selectedCategory;
    document.getElementById("difficulty-select").value = selectedDifficulty;

    // Reset the navigation and hide it until the quiz starts
    document.getElementById("question-navigation").innerHTML = "";
    document.getElementById("question-navigation").classList.add("hidden");
  }
}

// Wait until the entire HTML document is loaded and parsed before starting the quiz
document.addEventListener("DOMContentLoaded", () => {
  const quiz = new Quiz("https://opentdb.com/api.php?amount=10");
  quiz.startQuiz();
});
