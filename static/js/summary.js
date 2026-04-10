/* Function A — Summary table */

(function () {
  "use strict";

  var tbody = document.querySelector("#summary-table tbody");
  var tableWrap = document.getElementById("summary-table-wrap");
  var statusEl = document.getElementById("summary-status");
  var columns = [
    "driverID",
    "carPlateNumber",
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

  function buildRow(record) {
    var tr = document.createElement("tr");

    columns.forEach(function (key) {
      var td = document.createElement("td");
      td.textContent = record[key] == null ? "" : String(record[key]);
      tr.appendChild(td);
    });

    return tr;
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

      if (!data.length) {
        setStatus("No summary data was generated yet.", false);
        return;
      }

      setStatus("", false);
      var fragment = document.createDocumentFragment();
      data.forEach(function (d) {
        fragment.appendChild(buildRow(d));
      });
      tbody.appendChild(fragment);
    } catch (err) {
      tbody.innerHTML = "";
      setStatus(err.message, true);
    }
  }

  loadSummary();
})();
