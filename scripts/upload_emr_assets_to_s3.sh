#!/usr/bin/env bash

set -euo pipefail

usage() {
    cat <<'EOF'
Usage:
  upload_emr_assets_to_s3.sh <s3-prefix> [dataset-dir]

Arguments:
  s3-prefix    Base S3 prefix for the project, for example:
               s3://example-bucket/project-harpy-eagle
  dataset-dir  Local dataset directory to upload. Defaults to dataset/detail-records

Uploads:
  - spark/spark_analysis.py -> <s3-prefix>/code/spark_analysis.py
  - Spark dependency bundle -> <s3-prefix>/code/spark_pyfiles.zip
  - dataset files           -> <s3-prefix>/dataset/detail-records/

Environment variables:
  AWS_REGION          Optional AWS region passed to the AWS CLI
  SPARK_PYFILES_ZIP   Optional prebuilt dependency bundle path
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

S3_PREFIX="${1:-}"
DATASET_DIR="${2:-dataset/detail-records}"

if [[ -z "${S3_PREFIX}" ]]; then
    echo "error: missing S3 prefix" >&2
    usage >&2
    exit 1
fi

if [[ "${S3_PREFIX}" != s3://* ]]; then
    echo "error: S3 prefix must start with s3://" >&2
    exit 1
fi

if [[ ! -f "spark/spark_analysis.py" ]]; then
    echo "error: spark/spark_analysis.py was not found. Run this script from the project root." >&2
    exit 1
fi

if [[ ! -d "${DATASET_DIR}" ]]; then
    echo "error: dataset directory '${DATASET_DIR}' does not exist" >&2
    exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
    echo "error: aws CLI is not installed" >&2
    exit 1
fi

PYFILES_ZIP="${SPARK_PYFILES_ZIP:-}"
TEMP_PYFILES_ZIP=""
if [[ -z "${PYFILES_ZIP}" ]]; then
    TEMP_PYFILES_ZIP="$(mktemp "${TMPDIR:-/tmp}/spark-pyfiles.XXXXXX.zip")"
    ./scripts/build_spark_pyfiles_zip.sh "${TEMP_PYFILES_ZIP}"
    PYFILES_ZIP="${TEMP_PYFILES_ZIP}"
fi

cleanup() {
    if [[ -n "${TEMP_PYFILES_ZIP}" && -f "${TEMP_PYFILES_ZIP}" ]]; then
        rm -f "${TEMP_PYFILES_ZIP}"
    fi
}
trap cleanup EXIT

if [[ ! -f "${PYFILES_ZIP}" ]]; then
    echo "error: Spark dependency bundle '${PYFILES_ZIP}' does not exist" >&2
    exit 1
fi

AWS_ARGS=()
if [[ -n "${AWS_REGION:-}" ]]; then
    AWS_ARGS+=(--region "${AWS_REGION}")
fi

aws "${AWS_ARGS[@]}" s3 cp spark/spark_analysis.py "${S3_PREFIX%/}/code/spark_analysis.py"
aws "${AWS_ARGS[@]}" s3 cp "${PYFILES_ZIP}" "${S3_PREFIX%/}/code/spark_pyfiles.zip"
aws "${AWS_ARGS[@]}" s3 sync "${DATASET_DIR%/}/" "${S3_PREFIX%/}/dataset/detail-records/"

echo "Uploaded spark script to ${S3_PREFIX%/}/code/spark_analysis.py"
echo "Uploaded Spark dependency bundle to ${S3_PREFIX%/}/code/spark_pyfiles.zip"
echo "Uploaded dataset to ${S3_PREFIX%/}/dataset/detail-records/"
