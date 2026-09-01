(function () {
  var CFG = window.SAENGGINDA_CONFIG;
  var TOKEN_KEY = "saengginda_admin_token";
  var entries = [];

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  // ---- 토큰 보관 ----
  var tokenBox = document.getElementById("token-box");
  var tokenNote = document.getElementById("token-note");
  var tokenInput = document.getElementById("token-input");

  function refreshTokenUi() {
    var has = !!getToken();
    tokenBox.classList.toggle("ok", has);
    tokenNote.textContent = has
      ? "토큰 저장됨 — 숨김/해제 버튼이 활성화되었습니다."
      : "토큰 없음 — 표 열람과 CSV 다운로드는 토큰 없이도 됩니다.";
    document.querySelectorAll("td.actions button").forEach(function (b) { b.disabled = !has; });
  }
  document.getElementById("token-save").addEventListener("click", function () {
    var v = tokenInput.value.trim();
    if (!v) return;
    try { localStorage.setItem(TOKEN_KEY, v); } catch (e) { alert("이 브라우저에서는 저장이 안 됩니다."); return; }
    tokenInput.value = "";
    refreshTokenUi();
  });
  document.getElementById("token-clear").addEventListener("click", function () {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    refreshTokenUi();
  });

  // ---- GitHub API로 hidden 토글 ----
  function b64DecodeUtf8(b64) {
    var bin = atob(b64.replace(/\n/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function b64EncodeUtf8(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  var msg = document.getElementById("msg");
  function say(text, cls) { msg.textContent = text; msg.className = "msg " + (cls || ""); }

  function toggleHidden(entry, btn) {
    var token = getToken();
    if (!token) return;
    var api = "https://api.github.com/repos/" + CFG.repo + "/contents/" + entry.path;
    var headers = {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github+json",
    };
    btn.disabled = true;
    say("저장소에 반영하는 중…");
    fetch(api + "?ref=" + CFG.branch, { headers: headers })
      .then(function (res) {
        if (!res.ok) throw new Error("원본을 읽지 못했습니다 (" + res.status + ")");
        return res.json();
      })
      .then(function (file) {
        var obj = JSON.parse(b64DecodeUtf8(file.content));
        obj.hidden = !entry.hidden;
        return fetch(api, {
          method: "PUT",
          headers: headers,
          body: JSON.stringify({
            message: "chore: " + (obj.hidden ? "숨김" : "숨김 해제") + " — " + entry.id.slice(0, 8),
            content: b64EncodeUtf8(JSON.stringify(obj, null, 1)),
            sha: file.sha,
            branch: CFG.branch,
          }),
        });
      })
      .then(function (res) {
        if (!res.ok) throw new Error("커밋에 실패했습니다 (" + res.status + ")");
        entry.hidden = !entry.hidden;
        say((entry.hidden ? "숨김" : "숨김 해제") + " 완료 — 1~2분 뒤 Actions 집계에 반영됩니다.", "ok");
        renderRows();
      })
      .catch(function (err) { say(err.message, "err"); })
      .finally(function () { btn.disabled = !getToken(); });
  }

  // ---- 표 ----
  var rowsEl = document.getElementById("rows");
  var searchEl = document.getElementById("search");
  var filterEl = document.getElementById("filter");

  function renderStats() {
    var visible = entries.filter(function (e) { return !e.hidden; }).length;
    var byRegion = {};
    entries.forEach(function (e) { byRegion[e.region] = (byRegion[e.region] || 0) + 1; });
    var el = document.getElementById("stats");
    el.innerHTML = "";
    var parts = [
      ["전체", entries.length], ["공개", visible], ["숨김", entries.length - visible],
      ["광주", byRegion["광주"] || 0], ["전남", byRegion["전남"] || 0],
      ["그 외", byRegion["기타"] || 0], ["무응답", byRegion["무응답"] || 0],
    ];
    parts.forEach(function (p) {
      var s = document.createElement("span");
      var b = document.createElement("b");
      b.textContent = p[1];
      s.textContent = p[0] + " ";
      s.appendChild(b);
      el.appendChild(s);
    });
  }

  function renderRows() {
    var q = searchEl.value.trim().toLowerCase();
    var mode = filterEl.value;
    rowsEl.innerHTML = "";
    var shown = entries.slice().reverse().filter(function (e) {
      if (mode === "visible" && e.hidden) return false;
      if (mode === "hidden" && !e.hidden) return false;
      if (q && (e.thing + " " + e.answer).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    shown.forEach(function (e) {
      var tr = document.createElement("tr");
      if (e.hidden) tr.className = "hidden-row";

      var when = document.createElement("td");
      when.className = "when";
      when.textContent = (e.created_at || "").slice(5, 16).replace("T", " ");
      tr.appendChild(when);

      var thing = document.createElement("td");
      thing.className = "thing";
      var b = document.createElement("b");
      b.textContent = e.thing_normalized;
      thing.appendChild(b);
      if (e.thing.trim() !== e.thing_normalized) {
        var orig = document.createElement("div");
        orig.className = "orig";
        orig.textContent = e.thing;
        thing.appendChild(orig);
      }
      tr.appendChild(thing);

      var verb = document.createElement("td");
      verb.textContent = e.verb === "바뀐다" ? "바뀜" : "생김";
      tr.appendChild(verb);

      var region = document.createElement("td");
      region.textContent = e.region;
      tr.appendChild(region);

      var answer = document.createElement("td");
      answer.className = "answer";
      var p = document.createElement("p");
      p.textContent = e.answer;
      p.title = "누르면 전체 보기";
      p.addEventListener("click", function () { p.classList.toggle("expanded"); });
      answer.appendChild(p);
      tr.appendChild(answer);

      var actions = document.createElement("td");
      actions.className = "actions";
      var btn = document.createElement("button");
      btn.textContent = e.hidden ? "숨김 해제" : "숨기기";
      btn.disabled = !getToken();
      btn.addEventListener("click", function () { toggleHidden(e, btn); });
      actions.appendChild(btn);
      var gh = document.createElement("a");
      gh.className = "ghlink";
      gh.href = "https://github.com/" + CFG.repo + "/blob/" + CFG.branch + "/" + e.path;
      gh.target = "_blank";
      gh.rel = "noopener";
      gh.textContent = "원본";
      actions.appendChild(gh);
      tr.appendChild(actions);

      rowsEl.appendChild(tr);
    });
    if (!shown.length) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 6;
      td0.style.color = "var(--ink-soft)";
      td0.textContent = "표시할 응답이 없습니다.";
      tr0.appendChild(td0);
      rowsEl.appendChild(tr0);
    }
  }

  searchEl.addEventListener("input", renderRows);
  filterEl.addEventListener("change", renderRows);

  fetch(CFG.adminDataUrl + "?t=" + Date.now())
    .then(function (res) { return res.ok ? res.json() : { entries: [] }; })
    .then(function (data) {
      entries = data.entries || [];
      renderStats();
      renderRows();
      refreshTokenUi();
    })
    .catch(function () { say("admin.json 을 불러오지 못했습니다.", "err"); });
})();
