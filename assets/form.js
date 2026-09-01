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

  // 생긴다는데 / 바뀐다는데 토글
  var verb = "생긴다";
  var verbButtons = document.querySelectorAll("#verb-toggle .verb");
  verbButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      verb = btn.dataset.verb;
      verbButtons.forEach(function (b) { b.classList.toggle("active", b === btn); });
    });
  });

  // 빈칸이 입력란임을 알리는 장치들
  var thingInput = document.getElementById("thing");
  // 1) 문장 아무 데나 누르면 빈칸에 커서
  document.querySelector(".big-sentence").addEventListener("click", function (e) {
    if (e.target.closest(".verb-toggle") || e.target === thingInput) return;
    thingInput.focus();
  });
  // 2) 빈칸 안에서 예시가 타이핑되듯 돌아가는 placeholder
  var EXAMPLES = ["군공항 이전", "복합쇼핑몰", "반도체 팹", "자치구의 시 전환", "반도체 계약 학과"];
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion) {
    var exIdx = 0, charIdx = 0, deleting = false, typingTimer = null;
    var tick = function () {
      if (document.activeElement === thingInput || thingInput.value) {
        thingInput.placeholder = "무엇";
        typingTimer = setTimeout(tick, 1000);
        return;
      }
      var word = EXAMPLES[exIdx];
      charIdx += deleting ? -1 : 1;
      thingInput.placeholder = word.slice(0, charIdx) || "무엇";
      var delay = deleting ? 40 : 110;
      if (!deleting && charIdx === word.length) { deleting = true; delay = 1600; }
      else if (deleting && charIdx === 0) { deleting = false; exIdx = (exIdx + 1) % EXAMPLES.length; delay = 500; }
      typingTimer = setTimeout(tick, delay);
    };
    typingTimer = setTimeout(tick, 800);
  }

  function getRegion() {
    var el = form.querySelector('input[name="region"]:checked');
    return el ? el.value : "무응답";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorEl.textContent = "";

    var thing = document.getElementById("thing").value.trim();
    var answerText = answer.value.trim();

    if (!thing) { errorEl.textContent = "빈칸을 채워 주세요. 무엇이 생긴다던가요?"; return; }
    if (!answerText) { errorEl.textContent = "나름의 답을 한 줄이라도 적어 주세요."; return; }

    var url = window.SAENGGINDA_CONFIG.submitUrl || "/submit";
    submitBtn.disabled = true;
    submitBtn.textContent = "보태는 중…";

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thing: thing, verb: verb, answer: answerText, region: getRegion() }),
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
