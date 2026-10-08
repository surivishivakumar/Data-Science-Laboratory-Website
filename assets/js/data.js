/*==========================================================================
  DIGITAL LABORATORY
  ----------------------------------------------------------------------
  THIS IS THE ONLY FILE YOU NEED TO EDIT FOR CONTENT.
  Every piece of text, link, video and code shown on the website is
  read from this file. Nothing is hard-coded inside the UI.

  HOW TO UPDATE:
    1. STUDENT      -> change photo / name / id / section / faculty / profession
    2. SUBJECT CODE -> change labMeta.subjectCode
    3. EXPERIMENTS   -> edit or append objects in the `experiments` array
    4. SECTIONS     -> the `sections` array of any experiment. Add or remove
                        freely; the website renders however many you define.
    5. VIDEOS       -> drop .mp4 files into assets/videos/ using the exact
                        filenames listed in assets/videos/README.txt
    6. CODE         -> replace the `code` string for any section
    7. MODULES      -> the `modules` array maps the syllabus to experiments
    8. TOOLS        -> the `tools` array lists libraries the experiments use

  After editing, just refresh the browser. No build step, no server needed.
==========================================================================*/

/* -------------------------------------------------------------------------
   1. LABORATORY BRANDING
   ------------------------------------------------------------------------- */
var laboratory = {
  name: "Digital Laboratory",
  tagline: "Digital Laboratory",
  address: "SREE SAINATH NAGAR, A. RANGAMPETA, TIRUPATI - 517102"
};

var labMeta = {
  subjectCode: "22DS102006",   // Digital Laboratory
  academicYear: "2025 - 2026",
  department: "Department of Computer Science & Engineering",
  copyrightYear: "2026",
  footerNote: "Laboratory records are for academic use."
};

/* -------------------------------------------------------------------------
   2. STUDENT DETAILS  (shown on the ID card, right side of page 1)
   photo accepts a file path OR leave it empty "" to keep the placeholder.
   ------------------------------------------------------------------------- */
var student = {
  "photo": "assets/img/student-photo.jpg",
  "name": "Surivi Shiva Kumar",
  "idNumber": "24102A030120",
  "section": "CSE-DS-2",
  "faculty": "S. Bosu Babu",
  "profession": "Assistant Professor",
  "email": "",
  "phone": ""
};

/* -------------------------------------------------------------------------
   2b. SOCIAL / PROFILE LINKS
   -------------------------------------------------------------------------
   Shown as the three small circular icons on the Student Card (and in the
   site footer). Leave a URL as "" to keep that icon inactive; fill it in
   from the Edit Student Card dialog to make it a live link.

   githubUrl / linkedinUrl / instagramUrl expect the full profile address,
   for example "https://www.linkedin.com/in/your-handle/"
   ------------------------------------------------------------------------- */
var social = {
  githubUrl: "https://github.com/surivishivakumar",
  githubLabel: "surivishivakumar",
  linkedinUrl: "",                  // paste the full LinkedIn profile URL here
  linkedinLabel: "Shiva kumar Surivi",
  instagramUrl: "",                 // paste the full Instagram profile URL here
  instagramLabel: "",
  email: ""                         // optional, e.g. "you@example.com"
};

/* -------------------------------------------------------------------------
   3. EXPERIMENTS
   -------------------------------------------------------------------------
   Each experiment supports:
     id             unique number shown as "Experiment <id>"
     name           title used by search and across every page
     tagline        one-line description shown on the preview card
     previewVideo   10 second hover preview, played on mouse-over
     youtubeVideo   YouTube ID (e.g. "dQw4w9WgXcQ") or a full URL
     youtubeLink    full watch URL, shown as a clickable link
     githubLink     repository URL, shown as a clickable link
     summary        the "Summary of Experiment" paragraph
     sections       A / B / C ... any number of parts, any letters

   Each section supports:
     id          short url-safe key used in the address bar
     letter      the label shown in the UI ("A", "B", "B(i)" ...)
     title       short descriptive title
     video       path to that part's screen-recording
     code        the source code, shown with line numbers and highlighting
     outputImage optional image of the plotted output, shown under the video
   ------------------------------------------------------------------------- */

