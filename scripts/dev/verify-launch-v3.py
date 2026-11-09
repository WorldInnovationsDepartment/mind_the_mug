#!/usr/bin/env python3
"""Mind the Mug — checks of the mascots launch video (docs/launch-v3.mp4).

  - probes the file: 1920x1080, 30 fps, h264 video, aac audio, 40 to 60 s
  - grabs a PNG shortly after every scene start and every hit into
    docs/review-v3/ and fails if one of them is blank (near black or white)
  - decodes the audio and fails if it is silent, then reports, for every hit
    of art/src/timeline-v3.json, how much louder the track is right after
    the hit than right before it; a slam must be louder

Run: python3 scripts/dev/verify-launch-v3.py     (after `npm run render:launch-v3` in art/)
Needs ffmpeg and ffprobe on PATH.
"""
import json
import math
import os
import struct
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MP4 = os.path.join(ROOT, "docs", "launch-v3.mp4")
REVIEW = os.path.join(ROOT, "docs", "review-v3")
TL = json.load(open(os.path.join(ROOT, "art", "src", "timeline-v3.json")))
FPS = TL["fps"]
DUR_RANGE = (40.0, 60.0)
RATE = 22050


def fail(msg):
    print(f"FAIL: {msg}")
    sys.exit(1)


def run(cmd):
    p = subprocess.run(cmd, capture_output=True)
    if p.returncode != 0:
        fail(f"{cmd[0]} exited {p.returncode}: {p.stderr.decode(errors='replace')[-300:]}")
    return p.stdout


def probe():
    info = json.loads(run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate", "-show_entries", "format=duration", "-of", "json", MP4]))
    video = next(s for s in info["streams"] if s["codec_type"] == "video")
    audio = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    dur = float(info["format"]["duration"])
    print(f"probe: {video['width']}x{video['height']} {video['r_frame_rate']} fps {video['codec_name']} + {audio and audio['codec_name']}, {dur:.2f} s")
    if (video["width"], video["height"]) != (1920, 1080): fail("size")
    if video["r_frame_rate"] != f"{FPS}/1": fail("frame rate")
    if video["codec_name"] != "h264": fail("video codec")
    if not audio or audio["codec_name"] != "aac": fail("audio codec")
    if not (DUR_RANGE[0] <= dur <= DUR_RANGE[1]): fail("duration")
    if abs(dur - TL["durationInFrames"] / FPS) > 0.2: fail("duration differs from the timeline")


def frames():
    os.makedirs(REVIEW, exist_ok=True)
    for name in os.listdir(REVIEW):
        if name.endswith(".png"): os.remove(os.path.join(REVIEW, name))
    shots = [(f"{s['id']}", s["start"] + 20) for s in TL["scenes"]]
    shots += [(f"{h['kind']}", h["frame"] + 8) for h in TL["hits"]]
    shots.append(("end", TL["durationInFrames"] - 10))
    for label, f in sorted(shots, key=lambda x: x[1]):
        t = f / FPS
        out = os.path.join(REVIEW, f"f{f:04d}-{label}.png")
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", MP4, "-frames:v", "1", out])
        luma = run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", MP4, "-frames:v", "1", "-vf", "scale=32:18,format=gray", "-f", "rawvideo", "-"])
        mean = sum(luma) / len(luma)
        spread = max(luma) - min(luma)
        print(f"frame {f:4d} {label:8s} luma {mean:5.1f} spread {spread:3d}")
        if spread < 12: fail(f"frame {f} ({label}) is blank")
    print(f"frames: {len(shots)} written to {os.path.relpath(REVIEW, ROOT)}/")


def audio():
    raw = run(["ffmpeg", "-v", "error", "-i", MP4, "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"])
    n = len(raw) // 2
    pcm = struct.unpack(f"<{n}h", raw[: n * 2])

    def rms(t0, t1):
        a, b = max(0, int(t0 * RATE)), min(n, int(t1 * RATE))
        if b <= a: return 0.0
        return math.sqrt(sum(v * v for v in pcm[a:b]) / (b - a)) / 32768

    whole = rms(0, n / RATE)
    print(f"audio: {n / RATE:.2f} s, rms {whole:.3f}")
    if whole < 0.02: fail("audio is silent")
    for h in TL["hits"]:
        t = h["frame"] / FPS
        before, after = rms(t - 0.14, t - 0.02), rms(t, t + 0.12)
        ratio = after / before if before > 1e-6 else float("inf")
        print(f"hit {h['frame']:4d} {h['kind']:5s} at {t:5.2f} s: after/before {ratio:5.2f}")
        if h["kind"] == "slam" and ratio < 1.15: fail(f"the slam at frame {h['frame']} does not land in the audio")
    # the ending: the last hit is the last event, and the track rings out to nothing on the final frame
    final, end = TL["final"] / FPS, n / RATE
    ring, tail, last = rms(final, final + 0.3), rms(end - 0.6, end - 0.1), rms(end - 0.05, end)
    print(f"ending: last hit at {final:.2f} s rms {ring:.3f}, last half second {tail:.4f}, last 50 ms {last:.5f}")
    if not (ring > tail > last): fail("the track does not die away after the last hit")
    if last > 0.004: fail("the track is still sounding on the final frame")


if __name__ == "__main__":
    if not os.path.exists(MP4): fail(f"{os.path.relpath(MP4, ROOT)} does not exist; render it first")
    probe()
    frames()
    audio()
    print("OK")
