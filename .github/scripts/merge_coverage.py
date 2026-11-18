# Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
# SPDX-License-Identifier: BSD-3-Clause

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path
from xml.etree import ElementTree as ET

from defusedxml.ElementTree import parse as parse_xml


def package_for_file(path, inputs, root):
    path = Path(path).resolve()
    for name, _, source in sorted(inputs, key=lambda item: len(str(item[2])), reverse=True):
        if path.is_relative_to(Path(source).resolve()):
            return name
    for parent in path.parents:
        if parent == root or not parent.is_relative_to(root):
            break
        if (parent / "package.json").is_file():
            return parent.name
    return "workspace"


def group_clover_packages(report, inputs, root):
    document = parse_xml(report, forbid_dtd=True)
    project = document.getroot().find("project")
    if project is None:
        raise ValueError("Clover report has no project")
    groups = {}
    for file in project.findall(".//file"):
        package = package_for_file(file.get("path"), inputs, root)
        groups.setdefault(package, []).append(file)
    for child in list(project):
        if child.tag in {"package", "file"}:
            project.remove(child)
    project.set("name", root.name)
    keys = ["statements", "coveredstatements", "conditionals",
            "coveredconditionals", "methods", "coveredmethods"]
    for name, files in sorted(groups.items()):
        package = ET.SubElement(project, "package", name=name)
        totals = {key: sum(int(file.find("metrics").get(key, "0")) for file in files)
                  for key in keys}
        totals.update(
            elements=totals["statements"] + totals["conditionals"] + totals["methods"],
            coveredelements=totals["coveredstatements"] + totals["coveredconditionals"] + totals["coveredmethods"],
            complexity=0, loc=totals["statements"], ncloc=totals["statements"],
            files=len(files), classes=len(files),
        )
        ET.SubElement(package, "metrics", {key: str(value) for key, value in totals.items()})
        for file in sorted(files, key=lambda item: item.get("path")):
            package.append(file)
    project.find("metrics").set("packages", str(len(groups)))
    ET.indent(document)
    document.write(report, encoding="utf-8", xml_declaration=True)


def merge_coverage(inputs, output, root, command):
    output = Path(output)
    root = Path(root).resolve()
    output.unlink(missing_ok=True)
    available = [item for item in inputs if Path(item[1]).is_file()]
    missing = [str(item[1]) for item in inputs if not Path(item[1]).is_file()]
    if not available:
        raise FileNotFoundError("No package coverage data was generated")
    with tempfile.TemporaryDirectory(prefix="arc-coverage-") as directory:
        temp = Path(directory)
        raw = temp / "inputs"
        raw.mkdir()
        for index, (_, report, _) in enumerate(available):
            shutil.copyfile(report, raw / f"{index}.json")
        merged = temp / "merged"
        merged.mkdir()
        subprocess.run([*command, "merge", str(raw), str(merged / "coverage-final.json")], check=True)
        subprocess.run([*command, "report", "--reporter=clover",
                        "--cwd=" + str(root), "--temp-dir=" + str(merged),
                        "--report-dir=" + str(temp / "report")], check=True)
        report = temp / "report" / "clover.xml"
        group_clover_packages(report, inputs, root)
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(report, output)
    if missing:
        raise FileNotFoundError("Missing package coverage data: " + ", ".join(missing))


def main():
    parser = argparse.ArgumentParser(description="Merge coverage into package-labelled Clover XML")
    parser.add_argument("--package", action="append", required=True, metavar="NAME=DIRECTORY")
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    root = Path.cwd()
    inputs = []
    for value in arguments.package:
        name, separator, directory = value.partition("=")
        if not separator or not name or not directory:
            parser.error("--package must use NAME=DIRECTORY")
        source = root / directory
        inputs.append((name, source / "coverage/coverage-final.json", source))
    merge_coverage(inputs, arguments.output, root, ["pnpm", "exec", "nyc"])


if __name__ == "__main__":
    main()
