import os
import json
import io
import csv
from flask import Flask, render_template, request, jsonify, Response, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static'),
    static_url_path='/static'
)

# -------------------------------------------------------------
# Data Loading & Initialization
# -------------------------------------------------------------
DATA_FILE = os.path.join(BASE_DIR, 'data', 'startups.json')
STARTUPS = []


def load_data():
    global STARTUPS
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                STARTUPS = json.load(f)
            print(f"Successfully loaded {len(STARTUPS)} startup records from {DATA_FILE}")
            return
        except Exception as e:
            print(f"Error loading {DATA_FILE}: {e}")

    # Fallback: check C:\Users\User\Downloads\startup_insights_25000.html if data file missing
    alt_html = r'C:\Users\User\Downloads\startup_insights_25000.html'
    if os.path.exists(alt_html):
        try:
            import re
            with open(alt_html, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            m = re.search(r'DATA\s*=\s*(\[.*?\]);', content, re.DOTALL)
            if m:
                STARTUPS = json.loads(m.group(1))
                os.makedirs(os.path.join(os.path.dirname(__file__), 'data'), exist_ok=True)
                with open(DATA_FILE, 'w', encoding='utf-8') as out:
                    json.dump(STARTUPS, out)
                print(f"Extracted and saved {len(STARTUPS)} records from {alt_html}")
                return
        except Exception as e:
            print(f"Error extracting from {alt_html}: {e}")

    # Minimal fallback demo dataset if file cannot be found
    print("Generating fallback demo records...")
    STARTUPS = [
        {
            "Company_ID": f"GTS{i:06d}",
            "Technology_Domain": ["AI / Machine Learning", "Fintech", "HealthTech", "ClimateTech", "Cybersecurity", "Cloud Computing"][i % 6],
            "Founding_Year": 2012 + (i % 13),
            "Country": ["United States", "United Kingdom", "Germany", "India", "Canada", "Singapore", "Japan"][i % 7],
            "City": ["San Francisco", "London", "Berlin", "Bengaluru", "Toronto", "Singapore", "Tokyo"][i % 7],
            "Funding_Stage": ["Seed", "Series A", "Series B", "Series C", "Late Stage", "Bootstrapped"][i % 6],
            "Total_Funding_USD_Millions": round(5.0 + (i * 2.3) % 250, 2),
            "Valuation_USD_Millions": round(20.0 + (i * 8.5) % 1500, 2),
            "Annual_Recurring_Revenue_USD_Millions": round(1.0 + (i * 0.7) % 80, 2),
            "Monthly_Burn_Rate_USD_Millions": round(0.2 + (i * 0.1) % 15, 2),
            "Runway_Months": round(8.0 + (i * 1.5) % 36, 1),
            "Peak_Headcount": 20 + (i * 11) % 600,
            "Layoffs_2024_2025": (i * 3) % 40,
            "Current_Headcount_2026": 18 + (i * 10) % 550,
            "Investor_Tier": ["Tier 1", "Tier 2", "Tier 3", "Angel/Accelerator"][i % 4],
            "AI_Adoption_Level": ["High", "Moderate", "Low", "None"][i % 4],
            "Company_Outcome": ["Independent", "Acquired", "Closed", "Public/IPO"][i % 4]
        }
        for i in range(1, 200)
    ]

# Initialize dataset once
load_data()

# Precompute unique filter choices for ultra-fast dropdown populating
FILTER_OPTIONS = {
    "domains": sorted(list({str(r.get("Technology_Domain") or "").strip() for r in STARTUPS if r.get("Technology_Domain")})),
    "countries": sorted(list({str(r.get("Country") or "").strip() for r in STARTUPS if r.get("Country")})),
    "outcomes": sorted(list({str(r.get("Company_Outcome") or "").strip() for r in STARTUPS if r.get("Company_Outcome")})),
    "stages": sorted(list({str(r.get("Funding_Stage") or "").strip() for r in STARTUPS if r.get("Funding_Stage")}))
}

# -------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------
def format_currency_compact(amount_millions):
    """Formats millions into readable USD representation ($X.XB or $X.XM)"""
    if amount_millions is None or amount_millions == 0:
        return "$0"
    dollars = amount_millions * 1_000_000
    if dollars >= 1_000_000_000:
        return f"${dollars / 1_000_000_000:.2f}B"
    elif dollars >= 1_000_000:
        return f"${dollars / 1_000_000:.1f}M"
    elif dollars >= 1_000:
        return f"${dollars / 1_000:.0f}K"
    return f"${dollars:.0f}"

def filter_records(records, search="", domain="", country="", outcome="", stage=""):
    """Filter records by search keyword and dropdown facets."""
    search_lower = search.strip().lower()
    domain_norm = domain.strip().lower()
    country_norm = country.strip().lower()
    outcome_norm = outcome.strip().lower()
    stage_norm = stage.strip().lower()

    filtered = []
    for r in records:
        if domain_norm and (str(r.get("Technology_Domain") or "").lower() != domain_norm):
            continue
        if country_norm and (str(r.get("Country") or "").lower() != country_norm):
            continue
        if outcome_norm and (str(r.get("Company_Outcome") or "").lower() != outcome_norm):
            continue
        if stage_norm and (str(r.get("Funding_Stage") or "").lower() != stage_norm):
            continue

        if search_lower:
            c_id = str(r.get("Company_ID") or "").lower()
            dom = str(r.get("Technology_Domain") or "").lower()
            cntry = str(r.get("Country") or "").lower()
            city = str(r.get("City") or "").lower()
            stg = str(r.get("Funding_Stage") or "").lower()
            outc = str(r.get("Company_Outcome") or "").lower()

            if (search_lower not in c_id and
                search_lower not in dom and
                search_lower not in cntry and
                search_lower not in city and
                search_lower not in stg and
                search_lower not in outc):
                continue

        filtered.append(r)
    return filtered

# -------------------------------------------------------------
# Routes
# -------------------------------------------------------------
@app.route('/static/<path:filename>')
def serve_static(filename):
    """Explicit static file serving for serverless environments."""
    static_dir = os.path.join(BASE_DIR, 'static')
    return send_from_directory(static_dir, filename)

@app.route('/')
def index():
    """Serves the main dashboard user interface."""
    return render_template('index.html', total_startups_count=f"{len(STARTUPS):,}")


@app.route('/api/stats')
def api_stats():
    """Returns dynamic statistics & chart distributions based on active filters."""
    search = request.args.get('search', '')
    domain = request.args.get('domain', '')
    country = request.args.get('country', '')
    outcome = request.args.get('outcome', '')
    stage = request.args.get('stage', '')

    filtered = filter_records(STARTUPS, search, domain, country, outcome, stage)
    total_count = len(filtered)

    # Calculate summaries
    total_funding_m = sum(float(r.get("Total_Funding_USD_Millions") or 0) for r in filtered)
    domains_set = {r.get("Technology_Domain") for r in filtered if r.get("Technology_Domain")}
    countries_set = {r.get("Country") for r in filtered if r.get("Country")}
    
    valuations = [float(r.get("Valuation_USD_Millions") or 0) for r in filtered if r.get("Valuation_USD_Millions") is not None]
    runways = [float(r.get("Runway_Months") or 0) for r in filtered if r.get("Runway_Months") is not None]

    avg_val = (sum(valuations) / len(valuations)) if valuations else 0
    avg_runway = (sum(runways) / len(runways)) if runways else 0

    # Chart 1: Company Outcomes
    outcome_counts = {}
    for r in filtered:
        o = r.get("Company_Outcome") or "Unknown"
        outcome_counts[o] = outcome_counts.get(o, 0) + 1
    sorted_outcomes = sorted(outcome_counts.items(), key=lambda x: x[1], reverse=True)

    # Chart 2: Top Technology Domains (Top 8)
    domain_counts = {}
    for r in filtered:
        d = r.get("Technology_Domain") or "Other"
        domain_counts[d] = domain_counts.get(d, 0) + 1
    sorted_domains = sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)[:8]

    # Chart 3: Founding Years (chronological)
    year_counts = {}
    for r in filtered:
        y = r.get("Founding_Year")
        if y is not None:
            try:
                y = int(y)
                year_counts[y] = year_counts.get(y, 0) + 1
            except:
                pass
    sorted_years = sorted(year_counts.items(), key=lambda x: x[0])

    # Chart 4: Top Countries (Top 10)
    country_counts = {}
    for r in filtered:
        c = r.get("Country") or "Unknown"
        country_counts[c] = country_counts.get(c, 0) + 1
    sorted_countries = sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    return jsonify({
        "status": "success",
        "total_records": total_count,
        "total_dataset_size": len(STARTUPS),
        "total_domains": len(domains_set),
        "total_funding_m": round(total_funding_m, 2),
        "total_funding_formatted": format_currency_compact(total_funding_m),
        "total_countries": len(countries_set),
        "avg_valuation_formatted": format_currency_compact(avg_val),
        "avg_runway_months": round(avg_runway, 1),
        "charts": {
            "outcomes": {
                "labels": [k for k, v in sorted_outcomes],
                "data": [v for k, v in sorted_outcomes]
            },
            "domains": {
                "labels": [k for k, v in sorted_domains],
                "data": [v for k, v in sorted_domains]
            },
            "years": {
                "labels": [str(k) for k, v in sorted_years],
                "data": [v for k, v in sorted_years]
            },
            "countries": {
                "labels": [k for k, v in sorted_countries],
                "data": [v for k, v in sorted_countries]
            }
        },
        "filter_options": FILTER_OPTIONS
    })

