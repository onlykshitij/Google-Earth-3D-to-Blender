"""
Updating the add-on from inside Blender.

Blender 4.2 and newer can track a *remote extension repository*: a URL serving
an index that describes the available versions. Once one is registered, updating
is Blender's own job - it checks, downloads, installs and handles the restart -
which is far better than an add-on trying to overwrite itself while running.

So there is no bespoke updater here. There is one operator that registers this
project's index with Blender, and one that asks Blender to go and look. The
index is published with every release, at a URL that always resolves to the
newest one.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request

REPO_NAME = "Google Map Export Bridge"
# Blender identifies a repository by module name; it must be a valid identifier.
REPO_MODULE = "google_map_export_bridge"

GITHUB_REPO = "onlykshitij/Google-Earth-3D-to-Blender"

# `releases/latest/download/<name>` always redirects to the newest release, so
# the URL never has to change as versions come and go.
INDEX_URL = ("https://github.com/%s/releases/latest/download/index.json"
             % GITHUB_REPO)
RELEASES_URL = "https://github.com/%s/releases/latest" % GITHUB_REPO
LATEST_API = "https://api.github.com/repos/%s/releases/latest" % GITHUB_REPO

CHECK_TIMEOUT = 8.0


def version_tuple(text):
    """Turn '1.2.3' into (1, 2, 3) for comparison. Unparsable parts become 0."""
    parts = []
    for chunk in str(text or "").lstrip("v").replace("-", ".").split("."):
        try:
            parts.append(int(chunk))
        except ValueError:
            break
    return tuple(parts) or (0,)


def is_newer(candidate, current):
    a, b = version_tuple(candidate), version_tuple(current)
    size = max(len(a), len(b))
    a = a + (0,) * (size - len(a))
    b = b + (0,) * (size - len(b))
    return a > b


def latest_release():
    """
    The newest published version, or None if it cannot be determined.

    Deliberately quiet: not knowing whether an update exists is never worth an
    error, and this runs on a button press in a preferences panel.
    """
    try:
        request = urllib.request.Request(
            LATEST_API, headers={"Accept": "application/vnd.github+json"})
        with urllib.request.urlopen(request, timeout=CHECK_TIMEOUT) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, ValueError):
        return None

    tag = str(data.get("tag_name") or "").lstrip("v")
    return tag or None


def find_repo(context):
    """The registered repository for this add-on, if there is one."""
    extensions = getattr(context.preferences, "extensions", None)
    if extensions is None:
        return None
    for repo in extensions.repos:
        if repo.module == REPO_MODULE:
            return repo
        if getattr(repo, "remote_url", "") == INDEX_URL:
            return repo
    return None


def register_repo(context):
    """
    Point Blender at this project's extension index.

    Returns (repo, created) or raises RuntimeError with something readable.
    """
    extensions = getattr(context.preferences, "extensions", None)
    if extensions is None:
        raise RuntimeError("This Blender has no extension repositories; "
                           "updating in place needs Blender 4.2 or newer.")

    repo = find_repo(context)
    created = False
    if repo is None:
        try:
            repo = extensions.repos.new(name=REPO_NAME, module=REPO_MODULE,
                                        remote_url=INDEX_URL)
        except Exception as exc:                        # noqa: BLE001
            raise RuntimeError("Could not add the repository: %s" % exc)
        created = True

    repo.remote_url = INDEX_URL
    if hasattr(repo, "use_remote_url"):
        repo.use_remote_url = True
    repo.enabled = True
    return repo, created
