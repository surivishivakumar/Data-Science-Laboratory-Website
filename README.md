# Digital Laboratory

A fully interactive laboratory website. Open **`index.html`** by double-clicking it.
No server, no install, no build step.

---

## 1. Folder layout

```
DS-Lab-Website/
├── index.html                  ← the page shell (you rarely need to touch this)
├── README.md                   ← this file
└── assets/
    ├── css/
    │   └── styles.css          ← all colours, spacing, layout, responsive rules
    ├── js/
    │   ├── data.js             ← ★ EDIT THIS FILE FOR ALL CONTENT ★
    │   ├── codelab-py.js       ← browser compatibility layer for Pyodide (seaborn, Excel, HTTP)
    │   ├── codelab.js          ← the Code Lab (editor, files, notebook, engines)
    │   └── app.js              ← search, routing, video hover, code viewer, page rendering
    ├── img/
    │   └── monthly-sales-expenses.png
    └── videos/
        ├── README.txt          ← exact filenames for your screen recordings
        └── (24 placeholder .mp4 files, 1920x1080, waiting to be replaced)
```

---

## 2. The one file you edit

Everything on the website comes from **`assets/js/data.js`**. Change a value,
save, refresh the browser. That is the whole workflow.

### 2.1 Branding and subject code

```js
var laboratory = { name: "Digital Laboratory" };

var labMeta = {
  subjectCode: "22DS102006",           // Digital Laboratory
  academicYear: "2025 - 2026",
  department: "Department of Computer Science & Engineering"
};
```

> Use `var` (not `const`/`let`) for these top-level blocks. The page fills in the
> visible text by reading them from `window`, which only works for `var`.

### 2.2 Student details (the ID card on the right of page 1)

```js
const student = {
  photo: "",                           // "" = nice initials placeholder
  name: "Surivi Shiva Kumar",
  idNumber: "24102A030120",
  section: "CSE-DS-2",
  faculty: "S. Bosu Babu",
  profession: "Assistant Professor"
};
```

**To use a real photograph:** save it as `assets/img/student-photo.jpg`
(portrait, roughly 3:4, e.g. 600 × 800) and set `photo: "assets/img/student-photo.jpg"`.
The photo area is clearly framed so it is obvious where the picture belongs.

### 2.3 Experiments

```js
var experiments = [
  {
    id: 1,
    name: "Import and Export in CSV, JSON and Excel Formats",
    tagline: "Reading and writing datasets in CSV, JSON and Excel using pandas.",
    previewVideo: "assets/videos/exp1-preview.mp4",   // 15s hover preview
    youtubeVideo: "",                                 // YouTube ID or full URL
    youtubeLink:  "",                                 // full watch URL
    githubLink:   "",                                 // repository URL
    summary: "This experiment demonstrates ...",
    sections: [
      {
        id: "a",                 // short key used in the web address
        letter: "A",             // the label shown on screen
        title: "Reading a CSV dataset ...",
        youtubeVideo: "",        // this part's video (optional, wins over `video`)
        video: "assets/videos/exp1-a.mp4",
        code: "import pandas as pd\ndf = pd.read_csv(...)",
        outputImage: ""          // optional, e.g. "assets/img/result.png"
      }
    ]
  }
];
```

**The number of sections is completely dynamic.** Nothing is hard-coded.
Right now the five experiments have 3, 2, 4, 3 and 7 parts — add or remove
entries freely and the letters, the jump grid, the counters and the prev/next
pager all adapt automatically.

#### Adding a brand new experiment

Copy an existing block, change the `id` to the next unused number, and append
it to the array. Nothing else to do.

#### YouTube

You can paste either a bare ID or a whole URL:

```js
youtubeVideo: "dQw4w9WgXcQ",                    // ID only  -> embedded player
youtubeVideo: "https://youtu.be/dQw4w9WgXcQ",   // or any YouTube URL
```

`watch`, `youtu.be`, `embed` and Shorts links are all understood. Embeds use
`youtube-nocookie.com`. `youtubeLink` is shown separately as a clickable
"YouTube Link" row.

