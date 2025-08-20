# Production Installation

- due to ffmpeg licensing issues, we must exclude the ffmpeg dll before bundling.
- this means we must ship the unpacked files (with our bundled app), excluding ffmpeg, and download ffmpeg after the fact.
- using QIK, we can run each installation script, which downloads ffmpeg and extracts it to the target OS's unpacked directory.
