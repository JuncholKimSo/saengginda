(function () {
  var form = document.getElementById("form");
  var done = document.getElementById("done");
  var errorEl = document.getElementById("form-error");
  var submitBtn = document.getElementById("submit-btn");
  var answer = document.getElementById("answer");
  var answerCount = document.getElementById("answer-count");

  answer.addEventListener("input", function () {
    answerCount.textContent = String(answer.value.length);
  });

  function getStance() {
    var el = form.querySelector('input[name="stance"]:checked');
    return el ? el.value : "";
  }
  function getRegion() {
    var el = form.querySelector('input[name="region"]:checked');
    return el ? el.value : "무응답";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorEl.textContent = "";

    var thing = document.getElementById("thing").value.trim();
    var stance = getStance();
    var answerText = answer.value.trim();

    if (!thing) { errorEl.textContent = "빈칸을 채워 주세요 — 무엇이 생긴다던가요?"; return; }
    if (!stance) { errorEl.textContent = "이 말을 들었을 때의 마음을 하나 골라 주세요."; return; }
    if (!answerText) { errorEl.textContent = "나름의 답을 한 줄이라도 적어 주세요."; return; }

    var url = window.SAENGGINDA_CONFIG.submitUrl || "/submit";
    submitBtn.disabled = true;
    submitBtn.textContent = "보태는 중…";

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thing: thing, stance: stance, answer: answerText, region: getRegion() }),
    })
      .then(function (res) {
        if (!res.ok) return res.json().catch(function () { return {}; }).then(function (body) {
          throw new Error(body.error || "제출에 실패했습니다 (" + res.status + ")");
        });
        form.style.display = "none";
        done.style.display = "block";
        window.scrollTo(0, 0);
      })
      .catch(function (err) {
        errorEl.textContent = err.message || "제출에 실패했습니다. 잠시 후 다시 시도해 주세요.";
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "말 보태기";
      });
  });

  document.getElementById("again-btn").addEventListener("click", function () {
    form.reset();
    answerCount.textContent = "0";
    done.style.display = "none";
    form.style.display = "block";
    window.scrollTo(0, 0);
  });
})();
