/* Function B — Speed monitor */

(function () {
  "use strict";

  var driverSelect = document.getElementById("driver-select");
  var btnStart = document.getElementById("btn-start");
  var btnStop = document.getElementById("btn-stop");
  var statusBadge = document.getElementById("monitor-status");
  var alertBox = document.getElementById("overspeed-alert");
  var panelStatus = document.getElementById("monitor-panel-status");
  var refreshInfo = document.getElementById("next-refresh");

  var chart = null;
  var intervalId = null;
  var currentOffset = 0;

  var BATCH_SIZE = 50;
  var REFRESH_MS = 30000;  // see project instruction document

  var chartLabels = [];
  var chartSpeeds = [];
  var chartOverspeed = [];

  function setPanelStatus(message, isError) {
    panelStatus.textContent = message;
    panelStatus.classList.toggle("hidden", !message);
    panelStatus.classList.toggle("is-error", !!message && !!isError);
  }

  function resetMonitorUi() {
    clearInterval(intervalId);
    intervalId = null;
    stopCountdown();
    driverSelect.disabled = false;
    btnStart.disabled = !driverSelect.value;
    btnStop.disabled = true;
    statusBadge.textContent = "Idle";
    statusBadge.classList.remove("running");
  }

  function handleMonitoringError(err) {
    resetMonitorUi();
    setPanelStatus(err.message || "Unable to load speed data.", true);
  }

  function clearChartData() {
    chartLabels.length = 0;
    chartSpeeds.length = 0;
    chartOverspeed.length = 0;
    alertBox.classList.add("hidden");

    if (chart) {
      chart.data.datasets[1].data = [];
      chart.update();
    }
  }

  // driver dropdown list
  async function loadDrivers() {
    try {
      var resp = await fetch("/api/drivers");
      var drivers = await resp.json();
      if (!resp.ok) {
        throw new Error(drivers.error || "Unable to load drivers.");
      }

      drivers.forEach(function (id) {
        var opt = document.createElement("option");
        opt.value = id;
        opt.textContent = id;
        driverSelect.appendChild(opt);
      });
      setPanelStatus("", false);
    } catch (err) {
      driverSelect.disabled = true;
      btnStart.disabled = true;
      setPanelStatus(err.message, true);
    }
  }

  loadDrivers();

  driverSelect.addEventListener("change", function () {
    btnStart.disabled = !driverSelect.value;
  });

  function initChart() {
    var ctx = document.getElementById("speed-chart").getContext("2d");
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: "Speed (km/h)",
            data: chartSpeeds,
            borderColor: "#3b7dd8",
            backgroundColor: "rgba(59,125,216,0.08)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
            fill: true,
          },
          {
            label: "Speed Limit (120 km/h)",
            data: [],
            borderColor: "rgba(220,60,60,0.6)",
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            ticks: { maxTicksLimit: 12, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            suggestedMax: 160,
            title: { display: true, text: "Speed (km/h)", font: { size: 12 } },
          },
        },
        plugins: {
          legend: { labels: { font: { size: 12 } } },
        },
      },
    });
  }

  async function fetchBatch() {
    var driverId = driverSelect.value;
    if (!driverId) return;

    var url = "/api/speed/" + driverId + "?offset=" + currentOffset + "&limit=" + BATCH_SIZE;
    var resp = await fetch(url);
    var body = await resp.json();
    if (!resp.ok) {
      throw new Error(body.error || "Unable to load speed data.");
    }
    if (!body || !Array.isArray(body.records)) {
      throw new Error("The speed-monitor response had an unexpected format.");
    }

    if (body.count === 0) {
      if (currentOffset > 0) {
        currentOffset = 0;
        clearChartData();
        return fetchBatch();
      }

      clearChartData();
      setPanelStatus("No speed data was generated for this driver yet.", false);
      return;
    }

    var hasOverspeed = false;

    body.records.forEach(function (r) {
      chartLabels.push(r.time);
      chartSpeeds.push(r.speed);
      chartOverspeed.push(r.isOverspeed);
      if (r.isOverspeed === 1) hasOverspeed = true;
    });

    var MAX_POINTS = 500;
    if (chartLabels.length > MAX_POINTS) {
      var trim = chartLabels.length - MAX_POINTS;
      chartLabels.splice(0, trim);
      chartSpeeds.splice(0, trim);
      chartOverspeed.splice(0, trim);
    }

    chart.data.datasets[1].data = chartLabels.map(function () { return 120; });
    chart.update();

    currentOffset += body.count;

    if (hasOverspeed) {
      alertBox.classList.remove("hidden");
    } else {
      alertBox.classList.add("hidden");
    }

    setPanelStatus("", false);
  }

  // Countdown display
  var countdownSec = 0;
  var countdownId = null;

  function startCountdown() {
    countdownSec = REFRESH_MS / 1000;
    refreshInfo.textContent = "Next refresh: " + countdownSec + "s";
    countdownId = setInterval(function () {
      countdownSec--;
      if (countdownSec <= 0) countdownSec = REFRESH_MS / 1000;
      refreshInfo.textContent = "Next refresh: " + countdownSec + "s";
    }, 1000);
  }

  function stopCountdown() {
    clearInterval(countdownId);
    countdownId = null;
    refreshInfo.textContent = "Next refresh: \u2014";
  }

  btnStart.addEventListener("click", async function () {
    if (!driverSelect.value) return;

    driverSelect.disabled = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    statusBadge.textContent = "Monitoring";
    statusBadge.classList.add("running");

    currentOffset = 0;

    if (chart) chart.destroy();
    initChart();
    clearChartData();

    try {
      await fetchBatch();
      intervalId = setInterval(function () {
        fetchBatch().catch(handleMonitoringError);
      }, REFRESH_MS);
      startCountdown();
    } catch (err) {
      handleMonitoringError(err);
    }
  });

  btnStop.addEventListener("click", function () {
    resetMonitorUi();
  });
})();
