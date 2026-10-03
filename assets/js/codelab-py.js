/* ===========================================================================
   Python compatibility shims for the Code Lab.

   Pyodide 0.27.2 ships 338 packages, but NOT seaborn and NOT any Excel
   reader/writer (no openpyxl, xlrd or xlsxwriter). Four of the nineteen
   notebook sections depend on them, so they would otherwise die with a raw
   ModuleNotFoundError.

   This file provides the minimum surface those sections actually use:

     seaborn  scatterplot, histplot, boxplot, kdeplot, pairplot, set_theme
     Excel    pandas.DataFrame.to_excel and pandas.read_excel

   The seaborn functions are re-implementations on top of matplotlib, so the
   notebook source stays exactly as it was submitted. The Excel code writes and
   reads a real .xlsx (an OOXML package built with the stdlib zipfile), so the
   file opens in Excel and LibreOffice.

   Nothing here overrides a working implementation: if the genuine package ever
   becomes importable, that one is used instead.

   Written as a String.raw template so Python backslashes such as \s and \n
   survive verbatim into the Python source.
   =========================================================================== */
(function () {
  "use strict";

  var PY = String.raw`
# ---------------------------------------------------------------------------
# Installed by buildProgram() before the student's code runs, on every run.
#
# Each installer keeps its own "done" flag and is a no-op once satisfied, so
# this stays cheap. It must NOT be guarded by a single global flag: on the very
# first run pandas or matplotlib may not be installed yet, and a one-shot guard
# would silently never patch Excel for the rest of the session.
#
# Never raises. If anything goes wrong the lab behaves as it did before.
# ---------------------------------------------------------------------------
_xl_ready = False
_net_ready = False

# Packages that are absent from the Pyodide distribution itself, so no amount
# of loading will produce them. A web server can never work in a browser.
_LAB_NO_WHEEL = {
    "flask": "Pyodide ships no Flask. A browser has no sockets, so a real WSGI "
             "server cannot run here. Use the HTML preview panel to see markup "
             "instead, or install Flask in a normal Python install.",
    "django": "Pyodide ships no Django, and a browser cannot bind a port.",
    "torch": "Pyodide ships no PyTorch. Try scikit-learn, which is available "
             "and covers the same regression and classification examples.",
    "tensorflow": "Pyodide ships no TensorFlow. scikit-learn is available.",
}


def _lab_explain_import_error(text):
    """Replace a raw ModuleNotFoundError with something a student can act on.

    Returns a message string, or None when there is nothing to explain.
    """
    if "ModuleNotFoundError" not in text and "ImportError" not in text:
        return None
    for name, note in _LAB_NO_WHEEL.items():
        if name is None or ("No module named '" + name + "'") not in text:
            continue
        return note
    if "No module named 'seaborn'" in text:
        return ("The seaborn shim failed to install. Reload the page and try "
                "again.")
    if "No module named 'openpyxl'" in text and "to_excel" not in text:
        return ("Pyodide ships no openpyxl module. pandas to_excel() and "
                "read_excel() are still available through the built-in "
                "writer, so the notebook's Excel cells work.")
    return None


def _lab_install_shims():
    for _fn in (_install_network_shim, _install_seaborn_shim,
                _install_excel_shim):
        try:
            _fn()
        except Exception:
            pass


# ===========================================================================
# 0. Networking
# ---------------------------------------------------------------------------
# Pyodide has no sockets, so urllib and requests cannot fetch anything until
# pyodide-http routes them through the browser's fetch(). Without this,
# requests.get(url) returns an empty body and pd.read_csv(url) raises.
# pyodide-http ships with Pyodide, so this is a patch, not a shim.
# ===========================================================================
def _install_network_shim():
    global _net_ready
    if _net_ready:
        return
    try:
        import pyodide_http
    except Exception:
        return
    try:
        pyodide_http.patch_all()
        _net_ready = True
    except Exception:
        pass


# ===========================================================================
# 1. seaborn
# ===========================================================================
_DEEP = [
    (0.298, 0.447, 0.690), (0.867, 0.518, 0.322), (0.333, 0.659, 0.408),
    (0.968, 0.505, 0.749), (0.550, 0.337, 0.055), (0.472, 0.443, 0.698),
    (0.749, 0.380, 0.057), (0.659, 0.578, 0.383), (0.769, 0.306, 0.070),
    (0.505, 0.447, 0.702), (0.505, 0.576, 0.702), (0.474, 0.749, 0.658),
]


def _sh_series(data, x, name=None):
    """Turn a seaborn-style x=/y= argument into a 1-D numpy array.

    Accepts a DataFrame plus a column name, a bare Series, or a plain list.
    """
    import numpy as np
    if x is None:
        return np.arange(len(data)), name
    if isinstance(x, str):
        if data is None or not hasattr(data, "columns"):
            raise ValueError("cannot use the column name " + repr(x) +
                             " without a DataFrame in data=")
        return np.asarray(data[x]), x
    if hasattr(x, "to_numpy"):
        return np.asarray(x.to_numpy()), (x.name if name is None else name)
    return np.asarray(x), name


def _sh_clean(a):
    """Drop NaN/inf so plotting never trips over missing values."""
    import numpy as np
    a = np.asarray(a, dtype=float)
    return a[np.isfinite(a)]


def _sh_levels(vals):
    out = []
    for v in vals:
        if v not in out:
            out.append(v)
    try:
        out.sort()
    except TypeError:
        pass
    return out


def _sh_groups(data, hue):
    """Yield (label, row-mask array, colour) for a hue= column."""
    if hue is None:
        return [(None, None, _DEEP[0])]
    import numpy as np
    col = _sh_series(data, hue, hue)[0]
    res = []
    for i, lvl in enumerate(_sh_levels(col.tolist())):
        mask = np.asarray(col == lvl)
        res.append((lvl, mask, _DEEP[i % len(_DEEP)]))
    return res


def _sh_kde(vals, grid):
    """Gaussian KDE with Silverman's bandwidth. Returns None if degenerate."""
    import numpy as np
    v = _sh_clean(vals)
    n = v.size
    if n < 2:
        return None
    sd = float(np.std(v, ddof=1))
    iqr = float(np.subtract(*np.percentile(v, [75, 25])))
    scale = min(sd, iqr / 1.349) if iqr > 0 else sd
    if not scale > 0:
        return None
    bw = 0.9 * scale * (n ** -0.2)
    if not bw > 0:
        return None
    z = (grid[:, None] - v[None, :]) / bw
    return np.exp(-0.5 * z * z).sum(axis=1) / (n * bw * np.sqrt(2 * np.pi))


def _sh_ax(ax):
    import matplotlib.pyplot as plt
    return plt.gca() if ax is None else ax


def _sh_frame(ax, grid=True):
    for side in ("top", "right"):
        if getattr(ax.spines, side) is not None:
            ax.spines[side].set_visible(False)
    ax.grid(grid, alpha=0.25, linewidth=0.6)
    ax.set_axisbelow(True)


def _sh_scatterplot(data=None, x=None, y=None, hue=None, size=None,
                    style=None, palette=None, ax=None, alpha=0.75, **kw):
    import numpy as np
    import matplotlib.pyplot as plt
    ax = _sh_ax(ax)
    xs, _ = _sh_series(data, x, x if isinstance(x, str) else None)
    ys, _ = _sh_series(data, y, y if isinstance(y, str) else None)
    for i, (lvl, mask, col) in enumerate(_sh_groups(data, hue)):
        if mask is None:
            ax.scatter(xs, ys, color=col, alpha=alpha, edgecolors="none", **kw)
        else:
            ax.scatter(np.asarray(xs)[mask], np.asarray(ys)[mask],
                       color=col, alpha=alpha, edgecolors="none", **kw)
    if hue is not None:
        ax.legend(title=str(hue), frameon=False, fontsize=9)
    _sh_frame(ax, grid=False)
    return ax


def _sh_histplot(data=None, x=None, y=None, hue=None, bins="auto",
                 kde=False, stat="count", element="bars", fill=True,
                 ax=None, alpha=0.55, **kw):
    import numpy as np
    import matplotlib.pyplot as plt
    ax = _sh_ax(ax)
    vals, name = _sh_series(data, x if x is not None else y,
                            x if isinstance(x, str) else None)
    groups = _sh_groups(data, hue)
    if not isinstance(bins, (int, np.integer)) or bins == "auto":
        bins = max(6, int(min(30, np.sqrt(len(_sh_clean(vals))) or 10)))
    bins = max(1, int(bins))

    lo = min(float(np.min(_sh_clean(vals))) for _, _, _ in groups) if len(groups) else 0.0
    hi = max(float(np.max(_sh_clean(vals))) for _, _, _ in groups) if len(groups) else 1.0
    if not hi > lo:
        hi = lo + 1.0
    edges = np.linspace(lo, hi, bins + 1)
    width = (hi - lo) / bins

    for lvl, mask, col in groups:
        v = _sh_clean(np.asarray(vals) if mask is None else np.asarray(vals)[mask])
        if v.size == 0:
            continue
        counts, _ = np.histogram(v, bins=edges)
        centres = (edges[:-1] + edges[1:]) / 2.0
        ax.bar(centres, counts, width=width, align="center",
               color=col, alpha=alpha,
               edgecolor="white" if len(groups) > 1 else "none",
               linewidth=0.6, label=None if lvl is None else str(lvl))
        if kde:
            grid = np.linspace(edges[0], edges[-1], 200)
            dens = _sh_kde(v, grid)
            if dens is not None:
                # scale the density so its area matches the bar total
                ax.plot(grid, dens * v.size * width, color=col, linewidth=1.6)
    if hue is not None:
        ax.legend(title=str(hue), frameon=False, fontsize=9)
    if name:
        ax.set_xlabel(str(name))
    _sh_frame(ax, grid=False)
    return ax


def _sh_kdeplot(x=None, y=None, data=None, hue=None, fill=False,
                ax=None, linewidth=1.8, **kw):
    import numpy as np
    import matplotlib.pyplot as plt
    ax = _sh_ax(ax)
    series = x if x is not None else data
    vals, _ = _sh_series(data if isinstance(series, str) else None,
                         series, None)
    v = _sh_clean(vals)
    lo, hi = float(np.min(v)), float(np.max(v))
    if not hi > lo:
        hi = lo + 1.0
    grid = np.linspace(lo, hi, 200)
    for lvl, mask, col in _sh_groups(data if hue else None, hue):
        vv = _sh_clean(np.asarray(vals) if mask is None else np.asarray(vals)[mask])
        dens = _sh_kde(vv, grid)
        if dens is None:
            continue
        if fill:
            ax.fill_between(grid, 0, dens, color=col, alpha=0.35, linewidth=0)
        ax.plot(grid, dens, color=col, linewidth=linewidth, label=None if lvl is None else str(lvl))
    if hue is not None:
        ax.legend(frameon=False, fontsize=9)
    ax.set_ylabel("Density")
    _sh_frame(ax, grid=False)
    return ax


def _sh_boxplot(data=None, x=None, y=None, hue=None, orient=None,
                ax=None, **kw):
    import numpy as np
    import matplotlib.pyplot as plt
    ax = _sh_ax(ax)
    if orient is None:
        orient = "v" if y is not None else "h"

    if x is None:
        vals, label = _sh_series(data, y if isinstance(y, str) else None, None)
        if not isinstance(vals, np.ndarray):
            vals = np.asarray(vals)
        cats = [(str(label or ""), _sh_clean(vals))]
    else:
        xs_raw, _ = _sh_series(data, x, x)
        ys_raw, ylabel = _sh_series(data, y, y if isinstance(y, str) else None)
        xs_raw = np.asarray(xs_raw)
        ys_raw = np.asarray(ys_raw)
        names = _sh_levels(xs_raw.tolist())
        cats = []
        for i, nm in enumerate(names):
            cats.append((str(nm), _sh_clean(ys_raw[xs_raw == nm])))
        if ylabel:
            ax.set_ylabel(str(ylabel))

    bp = ax.boxplot([c[1] for c in cats], patch_artist=True,
                    widths=0.6, showfliers=True, vert=(orient == "v"))
    for i, box in enumerate(bp["boxes"]):
        box.set(facecolor=_DEEP[i % len(_DEEP)], alpha=0.75,
                edgecolor=_DEEP[i % len(_DEEP)], linewidth=1.4)
    for part in ("whiskers", "caps", "medians"):
        for ln in bp[part]:
            ln.set(color="#444444", linewidth=1.1)
    for fl in bp["fliers"]:
        fl.set(marker="o", markersize=4, markerfacecolor="#444444",
               markeredgecolor="none")
    ax.set_xticks(range(1, len(cats) + 1))
    ax.set_xticklabels([c[0] for c in cats])
    _sh_frame(ax, grid=(orient == "h"))
    return ax


def _sh_pairplot(data, hue=None, diag_kind="hist", corner=False,
                 diag_kde=False, **kw):
    """Scatter matrix with per-species colouring, histograms on the diagonal."""
    import numpy as np
    import matplotlib.pyplot as plt
    df = data if hasattr(data, "columns") else None
    if df is None:
        raise ValueError("pairplot needs a DataFrame")
    cols = [c for c in df.columns if _sh_isnum(df[c])]
    n = len(cols)
    if n == 0:
        raise ValueError("pairplot needs at least one numeric column")
    size = max(2.6 * n, 5.0)
    fig, axes = plt.subplots(n, n, figsize=(size, size), squeeze=False)
    groups = _sh_groups(data, hue)

    for i, ci in enumerate(cols):
        for j, cj in enumerate(cols):
            ax = axes[i][j]
            if i == j:
                v_all = _sh_clean(np.asarray(df[ci]))
                if v_all.size == 0:
                    continue
                lo, hi = float(np.min(v_all)), float(np.max(v_all))
                if not hi > lo:
                    hi = lo + 1.0
                edges = np.linspace(lo, hi, 11)
                for lvl, mask, col in groups:
                    v = _sh_clean(np.asarray(df[ci]) if mask is None
                                  else np.asarray(df[ci])[mask])
                    if v.size == 0:
                        continue
                    ax.hist(v, bins=edges, color=col, alpha=0.55,
                            edgecolor="white", linewidth=0.5)
                ax.set_yticks([])
            else:
                xi = np.asarray(df[ci])
                xj = np.asarray(df[cj])
                for lvl, mask, col in groups:
                    m = slice(None) if mask is None else mask
                    xx, yy = xi[m], xj[m]
                    keep = np.isfinite(np.asarray(xx, dtype=float)) & \
                        np.isfinite(np.asarray(yy, dtype=float))
                    ax.scatter(np.asarray(xx)[keep], np.asarray(yy)[keep],
                               s=11, color=col, alpha=0.75, edgecolors="none")
                if i == n - 1:
                    ax.set_xlabel(str(cj))
                else:
                    ax.set_xticks([])
                if j == 0:
                    ax.set_ylabel(str(ci))
                else:
                    ax.set_yticks([])
                ax.grid(alpha=0.2, linewidth=0.5)
                for side in ("top", "right"):
                    ax.spines[side].set_visible(False)
                continue
            if i == n - 1:
                ax.set_xlabel(str(ci))
            ax.set_yticks([])

    if hue is not None:
        fig.legend(*_sh_legend(groups), loc="upper right", frameon=False,
                   fontsize=8, title=str(hue))
    fig.tight_layout(rect=(0, 0, 0.94 if hue is not None else 1, 1))
    return fig


def _sh_legend(groups):
    import matplotlib.lines as mlines
    handles = [mlines.Line2D([], [], marker="o", linestyle="", color=c,
                             label=str(lvl))
               for lvl, _, c in groups]
    return (handles, [str(g[0]) for g in groups])


def _sh_isnum(col):
    import numpy as np
    try:
        if getattr(col, "dtype", None) is None or col.dtype == object:
            return False
        return bool(np.issubdtype(col.dtype, np.number))
    except Exception:
        return False


def _sh_set_theme(*a, **k):
    pass


def _sh_set_style(*a, **k):
    pass


def _sh_color_palette(n=None, **k):
    n = int(n) if n else 10
    return [_DEEP[i % len(_DEEP)] for i in range(n)]


def _install_seaborn_shim():
    import sys, types
    if "seaborn" in sys.modules:
        return
    try:
        import seaborn  # noqa: F401
        return
    except Exception:
        pass
    mod = types.ModuleType("seaborn")
    mod.__version__ = "0.13.2-lab-shim"
    mod.__doc__ = ("Matplotlib-backed stand-in for the seaborn functions used "
                   "by the lab notebooks. Pyodide ships no seaborn wheel.")
    mod.scatterplot = _sh_scatterplot
    mod.histplot = _sh_histplot
    mod.kdeplot = _sh_kdeplot
    mod.boxplot = _sh_boxplot
    mod.pairplot = _sh_pairplot
    mod.set_theme = _sh_set_theme
    mod.set_style = _sh_set_style
    mod.color_palette = _sh_color_palette
    mod.axes = types.SimpleNamespace()
    sys.modules["seaborn"] = mod


# ===========================================================================
# 2. Excel (.xlsx) without openpyxl
#
# An .xlsx file is a ZIP of XML parts. We write the smallest set Excel and
# LibreOffice accept: content types, package relationships, the workbook and its
# relationships, a minimal style sheet, and one worksheet. Strings are written
# inline so no shared-string table is needed. Reading understands inline
# strings, shared strings, numbers, booleans and errors.
# ===========================================================================
_XL_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
_XL_RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
_XL_BAD_SHEET = '[]:*?/\\'


def _xl_esc(text, attr=False):
    s = str(text)
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    if attr:
        s = s.replace('"', "&quot;")
    # drop code points XML 1.0 cannot represent
    return "".join(c for c in s
                   if (ord(c) >= 32 or ord(c) in (9, 10, 13))
                   and ord(c) not in (0xFFFE, 0xFFFF))


def _xl_col(index):
    """0 -> A, 25 -> Z, 26 -> AA."""
    name = ""
    n = int(index) + 1
    while n > 0:
        n, rem = divmod(n - 1, 26)
        name = chr(65 + rem) + name
    return name


def _xl_sheet_name(name, fallback="Sheet1"):
    s = "".join("_" if c in _XL_BAD_SHEET else c for c in str(name))
    s = s.strip("'") or fallback
    return s[:31]


def _xl_cell(ref, value):
    if value is None:
        return ""
    if hasattr(value, "item") and not isinstance(value, str):
        try:
            value = value.item()
        except Exception:
            pass
    if isinstance(value, bool):
        return '<c r="%s" t="b"><v>%d</v></c>' % (ref, 1 if value else 0)
    if isinstance(value, int):
        return '<c r="%s"><v>%d</v></c>' % (ref, value)
    if isinstance(value, float):
        if value != value or value in (float("inf"), float("-inf")):
            return ""
        return '<c r="%s"><v>%.17g</v></c>' % (ref, value)
    text = _xl_esc(value)
    space = ' xml:space="preserve"' if text != text.strip() else ""
    return ('<c r="%s" t="inlineStr"><is><t%s>%s</t></is></c>'
            % (ref, space, text))


_XL_CONTENT_TYPES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    '</Types>')

_XL_ROOT_RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    '</Relationships>')

_XL_STYLES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<styleSheet xmlns="' + _XL_NS + '">'
    '<fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font></fonts>'
    '<fills count="2"><fill><patternFill patternType="none"/></fill>'
    '<fill><patternFill patternType="gray125"/></fill></fills>'
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    '</styleSheet>')


def _xl_write_frame(df, path, sheet_name="Sheet1", index=False, **kwargs):
    """pandas.DataFrame.to_excel replacement."""
    import zipfile
    sheet = _xl_sheet_name(sheet_name)
    columns = [str(c) for c in df.columns]
    header = list(columns)
    if index:
        name = df.index.name
        header = [str(name) if name is not None else ""] + header

    rows = ['<row r="1">' + "".join(
        _xl_cell(_xl_col(i) + "1", h) for i, h in enumerate(header)) + "</row>"]
    for r, (_, rec) in enumerate(df.iterrows(), start=2):
        cells = []
        if index:
            cells.append(_xl_cell(_xl_col(0) + str(r), rec.name))
        offset = 1 if index else 0
        for c, col in enumerate(df.columns):
            cells.append(_xl_cell(_xl_col(c + offset) + str(r), rec[col]))
        rows.append('<row r="%d">%s</row>' % (r, "".join(cells)))

    sheet_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="' + _XL_NS + '" xmlns:r="' + _XL_RNS + '">'
        '<dimension ref="A1"/>'
        '<sheetData>' + "".join(rows) + '</sheetData></worksheet>')

    workbook = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="' + _XL_NS + '" xmlns:r="' + _XL_RNS + '">'
        '<sheets><sheet name="' + _xl_esc(sheet, True) +
        '" sheetId="1" r:id="rId1"/></sheets></workbook>')

    wb_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="' + _XL_RNS + '/worksheet" Target="worksheets/sheet1.xml"/>'
        '<Relationship Id="rId2" Type="' + _XL_RNS + '/styles" Target="styles.xml"/>'
        '</Relationships>')

    target = str(path)
    if hasattr(target, "write"):
        handle, target = target, getattr(target, "name", str(path))
    else:
        handle = open(target, "wb")
        close = True
    try:
        with zipfile.ZipFile(handle, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("[Content_Types].xml", _XL_CONTENT_TYPES)
            z.writestr("_rels/.rels", _XL_ROOT_RELS)
            z.writestr("xl/workbook.xml", workbook)
            z.writestr("xl/_rels/workbook.xml.rels", wb_rels)
            z.writestr("xl/styles.xml", _XL_STYLES)
            z.writestr("xl/worksheets/sheet1.xml", sheet_xml)
    finally:
        if handle is not None and locals().get("close"):
            handle.close()
    return None


def _xl_read_one(path, which):
    import zipfile
    import xml.etree.ElementTree as ET
    import pandas as pd

    with zipfile.ZipFile(path) as z:
        names = set(z.namelist())

        shared = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("{%s}si" % _XL_NS):
                shared.append("".join(t.text or ""
                                      for t in si.iter("{%s}t" % _XL_NS)))

        sheet_name, target = None, None
        if "xl/workbook.xml" in names:
            wb = ET.fromstring(z.read("xl/workbook.xml"))
            rels = {}
            if "xl/_rels/workbook.xml.rels" in names:
                for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels")):
                    rels[r.get("Id")] = r.get("Target")
            sheets = []
            for sh in wb.iter("{%s}sheet" % _XL_NS):
                tgt = rels.get(sh.get("{%s}id" % _XL_RNS), "")
                tgt = tgt[1:] if tgt.startswith("/") else (
                    tgt if tgt.startswith("xl/") else "xl/" + tgt)
                sheets.append((sh.get("name"), tgt))
            if sheets:
                if isinstance(which, int):
                    sheet_name, target = sheets[max(0, min(which, len(sheets) - 1))]
                else:
                    for nm, tgt in sheets:
                        if str(nm).lower() == str(which).lower():
                            sheet_name, target = nm, tgt
                            break
                    if target is None:
                        raise ValueError("no sheet named " + repr(which))
        if target is None or target not in names:
            raise ValueError("the workbook has no readable worksheet")

        root = ET.fromstring(z.read(target))
        body = root.find("{%s}sheetData" % _XL_NS)
        rows = []
        width = 0
        if body is not None:
            for row in body.findall("{%s}row" % _XL_NS):
                cells = {}
                auto = 0
                for c in row.findall("{%s}c" % _XL_NS):
                    ref = c.get("r") or ""
                    col = 0
                    for ch in ref:
                        if ch.isalpha():
                            col = col * 26 + (ord(ch.upper()) - 64)
                        else:
                            break
                    col = max(0, col - 1)
                    auto = col
                    t = c.get("t")
                    if t == "inlineStr":
                        inline = c.find("{%s}is" % _XL_NS)
                        val = "" if inline is None else "".join(
                            x.text or "" for x in inline.iter("{%s}t" % _XL_NS))
                    elif t == "s":
                        v = c.find("{%s}v" % _XL_NS)
                        try:
                            val = shared[int(v.text)] if v is not None else ""
                        except Exception:
                            val = ""
                    elif t == "b":
                        v = c.find("{%s}v" % _XL_NS)
                        val = (v is not None and v.text == "1")
                    elif t == "e":
                        val = None
                    elif t == "str":
                        v = c.find("{%s}v" % _XL_NS)
                        val = v.text if v is not None else ""
                    else:
                        v = c.find("{%s}v" % _XL_NS)
                        if v is None or v.text is None or v.text == "":
                            val = None
                        else:
                            txt = v.text.strip()
                            # Excel has no integer type; it stores everything as a
                            # double. openpyxl (and therefore pandas) reports a
                            # value as int when the text carries no decimal point
                            # or exponent, so match that or integer columns come
                            # back as float and DataFrame.equals() fails.
                            try:
                                if "." in txt or "e" in txt.lower():
                                    val = float(txt)
                                else:
                                    val = int(txt)
                            except ValueError:
                                val = v.text
                    cells[col] = val
                width = max(width, len(cells))
                rows.append(cells)

    if not rows:
        return pd.DataFrame()

    header = []
    for i in range(width):
        v = rows[0].get(i)
        header.append("" if v is None else str(v))
    seen = {}
    for i, h in enumerate(header):
        if h in seen:
            seen[h] += 1
            header[i] = h + "." + str(seen[h])
        else:
            seen[h] = 0

    records = []
    for cells in rows[1:]:
        rec = {}
        for i, h in enumerate(header):
            rec[h] = cells.get(i)
        records.append(rec)
    return pd.DataFrame(records, columns=header)


def _xl_read(path, sheet_name=0, **kwargs):
    """pandas.read_excel replacement."""
    if isinstance(sheet_name, (list, tuple)):
        return dict((str(n), _xl_read_one(path, n)) for n in sheet_name)
    if isinstance(sheet_name, int):
        return _xl_read_one(path, sheet_name)
    return _xl_read_one(path, sheet_name)


def _install_excel_shim():
    """Patch the two pandas entry points, but only if openpyxl is really gone."""
    global _xl_ready
    if _xl_ready:
        return
    try:
        import pandas as pd
    except Exception:
        return  # pandas not installed yet; retry on the next run
    try:
        import openpyxl  # noqa: F401
        _xl_ready = True  # genuine support available, nothing to patch
        return
    except Exception:
        pass

    def to_excel(self, excel_writer, sheet_name="Sheet1", index=False, **kwargs):
        return _xl_write_frame(self, excel_writer, sheet_name=sheet_name,
                               index=index, **kwargs)

    def read_excel(io, sheet_name=0, **kwargs):
        return _xl_read(io, sheet_name=sheet_name, **kwargs)

    to_excel._lab_shim = True
    pd.DataFrame.to_excel = to_excel
    pd.read_excel = read_excel
    _xl_ready = True
`;

  if (typeof window === "undefined") {
    throw new Error("codelab-py.js must be loaded in a browser");
  }
  window.DSLabPy = { source: PY };
})();