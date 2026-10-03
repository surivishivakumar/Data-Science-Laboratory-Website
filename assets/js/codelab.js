/*==========================================================================
  DS LAB  -  MULTI-LANGUAGE CODE EXECUTION PLATFORM
  ---------------------------------------------------------------------------
  Self-contained module. Exposes window.DSCodeLab.mount(container).

  DESIGN
  ------
  Everything runs client-side where possible, so the lab needs no server and
  no local toolchain:

    python      Pyodide (CPython + NumPy/Pandas/Matplotlib/Seaborn/...) inside
                a dedicated Web Worker. A worker is used precisely so a runaway
                script can be killed instantly by terminating it, and so the UI
                thread never freezes.
    javascript  A plain Web Worker. `window` and `document` are not available.
    sql         sqlite3, which already ships inside Pyodide, so SQL is instant
                once the Python runtime is warm.
    html, css   A sandboxed iframe (sandbox="allow-scripts", no same-origin).
    everything  else (Java, C, C++, PHP, Kotlin, Go, Rust, ...) is compiled
    else        and run by a Judge0 endpoint, which executes each submission
                inside its own isolated container with separate CPU,
                wall-clock and memory ceilings.

  EXECUTION SAFETY
  ----------------
  Local engines are sandboxed by the browser: they run in a worker with no DOM
  access, and Stop terminates that worker, so an infinite loop cannot survive.
  They cannot read local files or reach the page.

  Remote engines hand the source to Judge0, which never runs it on the
  website's own machine. No user code is executed on any server belonging to
  this site, because this site has no server: it is a folder of static files.

  Saved projects live in localStorage, so code stays in the browser unless the
  student presses Run on a language that requires the remote compiler.
==========================================================================*/

