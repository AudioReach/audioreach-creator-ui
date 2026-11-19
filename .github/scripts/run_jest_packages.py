# Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
# SPDX-License-Identifier: BSD-3-Clause

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from junit_reports import merge_reports
from merge_coverage import merge_coverage


def discover_packages(root):
    packages = []
    for manifest in sorted((root / "packages").glob("*/package.json")):
        data = json.loads(manifest.read_text(encoding="utf-8"))
        has_jest = "jest" in data or any(manifest.parent.glob("jest.config.*"))
        if has_jest and data.get("scripts", {}).get("test:ci"):
            packages.append(manifest.parent)
    return packages


def run_packages(root):
    packages = discover_packages(root)
    if not packages:
        print("No Jest packages with a test:ci script were found", file=sys.stderr)
        return 1
    for package in packages:
        (package / "test-results" / "junit.xml").unlink(missing_ok=True)
        (root / "coverage" / package.name / "coverage-final.json").unlink(missing_ok=True)
    failed = False
    for package in packages:
        print(f"Running Jest for {package.name}", flush=True)
        result = subprocess.run(
            ["pnpm", "--dir", str(package), "run", "test:ci",
             "--reporters=default", "--reporters=jest-junit",
             "--coverage", "--coverageReporters=json",
             "--coverageDirectory=" + str(root / "coverage" / package.name)],
            cwd=root,
            env={**os.environ,
                 "JEST_JUNIT_OUTPUT_DIR": str(package / "test-results"),
                 "JEST_JUNIT_OUTPUT_NAME": "junit.xml"},
            check=False,
        )
        failed = failed or result.returncode != 0
    return int(failed)


def main():
    parser = argparse.ArgumentParser(description="Run or merge workspace Jest packages")
    action = parser.add_mutually_exclusive_group()
    action.add_argument("--merge", action="store_true")
    action.add_argument("--coverage", action="store_true")
    parser.add_argument("--output", type=Path, default=Path("test-results/merged-results.xml"))
    arguments = parser.parse_args()
    root = Path.cwd()
    if arguments.coverage:
        inputs = [(package.name, root / "coverage" / package.name / "coverage-final.json", package)
                  for package in discover_packages(root)]
        merge_coverage(inputs, arguments.output, root,
                       ["pnpm", "--dir", str(root / "packages/electron-app"), "exec", "nyc"])
        return 0
    if arguments.merge:
        reports = [(package.name, package / "test-results" / "junit.xml")
                   for package in discover_packages(root)]
        merge_reports(reports, arguments.output, root.name)
        return 0
    return run_packages(root)


if __name__ == "__main__":
    sys.exit(main())
