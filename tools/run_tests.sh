#!/usr/bin/env bash
# Runs the headless Godot test suite and fails on any test failure OR any
# script/runtime error printed by the engine.
set -u
GODOT="${GODOT:-godot}"
cd "$(dirname "$0")/.."
"$GODOT" --headless --import >/dev/null 2>&1
OUT=$(timeout 600 "$GODOT" --headless res://tests/TestRunner.tscn 2>&1)
CODE=$?
echo "$OUT" | grep -v '^$'
if echo "$OUT" | grep -qE "SCRIPT ERROR|Parse Error|Compile Error"; then
  echo "FAILED: engine reported script errors"
  exit 1
fi
exit $CODE