(function (global) {
  "use strict";

  /* ===================================================================
     1. CONFIGURATION
     =================================================================== */

  var PYODIDE_VERSION = "0.27.2";
  var PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/";
  var JUDGE0_URL = "https://ce.judge0.com";
  var WORKER_TIMEOUT_MS = 30000;
  var PYODIDE_LOAD_TIMEOUT_MS = 180000;
  var MAX_VERSIONS = 20;
  var STORE_KEY = "dslab.workspace.v2";
  var CONFIG_KEY = "dslab.config.v2";

  var ICON = {
    play: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
    save: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 2v5h8V5H7Zm5 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M9 3h9a2 2 0 0 1 2 2v11h-2V5H9V3ZM5 7h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Z"/></svg>',
    down: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M12 3v10.2l3.6-3.6 1.4 1.4-6 6-6-6 1.4-1.4L10 13.2V3h2ZM4 19h16v2H4v-2Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>'
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* Notebook programs can return arbitrary HTML through _repr_html_(). It is
     user-authored content, so it is filtered down to a table/formatting subset
     before it reaches innerHTML. */
  var HTML_ALLOW = {
    TABLE: 1, THEAD: 1, TBODY: 1, TFOOT: 1, TR: 1, TH: 1, TD: 1, CAPTION: 1,
    COLGROUP: 1, COL: 1, DIV: 1, SPAN: 1, P: 1, BR: 1, HR: 1, PRE: 1, CODE: 1,
    B: 1, I: 1, EM: 1, STRONG: 1, SMALL: 1, SUB: 1, SUP: 1, MARK: 1,
    H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1,
    UL: 1, OL: 1, LI: 1, DL: 1, DT: 1, DD: 1,
    FIGURE: 1, FIGCAPTION: 1, STYLE: 1, KBD: 1
  };
  var HTML_ATTR_OK = {
    "class": 1, "id": 1, "title": 1, "colspan": 1, "rowspan": 1, "scope": 1,
    "align": 1, "data-frame": 1, "data-name": 1, "border": 1,
    "cellpadding": 1, "cellspacing": 1, "width": 1, "height": 1
  };

  function sanitizeHtml(input) {
    if (!input) return "";
    var doc;
    try {
      doc = new DOMParser().parseFromString("<div>" + input + "</div>", "text/html");
    } catch (e) { return ""; }
    var root = doc.body ? doc.body.firstChild : null;
    if (!root) return "";

    var drop = [];
    var walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
    var node = walker.nextNode();
    while (node) {
      var tag = (node.tagName || "").toUpperCase();
      if (!HTML_ALLOW[tag]) {
        drop.push(node);
      } else {
        var attrs = Array.prototype.slice.call(node.attributes || []);
        attrs.forEach(function (a) {
          var n = String(a.name || "").toLowerCase();
          var v = String(a.value || "");
          if (n.indexOf("on") === 0) { node.removeAttribute(a.name); return; }
          if (n === "style") {
            if (/javascript:|expression\s*\(|behaviou?r\s*:|-moz-binding/i.test(v)) {
              node.removeAttribute(a.name);
            }
            return;
          }
          if (!HTML_ATTR_OK[n]) { node.removeAttribute(a.name); return; }
          if (/javascript:|vbscript:|data:text\/html/i.test(v)) node.removeAttribute(a.name);
        });
      }
      node = walker.nextNode();
    }
    drop.forEach(function (d) { if (d.parentNode) d.parentNode.removeChild(d); });
    return root.innerHTML;
  }

  function uid() {
    return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function toast(msg) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("is-on"); }, 2400);
  }

  /* Non-blocking replacement for prompt()/confirm(): browsers suppress those
     dialogs inside sandboxed frames and some kiosk/embedder setups, and they
     freeze the whole page, so the lab uses its own async dialog instead. */
  var dlg = null;
  function ask(opts) {
    return new Promise(function (resolve) {
      if (!dlg) {
        dlg = document.createElement("div");
        dlg.className = "lab2-dlg";
        dlg.setAttribute("role", "dialog");
        dlg.setAttribute("aria-modal", "true");
        dlg.hidden = true;
        dlg.innerHTML =
          '<div class="lab2-dlg__box">' +
            '<h3 class="lab2-dlg__title"></h3>' +
            '<p class="lab2-dlg__msg"></p>' +
            '<input class="lab2-dlg__input" type="text" spellcheck="false" autocomplete="off">' +
            '<div class="lab2-dlg__row">' +
              '<button class="lab2-mini lab2-dlg__no" type="button"></button>' +
              '<button class="lab2-mini lab2-mini--run lab2-dlg__yes" type="button"></button>' +
            "</div>" +
          "</div>";
        document.body.appendChild(dlg);
        dlg._box = dlg.querySelector(".lab2-dlg__box");
        dlg._title = dlg.querySelector(".lab2-dlg__title");
        dlg._msg = dlg.querySelector(".lab2-dlg__msg");
        dlg._input = dlg.querySelector(".lab2-dlg__input");
        dlg._yes = dlg.querySelector(".lab2-dlg__yes");
        dlg._no = dlg.querySelector(".lab2-dlg__no");
        dlg._input.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); dlg._close(opts.value); }
          if (e.key === "Escape") { e.preventDefault(); dlg._close(null); }
        });
      }
      dlg._title.textContent = opts.title || (opts.ok ? "Confirm" : "Enter a name");
      dlg._msg.textContent = opts.message || "";
      dlg._yes.textContent = opts.ok || "OK";
      dlg._no.textContent = opts.cancel || "Cancel";
      dlg._input.hidden = !opts.value;
      dlg._input.value = opts.value || "";
      dlg._box.setAttribute("data-kind", opts.kind || "text");
      dlg.hidden = false;
      dlg._close = function (val) {
        if (!dlg || dlg.hidden) return;
        dlg.hidden = true;
        document.removeEventListener("keydown", dlg._esc, true);
        resolve(val);
      };
      dlg._esc = function (e) {
        if (e.key === "Escape") { e.stopPropagation(); dlg._close(null); }
      };
      document.addEventListener("keydown", dlg._esc, true);
      setTimeout(function () {
        if (!opts.value) dlg._yes.focus();
        else { dlg._input.focus(); dlg._input.select(); }
      }, 0);
      dlg._onYes = function () { dlg._close(opts.value ? dlg._input.value : true); };
      dlg._onNo = function () { dlg._close(null); };
      dlg._yes.onclick = dlg._onYes;
      dlg._no.onclick = dlg._onNo;
      dlg.onclick = function (e) { if (e.target === dlg) dlg._close(null); };
    });
  }

  /* ===================================================================
     2. LANGUAGE REGISTRY
     -------------------------------------------------------------------
     Judge0 ids were read from https://ce.judge0.com/languages.
     IMPORTANT: the public Judge0 instance has NO Java 8 entry. Id 62 is
     OpenJDK 13.0.1 and id 91 is JDK 17.0.6. Both compile and run Java 8
     language level source unchanged, but to pin the compiler to Java 8 you
     must self-host Judge0 with a Java 8 image. See README.md.
     =================================================================== */

  var L = {};

  L.python = {
    id: "python", label: "Python", ext: "py", engine: "pyodide",
    version: "3.12", indent: 4, notebook: true,
    lineComment: "#", blockComment: null,
    keywords: ["and","as","assert","async","await","break","class","continue","def","del","elif","else","except","False","finally","for","from","global","if","import","in","is","lambda","match","case","None","nonlocal","not","or","pass","raise","return","True","try","while","with","yield"],
    builtins: ["abs","all","any","bool","dict","enumerate","filter","float","format","frozenset","getattr","hasattr","input","int","isinstance","iter","len","list","map","max","min","next","open","print","range","repr","reversed","round","set","setattr","sorted","str","sum","tuple","type","zip","json","os","re","sys","sqlite3","pd","np","plt","sns","requests","BeautifulSoup","np"]
  };

  L.javascript = {
    id: "javascript", label: "JavaScript", ext: "js", engine: "workerjs",
    version: "ES2022", indent: 2, notebook: false,
    lineComment: "//", blockComment: ["/*", "*/"],
    keywords: ["async","await","break","case","catch","class","const","continue","debugger","default","delete","do","else","export","extends","finally","for","function","if","import","in","instanceof","let","new","of","return","static","super","switch","this","throw","try","typeof","var","void","while","with","yield"],
    builtins: ["Array","Boolean","console","Date","Error","JSON","Map","Math","Number","Object","parseInt","parseFloat","Promise","RegExp","Set","String","Symbol","undefined","true","false","NaN"]
  };

  L.sql = {
    id: "sql", label: "SQL", ext: "sql", engine: "pyodide",
    version: "SQLite 3", indent: 2, notebook: false, caseInsensitive: true,
    lineComment: "--", blockComment: ["/*", "*/"],
    keywords: ["SELECT","FROM","WHERE","GROUP","BY","ORDER","HAVING","LIMIT","OFFSET","INSERT","INTO","VALUES","UPDATE","SET","DELETE","CREATE","TABLE","DROP","ALTER","ADD","PRIMARY","KEY","FOREIGN","REFERENCES","UNIQUE","NOT","NULL","DEFAULT","JOIN","LEFT","RIGHT","INNER","OUTER","CROSS","ON","AS","AND","OR","IN","BETWEEN","LIKE","IS","DISTINCT","UNION","ALL","CASE","WHEN","THEN","ELSE","END","WITH","INDEX","VIEW"],
    builtins: ["COUNT","SUM","AVG","MIN","MAX","ROUND","ABS","COALESCE","UPPER","LOWER","LENGTH","GROUP_CONCAT","strftime","sqlite_master"]
  };

  L.html = {
    id: "html", label: "HTML", ext: "html", engine: "web",
    version: "HTML5", indent: 2, notebook: false, isHtml: true,
    lineComment: null, blockComment: ["<!--", "-->"],
    keywords: ["a","article","aside","body","button","canvas","div","footer","form","h1","h2","h3","h4","header","html","img","input","label","li","main","nav","ol","option","p","section","select","span","strong","style","table","tbody","td","th","thead","tr","ul","script"],
    builtins: []
  };

  L.css = {
    id: "css", label: "CSS", ext: "css", engine: "web",
    version: "CSS3", indent: 2, notebook: false,
    lineComment: null, blockComment: ["/*", "*/"],
    keywords: ["align-items","background","background-color","border","border-radius","bottom","box-shadow","color","display","flex","flex-direction","font-family","font-size","font-weight","gap","grid","grid-template-columns","height","justify-content","left","line-height","margin","margin-top","max-width","opacity","padding","position","right","text-align","top","transform","transition","width"],
    builtins: []
  };

  function remote(id, label, ext, judgeId, version, opts) {
    var o = opts || {};
    L[id] = {
      id: id, label: label, ext: ext, engine: "judge0",
      judgeId: judgeId, version: version,
      indent: o.indent || 4, notebook: false,
      lineComment: (o.lineComment === undefined) ? "//" : o.lineComment,
      blockComment: o.blockComment || null,
      keywords: o.keywords || [],
      builtins: o.builtins || []
    };
  }

  remote("java", "Java", "java", 62, "OpenJDK 13.0.1", {
    keywords: ["abstract","assert","boolean","break","byte","case","catch","char","class","const","continue","default","do","double","else","enum","extends","final","finally","float","for","if","implements","import","instanceof","int","interface","long","native","new","package","private","protected","public","return","short","static","strictfp","super","switch","synchronized","this","throw","throws","transient","try","void","volatile","while","var","record"],
    builtins: ["String","System","Integer","Double","Boolean","Math","Scanner","List","ArrayList","Map","HashMap","Arrays","Collections","Exception"]
  });

  remote("c", "C", "c", 50, "GCC 9.2.0", {
    keywords: ["auto","break","case","char","const","continue","default","do","double","else","enum","extern","float","for","goto","if","inline","int","long","register","restrict","return","short","signed","sizeof","static","struct","switch","typedef","union","unsigned","void","volatile","while"],
    builtins: ["printf","scanf","malloc","free","strlen","strcpy","puts","main","FILE"]
  });

  remote("cpp", "C++", "cpp", 54, "GCC 9.2.0", {
    keywords: ["using","namespace","class","public","private","protected","virtual","template","typename","auto","const","constexpr","nullptr","true","false","new","delete","try","catch","throw","operator","friend","inline","explicit","mutable","class","struct","enum"],
    builtins: ["std","string","vector","map","set","cout","cin","cerr","endl","sort","printf","scanf","main"]
  });

  remote("php", "PHP", "php", 68, "PHP 7.4.1", {
    keywords: ["abstract","and","array","as","break","callable","case","catch","class","clone","const","continue","declare","default","do","echo","else","elseif","empty","endfor","endforeach","endif","endswitch","endwhile","extends","final","finally","fn","for","foreach","function","global","if","implements","include","include_once","instanceof","interface","isset","list","namespace","new","or","print","private","protected","public","require","require_once","return","static","switch","throw","trait","try","unset","use","var","while","xor","true","false","null"],
    builtins: ["count","array_map","array_filter","str_replace","sprintf","printf","json_encode","json_decode"]
  });

  remote("kotlin", "Kotlin", "kt", 78, "Kotlin 1.3.70", {
    keywords: ["fun","val","var","class","object","interface","package","import","if","else","when","for","while","do","return","break","continue","try","catch","finally","throw","is","as","in","out","data","sealed","enum","companion","private","public","internal","protected","override","open","abstract","const","lateinit"],
    builtins: ["println","print","readLine","main","String","Int","Double","Boolean","List","MutableList","Map","arrayOf","listOf","mutableListOf"]
  });

  remote("go", "Go", "go", 60, "Go 1.13.5", {
    keywords: ["package","import","func","var","const","type","struct","interface","map","chan","go","defer","return","if","else","for","range","switch","case","default","break","continue","fallthrough","select","goto"],
    builtins: ["fmt","Println","Printf","Print","Sprint","main","make","new","len","cap","append","string","int","float64","bool","byte","error"]
  });

  remote("rust", "Rust", "rs", 73, "Rust 1.40.0", {
    keywords: ["fn","let","mut","const","static","struct","enum","trait","impl","for","in","if","else","match","while","loop","return","break","continue","pub","use","mod","crate","self","Self","where","as","dyn","ref","move","unsafe","async","await"],
    builtins: ["println","print","format","vec","String","Vec","Option","Some","None","Result","Ok","Err","i32","i64","u32","u64","f64","usize","bool","str"]
  });

  remote("csharp", "C#", "cs", 51, "Mono 6.6", {
    keywords: ["using","namespace","class","struct","interface","enum","public","private","protected","internal","static","void","var","int","double","bool","string","new","return","if","else","for","foreach","while","do","switch","case","break","continue","try","catch","finally","throw","this","base"],
    builtins: ["Console","WriteLine","ReadLine","Main","Math","Convert","Array","List"]
  });

  remote("ruby", "Ruby", "rb", 72, "Ruby 2.7.0", {
    keywords: ["def","end","class","module","if","elsif","else","unless","while","until","for","do","begin","rescue","ensure","return","yield","require","require_relative","puts","print","attr_accessor","nil","true","false","then","case","when","self","super","lambda","proc","new"],
    builtins: ["Array","Hash","String","Integer","Float","map","each","select","sort","join","length","to_i","to_f"]
  });

  remote("bash", "Bash", "sh", 46, "Bash 5.0.0", {
    keywords: ["if","then","else","elif","fi","for","in","do","done","while","case","esac","function","return","export","local","set","unset","source"],
    builtins: ["echo","read","printf","pwd","ls","cat","grep"],
    lineComment: "#", indent: 2
  });

  remote("swift", "Swift", "swift", 83, "Swift 5.2.3", {
    keywords: ["func","var","let","class","struct","enum","protocol","extension","init","deinit","if","else","guard","while","for","in","repeat","switch","case","default","return","import","self","true","false","nil"],
    builtins: ["print","String","Int","Double","Bool","Array","Dictionary"]
  });

  remote("scala", "Scala", "scala", 81, "Scala 2.13.2", {
    keywords: ["object","class","trait","def","val","var","if","else","while","for","yield","match","case","import","package","new","return","this","type","given"],
    builtins: ["println","print","String","Int","Double","Boolean","List","Array","Seq"],
    indent: 2
  });

  remote("perl", "Perl", "pl", 85, "Perl 5.28.1", {
    keywords: ["sub","my","our","local","use","require","package","if","elsif","else","unless","while","until","for","foreach","do","return"],
    builtins: ["print","printf","say","qw","join","map","sort","scalar","push"],
    lineComment: "#"
  });

  remote("r", "R", "r", 99, "R 4.4.1", {
    keywords: ["function","library","require","data","if","else","for","while","repeat","break","next","return"],
    builtins: ["print","cat","paste","nrow","ncol","head","tail","summary","mean","median","max","min","plot","hist"],
    lineComment: "#", indent: 2
  });

  remote("elixir", "Elixir", "ex", 57, "Elixir 1.9.4", {
    keywords: ["defmodule","defp","def","do","end","if","else","case","cond","when","with","for"],
    builtins: ["Enum","IO","String","Integer","Map","List"],
    lineComment: "#", indent: 2
  });

  var ORDER = ["python", "java", "c", "cpp", "javascript", "sql", "html", "css",
               "php", "kotlin", "go", "rust", "csharp", "ruby", "bash", "swift",
               "scala", "perl", "r", "elixir"];

  var SAMPLES = {
    python: "import pandas as pd\nimport numpy as np\n\nscores = [78, 85, 90, 62, 95]\ndf = pd.DataFrame({\"Marks\": scores})\n\nprint(\"Mean marks:\", np.mean(scores))\nprint(df.describe())\n",
    java: "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}\n",
    c: "#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    scanf(\"%d %d\", &a, &b);\n    printf(\"%d\\n\", a + b);\n    return 0;\n}\n",
    cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}\n",
    javascript: "// JavaScript runs in a Web Worker, so window and document are not available.\nconst nums = [12, 7, 25, 3, 18];\n\nconsole.log(\"sorted:\", [...nums].sort((a, b) => a - b));\nconsole.log(\"sum:\", nums.reduce((a, b) => a + b, 0));\nconsole.log(\"max:\", Math.max(...nums));\n",
    sql: "-- SQLite, executed in order.\nCREATE TABLE students (\n  id    INTEGER PRIMARY KEY,\n  name  TEXT,\n  dept  TEXT,\n  marks INTEGER\n);\n\nINSERT INTO students (name, dept, marks) VALUES\n  ('Shiva', 'DS', 92),\n  ('Kanishka', 'DS', 88),\n  ('Surya', 'CSE', 76),\n  ('Kushwanth', 'CSE', 95);\n\nSELECT dept, COUNT(*) AS students, AVG(marks) AS average\nFROM students\nGROUP BY dept;\n",
    html: "<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <title>My page</title>\n  <style>\n    body { font-family: system-ui; padding: 24px; }\n    h1 { color: #0d9488; }\n  </style>\n</head>\n<body>\n  <h1>Hello from the Code Lab</h1>\n  <p>Edit the HTML on the left and it updates on the right.</p>\n  <button onclick=\"alert('It works!')\">Click me</button>\n</body>\n</html>\n",
    css: "body {\n  margin: 0;\n  padding: 32px;\n  font-family: system-ui, sans-serif;\n  background: #0f172a;\n  color: #e2e8f0;\n}\n\n.card {\n  max-width: 420px;\n  margin: 0 auto;\n  padding: 28px;\n  border-radius: 16px;\n  background: #1e293b;\n}\n\nh1 {\n  margin-top: 0;\n  color: #2dd4bf;\n  font-size: 24px;\n}\n\np {\n  line-height: 1.7;\n  color: #94a3b8;\n}\n",
    php: "<?php\n$students = [[\"Shiva\", 92], [\"Kanishka\", 88], [\"Surya\", 76]];\n\n$sum = 0;\nforeach ($students as $s) {\n    echo $s[0] . \": \" . $s[1] . \"\\n\";\n    $sum += $s[1];\n}\necho \"Average: \" . ($sum / count($students)) . \"\\n\";\n",
    kotlin: "import java.util.Scanner\n\nfun main() {\n    val sc = Scanner(System.`in`)\n    val a = sc.nextInt()\n    val b = sc.nextInt()\n    println(a + b)\n}\n",
    go: "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tvar a, b int\n\tfmt.Scan(&a, &b)\n\tfmt.Println(a + b)\n}\n",
    rust: "use std::io;\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_line(&mut input).unwrap();\n    let n: i32 = input.trim().parse().unwrap();\n    println!(\"{}\", n * n);\n}\n",
    csharp: "using System;\n\nclass Program {\n    static void Main() {\n        int a = int.Parse(Console.ReadLine());\n        int b = int.Parse(Console.ReadLine());\n        Console.WriteLine(a + b);\n    }\n}\n",
    ruby: "students = [[\"Shiva\", 92], [\"Kanishka\", 88], [\"Surya\", 76]]\n\nsum = students.sum { |s| s[1] }\nstudents.each { |name, mark| puts \"#{name}: #{mark}\" }\nputs \"Average: #{sum.to_f / students.length}\"\n",
    bash: "read -p \"First number: \" a\nread -p \"Second number: \" b\necho \"Sum: $((a + b))\"\necho \"Script finished\"\n",
    swift: "import Foundation\n\nlet a = 10\nlet b = 20\nprint(\"Sum: \\(a + b)\")\n",
    scala: "object Main {\n  def main(args: Array[String]): Unit = {\n    val nums = List(12, 7, 25, 3)\n    println(\"sum = \" + nums.sum)\n    println(\"sorted = \" + nums.sorted.mkString(\", \"))\n  }\n}\n",
    perl: "use strict;\nuse warnings;\n\nmy @nums = (12, 7, 25, 3);\nmy $sum = 0;\n$sum += $_ for @nums;\nprint \"sum = $sum\\n\";\nprint \"sorted = \", join(\", \", sort { $a <=> $b } @nums), \"\\n\";\n",
    r: "scores <- c(78, 85, 90, 62, 95)\ncat(\"mean:\", mean(scores), \"\\n\")\ncat(\"max:\", max(scores), \"\\n\")\n",
    elixir: "scores = [78, 85, 90, 62]\nIO.puts(\"sum: #{Enum.sum(scores)}\")\nIO.puts(\"max: #{Enum.max(scores)}\")\n"
  };

  var STDIN_DEFAULT = {
    java: "10 20", c: "10 20", cpp: "10 20", kotlin: "10 20", go: "10 20",
    csharp: "10\n20", bash: "10\n20"
  };

  /* ===================================================================
     3. WORKSPACE STORAGE
     =================================================================== */

  function readStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return (parsed && parsed.root) ? parsed : null;
    } catch (e) { return null; }
  }

  function writeStore(store) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
      return true;
    } catch (e) {
      toast("Could not save: browser storage is full or blocked");
      return false;
    }
  }

  function readConfig() {
    try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }

  function seedStore() {
    var root = { id: "root", type: "folder", name: "My Programs", open: true, children: [] };
    ORDER.forEach(function (id) {
      var lang = L[id];
      root.children.push({
        id: uid(), type: "folder", name: lang.label, open: false,
        children: [{
          id: uid(), type: "file",
          name: "hello." + lang.ext,
          lang: id,
          code: SAMPLES[id] || "",
          created: Date.now(), modified: Date.now(),
          versions: []
        }]
      });
    });
    return { root: root, activeId: null };
  }

  /* ===================================================================
     4. SYNTAX HIGHLIGHTER
     -------------------------------------------------------------------
     One small regex tokenizer driven by the language descriptor. It must
     never be the reason the editor feels slow, and it must work offline.
     =================================================================== */

  var TOKEN_CLASS = {
    com: "tok-com", str: "tok-str", num: "tok-num", kw: "tok-kw",
    bi: "tok-bi", fn: "tok-fn", pun: "tok-pun", tag: "tok-tag", attr: "tok-attr"
  };

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function buildMatcher(lang) {
    var alts = [];

    if (lang.blockComment) {
      alts.push("(?<com>" + escapeRe(lang.blockComment[0]) + "[\\s\\S]*?" + escapeRe(lang.blockComment[1]) + ")");
    }
    if (lang.lineComment) {
      alts.push("(?<com>" + escapeRe(lang.lineComment) + "[^\\n]*)");
    }
    if (lang.id === "javascript" || lang.id === "php" ||
        lang.id === "go" || lang.id === "rust" ||
        lang.id === "csharp" || lang.id === "swift" ||
        lang.id === "scala" || lang.id === "elixir") {
      alts.push("(?<str>`(?:\\\\.|[^`\\\\])*`)");
    }
    alts.push('(?<str>"(?:\\\\.|[^"\\\\])*")');
    alts.push("(?<str>'(?:\\\\.|[^'\\\\])*')");

    alts.push("(?<num>\\b0[xXbBoO][0-9a-fA-F_]+\\b|\\b\\d[\\d_]*\\.?\\d*(?:[eE][+-]?\\d+)?[fFlLdDmMuU]*\\b)");

    if (lang.keywords && lang.keywords.length) {
      alts.push("(?<kw>\\b(?:" + lang.keywords.map(escapeRe).join("|") + ")\\b)");
    }
    if (lang.builtins && lang.builtins.length) {
      alts.push("(?<bi>\\b(?:" + lang.builtins.map(escapeRe).join("|") + ")\\b)");
    }
    alts.push("(?<fn>\\b[A-Za-z_$][\\w$]*(?=\\s*\\())");
    alts.push("(?<pun>[{}()\\[\\].,:;=+\\-*/%<>!&|^~?]+)");

    return new RegExp(alts.join("|"), "gm" + (lang.caseInsensitive ? "i" : ""));
  }

  var matcherCache = {};

  function highlight(code, lang) {
    var source = String(code == null ? "" : code);
    if (lang.isHtml) return highlightHtml(source);
    var re = matcherCache[lang.id] || (matcherCache[lang.id] = buildMatcher(lang));
    re.lastIndex = 0;
    var out = "";
    var cursor = 0;
    var m;

    while ((m = re.exec(source)) !== null) {
      if (m[0] === "") { re.lastIndex++; continue; }
      if (m.index > cursor) out += esc(source.slice(cursor, m.index));
      var kind = null;
      for (var k in m.groups) { if (m.groups[k] !== undefined) { kind = k; break; } }
      out += '<span class="' + (TOKEN_CLASS[kind] || "tok-id") + '">' + esc(m[0]) + "</span>";
      cursor = m.index + m[0].length;
    }
    if (cursor < source.length) out += esc(source.slice(cursor));
    return out;
  }

  function highlightHtml(code) {
    return esc(code)
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-com">$1</span>')
      .replace(/(&lt;\/?)([a-zA-Z][\w:-]*)/g, '$1<span class="tok-tag">$2</span>')
      .replace(/([a-zA-Z-]+)(=)(&quot;[^&]*?&quot;)/g, '<span class="tok-attr">$1</span>$2<span class="tok-str">$3</span>');
  }

  /* ===================================================================
     5. EXECUTION ENGINES
     =================================================================== */

  /* The Python compatibility shims live in their own file so this one stays
     readable. They are baked into the worker source at build time because a
     blob worker has no access to the page's window object. */
  function pythonShimSource() {
    return (window.DSLabPy && window.DSLabPy.source) || "";
  }

  function pythonWorkerSource() {
    return `
const CDN = ${JSON.stringify(PYODIDE_CDN)};
const PY_SHIMS = ${JSON.stringify(pythonShimSource())};
let py = null, ready = false, readyPromise = null;

/* Memoised: mount() preloads the runtime while the user may already press Run.
   Without this guard two concurrent loadPyodide() calls race and the first run
   can come back empty. */
async function ensureReady() {
  if (ready) return;
  if (!readyPromise) {
    readyPromise = (async () => {
      if (!self.pyodide) {
        importScripts(CDN + "pyodide.js");
        self.pyodide = await loadPyodide({ indexURL: CDN });
      }
      py = self.pyodide;
      ready = true;
    })();
  }
  await readyPromise;
}

/* Runs the caller's code with stdout and stderr captured, stdin served from
   the input box, a headless matplotlib backend, and any trailing expression
   rendered the way Jupyter renders it, so a DataFrame becomes an HTML table.
   Globals are preserved between calls so notebook cells share variables. */
function buildProgram() {
  return [
    'import sys, io, ast, base64, warnings, logging',
    'warnings.filterwarnings("ignore")',
    /* seaborn and openpyxl are not part of the Pyodide distribution, so the
       shims supply them on first use. Idempotent, and never fatal. Runs on
       every call because pandas or matplotlib may only be installed now. */
    'try:',
    '    exec(PY_SHIMS, globals())',
    '    _lab_install_shims()',
    'except Exception:',
    '    pass',
    'try:',
    '    import matplotlib',
    '    matplotlib.use("Agg")',
    '    logging.getLogger("matplotlib").setLevel(logging.ERROR)',
    'except Exception:',
    '    pass',
    'sys.stdin = io.StringIO(_stdin)',
    '_buf = []',
    'class _Cap(io.TextIOBase):',
    '    def write(self, s):',
    '        _buf.append(str(s))',
    '        return len(s)',
    '    def flush(self):',
    '        pass',
    'sys.stdout = _cap = _Cap()',
    'sys.stderr = _cap',
    '_html = []',
    '_err = None',
    '_res = {}',
    'try:',
    '    _tree = ast.parse(_code)',
    '    _last = None',
    '    if _tree.body and isinstance(_tree.body[-1], ast.Expr):',
    '        _last = ast.Expression(_tree.body.pop().value)',
    '    exec(compile(_tree, "<lab>", "exec"), globals(), globals())',
    '    if _last is not None:',
    '        _v = eval(compile(_last, "<lab>", "eval"), globals(), globals())',
    '        if hasattr(_v, "_repr_html_"):',
    '            _html.append(str(_v._repr_html_()))',
    '        else:',
    '            _rv = repr(_v)',
    '            if _rv != "None":',
    '                _res["value"] = _rv',
    'except BaseException:',
    '    import traceback',
    '    _err = traceback.format_exc()',
    /* Turn a bare ModuleNotFoundError into something actionable. The original
       traceback is kept underneath so nothing is hidden. */
    '    try:',
    '        _note = _lab_explain_import_error(_err)',
    '        if _note:',
    /* Four backslashes, not two: this code sits inside the pythonWorkerSource()
       template literal, so the worker ends up seeing "\\n" and the Python it
       generates contains an escaped newline inside a string literal. */
    '            _err = _note + "\\\\n\\\\n--- original traceback ---\\\\n" + _err',
    '    except Exception:',
    '        pass',
    '_figs = []',
    'try:',
    '    import matplotlib.pyplot as plt',
    '    for _n in list(plt.get_fignums()):',
    '        _b = io.BytesIO()',
    '        plt.figure(_n)',
    '        plt.savefig(_b, format="png", dpi=110, bbox_inches="tight")',
    '        _figs.append(base64.b64encode(_b.getvalue()).decode())',
    '    plt.close("all")',
    'except Exception:',
    '    pass',
    '_res["stdout"] = "".join(_buf)',
    '_res["stderr"] = _err or ""',
    '_res["plots"] = _figs',
    '_res["html"] = _html'
  ].join("\\n");
}

/* Runs the statements in _sql against a fresh in-memory SQLite database and
   returns each SELECT result as a table. */
function buildSqlProgram() {
  return [
    'import json',
    '_sqlOut = json.dumps({"error": "The SQL engine could not start.", "tables": []})',
    'try:',
    '    import sqlite3, traceback',
    '    conn = sqlite3.connect(":memory:")',
    '    cur = conn.cursor()',
    '    _tables = []',
    '    _err = None',
    '    try:',
    '        for _s in _sql.split(";"):',
    '            _s = _s.strip()',
    '            if not _s:',
    '                continue',
    '            _parts = _s.split(None, 1)',
    '            _head = _parts[0].upper() if _parts else ""',
    '            _c = cur.execute(_s)',
    '            if _head in ("SELECT", "PRAGMA", "WITH", "VALUES", "EXPLAIN") or _c.description:',
    '                _cols = [d[0] for d in _c.description]',
    '                _tables.append({"columns": _cols, "rows": [list(r) for r in _c.fetchall()]})',
    '        conn.commit()',
    '    except BaseException:',
    '        _err = traceback.format_exc()',
    '    _sqlOut = json.dumps({"error": _err or "", "tables": _tables}, default=str)',
    'except BaseException:',
    '    import traceback as _tb2',
    '    _sqlOut = json.dumps({"error": _tb2.format_exc(), "tables": []}, default=str)'
  ].join("\\n");
}

self.onmessage = async function (ev) {
  const msg = ev.data || {};
  const rid = msg.__id || null;
  const reply = function (obj) { obj.__id = rid; postMessage(obj); };
  try {
    await ensureReady();

    if (msg.type === "ping") {
      reply({ type: "ready", version: py.version });
      return;
    }

    const t0 = performance.now();

    if (msg.type === "run") {
      try {
        await py.loadPackagesFromImports(msg.code);
      } catch (e) {
        reply({
          type: "result", cellId: msg.cellId, ok: false,
          stdout: "",
          stderr: "Could not load the required Python packages:\\n" + ((e && e.message) || e),
          plots: [], html: [], time: (performance.now() - t0) / 1000
        });
        return;
      }

      py.globals.set("_code", msg.code);
      py.globals.set("_stdin", msg.stdin || "");
      py.globals.set("PY_SHIMS", PY_SHIMS);
      /* pyodide-http must be loaded *after* loadPackagesFromImports. It patches
         requests and urllib in place, so patching a module that is not loaded
         yet leaves responses truncated at ~2.5 KB. buildProgram() then calls
         pyodide_http.patch_all() once the real packages exist. */
      try { await py.loadPackage("pyodide-http"); } catch (e) {}
      /* The seaborn shim is matplotlib-backed, but loadPackagesFromImports
         cannot see that: it only reacts to a literal matplotlib import.
         Without this, sns.histplot(...) with no explicit matplotlib import
         fails with ModuleNotFoundError.
         Uses indexOf, not a regex: this whole block lives inside a JS template
         literal, where a backslash-b would arrive as a literal backspace. */
      if (msg.code.indexOf("seaborn") > -1 || msg.code.indexOf("matplotlib") > -1) {
        try { await py.loadPackage("matplotlib"); } catch (e) {}
      }
      await py.runPythonAsync(buildProgram());

      const res = py.globals.get("_res").toJs();
      reply({
        type: "result",
        cellId: msg.cellId,
        ok: !res.stderr,
        stdout: res.stdout || "",
        stderr: res.stderr || "",
        plots: res.plots || [],
        html: res.html || [],
        value: (res.value === undefined ? null : res.value),
        time: (performance.now() - t0) / 1000
      });
      return;
    }

    if (msg.type === "sql") {
      py.globals.set("_sql", msg.code);
      /* sqlite3 ships with Pyodide but is not loaded by default, and the import
         lives inside generated code that loadPackagesFromImports cannot see. */
      try {
        await py.loadPackage("sqlite3");
      } catch (e) {
        reply({
          type: "result", ok: false, stdout: "", plots: [], html: [], tables: [],
          stderr: "Could not load the SQLite package:\\n" + ((e && e.message) || e),
          time: (performance.now() - t0) / 1000
        });
        return;
      }
      await py.runPythonAsync(buildSqlProgram());
      const res = JSON.parse(py.globals.get("_sqlOut"));
      reply({
        type: "result",
        ok: !res.error, stdout: "", stderr: res.error || "", plots: [], html: [],
        tables: res.tables || [],
        time: (performance.now() - t0) / 1000
      });
      return;
    }

    reply({ type: "fatal", error: "Unknown message type: " + msg.type });
  } catch (err) {
    /* Pyodide raises PythonError, whose own message is often just the class
       name. String(err) keeps the traceback, which is what the user needs. */
    let detail = "";
    try { detail = String(err); } catch (x) { detail = ""; }
    if (!detail || detail === "[object Object]") detail = (err && err.message) || "unknown error";
    reply({ type: "fatal", error: detail });
  }
};
`;
  }

  var pythonWorker = null;
  var pythonWorkerUrl = null;

  function ensurePythonWorker() {
    if (pythonWorker) return pythonWorker;
    var blob = new Blob([pythonWorkerSource()], { type: "text/javascript" });
    pythonWorkerUrl = URL.createObjectURL(blob);
    pythonWorker = new Worker(pythonWorkerUrl);
    return pythonWorker;
  }

  function killPythonWorker() {
    if (pythonWorker) { try { pythonWorker.terminate(); } catch (e) {} }
    if (pythonWorkerUrl) { try { URL.revokeObjectURL(pythonWorkerUrl); } catch (e) {} }
    pythonWorker = null;
    pythonWorkerUrl = null;
  }

  /* Judge0 rejects a plain-text submission whose compiler diagnostics contain
   bytes that are not valid UTF-8 (HTTP 400), so both directions are base64. */
  function toB64(str) {
    var bytes = new TextEncoder().encode(String(str == null ? "" : str));
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function fromB64(s) {
    if (!s) return "";
    try {
      var bin = atob(String(s));
      var bytes = new Uint8Array(bin.length);
      for (var j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      return new TextDecoder().decode(bytes);
    } catch (e) {
      return String(s);
    }
  }

  var postSeq = 0;

  function postToWorker(worker, msg, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;

      /* Every worker reply carries the id of the request that caused it. Without
         this correlation the runtime preload ("ready") resolves whichever run is
         in flight, and that run's real output is discarded. */
      postSeq += 1;
      var myId = "req-" + postSeq + "-" + Date.now();
      msg.__id = myId;

      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Timed out after " + Math.round(timeoutMs / 1000) +
          "s. The program may be looping forever, or the first run may still be " +
          "downloading the runtime."));
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
      }
      function onMessage(ev) {
        if (settled) return;
        var data = ev.data || {};
        if (data.__id && data.__id !== myId) return;
        settled = true;
        cleanup();
        resolve(data);
      }
      function onError(err) {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      }

      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      worker.postMessage(msg);
    });
  }

  var Engines = {};

  Engines.pyodide = {
    label: "Pyodide in this browser",
    run: function (code, stdin, cellId) {
      var w = ensurePythonWorker();
      return postToWorker(w, { type: "run", code: code, stdin: stdin, cellId: cellId },
                          WORKER_TIMEOUT_MS + PYODIDE_LOAD_TIMEOUT_MS)
        .then(function (r) {
          if (r.type === "fatal") throw new Error(r.error);
          return {
            stdout: r.stdout, stderr: r.stderr, plots: r.plots,
            html: r.html, value: r.value, time: r.time, ok: r.ok
          };
        });
    },
    sql: function (code) {
      var w = ensurePythonWorker();
      return postToWorker(w, { type: "sql", code: code },
                          WORKER_TIMEOUT_MS + PYODIDE_LOAD_TIMEOUT_MS)
        .then(function (r) {
          if (r.type === "fatal") throw new Error(r.error);
          return {
            stdout: r.stdout, stderr: r.stderr, plots: [], tables: r.tables,
            time: r.time, ok: r.ok
          };
        });
    },
    warm: function () {
      return postToWorker(ensurePythonWorker(), { type: "ping" }, PYODIDE_LOAD_TIMEOUT_MS);
    },
    stop: function () { killPythonWorker(); }
  };

  Engines.workerjs = {
    label: "Web Worker in this browser",
    run: function (code, stdin) {
      var src = [
        "const __out = [];",
        "const __push = (a) => __out.push(a.map(String).join(' '));",
        "const console = { log: (...a) => __push(a), info: (...a) => __push(a),",
        "  warn: (...a) => __push(a), error: (...a) => __push(a), debug: (...a) => __push(a) };",
        "globalThis.console = console;",
        "self.onmessage = function (e) {",
        "  const t0 = performance.now();",
        "  let err = null;",
        "  try {",
        "    const __lines = (e.data.stdin || '').split('\\n');",
        "    let __i = 0;",
        "    globalThis.prompt = (m) => { if (m) __push([m]); return (__lines[__i++] || '').trim(); };",
        "    const __res = (0, eval)(e.data.code);",
        "    if (__res !== undefined) __push([__res]);",
        "  } catch (ex) {",
        "    err = (ex && ex.stack) ? ex.stack : String(ex);",
        "  }",
        "  postMessage({ stdout: __out.join('\\n'), stderr: err || '',",
        "    time: (performance.now() - t0) / 1000 });",
        "};"
      ].join("\n");

      var blob = new Blob([src], { type: "text/javascript" });
      var url = URL.createObjectURL(blob);
      var worker = new Worker(url);

      return postToWorker(worker, { code: code, stdin: stdin }, 15000)
        .then(function (r) {
          worker.terminate();
          URL.revokeObjectURL(url);
          return { stdout: r.stdout, stderr: r.stderr, time: r.time, plots: [], ok: !r.stderr };
        })
        .catch(function (err) {
          worker.terminate();
          URL.revokeObjectURL(url);
          throw err;
        });
    },
    stop: function () {}
  };

  Engines.web = {
    label: "Sandboxed preview",
    run: function (code, stdin, langId) {
      var t0 = performance.now();
      var srcdoc;
      if (langId === "css") {
        srcdoc = "<!DOCTYPE html><html><head><meta charset='utf-8'><style>\n" +
          "body{margin:0;padding:20px;font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}\n" +
          code + "\n</style></head><body><h1>Heading</h1>" +
          "<p class='card'>A card styled by your CSS.</p></body></html>";
      } else {
        srcdoc = code;
      }
      return Promise.resolve({
        stdout: "Preview rendered in the panel below.",
        stderr: "", time: (performance.now() - t0) / 1000,
        plots: [], preview: srcdoc, ok: true
      });
    },
    stop: function () {}
  };

  Engines.judge0 = {
    label: "Judge0 sandboxed container",
    /* run() is handed the language id, so resolve the Judge0 id from here
       rather than expecting a language object. */
    run: function (code, stdin, langId) {
      var lang = (typeof langId === "string") ? L[langId] : langId;
      if (!lang || !lang.judgeId) {
        return Promise.reject(new Error("No remote compiler is configured for this language."));
      }
      var base = (readConfig().judge0Url || JUDGE0_URL).replace(/\/+$/, "");
      var ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, WORKER_TIMEOUT_MS);

      return fetch(base + "/submissions?base64_encoded=true&wait=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language_id: lang.judgeId,
          source_code: toB64(code),
          stdin: toB64(stdin || "")
        }),
        signal: ctrl ? ctrl.signal : undefined
      })
        .then(function (res) {
          clearTimeout(timer);
          if (!res.ok) {
            return res.text().then(function (t) {
              throw new Error("The remote compiler returned HTTP " + res.status +
                (t ? ": " + t.slice(0, 200) : ""));
            });
          }
          return res.json();
        })
        .then(function (j) {
          var compile = fromB64(j.compile_output);
          var stdout = fromB64(j.stdout);
          var stderr = fromB64(j.stderr);
          /* Judge0 reports 3 = Accepted; the id appears as status_id on some
             deployments and only nested under status on others. */
          var statusId = (j.status_id != null) ? j.status_id : (j.status && j.status.id);
          var accepted = String(statusId) === "3";
          return {
            stdout: stdout,
            stderr: stderr,
            compile: compile,
            compileFailed: !!(compile && !stdout),
            time: (j.time != null ? parseFloat(j.time) : null),
            memory: (j.memory != null ? parseFloat(j.memory) : null),
            status: j.status ? j.status.description : "",
            plots: [],
            ok: accepted
          };
        })
        .catch(function (err) {
          clearTimeout(timer);
          if (err && err.name === "AbortError") {
            throw new Error("The remote run exceeded " + Math.round(WORKER_TIMEOUT_MS / 1000) + " seconds.");
          }
          throw new Error(
            "Could not reach the remote compiler at " + base + ".\n\n" +
            "This language needs internet access and a reachable Judge0 endpoint.\n" +
            "Python, JavaScript, SQL, HTML and CSS all work offline and do not need it.\n\n" +
            ((err && err.message) ? err.message : "")
          );
        });
    },
    stop: function () {}
  };

  function engineFor(lang) {
    return Engines[lang.engine] || Engines.pyodide;
  }

  /* ===================================================================
     6. ERROR LINE EXTRACTION
     =================================================================== */

  function findErrorLines(text) {
    var lines = {};
    var patterns = [
      /File "<lab>", line (\d+)/g,
      /<anonymous>:(\d+)/g,
      /(\w[\w.]*):(\d+):\d+:/g,
      /--> [^:]+:(\d+):\d+/g,
      /^\s*at line (\d+)/gmi,
      /\[(\d+):(\d+)\]/g,
      /(\w+): line (\d+)/g
    ];

    patterns.forEach(function (re) {
      var m;
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) {
        if (m.length === 2) lines[parseInt(m[1], 10)] = true;
        else lines[parseInt(m[2], 10)] = true;
      }
    });

    return Object.keys(lines).map(Number)
      .filter(function (n) { return n > 0 && n < 5000; });
  }

  /* ===================================================================
     7. EDITOR
     =================================================================== */

  function createEditor(host, opts) {
    var lang = opts.lang;

    var ta = document.createElement("textarea");
    ta.className = "ed__ta";
    ta.spellcheck = false;
    ta.setAttribute("autocapitalize", "off");
    ta.setAttribute("autocomplete", "off");
    ta.setAttribute("autocorrect", "off");
    ta.setAttribute("aria-label", opts.ariaLabel || "Code editor");

    var pre = document.createElement("pre");
    pre.className = "ed__hl";
    pre.setAttribute("aria-hidden", "true");

    var gutter = document.createElement("div");
    gutter.className = "ed__gutter";
    gutter.setAttribute("aria-hidden", "true");

    var wrap = document.createElement("div");
    wrap.className = "ed";
    wrap.appendChild(gutter);
    wrap.appendChild(pre);
    wrap.appendChild(ta);

    var ac = document.createElement("div");
    ac.className = "ed__ac";
    ac.hidden = true;
    wrap.appendChild(ac);

    host.appendChild(wrap);

    var errorLines = [];
    var acItems = [];
    var acIndex = 0;

    function paintGutter() {
      var n = ta.value.split("\n").length;
      var html = "";
      for (var i = 1; i <= n; i++) {
        html += '<span class="' + (errorLines.indexOf(i) > -1 ? "is-err" : "") + '">' + i + "</span>";
      }
      gutter.innerHTML = html;
    }

    function paint() {
      pre.innerHTML = highlight(ta.value, lang) + "\n";
      paintGutter();
    }

    function syncScroll() {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
      gutter.scrollTop = ta.scrollTop;
    }

    function changed() {
      paint();
      if (opts.onChange) opts.onChange(ta.value);
    }

    ta.addEventListener("input", function () { changed(); updateAc(); });
    ta.addEventListener("scroll", syncScroll);
    ta.addEventListener("blur", hideAc);
    ta.addEventListener("click", hideAc);

    /* ---- autocomplete ---- */
    function candidates(prefix) {
      var set = {};
      (lang.keywords || []).forEach(function (k) { set[k] = 1; });
      (lang.builtins || []).forEach(function (k) { set[k] = 1; });
      var re = /[A-Za-z_$][\w$]*/g;
      var m;
      var text = ta.value;
      while ((m = re.exec(text)) !== null) set[m[0]] = 1;
      var p = prefix.toLowerCase();
      return Object.keys(set)
        .filter(function (w) { return w.toLowerCase().indexOf(p) === 0 && w !== prefix; })
        .sort()
        .slice(0, 40);
    }

    function paintAc() {
      ac.innerHTML = acItems.map(function (w, i) {
        return '<div class="ed__ac-item' + (i === acIndex ? " is-on" : "") + '">' + esc(w) + "</div>";
      }).join("");
    }

    function hideAc() { ac.hidden = true; acItems = []; }

    function acceptAc() {
      var word = acItems[acIndex];
      if (!word) return;
      var v = ta.value;
      var s = ta.selectionStart;
      var m = /[A-Za-z_$][\w$]*$/.exec(v.slice(0, s));
      var prefixLen = m ? m[0].length : 0;
      ta.value = v.slice(0, s - prefixLen) + word + v.slice(s);
      ta.selectionStart = ta.selectionEnd = s - prefixLen + word.length;
      hideAc();
      changed();
    }

    function updateAc() {
      if (ac.hidden === false && acItems.length) return;
      if (ta.selectionStart !== ta.selectionEnd) { hideAc(); return; }
      var v = ta.value;
      var s = ta.selectionStart;
      var m = /[A-Za-z_$][\w$]*$/.exec(v.slice(0, s));
      var prefix = m ? m[0] : "";
      if (prefix.length < 2) { hideAc(); return; }
      var list = candidates(prefix);
      if (!list.length) { hideAc(); return; }
      acItems = list;
      acIndex = 0;
      ac.hidden = false;
      paintAc();
    }

    ac.addEventListener("mousedown", function (e) {
      var item = e.target.closest(".ed__ac-item");
      if (!item) return;
      e.preventDefault();
      acIndex = Array.prototype.indexOf.call(ac.children, item);
      acceptAc();
    });

    /* ---- key handling: indent, autocomplete, shortcuts ---- */
    ta.addEventListener("keydown", function (e) {
      var indent = lang.indent || 4;
      var v = ta.value;
      var start = ta.selectionStart;
      var end = ta.selectionEnd;

      if (acItems.length && !ac.hidden) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          acIndex = (acIndex + 1) % acItems.length;
          paintAc();
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          acIndex = (acIndex - 1 + acItems.length) % acItems.length;
          paintAc();
          return;
        }
        if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
          e.preventDefault();
          acceptAc();
          return;
        }
        if (e.key === "Escape") { hideAc(); return; }
      }

      if (e.key === "Tab") {
        e.preventDefault();
        var ls = v.lastIndexOf("\n", start - 1) + 1;
        if (e.shiftKey) {
          var ded = v.slice(ls, end).replace(new RegExp("^ {" + indent + "}", "gm"), "");
          ta.value = v.slice(0, ls) + ded + v.slice(end);
          ta.selectionStart = ls;
          ta.selectionEnd = ls + ded.length;
        } else if (start !== end) {
          var out = v.slice(ls, end).split("\n")
            .map(function (l) { return " ".repeat(indent) + l; }).join("\n");
          ta.value = v.slice(0, ls) + out + v.slice(end);
          ta.selectionStart = ls;
          ta.selectionEnd = ls + out.length;
        } else {
          ta.value = v.slice(0, start) + " ".repeat(indent) + v.slice(end);
          ta.selectionStart = ta.selectionEnd = start + indent;
        }
        changed();
        return;
      }

      if (e.key === "Enter") {
        var ls2 = v.lastIndexOf("\n", start - 1) + 1;
        var line = v.slice(ls2, start);
        var lead = (line.match(/^[ \t]*/) || [""])[0];
        var opensBlock = (lang.id === "python") ? /:\s*$/.test(line) : /[{([]\s*$/.test(line);

        if (opensBlock) {
          e.preventDefault();
          var body = "\n" + lead + " ".repeat(indent) + "\n" + lead;
          ta.value = v.slice(0, start) + body + v.slice(end);
          ta.selectionStart = start + 1 + lead.length + indent;
          ta.selectionEnd = ta.selectionStart;
          changed();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (opts.onSave) opts.onSave();
        return;
      }
      if (e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
        e.preventDefault();
        if (opts.onRun) opts.onRun();
      }
    });

    /* ---- formatting: re-indent ---- */
    function format() {
      var python = lang.id === "python";
      var depth = 0;
      var out = ta.value.split("\n").map(function (line) {
        var trimmed = line.trim();
        if (!trimmed) return "";
        if (/^[\s]*[}\])]/.test(trimmed) && depth > 0) depth--;
        var lineOut = " ".repeat(depth * (lang.indent || 4)) + trimmed;
        var opensCount = (trimmed.match(/[{([]/g) || []).length;
        var closesCount = (trimmed.match(/[}\])]/g) || []).length;
        var blockOpen = python ? /:\s*$/.test(trimmed) : /[{([]\s*$/.test(trimmed);
        if (blockOpen) {
          if (opensCount > closesCount) depth++;
        } else if (opensCount > closesCount) {
          depth += opensCount - closesCount;
        }
        return lineOut;
      });
      ta.value = out.join("\n").replace(/\n{3,}/g, "\n\n");
      changed();
    }

    paint();

    return {
      el: wrap,
      textarea: ta,
      get value() { return ta.value; },
      set value(v) { ta.value = v == null ? "" : v; paint(); },
      setLang: function (l) { lang = l; hideAc(); paint(); },
      setErrors: function (lines) { errorLines = lines || []; paintGutter(); },
      clearErrors: function () { errorLines = []; paintGutter(); },
      format: format,
      focus: function () { ta.focus(); }
    };
  }

  /* ===================================================================
     8. FILE TREE
     =================================================================== */

  function findNode(node, id, parent) {
    if (node.id === id) return { node: node, parent: parent || null };
    var kids = node.children || [];
    for (var i = 0; i < kids.length; i++) {
      var hit = findNode(kids[i], id, node);
      if (hit) return hit;
    }
    return null;
  }

  function removeNode(node, id) {
    var kids = node.children || [];
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].id === id) { kids.splice(i, 1); return true; }
      if (removeNode(kids[i], id)) return true;
    }
    return false;
  }

  /* ===================================================================
     9. MOUNT
     =================================================================== */

  function mount(host, opts) {
    var store = readStore() || seedStore();

    var state = {
      langId: "python",
      mode: "code",
      running: false,
      fileId: store.activeId || null,
      notebook: null
    };

    var editor = null;
    var editorWrap = null;
    var els = {};

    function lang() { return L[state.langId]; }
    function activeFile() {
      if (!state.fileId) return null;
      var hit = findNode(store.root, state.fileId);
      return hit ? hit.node : null;
    }
    function currentCode() {
      if (state.mode === "notebook" && state.notebook) {
        return state.notebook.cells.map(function (c) { return c.code; }).join("\n\n");
      }
      return editor ? editor.value : "";
    }
    function persist() { writeStore(store); }
    function markModified() {
      var f = activeFile();
      if (!f) return;
      f.modified = Date.now();
      persist();
    }

    /* ---------------------------------------------------------- markup */

    function languageOptionsHtml() {
      var groups = [
        { label: "Runs in this browser (offline capable)", ids: ["python", "sql", "javascript", "html", "css"] },
        { label: "Compiled on a remote sandbox", ids: ["java", "c", "cpp", "php", "kotlin", "go", "rust", "csharp"] },
        { label: "More, on a remote sandbox", ids: ["ruby", "bash", "swift", "scala", "perl", "r", "elixir"] }
      ];
      return groups.map(function (g) {
        return '<optgroup label="' + esc(g.label) + '">' +
          g.ids.filter(function (id) { return !!L[id]; }).map(function (id) {
            return '<option value="' + id + '"' + (id === state.langId ? " selected" : "") + ">" +
              esc(L[id].label) + "</option>";
          }).join("") +
        "</optgroup>";
      }).join("");
    }

    function toolbarHtml() {
      return "" +
      '<div class="lab2-bar">' +
        '<div class="lab2-bar__left">' +
          '<label class="lab2-field">' +
            '<span class="lab2-field__label">Language</span>' +
            '<select class="lab2-select" id="langSelect" aria-label="Programming language">' +
              languageOptionsHtml() +
            "</select>" +
          "</label>" +
          '<div class="lab2-seg" role="group" aria-label="Editor mode">' +
            '<button class="lab2-seg__btn is-on" type="button" data-mode="code" id="modeCode">Code</button>' +
            '<button class="lab2-seg__btn" type="button" data-mode="notebook" id="modeNotebook"' +
              (lang().notebook ? "" : " disabled title=\"Notebook mode is available for Python\"") +
            ">Notebook</button>" +
          "</div>" +
        "</div>" +
        '<div class="lab2-bar__right">' +
          '<button class="btn btn--run lab2-run" type="button" id="runBtn">' + ICON.play + " Run code</button>" +
          '<button class="btn btn--ghost lab2-stop" type="button" id="stopBtn" hidden>' + ICON.stop + " Stop</button>" +
          '<button class="btn btn--ghost" type="button" id="saveBtn" title="Save (Ctrl+S)">' + ICON.save + " Save</button>" +
          '<button class="btn btn--ghost" type="button" id="saveAsBtn">Save as</button>' +
          '<button class="btn btn--ghost" type="button" id="fileMenuBtn">Files</button>' +
        "</div>" +
      "</div>";
    }

    function shellHtml() {
      return "" +
      '<div class="lab2">' +
        '<div class="lab2-banner" id="lab2Banner"></div>' +
        toolbarHtml() +
        '<div class="lab2-grid">' +
          '<section class="lab2-left">' +
            '<div class="lab2-panel lab2-panel--editor" id="editorPanel">' +
              '<div class="lab2-panel__head">' +
                '<span class="lab2-panel__title" id="fileName">Untitled</span>' +
                '<span class="lab2-panel__meta" id="fileMeta"></span>' +
                '<span class="lab2-panel__spacer"></span>' +
                '<button class="lab2-mini" type="button" id="fmtBtn" title="Re-indent the code">Format</button>' +
                '<button class="lab2-mini" type="button" id="copyBtn" title="Copy all code">' + ICON.copy + "</button>" +
                '<button class="lab2-mini" type="button" id="clearBtn" title="Clear the editor">Clear</button>' +
              "</div>" +
              '<div class="lab2-editor" id="editorHost"></div>' +
            "</div>" +
            '<div class="lab2-notebook" id="notebookHost" hidden></div>' +
          "</section>" +
          '<section class="lab2-right">' +
            '<div class="lab2-panel lab2-panel--io">' +
              '<div class="lab2-panel__head">' +
                '<span class="lab2-panel__title">Input (stdin)</span>' +
                '<span class="lab2-panel__spacer"></span>' +
              "</div>" +
              '<textarea class="lab2-stdin" id="stdinBox" spellcheck="false" ' +
                'aria-label="Program input" ' +
                'placeholder="Values sent to the program on standard input"></textarea>' +
            "</div>" +
            '<div class="lab2-panel lab2-panel--out">' +
              '<div class="lab2-panel__head">' +
                '<span class="lab2-panel__title">Output</span>' +
                '<span class="lab2-panel__spacer"></span>' +
                '<span class="lab2-panel__meta" id="runMeta"></span>' +
                '<button class="lab2-mini" type="button" id="clearOutBtn">Clear</button>' +
              "</div>" +
              '<div class="lab2-console" id="console" role="log" aria-live="polite"></div>' +
              '<div class="lab2-figs" id="figs"></div>' +
              '<div class="lab2-preview" id="preview" hidden></div>' +
            "</div>" +
          "</section>" +
        "</div>" +
        '<div class="lab2-foot">' +
          "Nothing to install. Python, JavaScript, SQL, HTML and CSS run entirely on this device. " +
          "Compiled languages upload the source to a remote sandbox to be built and run." +
          "<br><kbd>Ctrl</kbd>+<kbd>Enter</kbd> run &middot; <kbd>Ctrl</kbd>+<kbd>S</kbd> save &middot; " +
          "<kbd>Tab</kbd> indent &middot; <kbd>F5</kbd> run" +
        "</div>" +
      "</div>";
    }

    function drawerHtml() {
      return "" +
      '<div class="drawer" id="drawer" hidden>' +
        '<div class="drawer__panel" role="dialog" aria-label="Project files">' +
          '<div class="drawer__head">' +
            "<span>Project files</span>" +
            '<button class="lab2-mini" type="button" id="drawerClose">Close</button>' +
          "</div>" +
          '<div class="drawer__tools">' +
            '<button class="lab2-mini" type="button" id="tNewFile">' + ICON.plus + " File</button>" +
            '<button class="lab2-mini" type="button" id="tNewFolder">' + ICON.plus + " Folder</button>" +
            '<button class="lab2-mini" type="button" id="tRename">Rename</button>' +
            '<button class="lab2-mini" type="button" id="tDelete">' + ICON.trash + " Delete</button>" +
            '<button class="lab2-mini" type="button" id="tDownload">' + ICON.down + " Download</button>" +
          "</div>" +
          '<div class="tree" id="treeHost"></div>' +
          '<div class="drawer__hist" id="histHost"></div>' +
          '<div class="drawer__foot">Saved in this browser only (localStorage). Nothing is uploaded.</div>' +
        "</div>" +
      "</div>";
    }

    /* ---------------------------------------------------------- paint */

    function paintBanner() {
      var l = lang();
      var bits = ["<b>" + esc(l.label) + "</b> &middot; " + esc(l.version)];
      if (l.engine === "judge0") {
        var url = readConfig().judge0Url || JUDGE0_URL;
        bits.push("compiled and run in an isolated container on <code>" + esc(url) +
                  "</code>, so the source is uploaded to that service");
      } else if (l.engine === "pyodide") {
        bits.push("runs on CPython " + esc(l.version) +
                  " compiled to WebAssembly inside a sandboxed worker; nothing is uploaded");
      } else if (l.engine === "web") {
        bits.push("rendered in a sandboxed iframe");
      } else {
        bits.push("runs in a sandboxed Web Worker; nothing is uploaded");
      }
      els.banner.innerHTML = bits.join(" &middot; ");
    }

    function paintFileMeta() {
      var f = activeFile();
      if (!f) {
        els.fileName.textContent = "Untitled";
        els.fileMeta.textContent = "";
        return;
      }
      els.fileName.textContent = f.name;
      var l = L[f.lang] || lang();
      els.fileMeta.textContent = l.label + " | created " +
        new Date(f.created).toLocaleDateString() + " | modified " +
        new Date(f.modified).toLocaleDateString();
    }

    function treeHtml(node, depth) {
      var kids = node.children || [];
      if (node.id === "root" && !kids.length) {
        return '<div class="tree__empty">No files yet. Use New file to add one.</div>';
      }
      return kids.map(function (child) {
        var pad = 8 + depth * 14;
        if (child.type === "folder") {
          return '<div class="tree__folder">' +
            '<button class="tree__row tree__row--folder" type="button" data-toggle="' + child.id + '"' +
              ' style="padding-left:' + pad + 'px" aria-expanded="' + (!!child.open) + '">' +
              '<span class="tree__caret">' + (child.open ? "&#9662;" : "&#9656;") + "</span>" +
              "<span>" + esc(child.name) + "</span>" +
            "</button>" +
            (child.open ? '<div class="tree__kids">' + treeHtml(child, depth + 1) + "</div>" : "") +
          "</div>";
        }
        var ext = (L[child.lang] && L[child.lang].ext) || "txt";
        return '<button class="tree__row tree__row--file' +
          (child.id === state.fileId ? " is-active" : "") +
          '" type="button" data-open="' + child.id + '" style="padding-left:' + (pad + 16) + 'px">' +
          '<span class="tree__ext">' + esc(ext) + "</span>" +
          "<span>" + esc(child.name) + "</span>" +
        "</button>";
      }).join("");
    }

    function paintTree() {
      els.tree.innerHTML = treeHtml(store.root, 0);
      var f = activeFile();
      var versions = (f && f.versions) ? f.versions : [];
      els.hist.innerHTML = versions.length
        ? "<span>Version history</span>" + versions.slice().reverse().map(function (v, i) {
            var real = versions.length - 1 - i;
            return '<button class="lab2-mini" type="button" data-version="' + real + '">' +
              new Date(v.at).toLocaleString() + "</button>";
          }).join("")
        : "";
    }

    /* ---------------------------------------------------------- console */

    function clearFigs() { els.figs.innerHTML = ""; }

    function setIdle(msg) {
      els.console.innerHTML = '<div class="lab2-console__idle">' + esc(msg) + "</div>";
      els.runMeta.textContent = "";
      clearFigs();
      els.preview.hidden = true;
      els.preview.innerHTML = "";
    }

    function consoleBlock(title, body, kind) {
      return '<div class="lab2-block lab2-block--' + kind + '">' +
        '<div class="lab2-block__head">' + esc(title) + "</div>" +
        '<pre class="lab2-block__body">' + esc(body) + "</pre>" +
      "</div>";
    }

    function tablesHtml(tables) {
      return (tables || []).map(function (t) {
        var head = "<tr>" + (t.columns || []).map(function (c) {
          return "<th>" + esc(c) + "</th>";
        }).join("") + "</tr>";
        var body = (t.rows || []).map(function (row) {
          return "<tr>" + row.map(function (v) { return "<td>" + esc(v) + "</td>"; }).join("") + "</tr>";
        }).join("");
        return '<div class="lab2-table-wrap"><table class="lab2-table"><thead>' + head +
          "</thead><tbody>" + (body || "<tr><td>(no rows)</td></tr>") + "</tbody></table></div>";
      }).join("");
    }

    function showResult(r) {
      var html = "";
      var ok = r.ok !== false;

      if (r.compile && r.compileFailed) html += consoleBlock("Compilation error", r.compile, "err");
      if (r.stderr && r.stderr.trim()) html += consoleBlock("Error", r.stderr.replace(/\s+$/, ""), "err");
      if (r.stdout && r.stdout.trim()) html += consoleBlock("Output", r.stdout.replace(/\s+$/, ""), "out");
      if (r.value) html += consoleBlock("Result", r.value, "out");
      if (!ok && !r.stderr && !r.compile && !r.stdout) {
        html += consoleBlock("Error",
          "The program finished with status " + (r.status || "unknown") + ".", "err");
      }
      var hasRich = (r.html && r.html.length) || (r.tables && r.tables.length) ||
(r.plots && r.plots.length) || !!r.preview;
if (!html && !hasRich) html = '<div class="lab2-console__idle">Program executed successfully (no output).</div>';

      /* Jupyter-style rich output, e.g. a DataFrame rendered as a table. */
      if (r.html && r.html.length) {
        var safe = sanitizeHtml(r.html.join(""));
        if (safe) html += '<div class="lab2-richtext">' + safe + "</div>";
      }
      html += tablesHtml(r.tables);

      els.console.innerHTML = html;

      var meta = [];
      if (r.time != null) meta.push("Execution time: " + r.time.toFixed(2) + " s");
      if (r.memory != null) meta.push("Memory: " + Math.round(r.memory) + " KB");
      if (r.status) meta.push(r.status);
      meta.push(ok ? "Program executed successfully." : "Program failed.");
      els.runMeta.textContent = meta.join(" | ");

      clearFigs();
      if (r.plots && r.plots.length) {
        els.figs.innerHTML = r.plots.map(function (b64) {
          return '<figure class="lab2-fig"><img alt="Plot produced by the program" ' +
            'src="data:image/png;base64,' + b64 + '"></figure>';
        }).join("");
      }

      if (r.preview) {
        els.preview.hidden = false;
        var f = document.createElement("iframe");
        f.className = "lab2-preview__frame";
        f.setAttribute("sandbox", "allow-scripts");
        f.setAttribute("title", "Rendered preview");
        f.srcdoc = r.preview;
        els.preview.innerHTML = "";
        els.preview.appendChild(f);
      }

      var errText = (r.stderr || "") + "\n" + (r.compile || "");
      if (editor) {
        if (errText.trim()) editor.setErrors(findErrorLines(errText));
        else editor.clearErrors();
      }
    }

    function showError(err) {
      els.console.innerHTML = consoleBlock("Error", String((err && err.message) || err), "err");
      els.runMeta.textContent = "Program failed.";
      if (editor) editor.clearErrors();
    }

    /* ---------------------------------------------------------- run */

    function setRunning(on) {
      state.running = on;
      els.runBtn.disabled = on;
      els.stopBtn.hidden = !on;
      els.runBtn.innerHTML = on ? ICON.stop + " Running" : ICON.play + " Run code";
    }

    function run() {
      if (state.running) return;
      var l = lang();
      var code = currentCode();
      var stdin = els.stdinBox.value;

      if (!code.trim()) { showError(new Error("Write some code first.")); return; }

      setRunning(true);
      els.console.innerHTML = '<div class="lab2-console__idle">Running</div>';
      els.runMeta.textContent = "";
      if (editor) editor.clearErrors();

      var eng = engineFor(l);
      var p = (l.id === "sql") ? eng.sql(code) : eng.run(code, stdin, l.id);

      Promise.resolve(p).then(showResult).catch(showError).then(function () {
        setRunning(false);
      });
    }

    function stop() {
      killPythonWorker();
      setRunning(false);
      els.console.innerHTML = consoleBlock("Stopped",
        "Execution was cancelled and the runtime was shut down. " +
        "Press Run code to start a fresh one.", "err");
      els.runMeta.textContent = "Cancelled.";
    }

    /* ---------------------------------------------------------- notebook */

    function newNotebook() {
      return { cells: [
        { id: uid(), code: "import numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\n\nprint(\"Data science stack ready\")" },
        { id: uid(), code: "marks = [78, 85, 90, 62, 95, 88]\ndf = pd.DataFrame({\"Marks\": marks})\ndf" }
      ]};
    }

    function renderNotebook() {
      if (!state.notebook) state.notebook = newNotebook();
      var host = els.notebookHost;

      host.innerHTML =
        '<div class="nb__bar">' +
          '<span class="nb__title">Python Notebook</span>' +
          '<span class="nb__spacer"></span>' +
          '<button class="btn btn--run" type="button" id="nbRunAll">' + ICON.play + " Run all</button>" +
          '<button class="btn btn--ghost" type="button" id="nbAddCell">' + ICON.plus + " Add cell</button>" +
          '<button class="btn btn--ghost" type="button" id="nbSaveNb">' + ICON.save + " Save</button>" +
          '<button class="btn btn--ghost" type="button" id="nbClearOut">Clear output</button>' +
        "</div>" +
        state.notebook.cells.map(function (c, i) {
          return '<div class="cell" data-cell="' + c.id + '">' +
            '<div class="cell__head">' +
              '<span class="cell__n">Cell ' + (i + 1) + "</span>" +
              '<span class="nb__spacer"></span>' +
              '<button class="lab2-mini lab2-mini--run" type="button" data-runcell="' + i + '">' +
                ICON.play + " Run</button>" +
              '<button class="lab2-mini" type="button" data-movecell="' + i + '" data-dir="-1" ' +
                'title="Move up" aria-label="Move cell up">&#8593;</button>' +
              '<button class="lab2-mini" type="button" data-movecell="' + i + '" data-dir="1" ' +
                'title="Move down" aria-label="Move cell down">&#8595;</button>' +
              '<button class="lab2-mini" type="button" data-delcell="' + i + '" ' +
                'title="Delete cell" aria-label="Delete cell">&#215;</button>' +
            "</div>" +
            '<div class="cell__ed" id="cellHost_' + i + '"></div>' +
            '<div class="cell__out" id="cellOut_' + i + '"></div>' +
          "</div>";
        }).join("");

      state.notebook.cells.forEach(function (c, i) {
        var h = document.getElementById("cellHost_" + i);
        if (!h) return;
        createEditor(h, {
          lang: L.python,
          ariaLabel: "Notebook cell " + (i + 1),
          onChange: function (v) { state.notebook.cells[i].code = v; },
          onRun: function () { runCell(i); }
        });
      });

      host.addEventListener("click", function (e) {
        var run = e.target.closest("[data-runcell]");
        var del = e.target.closest("[data-delcell]");
        var mv = e.target.closest("[data-movecell]");
        if (run) {
          runCell(parseInt(run.getAttribute("data-runcell"), 10));
        } else if (del) {
          state.notebook.cells.splice(parseInt(del.getAttribute("data-delcell"), 10), 1);
          if (!state.notebook.cells.length) state.notebook.cells.push({ id: uid(), code: "" });
          renderNotebook();
        } else if (mv) {
          var mi = parseInt(mv.getAttribute("data-movecell"), 10);
          var dir = parseInt(mv.getAttribute("data-dir"), 10);
          var arr = state.notebook.cells;
          var to = mi + dir;
          if (to >= 0 && to < arr.length) {
            var tmp = arr[mi];
            arr[mi] = arr[to];
            arr[to] = tmp;
            renderNotebook();
          }
        }
      });

      var runAll = document.getElementById("nbRunAll");
      if (runAll) runAll.addEventListener("click", runAllCells);
      var addCell = document.getElementById("nbAddCell");
      if (addCell) addCell.addEventListener("click", function () {
        state.notebook.cells.push({ id: uid(), code: "" });
        renderNotebook();
      });
      var clearOut = document.getElementById("nbClearOut");
      if (clearOut) clearOut.addEventListener("click", function () {
        state.notebook.cells.forEach(function (c, i) {
          var o = document.getElementById("cellOut_" + i);
          if (o) o.innerHTML = "";
        });
      });
      var saveNb = document.getElementById("nbSaveNb");
      if (saveNb) saveNb.addEventListener("click", saveNotebook);
    }

    function runCell(i) {
      var cell = state.notebook.cells[i];
      var out = document.getElementById("cellOut_" + i);
      if (!out) return;

      if (state.running) { out.innerHTML = '<div class="lab2-console__idle">Wait for the current cell to finish.</div>'; return; }
      if (!cell.code.trim()) { out.innerHTML = '<div class="lab2-console__idle">Empty cell.</div>'; return; }

      setRunning(true);
      out.innerHTML = '<div class="lab2-console__idle">Running</div>';

      Engines.pyodide.run(cell.code, els.stdinBox.value, i)
        .then(function (r) {
          var html = "";
          if (r.stderr && r.stderr.trim()) html += consoleBlock("Error", r.stderr.replace(/\s+$/, ""), "err");
          if (r.stdout && r.stdout.trim()) html += consoleBlock("Output", r.stdout.replace(/\s+$/, ""), "out");
          if (r.value) html += consoleBlock("Result", r.value, "out");
          if (!html) html = '<div class="lab2-console__idle">Ran with no output.</div>';
          if (r.html && r.html.length) {
            var safeHtml = sanitizeHtml(r.html.join(""));
            if (safeHtml) html += '<div class="lab2-richtext">' + safeHtml + "</div>";
          }
          if (r.plots && r.plots.length) {
            html += r.plots.map(function (b64) {
              return '<figure class="lab2-fig"><img alt="Plot" src="data:image/png;base64,' + b64 + '"></figure>';
            }).join("");
          }
          var meta = "Execution time: " + (r.time != null ? r.time.toFixed(2) + " s" : "n/a");
          out.innerHTML = html + '<div class="cell__meta">' + esc(meta) + "</div>";
        })
        .catch(function (err) {
          out.innerHTML = consoleBlock("Error", String((err && err.message) || err), "err");
        })
        .then(function () { setRunning(false); });
    }

    function runAllCells() {
      var i = 0;
      function next() {
        if (i >= state.notebook.cells.length) return;
        var idx = i++;
        runCell(idx);
        var wait = setInterval(function () {
          if (!state.running) { clearInterval(wait); next(); }
        }, 100);
      }
      next();
    }

    /* ---------------------------------------------------------- files */

    function pushVersion(f) {
      if (!f.versions) f.versions = [];
      f.versions.push({ at: Date.now(), code: f.code || "" });
      if (f.versions.length > MAX_VERSIONS) {
        f.versions.splice(0, f.versions.length - MAX_VERSIONS);
      }
    }

    function save() {
      var f = activeFile();
      if (!f) { saveAs(); return; }
      pushVersion(f);
      f.code = currentCode();
      f.modified = Date.now();
      persist();
      paintFileMeta();
      paintTree();
      toast("Saved " + f.name);
    }

    function saveNotebook() {
      var f = activeFile();
      var src = state.notebook.cells.map(function (c) { return c.code; }).join("\n\n");
      if (f) {
        pushVersion(f);
        f.code = src;
        f.modified = Date.now();
        if (!/\.(py|ipynb|txt)$/i.test(f.name)) f.name = f.name.replace(/\.[^.]+$/, "") + ".py";
        persist();
        paintFileMeta();
        paintTree();
        toast("Saved " + f.name);
      } else {
        saveAs(src, "notebook.py");
      }
    }

    function saveAs(presetCode, presetName) {
      var l = lang();
      ask({ title: "Save as", value: presetName || ("untitled." + l.ext), ok: "Save" })
        .then(function (name) {
      if (!name) return;
      name = String(name).trim();
      if (!name) return;

      var langId = state.langId;
      var dot = name.lastIndexOf(".");
      if (dot > 0) {
        var given = name.slice(dot + 1).toLowerCase();
        var match = ORDER.filter(function (id) { return L[id].ext === given; })[0];
        if (match) langId = match;
      }

      var now = Date.now();
      var file = {
        id: uid(), type: "file", name: name, lang: langId,
        code: presetCode != null ? presetCode : currentCode(),
        created: now, modified: now, versions: []
      };

      /* drop it into the folder named after its language, when one exists */
      var target = (store.root.children || []).filter(function (f) {
        return f.type === "folder" && f.name === (L[langId] || {}).label;
      })[0];

      if (target) { target.open = true; target.children.push(file); }
      else store.root.children.push(file);

      state.fileId = file.id;
      store.activeId = file.id;
      state.langId = langId;
      persist();
      openFile(file.id);
      toast("Saved " + name);
        });
    }

    function rename() {
      var f = activeFile();
      if (!f) { toast("Open a file first"); return; }
      ask({ title: "Rename file", value: f.name, ok: "Rename" }).then(function (name) {
      if (!name || name === f.name) return;
      name = String(name).trim();
      if (!name) return;
      f.name = name;
      f.modified = Date.now();
      persist();
      paintFileMeta();
      paintTree();
      toast("Renamed to " + name);
      });
    }

    function del() {
      var f = activeFile();
      if (!f) { toast("Open a file first"); return; }
      ask({
        title: "Delete file",
        message: "Delete " + f.name + "? This cannot be undone.",
        ok: "Delete", cancel: "Keep", kind: "danger"
      }).then(function (yes) {
      if (!yes) return;
      removeNode(store.root, f.id);
      state.fileId = null;
      store.activeId = null;
      persist();
      if (editor) editor.value = "";
      paintFileMeta();
      paintTree();
      toast("Deleted " + f.name);
      });
    }

    function download() {
      var f = activeFile();
      if (!f) { toast("Open a file first"); return; }
      var blob = new Blob([currentCode()], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast("Downloaded " + f.name);
    }

    function newFile() {
      var l = lang();
      ask({ title: "New file", value: "untitled." + l.ext, ok: "Create" }).then(function (name) {
      if (!name) return;
      name = String(name).trim();
      if (!name) return;
      var now = Date.now();
      var file = {
        id: uid(), type: "file", name: name, lang: state.langId,
        code: SAMPLES[state.langId] || "",
        created: now, modified: now, versions: []
      };
      store.root.children.push(file);
      state.fileId = file.id;
      store.activeId = file.id;
      persist();
      paintTree();
      openFile(file.id);
      toast("Created " + name);
      });
    }

    function newFolder() {
      ask({ title: "New folder", value: "New folder", ok: "Create" }).then(function (name) {
      if (!name) return;
      name = String(name).trim();
      if (!name) return;
      store.root.children.push({ id: uid(), type: "folder", name: name, open: true, children: [] });
      persist();
      paintTree();
      toast("Created folder " + name);
      });
    }

    function restoreVersion(at) {
      var f = activeFile();
      if (!f || !f.versions || !f.versions[at]) return;
      var v = f.versions[at];
      ask({
        title: "Restore version",
        message: "Restore the version saved on " + new Date(v.at).toLocaleString() + "?",
        ok: "Restore", kind: "danger"
      }).then(function (yes) {
      if (!yes) return;
      if (editor) editor.value = v.code;
      f.code = v.code;
      persist();
      paintFileMeta();
      toast("Version restored");
      });
    }

    /* ---------------------------------------------------------- open */

    function setMode(mode) {
      state.mode = mode;
      var isNb = mode === "notebook";
      els.modeCode.classList.toggle("is-on", !isNb);
      els.modeNotebook.classList.toggle("is-on", isNb);
      els.editorPanel.hidden = isNb;
      els.notebookHost.hidden = !isNb;
      if (isNb) renderNotebook();
    }

    function openFile(id) {
      var hit = findNode(store.root, id);
      if (!hit || hit.node.type !== "file") return;

      state.fileId = id;
      store.activeId = id;
      state.langId = hit.node.lang || "python";
      persist();

      if (editor) {
        editor.setLang(L[state.langId]);
        editor.value = hit.node.code || "";
        editor.clearErrors();
      }
      els.langSelect.value = state.langId;
      els.stdinBox.value = STDIN_DEFAULT[state.langId] || "";

      els.modeNotebook.disabled = !lang().notebook;
      if (!lang().notebook && state.mode === "notebook") setMode("code");

      setIdle("Ready. Press Run code.");
      paintBanner();
      paintFileMeta();
      paintTree();
    }

    function buildEditor() {
      els.editorHost.innerHTML = "";
      editor = createEditor(els.editorHost, {
        lang: lang(),
        ariaLabel: "Code editor",
        onChange: markModified,
        onRun: run,
        onSave: save
      });
      editorWrap = editor.el;
    }

    /* ---------------------------------------------------------- wire */

    host.innerHTML = drawerHtml() + shellHtml();

    els = {
      banner: host.querySelector("#lab2Banner"),
      langSelect: host.querySelector("#langSelect"),
      modeCode: host.querySelector("#modeCode"),
      modeNotebook: host.querySelector("#modeNotebook"),
      runBtn: host.querySelector("#runBtn"),
      stopBtn: host.querySelector("#stopBtn"),
      saveBtn: host.querySelector("#saveBtn"),
      saveAsBtn: host.querySelector("#saveAsBtn"),
      fileMenuBtn: host.querySelector("#fileMenuBtn"),
      fmtBtn: host.querySelector("#fmtBtn"),
      copyBtn: host.querySelector("#copyBtn"),
      clearBtn: host.querySelector("#clearBtn"),
      editorPanel: host.querySelector("#editorPanel"),
      editorHost: host.querySelector("#editorHost"),
      notebookHost: host.querySelector("#notebookHost"),
      stdinBox: host.querySelector("#stdinBox"),
      console: host.querySelector("#console"),
      runMeta: host.querySelector("#runMeta"),
      figs: host.querySelector("#figs"),
      preview: host.querySelector("#preview"),
      fileName: host.querySelector("#fileName"),
      fileMeta: host.querySelector("#fileMeta"),
      tree: host.querySelector("#treeHost"),
      hist: host.querySelector("#histHost"),
      drawer: host.querySelector("#drawer")
    };

    buildEditor();

    els.runBtn.addEventListener("click", function () {
      if (state.running) stop(); else run();
    });
    els.stopBtn.addEventListener("click", stop);
    els.saveBtn.addEventListener("click", save);
    els.saveAsBtn.addEventListener("click", function () { saveAs(); });
    els.fmtBtn.addEventListener("click", function () {
      if (editor) { editor.format(); toast("Code reformatted"); }
    });
    els.copyBtn.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentCode()).then(
          function () { toast("Code copied to clipboard"); },
          function () { toast("The browser blocked clipboard access"); }
        );
      } else {
        toast("Clipboard is unavailable in this browser");
      }
    });
    els.clearBtn.addEventListener("click", function () {
      if (state.mode === "notebook") {
        state.notebook = { cells: [{ id: uid(), code: "" }] };
        renderNotebook();
      } else if (editor) {
        editor.value = "";
        markModified();
      }
    });
    host.querySelector("#clearOutBtn").addEventListener("click", function () {
      setIdle("Output cleared.");
    });

    els.langSelect.addEventListener("change", function () {
      var id = els.langSelect.value;
      state.langId = id;
      els.stdinBox.value = STDIN_DEFAULT[id] || "";
      if (editor) editor.setLang(L[id]);
      els.modeNotebook.disabled = !L[id].notebook;
      if (!L[id].notebook && state.mode === "notebook") setMode("code");
      if (state.mode === "notebook") renderNotebook();
      paintBanner();
      setIdle("Ready. Press Run code.");
    });

    els.modeCode.addEventListener("click", function () { setMode("code"); });
    els.modeNotebook.addEventListener("click", function () { setMode("notebook"); });

    els.fileMenuBtn.addEventListener("click", function () {
      els.drawer.hidden = !els.drawer.hidden;
    });
    host.querySelector("#drawerClose").addEventListener("click", function () {
      els.drawer.hidden = true;
    });
    host.querySelector("#tNewFile").addEventListener("click", newFile);
    host.querySelector("#tNewFolder").addEventListener("click", newFolder);
    host.querySelector("#tRename").addEventListener("click", rename);
    host.querySelector("#tDelete").addEventListener("click", del);
    host.querySelector("#tDownload").addEventListener("click", download);

    els.tree.addEventListener("click", function (e) {
      var tog = e.target.closest("[data-toggle]");
      var op = e.target.closest("[data-open]");
      if (tog) {
        var hit = findNode(store.root, tog.getAttribute("data-toggle"));
        if (hit) { hit.node.open = !hit.node.open; persist(); paintTree(); }
      } else if (op) {
        openFile(op.getAttribute("data-open"));
      }
    });

    els.hist.addEventListener("click", function (e) {
      var vb = e.target.closest("[data-version]");
      if (vb) restoreVersion(parseInt(vb.getAttribute("data-version"), 10));
    });

    /* Hand-off from an experiment page: open the carried snippet, without duplicating it. */
    var carriedOk = false;
    if (opts && opts.code) {
      var carried = String(opts.code);
      var label = String(opts.name || "snippet").replace(/[^A-Za-z0-9._-]+/g, " ").trim().slice(0, 40) || "snippet";
      var matchId = null;
      (function scan(n) {
        if (matchId) return;
        var kids = n.children || [];
        for (var i = 0; i < kids.length; i++) {
          if (kids[i].type === "file") {
            if (kids[i].code === carried) { matchId = kids[i].id; return; }
          } else { scan(kids[i]); }
        }
      })(store.root);
      if (matchId) {
        openFile(matchId);
      } else {
        var stamp = Date.now();
        var scratch = {
          id: uid(), type: "file", name: label + ".py", lang: "python",
          code: carried, created: stamp, modified: stamp, versions: []
        };
        store.root.children = store.root.children || [];
        store.root.children.push(scratch);
        store.activeId = scratch.id;
        persist();
        paintTree();
        openFile(scratch.id);
      }
      carriedOk = true;
    }

    /* restore the last open file, else seed with the Python sample */
    if (!carriedOk && state.fileId && findNode(store.root, state.fileId)) {
      openFile(state.fileId);
    } else if (!carriedOk) {
      var pyFolder = (store.root.children || []).filter(function (f) {
        return f.type === "folder" && f.name === "Python";
      })[0];
      var pyFile = pyFolder && pyFolder.children && pyFolder.children[0];
      if (pyFile) openFile(pyFile.id);
      else { paintBanner(); paintFileMeta(); paintTree(); setIdle("Ready. Press Run code."); }
    }

    /* Preload the Python runtime so the first Run is not a long download. */
    if (lang().engine === "pyodide") {
      setTimeout(function () { Engines.pyodide.warm().catch(function () {}); }, 500);
    }
  }

  /* ===================================================================
     EXPORT
     =================================================================== */

  global.DSCodeLab = {
    mount: mount,
    languages: ORDER.map(function (id) {
      return { id: L[id].id, label: L[id].label, ext: L[id].ext,
               version: L[id].version, engine: L[id].engine };
    })
  };

})(typeof window !== "undefined" ? window : globalThis);