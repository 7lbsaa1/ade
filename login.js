import { db, ref, push, set } from "./firebase-config.js";

const form = document.getElementById("loginForm");
const alertBox = document.getElementById("alertBox");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const phone = document.getElementById("phone").value.trim();

  if (username.length < 3 || phone.length < 8) {
    alertBox.textContent = "من فضلك اكتب اسمًا ورقم هاتف صحيحين.";
    alertBox.style.display = "block";
    return;
  }

  const submitButton = form.querySelector("button");
  submitButton.disabled = true;
  submitButton.textContent = "جارٍ تجهيز الاختبار...";

  try {
    const attemptRef = push(ref(db, "attempts"));

    await set(attemptRef, {
      username,
      phone,
      createdAt: Date.now(),
      status: "in_progress",
      answers: {},
      choiceScore: 0,
      essayScore: 0,
      totalScore: 0,
      resultPublished: false,
    });

    localStorage.setItem("footballQuizAttemptId", attemptRef.key);
    localStorage.setItem("footballQuizUser", JSON.stringify({ username, phone }));

    window.location.href = "quiz.html";
  } catch (error) {
    console.error(error);
    alertBox.textContent = "تعذر الاتصال بقاعدة البيانات. حاول مرة أخرى.";
    alertBox.style.display = "block";
    submitButton.disabled = false;
    submitButton.textContent = "ابدأ الاختبار ←";
  }
});