var experiments = [
  {
    "id": 1,
    "name": "Import and Export in CSV, JSON and Excel Formats",
    "tagline": "Creating a DataFrame and persisting it to CSV, JSON and Excel with pandas.",
    "previewVideo": "assets/videos/exp1-preview.mp4",
    "youtubeVideo": "",
    "youtubeLink": "",
    "githubLink": "",
    "summary": "This experiment demonstrates how tabular data is created in Python and persisted back out again using pandas. A Student DataFrame is built from a Python dictionary and inspected with `print()`, `head()` and `shape` to confirm its structure and row count. The same DataFrame is then written three different ways. It is exported to a CSV file with `to_csv()` and read back with `read_csv()` to confirm the round trip preserved the data. Next it is written to a JSON file using `to_json()` with record orientation and pretty indentation, and verified with `read_json()`. Finally it is saved as an Excel workbook with `to_excel()` using a named sheet, and reloaded with `read_excel()`. The practical outcome is an understanding of which pandas function to use for each of the three most common flat-file formats, and how the `orient`, `index` and `sheet_name` arguments change the stored result.",
    "sections": [
      {
        "id": "a",
        "letter": "A",
        "title": "Creating a DataFrame and writing it to CSV",
        "youtubeVideo": "",
        "video": "assets/videos/exp1-a.mp4",
        "code": "import pandas as pd\n\nstudents={\n    \"Name\":[\"shiva\",\"Jai simha\",\"harsha\"],\n    \"Roll_no\":[120,110,74],\n    \"Dept\":[\"DS\",\"AIML\",\"CSE\"]\n}\ndf=pd.DataFrame(students)\nprint(df)\nprint(\"\\n\")\nprint(df.head(2))\nprint(\"\\n\")\nprint(df.shape)\n\ndf.to_csv(\"StudentOutputs.csv\",index=False)\nprint(\"CSV file created\")\n\ndf2 = pd.read_csv(\"StudentOutputs.csv\")\nprint(df2)",
        "notes": "WHAT THIS DOES\nBuilds a DataFrame from a Python dict of three\nstudents, inspects it, saves it as CSV, then reads\nthe CSV back to prove the round trip works.\n\nKEY POINTS\n- pd.DataFrame(dict) turns column lists into a table\n- print(df) shows every row; head(2) shows the first 2\n- df.shape returns (rows, columns) -> (3, 3)\n- to_csv(..., index=False) leaves out the row numbers\n- read_csv parses the text file back into a DataFrame\n\nWATCH OUT\n- index=False matters: without it each read/write\n  cycle grows an unnamed first column\n- df2 is a NEW DataFrame, not the same object as df",
        "outputImage": ""
      },
      {
        "id": "b",
        "letter": "B",
        "title": "Exporting and reading a JSON file",
        "youtubeVideo": "",
        "video": "assets/videos/exp1-b.mp4",
        "code": "df2.to_json(\n    \"Student.json\",\n    orient=\"records\",\n    indent=4\n)\nprint(\"JSON file created\")\n\ndf3=pd.read_json(\"Student.json\")\nprint(df3)",
        "notes": "WHAT THIS DOES\nWrites the DataFrame from part A to JSON, reads it\nback, and shows the two orientations you will meet.\n\nKEY POINTS\n- orient='records' -> one JSON object per row\n- orient='columns' would nest the data by column\n- indent=4 makes the saved file readable to humans\n- read_json recovers the column names on the way back\n- this part reuses df2, so part A must run first\n\nWATCH OUT\n- JSON keeps the index unless you use orient='table'\n- to_json writes no type tags, so a column of ids can\n  come back as text rather than numbers\n- Sections run in order: A creates df2, B needs it",
        "outputImage": ""
      },
      {
        "id": "c",
        "letter": "C",
        "title": "Exporting and reading an Excel workbook",
        "youtubeVideo": "",
        "video": "assets/videos/exp1-c.mp4",
        "code": "df3.to_excel(\n    \"Student.xlsx\",\n    sheet_name=\"Student Details\",\n    index=False\n)\nprint(\"Excel file created\")\n\ndf4 = pd.read_excel(\n    \"Student.xlsx\",\n    sheet_name=\"Student Details\"\n)\nprint(df4)",
        "notes": "WHAT THIS DOES\nSaves the DataFrame from part B as a real .xlsx\nworkbook and reads it back from a named sheet.\n\nKEY POINTS\n- sheet_name='Student Details' names the worksheet tab\n- read_excel needs the same sheet_name to find it\n- index=False keeps row numbers out of the sheet\n- an xlsx file is a zip archive of XML, not plain text\n\nWATCH OUT\n- xlsx needs a real engine behind it. This lab\n  supplies one in the browser - see the README for the\n  exact limits\n- Sections run in order: B creates df3, C needs it",
        "outputImage": ""
      }
    ]
  },
  {
    "id": 2,
    "name": "Web Data, APIs and SQL Integration",
    "tagline": "Pulling live data from a REST API and working with a SQLite database.",
    "previewVideo": "assets/videos/exp2-preview.mp4",
    "youtubeVideo": "",
    "youtubeLink": "",
    "githubLink": "",
    "summary": "This experiment covers the two common ways real data reaches a Data Science workflow. Part A uses the `requests` library to call the public GitHub REST API for the pandas repository, prints the HTTP status code to confirm the request succeeded, and parses the returned JSON payload into a pandas DataFrame so the response can be inspected like any other table. Part B moves to local storage: a SQLite database file is created with `sqlite3.connect()`, a table is defined and populated, rows are inserted, queried with `SELECT` and updated, and the results are finally loaded back into a pandas DataFrame for analysis. Together the two parts show the full path from a remote HTTP response and from a relational database into the pandas DataFrame that the rest of the course works with.",
    "sections": [
      {
        "id": "a",
        "letter": "A",
        "title": "Fetching live data from a REST API using Requests",
        "youtubeVideo": "",
        "video": "assets/videos/exp2-a.mp4",
        "code": "import requests\nimport pandas as pd\n\nurl = \"https://api.github.com/repos/pandas-dev/pandas/issues\"\nresponse=requests.get(url)\nprint(response.status_code)\nprint(response.text)\n\ndata = response.json()\nprint(type(data))\n\ndf = pd.DataFrame(data)\ndf.head()\n\nprint(df[[\"id\",\"url\",\"repository_url\"]].head())\nprint(df.head(5))",
        "notes": "WHAT THIS DOES\nCalls the public GitHub issues API, checks the HTTP\nstatus, then turns the returned JSON into a DataFrame.\n\nKEY POINTS\n- status_code 200 means the request succeeded\n- response.text is the raw body; .json() parses it\n- this endpoint returns a LIST of issue objects\n- pd.DataFrame(list) treats each item as one row\n- df[['id','url']] selects columns by name\n\nWATCH OUT\n- this part needs internet access; offline it fails\n- the API returns only the first page (30 items), so\n  the table is not the whole dataset\n- always check status_code before trusting .json()",
        "outputImage": ""
      },
      {
        "id": "b",
        "letter": "B",
        "title": "Creating and querying a SQLite database from Python",
        "youtubeVideo": "",
        "video": "assets/videos/exp2-b.mp4",
        "code": "import sqlite3\nimport pandas as pd\n\nconn=sqlite3.connect(\"Engineer.db\")\nprint(\"Database connected\")\n\ncurr=conn.cursor()\nprint(\"Cursor created\")\n\ncurr.execute(\"\"\"\nCREATE TABLE IF NOT EXISTS Engineers(\nid INTEGER PRIMARY KEY,\nname TEXT,\ndept TEXT,\nmarks MARKS\n)\n\"\"\")\nprint(\"Table created\")\n\ncurr.execute(\"\"\"\nINSERT INTO Engineers(id,name,dept,marks)\nVALUES(120,'shiva','CSE-DS',58)\n\"\"\")\nconn.commit()\nprint(\"Engineer inserted\")\n\ncurr.execute(\"\"\"\nINSERT INTO Engineers(id, name, dept, marks)\nVALUES(0, 'Bhuvan', 'AIML', 89)\n\"\"\")\n\nconn.commit()\n\nprint(\"Engineer inserted\")\n\ncurr.execute(\"\"\"\nINSERT INTO Engineers(id,name,dept,marks)\nVALUES(1,'surya','CSE',67)\n\"\"\")\nconn.commit()\nprint(\"Engineer inserted\")\n\ncurr.execute(\"SELECT * FROM  Engineers\")\nrows=curr.fetchall()\nprint(rows)\n\ndf=pd.DataFrame(rows,columns=[\"id\", \"name\", \"dept\", \"marks\"])\nprint(df)\n\ncurr.execute(\"\"\"\nUPDATE Engineers\nSET name='Surya'\nwhere id=2\n\"\"\")\nconn.commit()\nprint(\"Updated successfully\")\n\ndf=pd.DataFrame(rows,columns=[\"id\", \"name\", \"dept\", \"marks\"])\nprint(df)\n\ncurr.execute(\"\"\"\nDELETE FROM Engineers\nwhere id=1\n\"\"\")\nconn.commit()\nprint(\"Deleted succsessfully\")\n\ncurr.execute(\"SELECT * FROM Engineers\")\nrows=curr.fetchall()\nprint(rows)\n\ndf=pd.DataFrame(rows,columns=[\"id\", \"name\", \"dept\", \"marks\"])\nprint(df)",
        "notes": "WHAT THIS DOES\nCreates an SQLite database file, inserts three\nengineer rows, reads them back, then updates\nand deletes.\n\nKEY POINTS\n- sqlite3.connect('Engineer.db') creates the file\n- CREATE TABLE IF NOT EXISTS is safe to re-run\n- conn.commit() is required or the changes vanish\n- curr.fetchall() returns a list of tuples\n- pd.DataFrame(rows, columns=[...]) adds headings\n\nWATCH OUT\n- the UPDATE targets id=2, which was never inserted,\n  so it prints success but changes nothing\n- the DataFrame printed after UPDATE reuses the old\n  rows list, so it cannot show the update\n- never build SQL by string-formatting user input;\n  use parameter placeholders to avoid SQL injection",
        "outputImage": ""
      }
    ]
  },
  {
    "id": 3,
    "name": "Data Cleaning, Transformation and Regular Expressions",
    "tagline": "Handling missing values, encoding categories, detecting outliers and extracting text with regex.",
    "previewVideo": "assets/videos/exp3-preview.mp4",
    "youtubeVideo": "",
    "youtubeLink": "",
    "githubLink": "",
    "summary": "This experiment is about cleaning messy real-world data before analysis. Part A handles missing values: a DataFrame containing `NaN` is inspected with `isna()`, `notna()` and `sum()` to count what is missing, then the gaps are filled using `fillna()` and removed using `dropna()`, comparing the effect of each approach. Part B covers categorical encoding, converting string columns such as gender or department into numeric form with `map()` and `replace()` so they can be used by machine-learning models. Part C detects outliers in a small marks dataset using the interquartile range, computing `Q1` and `Q3` and filtering rows that fall outside the `1.5 x IQR` fences. Part D uses regular expressions, applying `re.findall()` to pull phone numbers and email addresses out of free text and `re.sub()` to clean and replace patterns. Each part ends with a short quick-reference table of the functions used.",
    "sections": [
      {
        "id": "a",
        "letter": "A",
        "title": "Finding and handling missing values",
        "youtubeVideo": "",
        "video": "assets/videos/exp3-a.mp4",
        "code": "import numpy as np\nimport pandas as pd\n\ndata={\n    'A':[1, 2, np.nan],\n    'B':[4, np.nan, np.nan]\n}\ndf=pd.DataFrame(data)\nprint(df)\n\nprint(df.isna())\n\ndata_clean=df.dropna()\nprint(data_clean)\n\ndata_filled = df.fillna(0)\nprint(data_filled)\n\nimport numpy as np\nimport pandas as pd\ndata={\n    \"A\":[1,5,np.nan,7,8],\n    \"B\":[9,np.nan,np.nan,4,3]\n}\ndf=pd.DataFrame(data)\nprint(df)\nprint(\"Finding missing values:\")\nprint(df.isna())\nprint(\"Remove missing rows:\")\nprint(df.dropna())\nprint(\"Replace missing values with 0:\")\nprint(df.fillna(0))",
        "notes": "WHAT THIS DOES\nCreates a table with holes in it, then finds and\nhandles those holes in three different ways.\n\nKEY POINTS\n- np.nan means 'not a number'; pandas shows it NaN\n- df.isna() returns True wherever a value is missing\n- dropna() removes any row containing a missing value\n- fillna(0) puts a value in the hole instead\n- a column becomes float dtype once NaN appears\n\nWATCH OUT\n- dropna() is harsh: one missing value deletes the\n  whole row\n- fillna(0) invents data. Prefer the mean or median,\n  or leave it missing, unless 0 is truly meaningful",
        "outputImage": ""
      },
      {
        "id": "b",
        "letter": "B",
        "title": "Data transformation and categorical encoding",
        "youtubeVideo": "",
        "video": "assets/videos/exp3-b.mp4",
        "code": "import pandas as pd\n\ndata={\n    \"Gender\":[\"male\",\"female\",\"female\",\"male\",\"female\",\"male\"]\n}\ndf=pd.DataFrame(data)\nprint(df)\n\ndf[\"Gender\"]=df[\"Gender\"].map({\n    \"male\":1,\n    \"female\":0\n})\nprint(df) # map() or replace\n\ndf[\"Gender\"]=df[\"Gender\"].replace({\n    \"male\":1,\n    \"female\":0\n})\nprint(df)\n\nimport pandas as pd\ndata={\n    \"Gender\":[\"female\",\"male\",\"male\",\"female\",\"male\"]\n}\ndf=pd.DataFrame(data)\nprint(df)\nprint(\"Replace with values:\")\ndf[\"Gender\"]=df[\"Gender\"].map({\n    \"male\":1,\n    \"female\":0\n})\nprint(df)",
        "notes": "WHAT THIS DOES\nTurns a text column into numbers so a model can use\nit, showing map() and replace() side by side.\n\nKEY POINTS\n- map() takes a dict and converts matching values\n- replace() does the same job with different syntax\n- values absent from the dict become NaN with map()\n- the result is int64, which models can consume\n- the order you map values in is the order they mean\n\nWATCH OUT\n- map() and replace() are NOT equivalent - map()\n  silently returns NaN for anything not in the dict\n- this part applies the mapping twice, so the second\n  block re-creates the DataFrame before remapping\n- a 0/1 encoding is a label, not a ranking",
        "outputImage": ""
      },
      {
        "id": "c",
        "letter": "C",
        "title": "Outlier detection using the IQR method",
        "youtubeVideo": "",
        "video": "assets/videos/exp3-c.mp4",
        "code": "import numpy as np\nimport pandas as pd\n\ndata={\n    \"Marks\":[10,32,43,64,23]\n}\ndf=pd.DataFrame(data)\nprint(df)\n\nQ1=df[\"Marks\"].quantile(0.25)\nQ3=df[\"Marks\"].quantile(0.75)\nIDR=Q3-Q1\nprint(IDR)\n\nlower=Q1-1.5*IDR\nupper=Q3+1.5*IDR\nprint(lower)\nprint(upper)\n\noutliers = df[(df[\"Marks\"]>lower) | (df[\"Marks\"]<upper)]\nprint(outliers)\n\nimport pandas as pd\ndata={\n    \"Marks\":[45, 54, 74, 82, 89, 200]\n}\ndf=pd.DataFrame(data)\nprint(df)\nQ1=df[\"Marks\"].quantile(0.25)\nQ3=df[\"Marks\"].quantile(0.75)\nprint(Q1)\nprint(Q3)\nIDR=Q3-Q1\nprint(\"IDR: \",IDR)\nlower=Q1-1.5*IDR\nupper=Q3+1.5*IDR\nprint(\"Lower: \",lower)\nprint(\"Upper: \",upper)\noutliers = df[\n    (df[\"Marks\"] < lower) |\n    (df[\"Marks\"] > upper)\n]\nprint(\"Outliers:\")\nprint(outliers)",
        "notes": "WHAT THIS DOES\nFinds outliers with the interquartile range rule:\nanything outside Q1 - 1.5*IQR to Q3 + 1.5*IQR.\n\nKEY POINTS\n- Q1 and Q3 are the 25th and 75th percentiles\n- IQR = Q3 - Q1, the spread of the middle half\n- the fences sit 1.5 * IQR beyond each quartile\n- a 200 among values ending at 89 is caught as an\n  outlier\n- combine masks with (& ...) or (| ...) to filter\n\nWATCH OUT\n- the first block of this part has the comparison\n  reversed: it keeps values >lower OR <upper, which\n  matches nearly every row. The second block uses the\n  correct  <lower OR >upper  form.\n- the variable is named IDR; the usual name is IQR",
        "outputImage": ""
      },
      {
        "id": "d",
        "letter": "D",
        "title": "Extracting text patterns with regular expressions",
        "youtubeVideo": "",
        "video": "assets/videos/exp3-d.mp4",
        "code": "import re\n\ntext=\"My phone number is 8919952311\"\nprint(text)\n\nphone_number=re.findall(r\"\\d{10}\",text)\nprint(phone_number)\n\ntext=\"My email is surivishivakumar@gmail.com\"\nprint(text)\n\nemail=re.findall(r\"[\\w.-]+@[\\w.-]+\\.\\w+\",text)\nprint(email)\n\ntext= \"Emails are surivishivakumar@gmail.com and 24102A030120@mbu.asia\"\nprint(text)\n\nemails=re.findall(r\"[\\w.-]+@[\\w.-]+\\.\\w+\",text)\nprint(emails)\n\ntext=\"My phone number is 8919952311\"\nSearch=re.search(r\"\\d{10}\",text)\nprint(Search)\nprint()\nprint(Search.group())\n\ntext=\"My phone number is 8919952311\"\nStarting_number=re.match(r\"\\d{10}\",text)\nprint(Starting_number)\n\ntext=\"apple banana mango watermelon\"\nresult=re.split(r\" \",text)\nprint(result)\n\ntext = \"My phone number is 8919952311\"\nresult = re.sub(r\"\\d{10}\", \"XXXXXXXXXX\", text)\nprint(result)\n\nimport re\ntext=\"->My number is 8919952311\"\nprint(text)\nphone=re.findall(r\"\\d{10}\",text)\nprint(phone)\ntext=\"->My email is surivishivakumar@gmail.com\"\nprint(text)\nemail=re.findall(r\"[\\w.-]+@[\\w.-]+\\.\\w+\",text)\nprint(email)\ntext=\"->My emails are surivishivakumar@gmail.com and 24102A030120@mbu.asia\"\nprint(text)\nemails=re.findall(r\"[\\w.-]+@[\\w.-]+\\.\\w+\",text)\nprint(emails)\ntext=\"->My roll number is 120\"\nprint(text)\nSearch=re.search(r\"\\d{3}\",text)\nprint(Search)\nprint(Search.group())\ntext=\"->apple banana mango\"\nprint(text)\nresult=re.split(\" \",text)\nprint(result)\ntext = \"->My phone number is 8919952311\"\nprint(text)\nresult = re.sub(r\"\\d{10}\", \"XXXXXXXXXX\", text)\nprint(result)",
        "notes": "WHAT THIS DOES\nPulls structured values out of raw text: phone\nnumbers, email addresses and roll numbers.\n\nKEY POINTS\n- findall() returns every match as a list\n- search() returns the FIRST match as an object\n- match() is anchored to the start of the string\n- split() breaks text apart on a pattern\n- sub() replaces matches, like global find/replace\n- r'...' raw strings keep backslashes literal\n\nWATCH OUT\n- re.match on 'My phone number is 8919952311' prints\n  None, and correctly so: the digits are not at\n  position 0\n- \\d{10} means exactly ten digits; \\d+ means one or\n  more\n- an unescaped dot (.) matches ANY character",
        "outputImage": ""
      }
    ]
  },
  {
    "id": 4,
    "name": "MultiIndex, Reshaping and Combining DataFrames",
    "tagline": "Hierarchical indexes, stack/unstack reshaping and merging or combining datasets.",
    "previewVideo": "assets/videos/exp4-preview.mp4",
    "youtubeVideo": "",
    "youtubeLink": "",
    "githubLink": "",
    "summary": "This experiment covers the pandas operations used when a dataset is more complex than a flat table. Part A builds a hierarchical index with `set_index()` using two key columns, selects values with `xs()`, and reads a single cross-section with `xs(level=...)`. Part B reshapes data between wide and long layouts with `stack()` and `unstack()`, demonstrating how a column becomes a row index and back again. Part C combines datasets: `pd.merge()` performs a join on a shared key with inner, outer and left variants, and `combine_first()` fills gaps in one frame from another. These three operations are the foundation for anything involving grouped or panel-style data in pandas.",
    "sections": [
      {
        "id": "a",
        "letter": "A",
        "title": "Building and querying a MultiIndex",
        "youtubeVideo": "",
        "video": "assets/videos/exp4-a.mp4",
        "code": "import pandas as pd\n\ndata={\n    \"Name\":[\"shiva\",\"kanishka\",\"surya\",\"kushwanth\"],\n    \"Marks\":[82,92,89,96]\n}\ndf=pd.DataFrame(data)\nprint(df)\n\ndf=pd.DataFrame(\n    {\n       \"Marks\":[82,92,89,96]\n    },\n    index=[\n        [\"CSE-DS\",\"CSE-DS\",\"CSE\",\"CSE-DS\"],\n        [\"shiva\",\"kanishka\",\"surya\",\"kushwanth\"]\n    ]\n)\nprint(df)\n\ndf.index.names = [\"Department\", \"Name\"]\nprint(df)\n\nprint(df.loc[\"CSE-DS\",\"Marks\"])\n\ndf.loc[(\"CSE-DS\", \"shiva\")]\n\nprint(df.loc[\"CSE-DS\"])\n\nprint(df.loc[\"CSE\"])\n\nprint(df[\"Marks\"])\n\ndf=df.reset_index()\nprint(df)\n\n# Important ones:\n# MultiIndex        → Multiple index levels → DataFrame\n# index.names       → Give names to index levels\n# loc[]             → Access data using index labels\n# reset_index()     → Index → normal columns\n\nimport pandas as pd\ndata={\n    \"Name\":[\"Shiva\",\"kanishka\",\"surya\",\"kushwanth\"],\n    \"Marks\":[82,92,89,96]\n}\nprint(df)\ndf=pd.DataFrame(\n    {\n       \"Marks\":[82,92,89,96]\n    },\n    index=[\n        [\"CSE-DS\",\"CSE-DS\",\"CSE\",\"CSE-DS\"],\n        [\"shiva\",\"kanishka\",\"surya\",\"kushwanth\"]\n    ]\n)\nprint(\"Multi index---------------------------:\")\nprint(df)\ndf.index.names=[\"Department\",\"Name\"]\nprint(\"Giving names to index levels----------: \")\nprint(df)\nprint(\"Students Name and marks---------------:\")\nprint(df.loc[\"CSE-DS\",\"Marks\"])\nprint(\"CSE-DS students-----------------------:\")\nprint(df.loc[\"CSE-DS\"])\nprint(\"CSE students--------------------------:\")\nprint(df.loc[\"CSE\"])\nprint(\"Index → normal columns----------------:\")\ndf=df.reset_index()\nprint(df)",
        "notes": "WHAT THIS DOES\nBuilds a two-level row index (Department, Name), names\neach level, then selects rows using .loc.\n\nKEY POINTS\n- index=[[...],[...]] creates two index levels\n- index.names = [...] labels each level\n- df.loc['CSE-DS'] returns that whole group\n- df.loc[('CSE-DS','shiva')] picks one exact row\n- reset_index() turns the index back into columns\n\nQUICK REFERENCE\n- MultiIndex      multiple index levels on a DataFrame\n- index.names     give names to the index levels\n- loc[]           access data using index labels\n- reset_index()   index -> normal columns\n\nWATCH OUT\n- this part rebuilds df from scratch halfway through,\n  which discards the earlier rows on purpose",
        "outputImage": ""
      },
      {
        "id": "b",
        "letter": "B",
        "title": "Reshaping data with stack and unstack",
        "youtubeVideo": "",
        "video": "assets/videos/exp4-b.mp4",
        "code": "import pandas as pd\n\ndata={\n    \"DataScience\":[43,48],\n    \"Iot\":[45,41]\n}\ndf=pd.DataFrame(\n    data,\n    index=[\"shiva\",\"jaisimha\"]\n)\nprint(df)\n\nstacked=df.stack()\nprint(stacked)\n\nprint(df.unstack())\n\nprint(stacked.unstack())",
        "notes": "WHAT THIS DOES\nMoves values between the column axis and the row\naxis, and then back again.\n\nKEY POINTS\n- stack() folds the columns down into the index\n- unstack() spreads the index back out to columns\n- stack() returns a Series with a MultiIndex\n- stacked.unstack() restores the original shape\n- stack() drops NaN by default\n\nWATCH OUT\n- stack and unstack are inverses, but stack returns a\n  Series while unstack returns a DataFrame\n- stacking behaviour changed across pandas versions,\n  so results can differ between releases",
        "outputImage": ""
      },
      {
        "id": "c",
        "letter": "C",
        "title": "Merging and combining DataFrames",
        "youtubeVideo": "",
        "video": "assets/videos/exp4-c.mp4",
        "code": "import pandas as pd\n\ndata={\n    \"ID\":[1,2,3,4],\n    \"Name\":[\"Shiva\",\"Kanishka\",\"surya\",\"kushwanth\"]\n}\ndf1=pd.DataFrame(data)\ndata={\n    \"ID\":[1,2,3,5],\n    \"Marks\":[82,92,87,96]\n}\ndf2=pd.DataFrame(data)\nprint(df1)\nprint(df2)\n\ndf3=df1.merge(df2)\nprint(df3)\n\ndf3 = pd.merge(df1, df2, on=\"ID\", how=\"right\")\nprint(df3)\n\ndf3 = pd.merge(df1, df2, on=\"ID\", how=\"inner\")\nprint(df3)\n\ndf3 = pd.merge(df1, df2, on=\"ID\", how=\"left\")\nprint(df3)\n\ndf3 = pd.merge(df1, df2, on=\"ID\", how=\"outer\")\nprint(df3)\n\nprint(df3[df3[\"Marks\"] > 80])\n\ndf3[\"Marks\"] = df3[\"Marks\"].fillna(0)\nprint(df3)",
        "notes": "WHAT THIS DOES\nJoins two tables on a shared ID column using all four\njoin types, then filters and fills.\n\nKEY POINTS\n- merge() matches on common columns automatically\n- on='ID' names the join key explicitly\n- inner  keeps only IDs present in both tables\n- left   keeps every row of the left table\n- right  keeps every row of the right table\n- outer  keeps everything, padding gaps with NaN\n\nWATCH OUT\n- ID 4 exists only in df1 and ID 5 only in df2, which\n  is exactly what makes the four join types differ\n- left and outer joins introduce NaN, which quietly\n  turns an integer column into float",
        "outputImage": ""
      }
    ]
  },
  {
    "id": 5,
    "name": "Data Visualization with Matplotlib and Seaborn",
    "tagline": "A full plotting suite over the Iris dataset and custom datasets.",
    "authored": true,
    "authoredNote": "Supplied for this site only - there is no Experiment 5 file in the submitted lab record. The other four experiments are converted from the student's own notebooks.",
    "previewVideo": "assets/videos/exp5-preview.mp4",
    "youtubeVideo": "",
    "youtubeLink": "",
    "githubLink": "",
    "summary": "This is the largest and most visual experiment, covering the plotting workflow with Matplotlib and Seaborn. It opens with the Iris dataset loaded directly from a remote CSV, followed by `head()`, `info()` and `describe()` to profile it. Five core chart types are then produced: a Matplotlib line plot of sepal and petal length, a Seaborn scatter plot coloured by species, a histogram with a kernel density overlay, a box plot comparing petal length across species, and a Seaborn pair plot of the full feature matrix. A second figure uses `plt.subplots()` to build a two-row annotated layout of monthly sales and expenses and exports it to PNG at 300 DPI. The remaining sections cover grouped and stacked bar plots built directly from a DataFrame with `df.plot()`, a histogram and filled KDE density plot of marks, a scatter plot of study hours against marks with the Pearson correlation coefficient printed, and a box plot of marks grouped by department.",
    "sections": [
      {
        "id": "a",
        "letter": "A",
        "title": "Exploring the Iris dataset with five plot types",
        "youtubeVideo": "",
        "video": "assets/videos/exp5-a.mp4",
        "code": "import pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\n# Load online dataset\nurl = \"https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv\"\ndf = pd.read_csv(url)\n# Display first five records\nprint(\"First Five Records:\")\nprint(df.head())\n# Display dataset information\nprint(\"\\nDataset Information:\")\nprint(df.info())\n# Display statistical summary\nprint(\"\\nStatistical Summary:\")\nprint(df.describe())\n# ---------------------------------------------------\n# 1. Matplotlib-Line Plot\n# ---------------------------------------------------\nplt.figure(figsize=(8,5))\nplt.plot(df.index,df[\"sepal_length\"],label=\"Sepal Length\")\nplt.plot(df.index,df[\"petal_length\"],label=\"Petal Length\")\nplt.xlabel(\"Sample Index\")\nplt.ylabel(\"Length\")\nplt.title(\"Sepal Length and Petal Length\")\nplt.legend()\nplt.grid()\nplt.show()\n# ---------------------------------------------------\n# 2. Seaborn-Scatter Plot\n# ---------------------------------------------------\nplt.figure(figsize=(8,5))\nsns.scatterplot(\n    data=df,\n    x=\"sepal_length\",\n    y=\"petal_length\",\n    hue=\"species\"\n)\nplt.title(\"Sepal Length vs Petal Length\")\nplt.xlabel(\"Sepal Length\")\nplt.ylabel(\"Petal Length\")\nplt.show()\n# ---------------------------------------------------\n# 3. Seaborn-Histogram\n# ---------------------------------------------------\nplt.figure(figsize=(8, 5))\nsns.histplot(\n    data=df,\n    x=\"sepal_length\",\n    hue=\"species\",\n    kde=True\n)\nplt.title(\"Distribution of Sepal Length\")\nplt.xlabel(\"Sepal Length\")\nplt.ylabel(\"Frequency\")\nplt.show()\n# ---------------------------------------------------\n# 4. Seaborn-Box Plot\n# ---------------------------------------------------\nplt.figure(figsize=(8, 5))\nsns.boxplot(\n    data=df,\n    x=\"species\",\n    y=\"petal_length\"\n)\nplt.title(\"Petal Length by Species\")\nplt.xlabel(\"Species\")\nplt.ylabel(\"Petal Length\")\nplt.show()\n# ---------------------------------------------------\n# 5. Seaborn-Pair Plot\n# ---------------------------------------------------\nsns.pairplot(\n    df,\n    hue=\"species\"\n)\nplt.show()",
        "outputImage": "",
        "notes": "WHAT THIS DOES\nLoads the Iris dataset from the web, inspects it with\nhead/info/describe, then draws five plot types.\n\nKEY POINTS\n- read_csv(url) reads straight from a web address\n- info() shows dtypes and counts of missing values\n- describe() gives count/mean/std/min/quartiles/max\n- plot() draws directly from the DataFrame\n- scatterplot/histplot/boxplot/pairplot take data=\n- hue='species' colours the marks by species\n\nWATCH OUT\n- this part needs internet access for the CSV\n- pairplot() draws every numeric pair, so it gets\n  slow on wide dataframes\n- histplot(kde=True) overlays a smoothed density curve"
      },
      {
        "id": "b",
        "letter": "B",
        "title": "Subplots and an annotated multi-panel figure",
        "youtubeVideo": "",
        "video": "assets/videos/exp5-b.mp4",
        "code": "import matplotlib.pyplot as plt\nmonths=[\"Jan\",\"Feb\",\"Mar\",\"Apr\",\"May\",\"Jun\"]\nsales=[120,150,180,160,220,250]\nexpenses=[80,100,120,110,140,160]\nfig,ax=plt.subplots(2,1,figsize=(10,8))\nax[0].plot(months,sales,marker=\"o\",linewidth=2,label=\"Sales\")\nax[0].set_title(\"Monthly Sales\")\nax[0].set_xlabel(\"Month\")\nax[0].set_ylabel(\"Sales\")\nax[0].set_xticks(range(len(months)))\nax[0].set_xticklabels(months)\nax[0].annotate(\"Highest Sales\",xy=(5,250),xytext=(3.5,270),arrowprops=dict(arrowstyle=\"->\"))\nax[0].legend()\nax[0].grid(True)\nax[1].plot(months,expenses,marker=\"s\",linewidth=2,label=\"Expenses\")\nax[1].set_title(\"Monthly Expenses\")\nax[1].set_xlabel(\"Month\")\nax[1].set_ylabel(\"Expenses\")\nax[1].set_xticks(range(len(months)))\nax[1].set_xticklabels(months)\nax[1].annotate(\"Highest Expense\",xy=(5,160),xytext=(3.5,180),arrowprops=dict(arrowstyle=\"->\"))\nax[1].legend()\nax[1].grid(True)\nfig.suptitle(\"Monthly Sales and Expenses Analysis\",fontsize=16)\nplt.tight_layout()\nplt.savefig(\"monthly_sales_expenses.png\",dpi=300,bbox_inches=\"tight\")\nplt.show()",
        "outputImage": "assets/img/monthly-sales-expenses.png",
        "notes": "WHAT THIS DOES\nBuilds two stacked plots on one figure, labels the peak\nof each with an arrow, then saves a PNG.\n\nKEY POINTS\n- plt.subplots(2,1) returns a figure and an axes array\n- ax[0] and ax[1] are the top and bottom plots\n- set_xticks + set_xticklabels name the month axis\n- annotate() puts text at xytext and points at xy\n- suptitle() titles the whole figure, not one plot\n- tight_layout() stops labels being clipped\n- savefig(..., dpi=300) writes a print-quality file\n\nWATCH OUT\n- savefig() in this browser lab writes to the in-page\n  file system; in a normal Python run it writes to disk"
      },
      {
        "id": "bi",
        "letter": "B(i)",
        "title": "Grouped bar plot of student marks",
        "youtubeVideo": "",
        "video": "assets/videos/exp5-bi.mp4",
        "code": "import pandas as pd\nimport matplotlib.pyplot as plt\ndata={\n'Python':[85,90,78,88],\n'Java':[75,82,80,85],\n'C++':[80,76,85,90]\n}\ndf=pd.DataFrame(data,index=['Student1','Student2','Student3','Student4'])\nprint(\"DataFrame:\")\nprint(df)\ndf.plot(kind='bar',figsize=(8,5))\nplt.title(\"Student Marks in Different Programming Languages\")\nplt.xlabel(\"Students\")\nplt.ylabel(\"Marks\")\nplt.xticks(rotation=0)\nplt.legend(title=\"Subjects\")\nplt.tight_layout()\nplt.show()",
        "outputImage": "",
        "notes": "WHAT THIS DOES\nTurns a DataFrame of student marks into a grouped\n(clustered) bar chart.\n\nKEY POINTS\n- each DataFrame column becomes a bar group\n- the index supplies the x axis labels\n- kind='bar' selects vertical bars\n- legend(title='Subjects') names the colour key\n- tight_layout() keeps long labels inside the figure\n\nWATCH OUT\n- xticks(rotation=0) keeps labels horizontal; drop it\n  if they get crowded\n- this compares subjects per student - swap the axes\n  to compare students per subject instead"
      },
      {
        "id": "bii",
        "letter": "B(ii)",
        "title": "Stacked bar plot of student marks",
        "youtubeVideo": "",
        "video": "assets/videos/exp5-bii.mp4",
        "code": "import pandas as pd\nimport matplotlib.pyplot as plt\ndata={\n'Python':[85,90,78,88],\n'Java':[75,82,80,85],\n'C++':[80,76,85,90]\n}\ndf=pd.DataFrame(data,index=['Student1','Student2','Student3','Student4'])\nprint(\"DataFrame:\")\nprint(df)\ndf.plot(kind='bar',stacked=True,figsize=(8,5))\nplt.title(\"Stacked Bar Plot of Student Marks\")\nplt.xlabel(\"Students\")\nplt.ylabel(\"Total Marks\")\nplt.xticks(rotation=0)\nplt.legend(title=\"Subjects\")\nplt.tight_layout()\nplt.show()",
        "outputImage": "",
        "notes": "WHAT THIS DOES\nThe same data as the previous part, but the bars are\nstacked so each student shows one total height.\n\nKEY POINTS\n- stacked=True stacks the columns on each bar\n- the bar height becomes the sum of the subjects\n- useful for part-to-whole comparison\n- unlike grouped bars, one series hides another\n\nWATCH OUT\n- only the bottom segment shares a common baseline,\n  so comparing the upper segments is unreliable\n- use grouped bars when the values must be compared"
      },
      {
        "id": "c",
        "letter": "C",
        "title": "Histogram and kernel density plot",
        "youtubeVideo": "",
        "video": "assets/videos/exp5-c.mp4",
        "code": "import pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\ndata=[45,50,52,55,58,60,62,65,68,70,72,75,78,80,82,85,88,90,92,95]\ndf=pd.DataFrame({'Marks':data})\nprint(\"Observed Data:\")\nprint(df)\nplt.figure(figsize=(8,5))\nsns.histplot(df['Marks'],bins=6,kde=False)\nplt.title(\"Histogram of Marks\")\nplt.xlabel(\"Marks\")\nplt.ylabel(\"Frequency\")\nplt.tight_layout()\nplt.show()\nplt.figure(figsize=(8,5))\nsns.kdeplot(df['Marks'],fill=True)\nplt.title(\"Density Plot of Marks\")\nplt.xlabel(\"Marks\")\nplt.ylabel(\"Density\")\nplt.tight_layout()\nplt.show()",
        "outputImage": "",
        "notes": "WHAT THIS DOES\nPlots the distribution of one column as a histogram,\nthen as a smoothed density curve.\n\nKEY POINTS\n- histplot(x=...) bins a single numeric column\n- bins=6 sets how many bars are drawn\n- kde=True overlays the density estimate\n- kdeplot(fill=True) shades under the curve\n- bars count observations; the curve is smoothed\n\nWATCH OUT\n- the bin count changes the shape you see, so check\n  more than one bin width before concluding anything\n- a density estimate never runs on a column that still\n  holds NaN - drop or fill those first"
      },
      {
        "id": "d",
        "letter": "D",
        "title": "Scatter plot and correlation coefficient",
        "youtubeVideo": "",
        "video": "assets/videos/exp5-d.mp4",
        "code": "import pandas as pd\nimport matplotlib.pyplot as plt\nstudy_hours=[1,2,3,4,5,6,7,8,9,10]\nmarks=[45,50,55,60,65,70,72,80,85,90]\ndf=pd.DataFrame({'Study_Hours':study_hours,'Marks':marks})\nprint(\"Data:\")\nprint(df)\nplt.figure(figsize=(8,5))\nplt.scatter(df['Study_Hours'],df['Marks'])\nplt.title(\"Relationship Between Study Hours and Marks\")\nplt.xlabel(\"Study Hours\")\nplt.ylabel(\"Marks\")\nplt.grid(True)\nplt.tight_layout()\nplt.show()\ncorrelation=df['Study_Hours'].corr(df['Marks'])\nprint(\"\\nCorrelation Coefficient:\",round(correlation,2))",
        "outputImage": "",
        "notes": "WHAT THIS DOES\nPlots marks against study hours, then measures how\nstrongly the two move together.\n\nKEY POINTS\n- scatter(x, y) needs one value per point\n- corr() returns Pearson's r, between -1 and 1\n- round(r, 2) trims the printed value to 2 decimals\n- a positive r means both rise together\n- an r near 0 means no linear relationship\n\nWATCH OUT\n- correlation is not causation\n- r only measures LINEAR relationships; a curved\n  pattern can still score near zero\n- this data is almost perfectly linear, so the result\n  sits near 1 - real data rarely behaves so neatly"
      },
      {
        "id": "e",
        "letter": "E",
        "title": "Box plot of marks by department",
        "youtubeVideo": "",
        "video": "assets/videos/exp5-e.mp4",
        "code": "import pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\ndata={\n'Department':['CSE','CSE','CSE','CSE','CSE','ECE','ECE','ECE','ECE','ECE','EEE','EEE','EEE','EEE','EEE'],\n'Marks':[78,85,90,72,88,65,70,82,75,80,60,68,72,76,85]\n}\ndf=pd.DataFrame(data)\nprint(\"Data:\")\nprint(df)\nplt.figure(figsize=(8,5))\nsns.boxplot(x='Department',y='Marks',data=df)\nplt.title(\"Marks Distribution by Department\")\nplt.xlabel(\"Department\")\nplt.ylabel(\"Marks\")\nplt.grid(axis='y',linestyle='--',alpha=0.5)\nplt.tight_layout()\nplt.show()",
        "outputImage": "",
        "notes": "WHAT THIS DOES\nCompares the spread of marks across three departments\nusing a box plot.\n\nKEY POINTS\n- boxplot(x=..., y=..., data=...) groups by x\n- the box spans the middle 50% (Q1 to Q3)\n- the line inside the box is the median\n- whiskers reach the usual 1.5*IQR limits\n- points beyond the whiskers are drawn as outliers\n\nWATCH OUT\n- the box shows neither the mean nor the sample size\n- with only five rows per department the quartiles are\n  rough, so treat the shape as indicative"
      }
    ]
  }
];