@app.route('/api/startups')
def api_startups():
    """Returns paginated, searchable, and filtered startup records."""
    search = request.args.get('search', '')
    domain = request.args.get('domain', '')
    country = request.args.get('country', '')
    outcome = request.args.get('outcome', '')
    stage = request.args.get('stage', '')
    
    sort_by = request.args.get('sort_by', 'Company_ID')
    sort_order = request.args.get('sort_order', 'asc')

    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(100, max(5, int(request.args.get('per_page', 15))))
    except ValueError:
        page = 1
        per_page = 15

    filtered = filter_records(STARTUPS, search, domain, country, outcome, stage)
    total_matches = len(filtered)

    # Sorting
    reverse_sort = (sort_order.lower() == 'desc')
    
    def sort_key(item):
        val = item.get(sort_by)
        if val is None:
            return -float('inf') if not reverse_sort else float('inf')
        if isinstance(val, (int, float)):
            return val
        try:
            return float(val)
        except (ValueError, TypeError):
            return str(val).lower()

    if sort_by in ['Total_Funding_USD_Millions', 'Valuation_USD_Millions', 'Founding_Year', 
                   'Runway_Months', 'Peak_Headcount', 'Current_Headcount_2026', 'Company_ID']:
        filtered.sort(key=sort_key, reverse=reverse_sort)

    # Pagination slice
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    page_data = filtered[start_idx:end_idx]
    total_pages = (total_matches + per_page - 1) // per_page if total_matches > 0 else 1

    return jsonify({
        "status": "success",
        "total": total_matches,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "records": page_data
    })

