import { db, ref, onValue, update } from "./firebase-config.js";
import questions from "./questions.js";

const studentsList = document.getElementById("studentsList");
const adminContent = document.getElementById("adminContent");

let attempts = {};
let selectedAttemptId = null;

const correctAnswers = {
  1: "الأرجنتين",
  2: "البرازيل",
  3: "11 لاعبًا",
  4: "ليونيل ميسي",
  5: "كريستيانو رونالدو",
  6: "دوري أبطال أوروبا",
  7: "ريال مدريد",
  8: "فرنسية",
  9: "حراسة المرمى",
  10: "90 دقيقة",
  11: "شوطان",
  12: "إسبانيا",
  13: "كريستيانو رونالدو",
  14: "الأرجنتين",
  15: "الحمراء",
  16: "الصفراء",
  17: "5 تبديلات",
  18: "إنجلترا",
  19: "الدوري الإنجليزي الممتاز",
  20: "الدوري الإسباني",
  21: "الدوري الإيطالي",
  22: "البوندسليجا",
  23: "مانشستر يونايتد",
  24: "ريال مدريد",
  25: "يوفنتوس",
  26: "بايرن ميونخ",
  27: "ريال مدريد",
  28: "برشلونة",
  29: "سانتياجو برنابيو",
  30: "سبوتيفاي كامب نو",
  31: "أولد ترافورد",
  32: "فرنسا",
  33: "ألمانيا",
  34: "إسبانيا",
  35: "أندريس إنييستا",
  36: "المغرب",
  37: "2022",
  38: "كيليان مبابي",
  39: "ليونيل ميسي",
  40: "3 نقاط",
  41: "نقطة واحدة",
  42: "VAR",
  43: "جياني إنفانتينو",
  44: "الاتحاد الدولي لكرة القدم",
  45: "ليونيل ميسي",
  46: "مصر",
  47: "7 مرات",
  48: "منتخب مصر",
  49: "أرشافين",
  50: "كفاراتسخيليا",
};

onValue(ref(db, "attempts"), (snapshot) => {
  attempts = snapshot.val() || {};
  renderStudents();

  if (selectedAttemptId && attempts[selectedAttemptId]) {
    renderStudentExam(selectedAttemptId);
  }
});

