================================================================================
  SCREEN RECORDINGS - EXACT FILENAMES REQUIRED
  Data Science Laboratory - Mohan Babu University
================================================================================

Drop your .mp4 files into THIS folder using the filenames listed below.
The website is already pointed at these paths, so as soon as a file with the
right name appears here, the corresponding video slot on the site fills itself.
No code changes are needed.

  ABOUT THE FILES THAT ARE ALREADY HERE
--------------------------------------------------------------------------------
  All 19 SECTION videos are REAL RECORDINGS. Each one is a genuine screen
  capture of that part being executed in the site's own Code Lab: the real
  program from data.js is entered into the real editor, the real Run button is
  clicked, and the real Pyodide interpreter prints its actual output. Nothing
  is drawn, animated or simulated. 1920x1080, 10-21 seconds, H.264 + AAC.

  The 5 PREVIEW videos (exp1-preview.mp4 ... exp5-preview.mp4) are still
  PLACEHOLDER title cards, about 5 seconds long and clearly labelled as such.

  How the recordings were made
--------------------------------------------------------------------------------
  * Recorded from the real page, so the editor, the Run button, the console and
    every figure in the video are the genuine article.
  * Each clip types the section's real source into the editor and then runs it.
    Part B and C of Experiment 1 build on dataframes created in the preceding
    part, so those upstream sections are executed silently first, exactly as a
    student working in order would have done.
  * Pyodide, pandas, NumPy and Matplotlib are loaded BEFORE recording starts.
    Otherwise a clip would spend most of its length waiting on a 15-second
    library import instead of showing the experiment's own work.
  * Every clip was checked after recording: that it decodes, that playback
    covers the whole file, that it contains real motion rather than a frozen
    frame, that the picture is not blank, and that the audio track carries
    actual sound rather than silence.
  * The audio is an original synthesised backing track, generated per clip from
    the section's own id, so no two experiments share the same music. It is
    written from scratch, so there is no licensing question and no music file
    to ship.

  A note on containers: Chrome writes "fragmented" MP4 (the streaming kind).
  It plays correctly in Chrome, Edge and Firefox, but older Safari and some
  desktop video players can refuse a fragmented file. If you need maximum
  compatibility, re-mux the clips with a normal MP4 writer, for example:
      ffmpeg -i exp1-a.mp4 -c copy -movflags +faststart out.mp4
  ffmpeg is not installed on this machine, so that step has not been done.

Preview videos  (10 second hover preview, shown on the Preview and Overview pages)
--------------------------------------------------------------------------------
  exp1-preview.mp4     Experiment 1 - Data Import, Export and File Formats
  exp2-preview.mp4     Experiment 2 - Web Data, APIs and SQL Integration
  exp3-preview.mp4     Experiment 3 - Data Cleaning, Transformation and Regex
  exp4-preview.mp4     Experiment 4 - Indexing, Reshaping and Combining Data
  exp5-preview.mp4     Experiment 5 - Data Visualization with Matplotlib

Section videos   (full recording for each part A / B / C ...)
--------------------------------------------------------------------------------
  exp1-a.mp4    exp1-b.mp4    exp1-c.mp4
  exp2-a.mp4    exp2-b.mp4
  exp3-a.mp4    exp3-b.mp4    exp3-c.mp4    exp3-d.mp4
  exp4-a.mp4    exp4-b.mp4    exp4-c.mp4
  exp5-a.mp4    exp5-b.mp4    exp5-bi.mp4   exp5-bii.mp4
  exp5-c.mp4    exp5-d.mp4    exp5-e.mp4

  Total: 5 preview videos + 19 section videos = 24 files.

If a file is missing, that slot automatically shows a clean
"video pending" panel instead of a broken player - so the site stays
presentable while you are still recording.

--------------------------------------------------------------------------------
  RECORDING TIPS
--------------------------------------------------------------------------------
  * Keep previews to roughly 10 seconds. The player loops the first 10 seconds
    while the mouse rests on the video, then rewinds when the mouse leaves.
  * 1920x1080 is the target and matches the placeholders. H.264 (AVC) in an
    MP4 container, yuv420p, constant frame rate. Keep files under ~25 MB each so
    the page stays quick on campus Wi-Fi.
  * Record the notebook in a browser with dark mode so the code is readable.
  * Name files exactly as written above - the site reads the name, not the
    folder listing.
  * The 19 section recordings DO have an audio track (original, synthesised,
    unique per clip). The 5 preview placeholders are silent.

  Student photograph
--------------------------------------------------------------------------------
  Put your photo at:  assets/img/student-photo.jpg
  ...then set `photo: "assets/img/student-photo.jpg"` in assets/js/data.js.
  Portrait orientation, roughly 3:4 (for example 600 x 800 pixels).