@app.route('/api/startup/<company_id>')
def api_startup_detail(company_id):
    """Retrieve all metadata and metrics for a specific company."""
    cid_upper = company_id.strip().upper()
    for r in STARTUPS:
        if str(r.get("Company_ID", "")).upper() == cid_upper:
            return jsonify({"status": "success", "company": r})
    return jsonify({"status": "error", "message": f"Company {company_id} not found"}), 404

@app.route('/api/export')
def api_export_csv():
    """Exports all currently filtered records as a downloadable CSV."""
    search = request.args.get('search', '')
    domain = request.args.get('domain', '')
    country = request.args.get('country', '')
    outcome = request.args.get('outcome', '')
    stage = request.args.get('stage', '')

    filtered = filter_records(STARTUPS, search, domain, country, outcome, stage)

    output = io.StringIO()
    if filtered:
        fieldnames = list(filtered[0].keys())
    else:
        fieldnames = ["Company_ID", "Technology_Domain", "Founding_Year", "Country", "City", 
                      "Funding_Stage", "Total_Funding_USD_Millions", "Valuation_USD_Millions", 
                      "Company_Outcome"]

    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for row in filtered:
        writer.writerow(row)

    csv_data = output.getvalue()
    output.close()

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=startup_insights_export.csv"}
    )

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f">> Starting Startup Insights Dashboard on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)