YouTube is used in two places:

- **Per part (section page)** — `sections[].youtubeVideo` renders as a real
  embedded player. If empty, the site falls back to the local `video` file.
- **Experiment preview card** — `experiments[].youtubeVideo` replaces the hover
  preview with a clickable thumbnail, because YouTube cannot autoplay muted on
  hover. Hover previews only work for local `.mp4` files.

So if you switch an experiment to YouTube, also clear its `previewVideo`:

```js
previewVideo: "",                 // disable the hover preview
youtubeVideo: "dQw4w9WgXcQ",      // show this instead
```

#### Preview length

Hover previews loop for **15 seconds**. Change it with the `PREVIEW_SECONDS`
constant at the top of `assets/js/app.js`.

---

## 3. Page flow

```
Home  ──►  "+ ADD" (or click an experiment card)
   │
   ▼
Experiment Preview      left: 15s preview video, hover to play
   │                    right: experiment name
   ▼
"Overview"
   │
   ▼
Experiment Overview    left: same preview video + YouTube + links + summary
   │                    right: experiment name + A / B / C / D ... letters
   ▼
Click a letter (A, B, C, B(i) ...)
   │
   ▼
Individual Section     header: "Experiment 1" + part letter
                       left: that part's video (normal controls)
                       below the video: Code (line numbers, syntax
                       highlighting, independent scrolling, Copy Code)
                       and a "Run this code" button
```

Back navigation works via the breadcrumb at the top of every page and the
prev/next buttons at the bottom.

The top bar also links to **Dashboard**, **Experiment Catalogue**, **Code Lab**
and **Student Card**. The first three besides Code Lab simply jump to the
matching part of page 1, so the four-step flow above is never duplicated.

---

## 3b. Code Lab - many languages, nothing to install

**Code Lab** (`#/codelab`) is a full editor plus runner. It lives in its own file,
`assets/js/codelab.js`, plus a small companion, `assets/js/codelab-py.js`, that
supplies the few Python packages Pyodide is missing (see below). The lab exposes
one function:

```js
window.DSCodeLab.mount(hostElement, { code, name })
```

`app.js` calls that when you open `#/codelab`, passing the source carried over
from a part page's **Run this code** button. Everything else in the lab is
self-contained.

### Languages and where each one runs

| Language | Engine | Needs internet |
|---|---|---|
| Python 3.12 | Pyodide (CPython -> WebAssembly) in a Worker | first run only |
| JavaScript | Web Worker | no |
| SQL | SQLite via Pyodide | first run only |
| HTML / CSS | sandboxed `<iframe>` | no |
| Java, C, C++, C#, Go, Rust, Kotlin, PHP, Ruby, Bash, Swift, Scala, Perl, R, Elixir | Judge0 container | yes, every run |

Compiled languages are **not** run in your browser: they are posted to a remote
Judge0 instance (`https://ce.judge0.com` by default), which builds and runs them
in a container and returns stdout, stderr, compiler diagnostics, execution time
and memory. **Your source code leaves your machine for those languages only.**
Python, JavaScript, SQL, HTML and CSS never leave the browser.

To point at your own Judge0 (recommended for a college deployment, and required
for real Java 8 - see below) set this in the browser console once:

```js
localStorage.setItem("dslab.config.v2", JSON.stringify({ judge0Url: "https://judge0.example.ac.in" }));
```

### Java version caveat

The public Judge0 instance has **no Java 8 runtime**. Language id `62` is
OpenJDK 13 and id `91` is JDK 17. Both compile and run Java 8 *language level*
source unchanged, but if you must pin the compiler to a real JDK 8, self-host
Judge0 (`judge0/judge0:java-8` image) and set `judge0Url` as above.

### What Pyodide is missing, and what the lab does about it

Pyodide is CPython compiled to WebAssembly. It ships most of the scientific stack
(`numpy`, `pandas`, `matplotlib`, `scipy`, `scikit-learn`, `requests`), but **not**
`seaborn`, `openpyxl`, or any web-server framework. Left alone, the notebook cells
that use those would stop dead with `ModuleNotFoundError`.

