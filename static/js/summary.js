/* Function A — Summary table */

(function () {
  "use strict";

  async function loadSummary() {
    var resp = await fetch("/api/summary");
    var data = await resp.json();
    var tbody = document.querySelector("#summary-table tbody");
    tbody.innerHTML = "";

    data.forEach(function (d) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + d.driverID + "</td>" +
        "<td>" + d.carPlateNumber + "</td>" +
        "<td>" + d.overspeed_count + "</td>" +
        "<td>" + d.total_overspeed_time + "</td>" +
        "<td>" + d.fatigue_count + "</td>" +
        "<td>" + d.neutral_slide_count + "</td>" +
        "<td>" + d.total_neutral_slide_time + "</td>" +
        "<td>" + d.rapid_speedup_count + "</td>" +
        "<td>" + d.rapid_slowdown_count + "</td>" +
        "<td>" + d.hthrottle_stop_count + "</td>" +
        "<td>" + d.oil_leak_count + "</td>";
      tbody.appendChild(tr);
    });
  }

  loadSummary();
})();
