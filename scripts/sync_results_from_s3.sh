#!/usr/bin/env bash

set -euo pipefail

usage() {
    cat <<'EOF'
Usage:
  sync_results_from_s3.sh <s3-results-uri> [local-results-dir]

Environment variables:
  S3_RESULTS_URI      S3 prefix containing drivers_summary.json and per_driver_speed_data/
  LOCAL_RESULTS_DIR   Local destination directory. Defaults to /opt/project-harpy-eagle/results
  AWS_REGION          Optional AWS region passed to the AWS CLI

Examples:
  sync_results_from_s3.sh s3://example-bucket/project-harpy-eagle/results/
  S3_RESULTS_URI=s3://example-bucket/project-harpy-eagle/results/ ./scripts/sync_results_from_s3.sh
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

S3_RESULTS_URI="${S3_RESULTS_URI:-${1:-}}"
LOCAL_RESULTS_DIR="${LOCAL_RESULTS_DIR:-${2:-/opt/project-harpy-eagle/results}}"

if [[ -z "${S3_RESULTS_URI}" ]]; then
    echo "error: missing S3 results URI" >&2
    usage >&2
    exit 1
fi

if [[ "${S3_RESULTS_URI}" != s3://* ]]; then
    echo "error: S3 results URI must start with s3://" >&2
    exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
    echo "error: aws CLI is not installed" >&2
    exit 1
fi

AWS_ARGS=()
if [[ -n "${AWS_REGION:-}" ]]; then
    AWS_ARGS+=(--region "${AWS_REGION}")
fi

mkdir -p "${LOCAL_RESULTS_DIR}"

aws "${AWS_ARGS[@]}" s3 sync "${S3_RESULTS_URI%/}/" "${LOCAL_RESULTS_DIR%/}/" --delete

echo "Synced results from ${S3_RESULTS_URI%/}/ to ${LOCAL_RESULTS_DIR%/}/"
