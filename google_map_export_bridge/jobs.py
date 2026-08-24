"""
Background job runner for area exports.

Blender's Python must only be touched from the main thread, so the work is
split: this module owns a worker thread that downloads tiles and rewrites the
OBJ (neither needs `bpy`), and hands the finished file to the main thread
through `pending_imports`. The add-on drains that queue from a
`bpy.app.timers` callback, which does run on the main thread.

Deliberately free of `bpy` imports so it can be exercised outside Blender.
"""

from __future__ import annotations

import json
import os
import queue
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid

from . import obj_transform

# Phase names shared with the web interface. Keep in step with web/src/types.ts.
PHASE_IDLE = "idle"
PHASE_QUEUED = "queued"
PHASE_DOWNLOADING = "downloading"
PHASE_CONVERTING = "converting"
PHASE_IMPORTING = "importing"
PHASE_DONE = "done"
PHASE_ERROR = "error"
PHASE_CANCELLED = "cancelled"

TERMINAL_PHASES = (PHASE_DONE, PHASE_ERROR, PHASE_CANCELLED)

MAX_LOG_LINES = 300

# Progress is apportioned across the stages so the bar advances monotonically:
# downloading dominates, conversion is a couple of file passes, import is quick.
_DOWNLOAD_SHARE = 0.72
_CONVERT_SHARE = 0.20

_GMEB_LINE = re.compile(r"^GMEB::(\w+)\s*(\{.*\})?\s*$")


def _no_window_kwargs():
    """Keep a console window from flashing up on Windows."""
    if sys.platform == "win32":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        return {"startupinfo": startupinfo,
                "creationflags": subprocess.CREATE_NO_WINDOW}
    return {}


class Job:
    def __init__(self, params):
        self.id = uuid.uuid4().hex[:12]
        self.params = params
        self.phase = PHASE_QUEUED
        self.message = "Queued"
        self.progress = 0.0
        self.log = []
        self.started_at = time.time()
        self.finished_at = None
        self.error = None
        self.model_path = None
        self.output_dir = None
        self.achieved_level = None
        # Tiles the exporter could not decode, and materials that reached the
        # scene without a usable image. They usually agree, but not always.
        self.textures_failed = 0
        self.textures_missing = 0
        # Tiles Google served blank. The geometry is real; the imagery is not.
        self.textures_blank = 0
        # Tiles that came back blank but were good before, so the earlier
        # picture was kept.
        self.textures_restored = 0
        self.report = None      # obj_transform.ObjTransformResult
        self.import_summary = None
        self.cancelled = False

    def as_dict(self):
        d = {
            "id": self.id,
            "phase": self.phase,
            "message": self.message,
            "progress": round(self.progress, 4),
            "startedAt": self.started_at,
            "finishedAt": self.finished_at,
            "elapsed": round((self.finished_at or time.time()) - self.started_at, 1),
            "bbox": self.params.get("bbox"),
            "level": self.params.get("level"),
            "error": self.error,
            "log": self.log[-40:],
            "importSummary": self.import_summary,
            "outputDir": self.output_dir,
        }
        if self.report is not None:
            r = self.report
            d["model"] = {
                "vertices": r.vertex_count,
                "latitude": round(r.latitude, 6),
                "longitude": round(r.longitude, 6),
                "sizeX": round(r.size_x_m, 1),
                "sizeY": round(r.size_y_m, 1),
                "minZ": round(r.min_z_m, 2),
                "maxZ": round(r.max_z_m, 2),
                "tiltRemovedDeg": round(r.tilt_removed_deg, 3),
                "groundCells": r.ground_cells,
                "groundInliers": r.ground_inliers,
                "groundRms": round(r.ground_rms_m, 3),
                "coverage": r.coverage,
                "coverageNote": r.coverage_note,
                "density": round(r.vertex_density, 3),
                "relief": round(r.relief_m, 1),
                "achievedLevel": self.achieved_level,
                "texturesFailed": self.textures_failed,
                "texturesBlank": self.textures_blank,
                "texturesRestored": self.textures_restored,
                "texturesMissing": self.textures_missing,
            }
        return d


