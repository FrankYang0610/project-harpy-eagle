import json
import os

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
SUMMARY_FILE = "drivers_summary.json"
SPEED_DATA_DIR = "per_driver_speed_data"
DEFAULT_BATCH_SIZE = 50
MAX_BATCH_SIZE = 500
MISSING_RESULTS_MESSAGE = (
    "Generated results are missing. Run `python spark/spark_analysis.py` before opening the dashboard."
)


def _load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _get_batch_window():
    offset = max(request.args.get("offset", 0, type=int), 0)
    limit = request.args.get("limit", DEFAULT_BATCH_SIZE, type=int)
    if limit <= 0:
        limit = DEFAULT_BATCH_SIZE

    return offset, min(limit, MAX_BATCH_SIZE)


def _summary_status():
    summary_path = os.path.join(RESULTS_DIR, SUMMARY_FILE)

    if not os.path.isdir(RESULTS_DIR):
        return {
            "ready": False,
            "message": MISSING_RESULTS_MESSAGE,
        }

    if not os.path.isfile(summary_path):
        return {
            "ready": False,
            "message": "The summary JSON is missing. Re-run `python spark/spark_analysis.py` to regenerate the analysis output.",
        }

    return {"ready": True, "message": ""}


def _speed_status():
    speed_dir = os.path.join(RESULTS_DIR, SPEED_DATA_DIR)

    if not os.path.isdir(RESULTS_DIR):
        return {
            "ready": False,
            "message": MISSING_RESULTS_MESSAGE,
        }

    if not os.path.isdir(speed_dir):
        return {
            "ready": False,
            "message": "Per-driver speed data is missing. Re-run `python spark/spark_analysis.py` to regenerate the analysis output.",
        }

    driver_files = [name for name in os.listdir(speed_dir) if name.endswith(".json")]
    if not driver_files:
        return {
            "ready": False,
            "message": "No per-driver speed files were found. Re-run `python spark/spark_analysis.py` to populate the dashboard data.",
        }

    return {"ready": True, "message": ""}


def _dashboard_status():
    messages = []
    for status in (_summary_status(), _speed_status()):
        if not status["ready"] and status["message"] not in messages:
            messages.append(status["message"])

    if messages:
        return {"ready": False, "message": " ".join(messages)}

    return {"ready": True, "message": ""}


def _json_error(message, status_code=503):
    return jsonify({"error": message}), status_code


@app.route("/")
def index():
    results_status = _dashboard_status()
    return render_template("base.html", results_status=results_status)


@app.route("/api/summary")
def api_summary():
    results_status = _summary_status()
    if not results_status["ready"]:
        return _json_error(results_status["message"])

    path = os.path.join(RESULTS_DIR, SUMMARY_FILE)
    try:
        return jsonify(_load_json(path))
    except (FileNotFoundError, json.JSONDecodeError):
        return _json_error(
            "The summary data could not be read. Re-run `python spark/spark_analysis.py` to regenerate the results."
        )


@app.route("/api/drivers")
def api_drivers():
    """Return the list of available driver IDs."""
    results_status = _speed_status()
    if not results_status["ready"]:
        return _json_error(results_status["message"])

    speed_dir = os.path.join(RESULTS_DIR, SPEED_DATA_DIR)
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
    results_status = _speed_status()
    if not results_status["ready"]:
        return _json_error(results_status["message"])

    path = os.path.join(RESULTS_DIR, SPEED_DATA_DIR, f"{driver_id}.json")
    if not os.path.isfile(path):
        return jsonify({"error": "driver not found"}), 404

    try:
        data = _load_json(path)
    except json.JSONDecodeError:
        return _json_error(
            "The selected driver's speed data could not be read. Re-run `python spark/spark_analysis.py` to regenerate the results."
        )

    offset, limit = _get_batch_window()
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