/* -------------------------------------------------------------------------
   4. MODULES  (shown on the Modules page)
   -------------------------------------------------------------------------
   The syllabus of this laboratory is five experiments, so the five modules
   follow the same order as the `experiments` array above. `experiments`
   lists the experiment ids that belong to the module.
   ------------------------------------------------------------------------- */
var modules = [
  {
    number: 1,
    title: "Data Import and Export",
    description:
      "Building a DataFrame from a Python dictionary, inspecting it with head() and shape, " +
      "then persisting it three ways - CSV with to_csv(), JSON with to_json() and an Excel " +
      "workbook with to_excel() - and reading each format back to confirm the round trip.",
    experiments: [1]
  },
  {
    number: 2,
    title: "Web Data, APIs and SQL Integration",
    description:
      "The two ways real data reaches a workflow: calling a REST API with the requests " +
      "library and parsing the JSON payload into a DataFrame, and creating, querying and " +
      "updating a SQLite database from Python with sqlite3.",
    experiments: [2]
  },
  {
    number: 3,
    title: "Data Cleaning, Transformation and Regular Expressions",
    description:
      "Cleaning messy data before analysis - missing values with isna(), fillna() and " +
      "dropna(), categorical encoding with map() and replace(), outlier detection with the " +
      "1.5 x IQR rule, and text extraction with regular expressions.",
    experiments: [3]
  },
  {
    number: 4,
    title: "MultiIndex, Reshaping and Combining DataFrames",
    description:
      "Handling data that is more complex than a flat table - hierarchical MultiIndex " +
      "lookups, stack() and unstack() reshaping between wide and long layouts, and merging " +
      "or combining datasets with pd.merge() and combine_first().",
    experiments: [4]
  },
  {
    number: 5,
    title: "Data Visualization with Matplotlib and Seaborn",
    description:
      "The full plotting workflow - line, scatter, histogram, KDE, box, pair, grouped and " +
      "stacked bar charts, annotated multi-panel subplots and PNG export - over the Iris " +
      "dataset and custom datasets.",
    experiments: [5]
  }
];

