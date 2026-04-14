/* Function A — Summary table */

(function () {
  "use strict";

  var tbody = document.querySelector("#summary-table tbody");
  var tableWrap = document.getElementById("summary-table-wrap");
  var statusEl = document.getElementById("summary-status");
  var rankingList = document.getElementById("risk-ranking-list");
  var columns = [
    "risk_rank",
    "driverID",
    "carPlateNumber",
    "risk_score",
    "risk_level",
    "overspeed_count",
    "total_overspeed_time",
    "fatigue_count",
    "neutral_slide_count",
    "total_neutral_slide_time",
    "rapid_speedup_count",
    "rapid_slowdown_count",
    "hthrottle_stop_count",
    "oil_leak_count",
  ];

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("hidden", !message);
    statusEl.classList.toggle("is-error", !!message && !!isError);
    tableWrap.classList.toggle("hidden", !!message && !!isError);
  }

  function getRiskClass(riskLevel) {
    return String(riskLevel || "")
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  function formatCellValue(key, value) {
    if (value == null) return "";
    if (key === "risk_score") return Number(value).toFixed(1);
    return String(value);
  }

  function buildRow(record) {
    var tr = document.createElement("tr");
    tr.className = "risk-row-" + getRiskClass(record.risk_level);

    columns.forEach(function (key) {
      var td = document.createElement("td");
      td.textContent = formatCellValue(key, record[key]);
      if (key === "risk_level") {
        td.className = "risk-level-cell";
        td.innerHTML = "";
        td.appendChild(buildRiskBadge(record[key]));
      }
      tr.appendChild(td);
    });

    return tr;
  }

  function buildRiskBadge(riskLevel) {
    var badge = document.createElement("span");
    badge.className = "risk-badge " + getRiskClass(riskLevel);
    badge.textContent = riskLevel || "Unknown";
    return badge;
  }

  function buildRankingCard(record) {
    var card = document.createElement("article");
    card.className = "risk-card " + getRiskClass(record.risk_level);

    var rank = document.createElement("div");
    rank.className = "risk-card-rank";
    rank.textContent = "#" + record.risk_rank;

    var body = document.createElement("div");
    body.className = "risk-card-body";

    var driver = document.createElement("h4");
    driver.textContent = record.driverID;

    var plate = document.createElement("p");
    plate.textContent = record.carPlateNumber;

    body.appendChild(driver);
    body.appendChild(plate);
    body.appendChild(buildRiskBadge(record.risk_level));

    var score = document.createElement("div");
    score.className = "risk-card-score";
    score.textContent = Number(record.risk_score || 0).toFixed(1);

    card.appendChild(rank);
    card.appendChild(body);
    card.appendChild(score);

    return card;
  }

  function renderRanking(data) {
    rankingList.innerHTML = "";

    var rankedDrivers = data
      .slice()
      .sort(function (a, b) {
        return (a.risk_rank || 999) - (b.risk_rank || 999);
      })
      .slice(0, 3);

    var fragment = document.createDocumentFragment();
    rankedDrivers.forEach(function (record) {
      fragment.appendChild(buildRankingCard(record));
    });
    rankingList.appendChild(fragment);
  }

  async function loadSummary() {
    try {
      var resp = await fetch("/api/summary");
      var data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Unable to load the summary data.");
      }
      if (!Array.isArray(data)) {
        throw new Error("The summary response had an unexpected format.");
      }

      tbody.innerHTML = "";
      rankingList.innerHTML = "";

      if (!data.length) {
        setStatus("No summary data was generated yet.", false);
        return;
      }

      setStatus("", false);
      renderRanking(data);
      var fragment = document.createDocumentFragment();
      data.forEach(function (d) {
        fragment.appendChild(buildRow(d));
      });
      tbody.appendChild(fragment);
    } catch (err) {
      tbody.innerHTML = "";
      rankingList.innerHTML = "";
      setStatus(err.message, true);
    }
  }

  loadSummary();
})();