`assets/js/codelab-py.js` is the fix. It is plain Python text that `codelab.js`
injects into the interpreter *before* your code runs, and it only ever adds
something that is genuinely absent - if a real package ever appears in Pyodide,
the lab uses it and steps aside.

| Notebook needs | How the lab provides it |
|---|---|
| `seaborn` | A matplotlib-backed shim providing the functions these notebooks use: `scatterplot`, `histplot`, `kdeplot`, `boxplot`, `pairplot`, and the theme helpers. It draws real charts with real data - it is not a picture of a chart. |
| `openpyxl` | `DataFrame.to_excel()` and `pandas.read_excel()` are replaced with a small writer/reader that produces real `.xlsx` OOXML. Output opens in Excel, LibreOffice and genuine `openpyxl`, with `int64`/`float64`/`bool` dtypes preserved. |
| `requests` over HTTP | `pyodide-http` is loaded and patched in, so live API and CSV calls work. This one does need internet. |

Being straight about the limits, because a lab that quietly pretends is worse than
one that admits a gap:

- The Excel writer handles **one sheet per call**, plain values only. No
  formatting, colours, formulas, merged cells, charts, column widths, or
  appending to an existing file. It reads back what it writes, plus ordinary
  workbooks made elsewhere.
- The seaborn shim covers the plots in these experiments, not all of seaborn's API.
  Plot styling, figure sizes and output are close to seaborn but not pixel-identical.
- A cell that uses a variable from an earlier cell needs that earlier cell run
  first, exactly as in a real Jupyter session where cells share globals. Part 1C
  writing `Student.xlsx` needs Part 1A and 1B to have run.
- Frameworks that have no browser equivalent - `flask`, `django`, `torch`,
  `tensorflow` - cannot work, because a web page cannot open a listening socket.
  The lab says so in plain language instead of showing a traceback. For Flask, use
  the HTML/CSS preview panel.

### Editor features

- Syntax highlighting, line-number gutter, auto-indent on Enter and `{`/`:`.
- Error lines from a Python traceback or compiler diagnostic are marked in the
  gutter and highlighted.
- Autocomplete for keywords and builtins, with Tab/Enter to accept.
- Formatting (re-indent), Copy, Clear.
- `Ctrl`+`Enter` or `F5` run, `Ctrl`+`S` save, `Tab` indent.
- Dark and light themes; the editor uses a code-specific palette in each.
- Responsive down to 320 px.

### Files, folders and version history

The **Files** panel is a project tree stored in `localStorage` under
`dslab.workspace.v2`. You can create files and folders, rename, delete, download,
and open any file in the editor. Every save pushes a snapshot onto that file's
version list (the newest 20 are kept) and any snapshot can be restored. Nothing
is uploaded; clearing site data clears the workspace.

### Notebook mode

For Python, switch the segmented control to **Notebook**. Cells share one
interpreter and one set of globals, so `df` defined in cell 1 is available in
cell 2. Each cell can be run on its own or with **Run all**, and outputs include
plain text, `DataFrame` HTML tables, and matplotlib figures. Add, reorder and
delete cells; the notebook can be saved as a `.py` file.

### Safety notes

- Python and JavaScript run in Web Workers, so they cannot touch the page, its
  cookies, or the DOM. They are isolated from the site, but they are still
  ordinary code running with your privileges inside a worker - do not treat the
  worker as a security boundary for untrusted code.
- HTML/CSS previews run in an `<iframe sandbox="allow-scripts">` with no
  `allow-same-origin`, so the preview cannot read or modify the lab page.
- Notebook rich output (`_repr_html_`) is filtered through an allow-list before
  it is inserted into the page; `<script>`, `<iframe>`, `<img onerror=...>`,
  `javascript:` URLs and inline event handlers are stripped.
- Remote execution is rate-limited and dependent on a third-party service. If it
  is unreachable the lab says so plainly and the offline languages still work.
