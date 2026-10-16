import requests
import json
import sys

BASE = 'http://127.0.0.1:5000'

def run_tests():
    print("=== 1. Testing HTML Page & DOM Structure ===")
    r = requests.get(f"{BASE}/")
    if r.status_code != 200:
        print(f"FAILED: GET / returned {r.status_code}")
        sys.exit(1)
    
    html = r.text
    required_ids = [
        'sidebar', 'quickSearchInput', 'resetAllFiltersBtn', 'topExportBtn',
        'kpiTotalStartups', 'kpiTotalDomains', 'kpiTotalFunding', 'kpiTotalCountries',
        'outcomeChart', 'domainChart', 'yearChart', 'countryChart',
        'tableSearchInput', 'domainFilter', 'countryFilter', 'outcomeFilter', 'stageFilter',
        'sortBySelect', 'sortOrderBtn', 'pageSizeSelect', 'startupsTable', 'tableBody',
        'paginationInfo', 'firstPageBtn', 'prevPageBtn', 'nextPageBtn', 'lastPageBtn',
        'companyModal', 'closeModalBtn'
    ]
    for req_id in required_ids:
        assert f'id="{req_id}"' in html or f"id='{req_id}'" in html, f"Missing element with ID: {req_id}"
    print(f"Verified {len(required_ids)} required DOM elements in HTML layout!")

    print("\n=== 2. Testing Stats API & Analytics Aggregations ===")
    stats_default = requests.get(f"{BASE}/api/stats").json()
    assert stats_default['total_records'] == 25000, f"Expected 25,000 records, got {stats_default['total_records']}"
    print(f"Dataset Records: {stats_default['total_records']:,}")
    print(f"Tech Domains: {stats_default['total_domains']}")
    print(f"Aggregated Capital: {stats_default['total_funding_formatted']}")
    print(f"Global Hubs (Countries): {stats_default['total_countries']}")
    print(f"Avg Valuation: {stats_default['avg_valuation_formatted']}")
    print(f"Avg Runway: {stats_default['avg_runway_months']} months")

    # Filtered test
    stats_filtered = requests.get(f"{BASE}/api/stats?domain=ClimateTech").json()
    print(f"Filtered (Domain=ClimateTech): {stats_filtered['total_records']} startups")
    assert 0 < stats_filtered['total_records'] < 25000

    print("\n=== 3. Testing Paginated Startups API & Sorting ===")
    r_p1 = requests.get(f"{BASE}/api/startups?page=1&per_page=15&sort_by=Total_Funding_USD_Millions&sort_order=desc").json()
    assert r_p1['status'] == 'success'
    assert len(r_p1['records']) == 15
    f1 = float(r_p1['records'][0]['Total_Funding_USD_Millions'])
    f2 = float(r_p1['records'][1]['Total_Funding_USD_Millions'])
    print(f"Top Funded #1: {r_p1['records'][0]['Company_ID']} with ${f1}M")
    print(f"Top Funded #2: {r_p1['records'][1]['Company_ID']} with ${f2}M")
    assert f1 >= f2, "Sorting descending failed!"

    print("\n=== 4. Testing Single Company Telemetry API ===")
    test_id = r_p1['records'][0]['Company_ID']
    r_comp = requests.get(f"{BASE}/api/startup/{test_id}").json()
    assert r_comp['status'] == 'success'
    c = r_comp['company']
    print(f"Company ID: {c['Company_ID']}")
    print(f"  Vertical: {c['Technology_Domain']}")
    print(f"  HQ: {c['City']}, {c['Country']}")
    print(f"  Stage: {c['Funding_Stage']} | Outcome: {c['Company_Outcome']}")
    print(f"  Valuation: ${c['Valuation_USD_Millions']}M | Runway: {c['Runway_Months']} mo")
    print(f"  Headcount (2026): {c['Current_Headcount_2026']} | Peak: {c['Peak_Headcount']}")

    print("\n=== 5. Testing CSV Export API ===")
    r_exp = requests.get(f"{BASE}/api/export?outcome=Acquired")
    assert r_exp.status_code == 200
    assert 'text/csv' in r_exp.headers.get('Content-Type', '')
    lines = r_exp.text.strip().splitlines()
    print(f"Exported CSV records for Outcome=Acquired: {len(lines) - 1} rows")
    assert len(lines) > 50

    print("\n>>> ALL VERIFICATION TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == '__main__':
    run_tests()
