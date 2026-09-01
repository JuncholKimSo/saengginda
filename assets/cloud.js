(function () {
  var STANCE_COLORS = { "기대": "#5fc596", "의문": "#e0a83d", "비판": "#e07a6b", "모름": "#8f8a7c" };
  var REFRESH_MS = 90 * 1000;
  var svg = document.getElementById("cloud");
  var lastSignature = null;
  var groupsByWord = {};

  // "일자리가" → "일자리". 남는 글자가 2자 미만이면 조사를 떼지 않는다 ("종이" 보호).
  function normalize(thing) {
    var t = thing.trim().replace(/\s+/g, " ");
    if (t.length >= 3 && /[이가은는도을를]$/.test(t)) t = t.slice(0, -1);
    return t;
  }

  function dominantStance(stances) {
    var best = "모름", bestN = -1;
    ["기대", "의문", "비판", "모름"].forEach(function (s) {
      if ((stances[s] || 0) > bestN) { bestN = stances[s] || 0; best = s; }
    });
    return best;
  }

  function buildGroups(entries) {
    var map = {};
    entries.forEach(function (e) {
      var w = normalize(e.thing);
      if (!w) return;
      if (!map[w]) map[w] = { word: w, count: 0, stances: {}, entries: [] };
      map[w].count += 1;
      map[w].stances[e.stance] = (map[w].stances[e.stance] || 0) + 1;
      map[w].entries.push(e);
    });
    return Object.values(map).sort(function (a, b) { return b.count - a.count; });
  }

  function render(groups) {
    var W = window.innerWidth;
    var HEADER = 80;
    var H = window.innerHeight - HEADER;
    var maxCount = groups.length ? groups[0].count : 1;
    var maxFont = Math.min(110, Math.max(48, W / 12));
    var minFont = 17;

    var words = groups.map(function (g) {
      return {
        text: g.word,
        size: minFont + (maxFont - minFont) * Math.sqrt(g.count / maxCount),
        color: STANCE_COLORS[dominantStance(g.stances)],
        count: g.count,
      };
    });

    d3.layout.cloud()
      .size([W, H])
      .words(words)
      .padding(6)
      .rotate(0)
      .font("Pretendard Variable")
      .fontWeight(700)
      .fontSize(function (d) { return d.size; })
      .on("end", function (placed) {
        svg.setAttribute("viewBox", "0 0 " + W + " " + window.innerHeight);
        svg.innerHTML = "";
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", "translate(" + W / 2 + "," + (HEADER + H / 2) + ")");
        placed.forEach(function (d) {
          var t = document.createElementNS("http://www.w3.org/2000/svg", "text");
          t.textContent = d.text;
          t.setAttribute("x", d.x);
          t.setAttribute("y", d.y);
          t.setAttribute("text-anchor", "middle");
          t.setAttribute("fill", d.color);
          t.setAttribute("font-size", d.size + "px");
          t.setAttribute("font-weight", "700");
          t.addEventListener("click", function () { openPanel(d.text); });
          g.appendChild(t);
        });
        svg.appendChild(g);
      })
      .start();
  }

  // 패널
  var panel = document.getElementById("panel");
  function openPanel(word) {
    var group = groupsByWord[word];
    if (!group) return;
    document.getElementById("panel-word").textContent = word;
    document.getElementById("panel-n").textContent = group.count + "개의 답";
    var list = document.getElementById("panel-list");
    list.innerHTML = "";
    group.entries.slice().reverse().forEach(function (e) {
      var li = document.createElement("li");
      var meta = document.createElement("div");
      meta.className = "meta";
      var stance = document.createElement("span");
      stance.className = "s-" + e.stance;
      stance.textContent = e.stance === "기대" ? "기대된다" : e.stance === "의문" ? "글쎄, 의문이다"
        : e.stance === "비판" ? "비판하고 싶다" : "잘 모르겠다";
      meta.appendChild(stance);
      if (e.region && e.region !== "무응답") {
        var region = document.createElement("span");
        region.className = "region";
        region.textContent = e.region;
        meta.appendChild(region);
      }
      var p = document.createElement("p");
      p.textContent = e.answer;
      li.appendChild(meta);
      li.appendChild(p);
      list.appendChild(li);
    });
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
  }
  document.getElementById("panel-close").addEventListener("click", function () {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  });

  function load() {
    var url = window.SAENGGINDA_CONFIG.dataUrl + "?t=" + Date.now();
    fetch(url)
      .then(function (res) { return res.ok ? res.json() : { entries: [] }; })
      .then(function (data) {
        var entries = data.entries || [];
        document.getElementById("total").textContent = String(entries.length);
        document.getElementById("empty").style.display = entries.length ? "none" : "flex";
        var signature = entries.length + ":" + (entries.length ? entries[entries.length - 1].id : "");
        if (signature === lastSignature) return;
        lastSignature = signature;
        var groups = buildGroups(entries);
        groupsByWord = {};
        groups.forEach(function (g) { groupsByWord[g.word] = g; });
        render(groups);
      })
      .catch(function () { /* 다음 주기에 재시도 */ });
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { lastSignature = null; load(); }, 400);
  });

  load();
  setInterval(load, REFRESH_MS);
})();
