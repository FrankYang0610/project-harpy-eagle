#!/usr/bin/env bash

set -euo pipefail

usage() {
    cat <<'EOF'
Usage:
  run_local_spark_to_dynamodb.sh <summary-table> <events-table> [dataset-dir]

Arguments:
  summary-table  DynamoDB table for per-driver summary records
  events-table   DynamoDB table for per-event monitoring and summary records
  dataset-dir    Local dataset directory. Defaults to dataset/detail-records

Environment variables:
  AWS_REGION                Required AWS region for DynamoDB access
  JAVA_HOME                 Required by local Spark
  SPARK_MASTER              Optional Spark master. Defaults to local[*]
  SPARK_SHUFFLE_PARTITIONS  Optional shuffle partition count. Defaults to 16
  SPARK_LOG_LEVEL           Optional Spark log level. Defaults to ERROR
  SPARK_FULL_REFRESH        Optional. Set to 1 to clear and rebuild the target tables
  SPARK_SUBMIT_BIN          Optional spark-submit binary path override

Example:
  export AWS_REGION=ap-southeast-1
  export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
  ./scripts/run_local_spark_to_dynamodb.sh \
    project-harpy-eagle-driver-summary \
    project-harpy-eagle-driver-events

Default mode:
  The runner performs idempotent upserts into DynamoDB. Existing rows with the same
  primary key are overwritten in place, which is safe for rerunning the same dataset.

Full refresh:
  Set SPARK_FULL_REFRESH=1 only when the target tables must be deleted and rebuilt.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

SUMMARY_TABLE="${1:-}"
EVENTS_TABLE="${2:-}"
DATASET_DIR="${3:-dataset/detail-records}"

if [[ -z "${SUMMARY_TABLE}" || -z "${EVENTS_TABLE}" ]]; then
    echo "error: summary and events table names are required" >&2
    usage >&2
    exit 1
fi

if [[ -z "${AWS_REGION:-}" ]]; then
    echo "error: AWS_REGION must be set" >&2
    exit 1
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
    echo "error: JAVA_HOME must be set for local Spark runs" >&2
    exit 1
fi

if [[ ! -d "${DATASET_DIR}" ]]; then
    echo "error: dataset directory '${DATASET_DIR}' does not exist" >&2
    exit 1
fi

if [[ ! -f "spark/spark_analysis.py" ]]; then
    echo "error: spark/spark_analysis.py was not found. Run this script from the project root." >&2
    exit 1
fi

SPARK_MASTER="${SPARK_MASTER:-local[*]}"
SPARK_SHUFFLE_PARTITIONS="${SPARK_SHUFFLE_PARTITIONS:-16}"
SPARK_LOG_LEVEL="${SPARK_LOG_LEVEL:-ERROR}"
SPARK_FULL_REFRESH="${SPARK_FULL_REFRESH:-0}"
SPARK_SUBMIT_BIN="${SPARK_SUBMIT_BIN:-}"

if [[ -z "${SPARK_SUBMIT_BIN}" ]]; then
    if [[ -x ".venv/bin/spark-submit" ]]; then
        SPARK_SUBMIT_BIN=".venv/bin/spark-submit"
    else
        SPARK_SUBMIT_BIN="spark-submit"
    fi
fi

if ! command -v "${SPARK_SUBMIT_BIN}" >/dev/null 2>&1; then
    echo "error: spark-submit was not found. Set SPARK_SUBMIT_BIN or install pyspark in the active environment." >&2
    exit 1
fi

echo "Running local Spark analysis against DynamoDB ..."
echo "  master: ${SPARK_MASTER}"
echo "  input: ${DATASET_DIR}"
echo "  summary table: ${SUMMARY_TABLE}"
echo "  events table: ${EVENTS_TABLE}"
echo "  region: ${AWS_REGION}"
if [[ "${SPARK_FULL_REFRESH}" == "1" ]]; then
    echo "  mode: full refresh (tables will be cleared before rewriting)"
else
    echo "  mode: idempotent upsert"
fi

SPARK_EXTRA_ARGS=()
if [[ "${SPARK_FULL_REFRESH}" == "1" ]]; then
    SPARK_EXTRA_ARGS+=(--full-refresh)
fi

"${SPARK_SUBMIT_BIN}" \
  --master "${SPARK_MASTER}" \
  spark/spark_analysis.py \
  --input "${DATASET_DIR}" \
  --summary-table "${SUMMARY_TABLE}" \
  --events-table "${EVENTS_TABLE}" \
  --aws-region "${AWS_REGION}" \
  --shuffle-partitions "${SPARK_SHUFFLE_PARTITIONS}" \
  --log-level "${SPARK_LOG_LEVEL}" \
  "${SPARK_EXTRA_ARGS[@]}"
