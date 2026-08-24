# Notices and provenance

This project is licensed under the **GNU Affero General Public License v3.0**
(see [`LICENSE`](LICENSE)). The notices below cover material it builds on, and
the position on Google's data.

---

## Bundled third-party code

### Google Earth CLI Exporter — MIT

<https://github.com/KIWIbird717/Google-Earth-CLI-Exporter>

The tile downloader is taken from this project. Its TypeScript sources are
vendored under [`vendor/earth-exporter/`](vendor/earth-exporter/) and bundled
into the add-on as the single file
`google_map_export_bridge/exporter/earth-export.cjs`. That bundle is a
derivative of the MIT-licensed sources and carries the notice below.

Two changes were made to the vendored sources, both documented in the README: a
`--level` option so the octant depth is selectable, and a bounding-box parser
that no longer rejects a coordinate of exactly `0`.

```
Copyright (c) 2025 KIWIbird717

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Map Bridge Web Interface — MIT

<https://github.com/KIWIbird717/Map-Bridge-Web-Interface>

The idea of a Leaflet page for choosing the area, and the workflow it
established, come from this project. The interface in [`web/`](web/) is a
rewrite rather than a copy — it is built around selecting a target Blender
instance and driving the export directly — but the debt is real and the same MIT
notice as above applies to the original.

### earth-reverse-engineering — no stated licence

<https://github.com/retroplasma/earth-reverse-engineering>

The exporter above is based on this project, which is the original work of
figuring out Google Earth's tile format. **It carries no licence file**, so no
permissions are granted by it in writing. Anyone redistributing this project, or
building on it commercially, should form their own view on that.

The bundled exporter also embeds Google's own minified tile-decoding code, which
that project extracted. It is Google's, not ours and not the exporter author's.

### Runtime dependencies

The interface uses React, Leaflet, Tailwind CSS and Vite, each under its own
permissive licence; see `web/package.json` and the generated lockfile. The hub
and the add-on use only the Python standard library and Blender's `bpy`.

---

## Not used here

<https://github.com/KIWIbird717/Map-Bridge-Addon> is a Blender add-on by the
same author, and its licence reserves all rights: *"Permission is NOT granted to
use, copy, modify, merge, publish, distribute…"*.

No code from it appears in this project. The add-on here was written from
scratch, on a different architecture — Blender polls out to a hub rather than
hosting a server, and the georeferencing and ground-levelling stages have no
counterpart there. It is named only so its status is unambiguous.

---

## Google Earth data

**Nothing from Google is owned, licensed or redistributed by this project.**

- The 3D geometry and imagery this tool downloads are **Google's**, together
  with their contributing data providers. No rights to them are granted here,
  and none are claimed.
- No Google data is included in this repository or in the released add-on. The
  add-on is a client: it fetches tiles to your own machine, on your instruction,
  at the moment you ask for them.
- The tiles are reached through endpoints Google does not publish for this
  purpose, using the reverse-engineering work credited above. That is not a
  supported or documented interface, it may stop working at any time, and using
  it may not be consistent with
  [Google's Terms of Service](https://policies.google.com/terms) or the
  [Google Maps/Google Earth Additional Terms](https://www.google.com/help/terms_maps/).
- This project exists to pull a **private visual reference to model against**,
  as described in the README. It is not a way to obtain redistributable
  geometry, and the output should not be treated as yours to publish or sell.

Deciding whether your particular use is permitted is your responsibility, not
this project's. If you need geometry you can license and redistribute, buy it
from a provider that sells exactly that.

---

## Warranty

None, per sections 15 and 16 of the AGPL. This software talks to an
undocumented third-party service; treat it accordingly.
