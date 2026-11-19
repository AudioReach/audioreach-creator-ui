# Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
# SPDX-License-Identifier: BSD-3-Clause

import argparse
import copy
from decimal import Decimal, InvalidOperation
from pathlib import Path
from xml.etree import ElementTree as ET

from defusedxml.ElementTree import parse as parse_xml


def duration(value):
    try:
        number = Decimal(value or "0")
    except InvalidOperation as error:
        raise ValueError(f"Invalid JUnit duration: {value}") from error
    if not number.is_finite() or number < 0:
        raise ValueError(f"Invalid JUnit duration: {value}")
    return number


def merge_reports(reports, output, name):
    output = Path(output)
    output.unlink(missing_ok=True)
    merged = ET.Element("testsuites", name=name)
    totals = dict.fromkeys(["tests", "failures", "errors", "skipped"], 0)
    total_time = Decimal("0")
    missing = []

    for package, path in reports:
        path = Path(path)
        if not path.is_file():
            missing.append(str(path))
            continue
        document = parse_xml(path, forbid_dtd=True).getroot()
        if document.tag not in {"testsuite", "testsuites"}:
            raise ValueError(f"Not a JUnit report: {path}")
        for original in document.iter("testsuite"):
            # Parent grouping suites are flattened to avoid counting cases twice.
            cases = original.findall("testcase")
            if not cases and original.findall("testsuite"):
                continue
            suite = copy.deepcopy(original)
            for nested in suite.findall("testsuite"):
                suite.remove(nested)
            original_name = suite.get("name", "tests")
            prefix = package + ": "
            suite.set("name", original_name if original_name.startswith(prefix) else prefix + original_name)
            suite.set("package", package)
            counts = dict.fromkeys(totals, 0)
            case_time = Decimal("0")
            for case in suite.findall("testcase"):
                classname = case.get("classname", original_name)
                case.set("classname", classname if classname.startswith(package + ".") else package + "." + classname)
                elapsed = duration(case.get("time"))
                case.set("time", str(elapsed))
                case_time += elapsed
                counts["tests"] += 1
                for key, tag in [("failures", "failure"), ("errors", "error"), ("skipped", "skipped")]:
                    counts[key] += int(case.find(tag) is not None)
            elapsed = duration(suite.get("time")) if suite.get("time") is not None else case_time
            suite.set("time", str(elapsed))
            for key, value in counts.items():
                suite.set(key, str(value))
                totals[key] += value
            total_time += elapsed
            merged.append(suite)

    for key, value in totals.items():
        merged.set(key, str(value))
    merged.set("time", str(total_time))
    output.parent.mkdir(parents=True, exist_ok=True)
    ET.indent(merged)
    ET.ElementTree(merged).write(output, encoding="utf-8", xml_declaration=True)
    if missing:
        raise FileNotFoundError("Missing JUnit reports: " + ", ".join(missing))
    if not reports:
        raise ValueError("No JUnit reports were selected")


def main():
    parser = argparse.ArgumentParser(description="Merge package-labelled JUnit reports")
    parser.add_argument("--report", action="append", required=True, metavar="PACKAGE=PATH")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--name", required=True)
    arguments = parser.parse_args()
    reports = []
    for value in arguments.report:
        package, separator, path = value.partition("=")
        if not separator or not package or not path:
            parser.error("--report must use PACKAGE=PATH")
        reports.append((package, Path(path)))
    merge_reports(reports, arguments.output, arguments.name)


if __name__ == "__main__":
    main()
