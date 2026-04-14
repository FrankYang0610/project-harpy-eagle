/* Function B map module */

(function () {
  "use strict";

  var mapStatus = document.getElementById("map-status");

  var trajectoryMap = null;
  var routeLayer = null;
  var overspeedLayer = null;
  var startMarker = null;
  var endMarker = null;
  var trajectoryPoints = [];
  var overspeedMarkers = [];

  var MAP_MAX_POINTS = 1000;
  var MAP_MAX_OVERSPEED_MARKERS = 120;

  function setStatus(message) {
    mapStatus.textContent = message;
  }

  function makeIcon(className, label) {
    return L.divIcon({
      className: "",
      html: '<span class="' + className + '">' + label + '</span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  function buildPopup(record, label) {
    var box = document.createElement("div");
    box.className = "trajectory-popup";

    [
      label,
      "Time: " + record.time,
      "Speed: " + record.speed + " km/h",
      "Plate: " + record.carPlateNumber,
    ].forEach(function (text) {
      var line = document.createElement("p");
      line.textContent = text;
      box.appendChild(line);
    });

    return box;
  }

  function hasLocation(record) {
    return (
      typeof record.latitude === "number" &&
      typeof record.longitude === "number" &&
      record.latitude >= -90 &&
      record.latitude <= 90 &&
      record.longitude >= -180 &&
      record.longitude <= 180
    );
  }

  function init() {
    if (trajectoryMap) {
      setTimeout(function () { trajectoryMap.invalidateSize(); }, 0);
      return true;
    }

    if (!window.L) {
      setStatus("Map library failed to load. Check the network connection.");
      return false;
    }

    trajectoryMap = L.map("trajectory-map", {
      scrollWheelZoom: false,
    }).setView([30.0, 110.0], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(trajectoryMap);

    routeLayer = L.polyline([], {
      color: "#2256b8",
      weight: 4,
      opacity: 0.78,
    }).addTo(trajectoryMap);

    overspeedLayer = L.layerGroup().addTo(trajectoryMap);
    setStatus("Route will update with each speed batch.");
    return true;
  }

  function clear() {
    trajectoryPoints.length = 0;
    overspeedMarkers.length = 0;

    if (!trajectoryMap) {
      setStatus("Start monitoring to draw the route on OpenStreetMap.");
      return;
    }

    routeLayer.setLatLngs([]);
    overspeedLayer.clearLayers();

    if (startMarker) {
      trajectoryMap.removeLayer(startMarker);
      startMarker = null;
    }
    if (endMarker) {
      trajectoryMap.removeLayer(endMarker);
      endMarker = null;
    }

    trajectoryMap.setView([30.0, 110.0], 5);
    setStatus("Waiting for GPS points from the selected driver.");
  }

  function refreshEndpointMarkers(recordsWithLocation) {
    var firstRecord = recordsWithLocation[0];
    var lastRecord = recordsWithLocation[recordsWithLocation.length - 1];

    if (!startMarker && firstRecord) {
      startMarker = L.marker(
        [firstRecord.latitude, firstRecord.longitude],
        { icon: makeIcon("trajectory-start-icon", "S") }
      )
        .bindPopup(buildPopup(firstRecord, "Route start"))
        .addTo(trajectoryMap);
    }

    if (endMarker) {
      trajectoryMap.removeLayer(endMarker);
    }
    if (lastRecord) {
      endMarker = L.marker(
        [lastRecord.latitude, lastRecord.longitude],
        { icon: makeIcon("trajectory-end-icon", "E") }
      )
        .bindPopup(buildPopup(lastRecord, "Latest point"))
        .addTo(trajectoryMap);
    }
  }

  function addOverspeedMarker(record) {
    var marker = L.marker(
      [record.latitude, record.longitude],
      { icon: makeIcon("trajectory-overspeed-icon", "!") }
    )
      .bindPopup(buildPopup(record, "Overspeed detected"))
      .addTo(overspeedLayer);

    overspeedMarkers.push(marker);
    if (overspeedMarkers.length > MAP_MAX_OVERSPEED_MARKERS) {
      overspeedLayer.removeLayer(overspeedMarkers.shift());
    }
  }

  function update(records) {
    if (!trajectoryMap && !init()) return;

    var recordsWithLocation = records.filter(hasLocation);
    if (!recordsWithLocation.length) {
      setStatus("No GPS points were available in this speed batch.");
      return;
    }

    recordsWithLocation.forEach(function (record) {
      trajectoryPoints.push([record.latitude, record.longitude]);
      if (record.isOverspeed === 1) {
        addOverspeedMarker(record);
      }
    });

    if (trajectoryPoints.length > MAP_MAX_POINTS) {
      trajectoryPoints.splice(0, trajectoryPoints.length - MAP_MAX_POINTS);
    }

    routeLayer.setLatLngs(trajectoryPoints);
    refreshEndpointMarkers(recordsWithLocation);

    if (trajectoryPoints.length > 1) {
      trajectoryMap.fitBounds(routeLayer.getBounds(), { padding: [24, 24], maxZoom: 15 });
    } else {
      trajectoryMap.setView(trajectoryPoints[0], 14);
    }

    setStatus(
      "Showing " + trajectoryPoints.length + " recent GPS points; red markers show overspeed events."
    );
  }

  window.MonitorMap = {
    clear: clear,
    init: init,
    update: update,
  };
})();
