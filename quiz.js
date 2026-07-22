import { db, ref, get, update } from "./firebase-config.js";
import questions from "./questions.js";

const attemptId = localStorage.getItem("footballQuizAttemptId");
const user = JSON.parse(localStorage.getItem("footballQuizUser") || "null");

const quizContainer = document.getElementById("quizContainer");
const submittedScreen = document.getElementById("submittedScreen");
const studentName = document.getElementById("studentName");
const questionNumbers = document.getElementById("questionNumbers");
const questionCard = document.getElementById("questionCard");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");

let currentIndex = 0;
let answers = {};
let attemptData = null;

if (!attemptId || !user) {
  window.location.href = "index.html";
}

studentName.textContent = `مرحبًا يا ${user.username}`;

async function loadAttempt() {
  const snapshot = await get(ref(db, `attempts/${attemptId}`));

  if (!snapshot.exists()) {
    localStorage.clear();
    window.location.href = "index.html";
    return;
  }

  attemptData = snapshot.val();
  answers = attemptData.answers || {};

  if (attemptData.status === "submitted" || attemptData.resultPublished) {
    showSubmittedScreen();
    return;
  }

  renderNavigation();
  renderQuestion();
}

function answeredCount() {
  return Object.values(answers).filter((answer) => String(answer || "").trim()).length;
}

function updateProgress() {
  const count = answeredCount();
  progressText.textContent = `${count} / ${questions.length}`;
  progressBar.style.width = `${(count / questions.length) * 100}%`;
}

function renderNavigation() {
  questionNumbers.innerHTML = "";

  questions.forEach((question, index) => {
    const button = document.createElement("button");
    button.className = "question-number";

    if (index === currentIndex) button.classList.add("active");
    if (answers[question.id]) button.classList.add("answered");

    button.textContent = question.id;
    button.addEventListener("click", () => {
      currentIndex = index;
      renderNavigation();
      renderQuestion();
    });

    questionNumbers.appendChild(button);
  });

  updateProgress();
}

function saveAnswer(questionId, value) {
  answers[questionId] = value;
  renderNavigation();
}

function renderQuestion() {
  const question = questions[currentIndex];

  const imageHtml = question.image
    ? `<img class="question-image" src="${question.image}" alt="صورة السؤال ${question.id}" />`
    : "";

  let answerHtml = "";

  if (question.type === "choice") {
    answerHtml = `
      <div class="options">
        ${question.options
          .map(
            (option, index) => `
              <label class="option">
                <input
                  type="radio"
                  name="question-${question.id}"
                  value="${option}"
                  ${answers[question.id] === option ? "checked" : ""}
                />
                <span>${["أ", "ب", "ج"][index]}. ${option}</span>
              </label>
            `
          )
          .join("")}
      </div>
    `;
  } else {
    answerHtml = `
      <label class="field">
        <span>اكتب إجابتك بالتفصيل</span>
        <textarea
          class="essay-input"
          id="essayAnswer"
          placeholder="اكتب إجابتك هنا..."
        >${answers[question.id] || ""}</textarea>
      </label>
    `;
  }

  questionCard.innerHTML = `
    <span class="question-label">السؤال ${question.id} من ${questions.length}</span>
    <h2>${question.question}</h2>
    ${imageHtml}
    ${answerHtml}

    <div class="quiz-actions">
      <button id="nextButton" class="secondary-btn">
        ${currentIndex === questions.length - 1 ? "السؤال الأخير" : "التالي ←"}
      </button>
      <button id="previousButton" class="secondary-btn" ${
        currentIndex === 0 ? "disabled" : ""
      }>→ السابق</button>
    </div>

    ${
      currentIndex === questions.length - 1
        ? `
          <div class="submit-area">
            <button id="submitQuizButton" class="primary-btn">إرسال الإجابات</button>
          </div>
        `
        : ""
    }
  `;

  if (question.type === "choice") {
    document.querySelectorAll(`input[name="question-${question.id}"]`).forEach((input) => {
      input.addEventListener("change", (event) => {
        saveAnswer(question.id, event.target.value);
      });
    });
  } else {
    document.getElementById("essayAnswer").addEventListener("input", (event) => {
      saveAnswer(question.id, event.target.value);
    });
  }

  document.getElementById("previousButton").addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderNavigation();
      renderQuestion();
    }
  });

  document.getElementById("nextButton").addEventListener("click", () => {
    if (currentIndex < questions.length - 1) {
      currentIndex++;
      renderNavigation();
      renderQuestion();
    }
  });

  const submitButton = document.getElementById("submitQuizButton");
  if (submitButton) {
    submitButton.addEventListener("click", submitQuiz);
  }
}

async function submitQuiz() {
  const missing = questions.filter((question) => !String(answers[question.id] || "").trim());

  if (missing.length) {
    alert(`يوجد ${missing.length} سؤال بدون إجابة. أكمل الإجابات أولًا.`);
    return;
  }

  const submitButton = document.getElementById("submitQuizButton");
  submitButton.disabled = true;
  submitButton.textContent = "جارٍ إرسال الإجابات...";

  try {
    await update(ref(db, `attempts/${attemptId}`), {
      answers,
      status: "submitted",
      submittedAt: Date.now(),
    });

    showSubmittedScreen();
  } catch (error) {
    console.error(error);
    alert("حدث خطأ أثناء الإرسال، حاول مرة أخرى.");
    submitButton.disabled = false;
    submitButton.textContent = "إرسال الإجابات";
  }
}

function showSubmittedScreen() {
  quizContainer.style.display = "none";
  document.querySelector(".quiz-header").style.display = "none";
  submittedScreen.style.display = "grid";
}

document.getElementById("checkResultBtn").addEventListener("click", async () => {
  const snapshot = await get(ref(db, `attempts/${attemptId}`));
  const current = snapshot.val();

  if (current?.resultPublished) {
    showResult(current);
  } else {
    alert("النتيجة لم تُعتمد بعد. حاول لاحقًا.");
  }
});

function showResult(data) {
  submittedScreen.innerHTML = `
    <section class="login-card" style="width:min(100%,850px); text-align:right">
      <div class="logo">🏆</div>
      <h1>تم اعتماد نتيجتك</h1>
      <div class="result-summary">
        النتيجة النهائية: ${data.totalScore || 0} / 52
      </div>
      <div id="studentResultDetails"></div>
    </section>
  `;

  const details = document.getElementById("studentResultDetails");

  details.innerHTML = questions
    .map((question) => {
      const answer = data.answers?.[question.id] || "لم تتم الإجابة";
      const review = data.essayReview?.[question.id];

      return `
        <article class="exam-question">
          <h3>السؤال ${question.id}: ${question.question}</h3>
          ${
            question.image
              ? `<img class="question-image" src="${question.image}" alt="صورة السؤال" />`
              : ""
          }
          <p class="answer-line"><strong>إجابتك:</strong> ${answer}</p>
          ${
            question.type === "essay"
              ? `
                <p class="answer-line ${
                  review?.isCorrect ? "correct-answer" : "wrong-answer"
                }">
                  <strong>تصحيح الإدارة:</strong>
                  ${review?.isCorrect ? "إجابة صحيحة" : "إجابة تحتاج تصحيحًا"}
                </p>
                ${
                  review?.note
                    ? `<p class="answer-line"><strong>ملاحظة الإدارة:</strong> ${review.note}</p>`
                    : ""
                }
              `
              : ""
          }
        </article>
      `;
    })
    .join("");
}

loadAttempt();