function renderStudents() {
  const entries = Object.entries(attempts).sort(
    (a, b) => (b[1].submittedAt || b[1].createdAt || 0) - (a[1].submittedAt || a[1].createdAt || 0)
  );

  if (!entries.length) {
    studentsList.innerHTML = `<p class="empty-state">لا يوجد طلاب حتى الآن.</p>`;
    return;
  }

  studentsList.innerHTML = entries
    .map(([id, student]) => {
      const status = student.resultPublished ? "published" : "pending";
      const statusText = student.resultPublished ? "تم نشر النتيجة" : "قيد المراجعة";

      return `
        <article class="student-item ${id === selectedAttemptId ? "active" : ""}" data-id="${id}">
          <h4>${escapeHtml(student.username || "بدون اسم")}</h4>
          <small>${escapeHtml(student.phone || "")}</small><br />
          <span class="status ${status}">${statusText}</span>
          ${
            student.resultPublished
              ? `<small> — النتيجة: ${student.totalScore || 0}/52</small>`
              : ""
          }
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".student-item").forEach((item) => {
    item.addEventListener("click", () => {
      selectedAttemptId = item.dataset.id;
      renderStudents();
      renderStudentExam(selectedAttemptId);
    });
  });
}

function calculateChoiceScore(student) {
  return questions
    .filter((question) => question.type === "choice")
    .reduce((score, question) => {
      return score + (student.answers?.[question.id] === correctAnswers[question.id] ? 1 : 0);
    }, 0);
}

function renderStudentExam(attemptId) {
  const student = attempts[attemptId];
  const choiceScore = calculateChoiceScore(student);
  const review = student.essayReview || {};

  adminContent.innerHTML = `
    <h2>${escapeHtml(student.username || "طالب")}</h2>
    <p><strong>رقم الهاتف:</strong> ${escapeHtml(student.phone || "-")}</p>
    <div class="result-summary">
      درجة الاختيارات: ${choiceScore} / 50
      ${student.resultPublished ? `<br />النتيجة النهائية: ${student.totalScore || 0} / 52` : ""}
    </div>

    ${questions
      .map((question) => {
        const studentAnswer = student.answers?.[question.id] || "لم يجب";

        if (question.type === "choice") {
          const isCorrect = studentAnswer === correctAnswers[question.id];

          return `
            <article class="exam-question">
              <h3>السؤال ${question.id}: ${question.question}</h3>
              ${
                question.image
                  ? `<img class="question-image" src="${question.image}" alt="صورة السؤال ${question.id}" />`
                  : ""
              }
              <p class="answer-line ${isCorrect ? "correct-answer" : "wrong-answer"}">
                <strong>إجابة الطالب:</strong> ${escapeHtml(studentAnswer)}
              </p>
              <p class="answer-line correct-answer">
                <strong>الإجابة الصحيحة:</strong> ${correctAnswers[question.id]}
              </p>
            </article>
          `;
        }

        const currentReview = review[question.id] || {};

        return `
          <article class="exam-question">
            <h3>السؤال ${question.id}: ${question.question}</h3>
            ${
              question.image
                ? `<img class="question-image" src="${question.image}" alt="صورة السؤال ${question.id}" />`
                : ""
            }
            <p class="answer-line"><strong>إجابة الطالب:</strong> ${escapeHtml(studentAnswer)}</p>

            <div class="review-grid">
              <label class="review-choice">
                <input
                  type="radio"
                  name="essay-${question.id}"
                  value="true"
                  ${currentReview.isCorrect === true ? "checked" : ""}
                />
                إجابة صحيحة
              </label>

              <label class="review-choice">
                <input
                  type="radio"
                  name="essay-${question.id}"
                  value="false"
                  ${currentReview.isCorrect === false ? "checked" : ""}
                />
                إجابة خاطئة
              </label>
            </div>

            <label class="field" style="margin-top: 14px">
              <span>التصحيح أو الملاحظة للطالب</span>
              <textarea id="note-${question.id}" placeholder="اكتب الإجابة الصحيحة أو ملاحظتك...">${escapeHtml(
                currentReview.note || ""
              )}</textarea>
            </label>
          </article>
        `;
      })
      .join("")}

    <button id="publishResultButton" class="primary-btn">
      ${student.resultPublished ? "تحديث النتيجة المنشورة" : "اعتماد وإظهار النتيجة للطالب"}
    </button>
  `;

  document.getElementById("publishResultButton").addEventListener("click", () => {
    publishResult(attemptId);
  });
}

async function publishResult(attemptId) {
  const student = attempts[attemptId];
  const essayReview = {};

  for (const question of questions.filter((item) => item.type === "essay")) {
    const checked = document.querySelector(`input[name="essay-${question.id}"]:checked`);
    const note = document.getElementById(`note-${question.id}`).value.trim();

    if (!checked) {
      alert(`من فضلك صحح السؤال المقالي رقم ${question.id} أولًا.`);
      return;
    }

    essayReview[question.id] = {
      isCorrect: checked.value === "true",
      note,
    };
  }

  const choiceScore = calculateChoiceScore(student);
  const essayScore = Object.values(essayReview).filter((item) => item.isCorrect).length;
  const totalScore = choiceScore + essayScore;

  const button = document.getElementById("publishResultButton");
  button.disabled = true;
  button.textContent = "جارٍ حفظ النتيجة...";

  try {
    await update(ref(db, `attempts/${attemptId}`), {
      choiceScore,
      essayScore,
      totalScore,
      essayReview,
      status: "reviewed",
      resultPublished: true,
      reviewedAt: Date.now(),
    });

    alert("تم اعتماد النتيجة وإظهارها للطالب.");
  } catch (error) {
    console.error(error);
    alert("حدث خطأ أثناء حفظ النتيجة.");
    button.disabled = false;
    button.textContent = "اعتماد وإظهار النتيجة للطالب";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