- The first Pyodide run downloads roughly 10 MB and needs internet; after that
  the browser caches it. A notebook cell also pulls in whatever it imports
  (`matplotlib`, `scipy`, `scikit-learn`, `pyodide-http`) on first use, so the very
  first run of a plotting or networking cell is the slowest one.

### Why Stop restarts Python

Python runs in a Web Worker so a runaway loop can be interrupted. **Stop
terminates the worker**, which also discards the interpreter and its globals, so
the next run rebuilds it (from cache, so it is quick).

---

## 4. Search

The box on page 1 filters **experiment names** as you type, highlights the
matching text, updates the counter, and offers autocomplete suggestions.
Full keyboard support: `/` focuses the box, `↑ ↓` move, `Enter` opens,
`Esc` closes, and the `×` button clears.

| Type this | You get |
|---|---|
| `pandas`, `numpy`, `regex` | Experiment 3 |
| `csv`, `json`, `excel`, `export` | Experiment 1 |
| `api`, `sql`, `web` | Experiment 2 |
| `multiindex`, `reshaping`, `combining` | Experiment 4 |
| `matplotlib`, `seaborn`, `visualization` | Experiment 5 |

---

## 5. Video behaviour

**Preview videos (pages 2 and 3)**

* Never autoplays on page load.
* Move the mouse over it → it plays muted so the browser allows it.
* It loops inside the first **15 seconds** and keeps going while hovered.
* Move the mouse away → it pauses and rewinds to 0:00.
* Click the speaker button for sound.

**Section videos (page 4)** use normal browser controls — play, pause,
scrub, full screen.

**YouTube instead of a file** — fill in `youtubeVideo` (see §2.3). Section
players become real embedded videos; preview cards become clickable thumbnails,
since YouTube cannot autoplay muted on hover.

**If a video file is missing**, that slot shows a neat notice naming the exact
filename to add instead of a broken player. See `assets/videos/README.txt`
for the full list of 24 filenames the site is already wired up for.

---

## 6. Code viewer

* Monospace font, line numbers, Python syntax highlighting (offline, built in).
* **Only the code box scrolls** — the page never jumps because of long code.
* **Copy Code** button, plus a `.py` download button.

---

## 7. Design notes

* Dark professional data-science theme, with a light/dark toggle in the top bar
  (the choice is remembered).
* Responsive from 320 px phones up to wide desktops; every page is checked at
  320, 360, 390, 430, 768, 1024, 1280 and 1920 px wide with no horizontal
  scrolling. The top bar nav becomes a 2 × 2 grid on phone-width screens.
* The top bar is sticky, so `scroll-padding-top` keeps anchor jumps, `Tab` focus
  and "scroll into view" from hiding a control underneath it. `--topbar-h` is
  measured from the live layout at load and on resize.
* Respects `prefers-reduced-motion`; the print stylesheet expands all code.

### Changing the colours

Every colour is a CSS variable at the top of `assets/css/styles.css`:

```css
:root {
  --accent: #2dd4bf;    /* teal   */
  --accent-2: #38bdf8;  /* blue   */
  --accent-3: #818cf8;  /* indigo */
  --gold: #f2c14e;      /* gold   */
}
```

Change those five values and the whole site re-themes.

---

## 8. Common tasks

| I want to… | Do this |
|---|---|
| Change my name / roll number | edit `student` in `assets/js/data.js` |
| Add my photo | save as `assets/img/student-photo.jpg`, set `student.photo` |
| Fix the subject code | edit `labMeta.subjectCode` |
| Add a YouTube video | set `youtubeVideo` (ID or URL); clear `previewVideo` if you want the thumbnail instead of the hover preview |
| Run Python code | open **Code Lab** from the top bar, or press **Run this code** on any part page |
| Add a GitHub link | set `githubLink` on that experiment |
| Change the summary | edit `summary` on that experiment |
| Add a new part | push another object into that experiment's `sections` array |
| Change the code shown | replace the `code` string for that section |
| Add recordings | drop the mp4s into `assets/videos/` using the names in its README |

After any edit: **save, then press Ctrl+F5** to force a refresh.