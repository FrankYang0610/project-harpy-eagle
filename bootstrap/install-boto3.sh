#!/bin/bash

set -euo pipefail

echo "[bootstrap] starting boto3 installation on $(hostname)"

# EMR bootstrap actions run as the hadoop user by default, so use sudo for system install.
sudo python3 -m pip install --upgrade "boto3==1.35.53"

echo "[bootstrap] boto3 installation complete on $(hostname)"
python3 - <<'PY'
import boto3
import botocore
print("[bootstrap] boto3 version:", boto3.__version__)
print("[bootstrap] botocore version:", botocore.__version__)
PY