class JobManager:
    """Single-slot job runner: one export at a time, which is all the CLI allows."""

    def __init__(self):
        self._lock = threading.RLock()
        self._job = None
        self._thread = None
        self._proc = None
        self.pending_imports = queue.Queue()
        self.history = []

    # --- state ------------------------------------------------------------
    @property
    def job(self):
        with self._lock:
            return self._job

    def is_busy(self):
        with self._lock:
            return self._job is not None and self._job.phase not in TERMINAL_PHASES

    def snapshot(self):
        with self._lock:
            return {
                "busy": self.is_busy(),
                "job": self._job.as_dict() if self._job else None,
                "history": self.history[-8:],
            }

    def _set(self, phase=None, message=None, progress=None):
        with self._lock:
            job = self._job
            if job is None:
                return
            if phase is not None:
                job.phase = phase
            if message is not None:
                job.message = message
                self._append_log(message)
            if progress is not None:
                job.progress = max(0.0, min(1.0, progress))

    def _append_log(self, line):
        job = self._job
        if job is None:
            return
        job.log.append(line)
        if len(job.log) > MAX_LOG_LINES:
            del job.log[:-MAX_LOG_LINES]

    # --- lifecycle --------------------------------------------------------
    def start(self, params):
        """Begin an export. Raises RuntimeError if one is already running."""
        with self._lock:
            if self.is_busy():
                raise RuntimeError("An export is already running")
            job = Job(params)
            self._job = job
            self._thread = threading.Thread(
                target=self._run, args=(job,),
                name="gmeb-export-%s" % job.id, daemon=True)
            self._thread.start()
            return job

    def record_failure(self, bbox, message):
        """
        Register a request that failed before any work began.

        Validation happens on the main thread, after the web page has already
        been told its request was accepted. Without a job to attach the reason
        to, the page would sit on "queued" forever, so a finished-in-error job
        is created purely to carry the message back.
        """
        with self._lock:
            if self.is_busy():
                return None
            job = Job({"bbox": bbox, "level": 0})
            self._job = job
        self._fail(job, RuntimeError(message))
        return job

    def last_params(self):
        """The parameters of the most recent job, for re-running it."""
        with self._lock:
            return dict(self._job.params) if self._job is not None else None

    def cancel(self):
        with self._lock:
            job = self._job
            if job is None or job.phase in TERMINAL_PHASES:
                return False
            job.cancelled = True
            proc = self._proc
        if proc is not None:
            try:
                proc.terminate()
            except Exception:
                pass
        self._set(message="Cancelling...")
        return True

    # --- worker -----------------------------------------------------------
    @staticmethod
    def _flatten(job, out_dir):
        """
        Move the export up into the job folder and clear the scaffolding away.

        The exporter insists on writing to
        `<cwd>/downloaded_files/obj/<timestamp>/`, which is not somewhere anyone
        wants to go looking. Everything is moved as one group so the material
        file keeps finding its textures - it refers to them by bare filename.
        """
        job_dir = job.params.get("job_dir")
        if not job_dir:
            return out_dir

        out_dir = os.path.abspath(out_dir)
        job_dir = os.path.abspath(job_dir)
        if out_dir == job_dir:
            return out_dir

        try:
            os.makedirs(job_dir, exist_ok=True)
            for name in sorted(os.listdir(out_dir)):
                src = os.path.join(out_dir, name)
                dst = os.path.join(job_dir, name)
                if os.path.exists(dst):
                    if os.path.isdir(dst):
                        continue
                    os.remove(dst)
                shutil.move(src, dst)

            scaffolding = os.path.join(job_dir, "downloaded_files")
            if os.path.isdir(scaffolding):
                shutil.rmtree(scaffolding, ignore_errors=True)
        except OSError as exc:
            # Not worth failing the whole export over; the files are still
            # perfectly usable where the exporter left them.
            print("[google-map-export-bridge] could not tidy the export folder: %s"
                  % exc)
            return out_dir

        return job_dir

    def _run(self, job):
        try:
            out_dir = self._download(job)
            if job.cancelled:
                self._finish(job, PHASE_CANCELLED, "Cancelled")
                return

            if job.params.get("flatten_output"):
                out_dir = self._flatten(job, out_dir)

            with self._lock:
                job.output_dir = out_dir

            model = os.path.join(out_dir, "model.obj")
            if not os.path.isfile(model):
                raise RuntimeError(
                    "The exporter finished but produced no model.obj. Google "
                    "Earth may not have 3D coverage for that area.")

            report = self._convert(job, model)
            if job.cancelled:
                self._finish(job, PHASE_CANCELLED, "Cancelled")
                return

            with self._lock:
                job.model_path = report.output_path
                job.report = report

            self._set(phase=PHASE_IMPORTING,
                      message="Handing off to Blender...",
                      progress=_DOWNLOAD_SHARE + _CONVERT_SHARE)
            # The main thread takes it from here.
            self.pending_imports.put(job.id)

        except Exception as exc:                      # noqa: BLE001 - reported to UI
            self._fail(job, exc)

    def _download(self, job):
        params = job.params
        node = params["node_path"]
        script = params["script_path"]
        cwd = params["job_dir"]

        if not node:
            raise RuntimeError(
                "Node.js was not found. Install it from nodejs.org, or set the "
                "path in the add-on preferences.")
        if not os.path.isfile(script):
            raise RuntimeError("Exporter script is missing: %s" % script)

        os.makedirs(cwd, exist_ok=True)

        bbox = params["bbox"]
        bbox_arg = "%.9f,%.9f,%.9f,%.9f" % (
            bbox["minLat"], bbox["minLng"], bbox["maxLat"], bbox["maxLng"])

        cmd = [node, script, "--bbox=" + bbox_arg,
               "--level=%d" % int(params["level"])]

        cache = params.get("texture_cache")
        if cache:
            try:
                os.makedirs(cache, exist_ok=True)
                cmd.append("--texture-cache=" + cache)
            except OSError as exc:
                # Not worth failing the export over; it only costs the ability
                # to keep a good texture from a previous run.
                print("[google-map-export-bridge] no texture cache: %s" % exc)

        self._set(phase=PHASE_DOWNLOADING,
                  message="Starting export at detail level %d..." % params["level"],
                  progress=0.01)

        proc = subprocess.Popen(
            cmd, cwd=cwd,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace",
            bufsize=1, **_no_window_kwargs())

        with self._lock:
            self._proc = proc

        out_dir = None
        remote_error = None
        found = 0
        downloaded = 0
        achieved_level = None

        try:
            for raw in proc.stdout:
                line = raw.rstrip()
                if not line:
                    continue

                match = _GMEB_LINE.match(line)
                if match:
                    event = match.group(1)
                    try:
                        data = json.loads(match.group(2) or "{}")
                    except ValueError:
                        data = {}
                    if event == "done":
                        out_dir = data.get("dir")
                    elif event == "error":
                        remote_error = data.get("message") or "Exporter failed"
                    elif event == "textures":
                        failed = int(data.get("failed", 0) or 0)
                        blank = int(data.get("blank", 0) or 0)
                        restored = int(data.get("restored", 0) or 0)
                        job.textures_failed = failed
                        job.textures_blank = blank
                        job.textures_restored = restored
                        if restored:
                            self._set(message="Kept %d texture%s from an "
                                              "earlier run" % (restored,
                                              "" if restored == 1 else "s"))
                        elif failed or blank:
                            self._set(message="%d tile%s without imagery"
                                              % (failed + blank,
                                                 "" if failed + blank == 1
                                                 else "s"))

                    elif event == "octants":
                        # The deepest level Google actually has here. Less than
                        # asked for is the first hint of thin coverage.
                        levels = data.get("levels") or []
                        if levels:
                            achieved_level = max(levels)
                        self._set(message="Found %d octants to fetch"
                                          % data.get("count", 0))
                    continue

                # The exporter logs one `found` line per discovered node and one
                # `downloaded` line per completed node. The tree is walked as it
                # downloads, so the total is only known at the end; the ratio
                # still gives a usable, monotonic-enough bar.
                if line.startswith("found"):
                    found += 1
                elif line.startswith("downloaded"):
                    downloaded += 1
                    if found:
                        frac = min(0.99, downloaded / float(max(found, 1)))
                        self._set(
                            message="Downloading tiles (%d/%d)" % (downloaded, found),
                            progress=0.02 + frac * (_DOWNLOAD_SHARE - 0.02))
                else:
                    print("[google-map-export-bridge] %s" % line)
        finally:
            proc.stdout.close()
            code = proc.wait()
            with self._lock:
                self._proc = None

        if job.cancelled:
            return out_dir or ""
        if remote_error:
            raise RuntimeError(remote_error)
        if code != 0:
            raise RuntimeError("Exporter exited with code %d" % code)
        if not out_dir or not os.path.isdir(out_dir):
            raise RuntimeError("Exporter did not report an output directory")

        self._set(message="Downloaded %d tiles" % downloaded,
                  progress=_DOWNLOAD_SHARE)
        job.achieved_level = achieved_level
        return out_dir

    def _convert(self, job, model_path):
        params = job.params
        self._set(phase=PHASE_CONVERTING,
                  message="Georeferencing and levelling...",
                  progress=_DOWNLOAD_SHARE)

        step = {"n": 0}

        def progress(msg):
            step["n"] += 1
            self._set(message=msg,
                      progress=_DOWNLOAD_SHARE
                               + _CONVERT_SHARE * min(1.0, step["n"] / 3.0))

        return obj_transform.transform_obj(
            model_path,
            level_ground=params["level_ground"],
            ground_cell_size=params["ground_cell_size"],
            scale=params["scale"],
            trim_below=params.get("trim_below", 0.0),
            requested_level=params.get("level"),
            achieved_level=job.achieved_level,
            progress=progress,
        )

    # --- completion -------------------------------------------------------
    def _finish(self, job, phase, message):
        with self._lock:
            job.phase = phase
            job.message = message
            job.finished_at = time.time()
            self._append_log(message)
            if phase == PHASE_DONE:
                job.progress = 1.0
            self.history.append({
                "id": job.id,
                "phase": phase,
                "bbox": job.params.get("bbox"),
                "finishedAt": job.finished_at,
                "message": message,
            })
            del self.history[:-20]
        self._cleanup(job)

    def complete(self, job_id, summary):
        """Called from the main thread once the Blender import succeeds."""
        job = self.job
        if job is None or job.id != job_id:
            return
        job.import_summary = summary
        self._finish(job, PHASE_DONE, summary or "Imported")

    def _fail(self, job, exc):
        message = str(exc) or exc.__class__.__name__
        with self._lock:
            job.error = message
        self._finish(job, PHASE_ERROR, message)

    def fail(self, job_id, exc):
        job = self.job
        if job is None or job.id != job_id:
            return
        self._fail(job, exc)

    def _cleanup(self, job):
        if job.params.get("keep_downloads", True):
            return
        job_dir = job.params.get("job_dir")
        if job_dir and os.path.isdir(job_dir):
            shutil.rmtree(job_dir, ignore_errors=True)


MANAGER = JobManager()
