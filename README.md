# Project Harpy Eagle

> A COMP4442 SERVICE AND CLOUD COMPUTING group project.

## Getting Started

### Prerequisites

- Python 3.12+
- Java 17 for local PySpark runs

### Setup

```bash
# Clone the repository
git clone https://github.com/FivespeedDoc/project-harpy-eagle
cd project-harpy-eagle

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # macOS / Linux
# .venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt
```

### Dataset Layout

Place the raw dataset under `dataset/detail-records/`.

The expected flow is:

`dataset/detail-records/` -> `spark/spark_analysis.py` -> `results/` -> `app.py`

### Generate Analysis Results

```bash
source .venv/bin/activate
python spark/spark_analysis.py
```

This generates:

- `results/drivers_summary.json`
- `results/per_driver_speed_data/<driverID>.json`

### Run the Web App

```bash
source .venv/bin/activate
python app.py
```

The app will start at `http://127.0.0.1:5000`.

If the generated files under `results/` are missing, the dashboard will show a setup notice instead of failing silently.
