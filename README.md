# 🚀 Startup Insights Dashboard (Python & Flask)

A modern, high-performance **Startup Insights Dashboard** built with **Python (Flask)**, **HTML5**, **Vanilla CSS**, and **JavaScript (Chart.js)**. 

The dashboard analyzes a comprehensive **25,000-record venture startup dataset** across technology domains, company outcomes, funding stages, founding years, and global hubs.

---

## ✨ Features

- **Dynamic KPI Telemetry:** Calculates total startups, technology domains, aggregated capital deployed (USD Billions), and global hubs on the fly in Python.
- **Interactive Chart.js Visualizations:**
  - 🍩 **Company Outcomes Split** (Doughnut chart for Independent, Acquired, Closed, Public/IPO)
  - 📊 **Top Technology Domains** (Horizontal Bar chart showing major tech verticals)
  - 📈 **Founding Trajectory** (Timeline trend curve of startup incorporations from 2010 to 2026)
  - 🌍 **Top 10 Global Startup Hubs** (Geographical distribution across nations)
- **High-Performance Startups Directory:**
  - Fast search across Company ID, Domain, City, and Country.
  - Dropdown filters for **Technology Domain**, **Country**, **Company Outcome**, and **Funding Stage**.
  - Dynamic active filter chips with one-click dismiss.
  - Flexible column sorting (Funding, Valuation, Year, Runway, Headcount).
  - Responsive pagination with page jump controls (15, 25, 50, 100 per page).
- **One-Click CSV Export:** Export currently filtered startup records into a clean `.csv` file.
- **Detailed Company Profile Modal:** Click any company record to view deep metrics including ARR, monthly burn rate, runway months, peak vs. current headcount, and AI adoption level.
- **Modern Dark Navy UI:** Professional dark aesthetic inspired by modern enterprise venture platforms, with glassmorphism gradients, subtle glow accents (Blue, Purple, Teal), and clean typography.
- **Simulated Dataset Transparency:** Clear and prominent disclaimer informing users that the 25,000-row cohort is synthetic/demo data for analytics modeling.

---

## 📁 Project Structure

```text
izzah/
│
├── app.py                     # Main Python Flask application & data processing APIs
├── requirements.txt           # Python dependencies (Flask, pandas)
├── README.md                  # Project overview & VS Code execution guide
│
├── data/
│   ├── startups.json          # Complete 25,000-record startup dataset
│   └── startups.csv           # CSV version of the 25,000 records
│
├── templates/
│   └── index.html             # Dashboard HTML5 layout & responsive UI structure
│
└── static/
    ├── style.css              # Custom dark navy CSS styling & responsive design
    └── script.js              # Frontend JavaScript controller & Chart.js integration
```

---

## 🛠️ Requirements & Setup in VS Code

### 1. Open the Project in VS Code
1. Open **Visual Studio Code**.
2. Click **File** &rarr; **Open Folder...**
3. Select the project folder: `c:\Users\User\Downloads\izzah`

### 2. Open the Terminal in VS Code
Press `Ctrl + ` `~` (or go to **Terminal** &rarr; **New Terminal** in the top menu).

### 3. Install Required Dependencies
Run the following simple command:
```powershell
pip install -r requirements.txt
```

### 4. Run the Application
Launch the Flask development server:
```powershell
python app.py
```

You should see output similar to:
```text
Successfully loaded 25000 startup records from .../data/startups.json
🚀 Starting Startup Insights Dashboard on http://127.0.0.1:5000
 * Running on http://127.0.0.1:5000
```

### 5. View in Your Browser
Open your web browser and go to:
[http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 🔌 API Endpoints Reference

| Endpoint | Method | Description |
|---|---|---|
| `/` | `GET` | Serves the main dashboard page |
| `/api/stats` | `GET` | Computes dynamic counts, funding sums, and chart series based on active filters |
| `/api/startups` | `GET` | Returns paginated, searchable, sorted startup records (`page`, `per_page`, etc.) |
| `/api/startup/<id>`| `GET` | Retrieves full financial and headcount telemetry for a specific startup |
| `/api/export` | `GET` | Generates and downloads a `.csv` file containing the currently filtered records |

---

## ⚖️ Dataset Notice
The dataset contains **25,000 synthetic startup records**. All company names, metrics (Valuation, ARR, Burn Rate, Runway, Headcount), and outcomes are generated for portfolio benchmarking and analytics demonstration.