/* -------------------------------------------------------------------------
   5. TOOLS  (shown on the Tools page)
   -------------------------------------------------------------------------
   Only libraries, formats and runtimes that appear in the experiment code or
   in the Code Run page are listed. Each entry:
      kind          small category label shown above the name
      name          display name
      definition    one-line explanation of what the tool is
      use           what it is used for in THIS laboratory
      experiments   experiment ids that use it ([] when it belongs to Code Run)
      where         optional label for the non-experiment place it is used
      whereHref     optional link target for `where` (defaults to #/codelab)
   ------------------------------------------------------------------------- */
var tools = [
  {
    kind: "Language",
    name: "Python",
    definition: "The general-purpose programming language every experiment is written in.",
    use: "All experiment source is plain Python; the Code Run page executes it in the browser.",
    experiments: [1, 2, 3, 4, 5]
  },
  {
    kind: "Library",
    name: "Pandas",
    definition: "The DataFrame library for tabular data in Python.",
    use: "Creates, inspects, exports, cleans, reshapes and merges the data in every experiment.",
    experiments: [1, 2, 3, 4, 5]
  },
  {
    kind: "Library",
    name: "NumPy",
    definition: "Numerical arrays and mathematics for Python.",
    use: "Supplies NaN for the missing-value tables and the quantile maths behind the IQR outlier fences in Experiment 3; also the Code Run starter code.",
    experiments: [3],
    where: "Code Run starter code"
  },
  {
    kind: "Library",
    name: "Requests",
    definition: "A simple HTTP client for calling web services from Python.",
    use: "Calls the public GitHub REST API, prints the HTTP status code and turns the JSON response into a DataFrame.",
    experiments: [2]
  },
  {
    kind: "Standard library",
    name: "SQLite (sqlite3)",
    definition: "A zero-configuration relational database that ships with Python.",
    use: "Connects to Engineer.db, creates the Engineers table and runs INSERT, SELECT, UPDATE and DELETE in Experiment 2 part B.",
    experiments: [2]
  },
  {
    kind: "Standard library",
    name: "Regular Expressions (re)",
    definition: "Python's pattern-matching library for searching inside text.",
    use: "findall(), search(), match(), split() and sub() pull phone numbers and email addresses out of free text in Experiment 3 part D.",
    experiments: [3]
  },
  {
    kind: "Library",
    name: "Matplotlib",
    definition: "The base 2-D plotting library for Python.",
    use: "Line plots, annotated multi-panel subplots, grouped and stacked bar charts, histograms, scatter plots and 300 DPI PNG export in Experiment 5.",
    experiments: [5]
  },
  {
    kind: "Library",
    name: "Seaborn",
    definition: "Statistical charts built on top of Matplotlib.",
    use: "Scatter plots coloured by species, histograms with a KDE overlay, box plots and pair plots over the Iris and marks datasets.",
    experiments: [5]
  },
  {
    kind: "Data formats",
    name: "CSV, JSON and Excel",
    definition: "The three flat-file formats pandas reads and writes.",
    use: "The to_csv / read_csv, to_json / read_json and to_excel / read_excel round trips demonstrated in Experiment 1.",
    experiments: [1]
  },
  {
    kind: "Notebook",
    name: "Jupyter Notebook",
    definition: "The notebook format that mixes code, output and notes in cells.",
    use: "Code Run renders DataFrame output as HTML tables the way Jupyter does, and files can be opened with a .ipynb name.",
    experiments: [],
    where: "Code Run"
  },
  {
    kind: "Runtime",
    name: "Pyodide",
    definition: "CPython compiled to WebAssembly, so Python runs entirely inside the browser.",
    use: "Powers the Code Run page, delivering pandas, NumPy, Matplotlib and Seaborn with nothing to install.",
    experiments: [],
    where: "Code Run"
  }
];

/* Make the array available to the app, both in the browser and in Node tests. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { laboratory, labMeta, student, social, experiments, modules, tools };
}
