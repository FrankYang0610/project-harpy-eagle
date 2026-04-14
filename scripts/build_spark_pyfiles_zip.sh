#!/usr/bin/env bash

set -euo pipefail

usage() {
    cat <<'EOF'
Usage:
  build_spark_pyfiles_zip.sh <output-zip>

Arguments:
  output-zip  Target zip file containing Python dependencies for EMR Spark

Environment variables:
  SPARK_PACKAGE_PYTHON  Optional Python interpreter used to locate installed packages

The generated zip currently bundles the AWS SDK dependencies required by
spark/spark_analysis.py when it writes to DynamoDB from EMR.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

OUTPUT_ZIP="${1:-}"

if [[ -z "${OUTPUT_ZIP}" ]]; then
    echo "error: output zip path is required" >&2
    usage >&2
    exit 1
fi

PYTHON_BIN="${SPARK_PACKAGE_PYTHON:-}"
if [[ -z "${PYTHON_BIN}" ]]; then
    if [[ -x ".venv/bin/python" ]]; then
        PYTHON_BIN=".venv/bin/python"
    else
        PYTHON_BIN="python3"
    fi
fi

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
    echo "error: python interpreter '${PYTHON_BIN}' was not found" >&2
    exit 1
fi

mkdir -p "$(dirname "${OUTPUT_ZIP}")"

"${PYTHON_BIN}" - "${OUTPUT_ZIP}" <<'PY'
import importlib
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

output_zip = Path(sys.argv[1]).resolve()
packages = [
    "boto3",
    "botocore",
    "s3transfer",
    "jmespath",
    "dateutil",
    "urllib3",
    "six",
]

with tempfile.TemporaryDirectory(prefix="spark-pyfiles-") as tmp_dir:
    staging = Path(tmp_dir)
    for name in packages:
        module = importlib.import_module(name)
        module_path = Path(module.__file__).resolve()
        if module_path.name == "__init__.py":
            shutil.copytree(
                module_path.parent,
                staging / module_path.parent.name,
                dirs_exist_ok=True,
                ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo"),
            )
        else:
            shutil.copy2(module_path, staging / module_path.name)

    with zipfile.ZipFile(output_zip, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(staging.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(staging))
PY

echo "Built Spark dependency bundle: ${OUTPUT_ZIP}"
