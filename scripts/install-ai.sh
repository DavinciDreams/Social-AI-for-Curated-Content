#!/bin/bash
# Install AI service dependencies without workspace propagation
# This script runs the install:ai:internal script at the root level only

cd "$(dirname "$0")/.." || exit 1
cd ai-service && pip install -r requirements.txt
