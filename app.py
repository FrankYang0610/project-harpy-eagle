import json
import os

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")


def _load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.route("/")
def index():
    return render_template("base.html")


@app.route("/api/summary")
def api_summary():
    path = os.path.join(RESULTS_DIR, "drivers_summary.json")
    return jsonify(_load_json(path))


@app.route("/api/drivers")
def api_drivers():
    """Return the list of available driver IDs."""
    speed_dir = os.path.join(RESULTS_DIR, "per_driver_speed_data")
    drivers = sorted(
        f.replace(".json", "") for f in os.listdir(speed_dir) if f.endswith(".json")
    )
    return jsonify(drivers)


@app.route("/api/speed/<driver_id>")
def api_speed(driver_id):
    """
    Returns a *batch* of speed records for the given driver.

    :param
        offset – index of first record to return (default 0)
        limit  – max number of records to return  (default 50)
    """
    path = os.path.join(RESULTS_DIR, "per_driver_speed_data", f"{driver_id}.json")
    if not os.path.isfile(path):
        return jsonify({"error": "driver not found"}), 404

    data = _load_json(path)
    offset = request.args.get("offset", 0, type=int)
    limit = request.args.get("limit", 50, type=int)
    batch = data[offset : offset + limit]

    return jsonify({
        "driver_id": driver_id,
        "total": len(data),
        "offset": offset,
        "limit": limit,
        "count": len(batch),
        "records": batch,
    })


if __name__ == '__main__':
    app.run()
