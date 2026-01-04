# PayGuard DQ

**Data Quality Scoring for Payment Transactions**

PayGuard DQ is an automated data quality scoring system designed specifically for payment transaction data. It uses a multi-agent architecture to profile your data, identify quality issues, and provide actionable remediation recommendations—all without storing any raw transaction data.

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [Quick Start](#quick-start)
3. [Running Locally](#running-locally)
4. [Sample Data](#sample-data)
5. [API Reference](#api-reference)
6. [Architecture](#architecture)
7. [Project Structure](#project-structure)

---

## What It Does

PayGuard DQ analyzes payment transaction datasets across seven quality dimensions:

| Dimension | What It Checks |
|-----------|----------------|
| **Completeness** | Missing values, null rates, required fields |
| **Uniqueness** | Duplicate transaction IDs |
| **Validity** | ISO currency codes, country codes, MCC formats, amount ranges |
| **Consistency** | Status-settlement date alignment, currency decimal rules, time ordering |
| **Timeliness** | Processing delays, SLA compliance |
| **Integrity** | Referential matches against master data |
| **Reconciliation** | BIN map validation, settlement ledger matching |

For each dataset, you get:
- A composite quality score (0-100)
- Per-dimension scores with full explainability
- Prioritized list of issues with severity levels
- Actionable remediation steps
- Exportable tests for dbt and Great Expectations

**Important:** Raw transaction data is never stored. Only metadata, scores, and aggregates are persisted.

---

## Quick Start

The fastest way to try PayGuard DQ:

### Option 1: Use the Live Demo

1. Visit the deployed frontend (your Vercel URL)
2. Upload a sample CSV file from the `sample_data/` folder
3. View your quality scores and recommendations

### Option 2: Run with Docker

```bash
git clone https://github.com/Revanthm2027/payguard-dq.git
cd payguard-dq
docker-compose up --build
```

Then open http://localhost:3000 in your browser.

---

## Running Locally

If you prefer to run without Docker, follow these steps.

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- pip and npm installed

### Step 1: Clone the Repository

```bash
git clone https://github.com/Revanthm2027/payguard-dq.git
cd payguard-dq
```

### Step 2: Generate Sample Data

```bash
pip install pandas numpy
python scripts/generate_sample_data.py
```

This creates six CSV files in the `sample_data/` folder.

### Step 3: Start the Backend

Open a terminal and run:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000. You can view the interactive API documentation at http://localhost:8000/docs.

### Step 4: Start the Frontend

Open a second terminal and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:3000.

### Step 5: Test the Application

1. Open http://localhost:3000 in your browser
2. Click "Start Analysis" or "Analyze Your Data"
3. Upload `sample_data/transactions_batch1.csv` (this is the "good quality" dataset)
4. Optionally upload reference files:
   - BIN Map: `sample_data/bin_reference.csv`
   - Currency Rules: `sample_data/currency_rules.csv`
5. Click "Analyze Dataset"
6. View your results on the dashboard

To see how the system handles poor quality data, repeat with `sample_data/transactions_batch2.csv`.

---

## Sample Data

The sample data generator creates six files:

| File | Description | Rows |
|------|-------------|------|
| `transactions_batch1.csv` | Good quality transactions (expect ~95% DQS) | 1,000 |
| `transactions_batch2.csv` | Poor quality transactions with intentional issues (expect ~70% DQS) | 1,000 |
| `bin_reference.csv` | Card BIN to issuer/network mapping | 10 |
| `currency_rules.csv` | Currency decimal place rules | 10 |
| `mcc_codes.csv` | Valid merchant category codes | 10 |
| `settlement.csv` | Settlement ledger for reconciliation | 950 |

The poor quality batch (`transactions_batch2.csv`) includes these intentional issues:
- 0.8% duplicate transaction IDs
- 3-5% missing auth codes
- 3% invalid MCC codes
- 5% invalid currency codes
- 5% JPY transactions with incorrect decimals
- 3% settled transactions missing settlement dates
- 5% unrecognized card BINs

---

## API Reference

The backend exposes the following endpoints:

### Ingestion

**POST /api/ingest**

Upload a dataset for analysis.

- Request: multipart/form-data with `dataset_file` (CSV) and optional `dataset_name`
- Response: `{ "run_id": "...", "row_count": 1000, "column_count": 12 }`

**POST /api/ingest-reference**

Upload reference data for validation checks.

- Request: multipart/form-data with `reference_file` (CSV) and `reference_type` (one of: bin_map, currency_rules, mcc_codes, settlement_ledger)
- Response: `{ "reference_id": "...", "row_count": 10 }`

### Results

**GET /api/runs**

List all previous runs.

**GET /api/runs/{run_id}**

Get full results for a specific run, including scores, checks, remediation, and agent logs.

**GET /api/runs/{run_id}/export/dbt**

Download dbt schema tests as YAML.

**GET /api/runs/{run_id}/export/ge**

Download Great Expectations suite as JSON.

**GET /api/runs/{run_id}/governance**

Get the governance report confirming no raw data was stored.

---

## Architecture

PayGuard DQ uses seven specialized agents, each with a single responsibility:

1. **Profiler Agent** — Analyzes schema and computes aggregate statistics
2. **Dimension Selector Agent** — Determines which quality dimensions apply to the dataset
3. **Check Executor Agent** — Runs validation checks across all selected dimensions
4. **Scoring Agent** — Computes per-dimension scores and a risk-weighted composite score
5. **Explainer Agent** — Generates human-readable explanations for scores and issues
6. **Remediation Agent** — Creates prioritized fix recommendations with expected impact
7. **Test Export Agent** — Generates dbt tests and Great Expectations suites

### Data Flow

```
Upload CSV
    |
    v
[Profiler Agent] --> Schema + Statistics
    |
    v
[Dimension Selector Agent] --> Applicable Dimensions
    |
    v
[Check Executor Agent] --> Check Results (pass/fail + metrics)
    |
    v
[Scoring Agent] --> Per-Dimension Scores + Composite DQS
    |
    v
[Explainer Agent] --> Narrative Summaries
    |
    v
[Remediation Agent] --> Prioritized Fix Recommendations
    |
    v
[Test Export Agent] --> dbt YAML + Great Expectations JSON
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Backend | Python, FastAPI, SQLModel, SQLite |
| Frontend | Next.js, TypeScript, Tailwind CSS, Recharts |
| Deployment | Docker, Vercel (frontend), Render (backend) |

---

## Project Structure

```
payguard-dq/
├── backend/
│   ├── app/
│   │   ├── agents/           # 7 specialized agents
│   │   ├── checks/           # Check implementations for each dimension
│   │   ├── routes/           # API endpoints
│   │   ├── utils/            # Hashing, JSON utilities, governance
│   │   ├── main.py           # FastAPI application
│   │   ├── models.py         # Database models
│   │   ├── storage.py        # Database operations
│   │   └── orchestrator.py   # Agent pipeline coordinator
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/                  # Next.js pages
│   ├── lib/                  # API client
│   ├── package.json
│   └── Dockerfile
├── scripts/
│   └── generate_sample_data.py
├── sample_data/              # Generated sample datasets
├── docker-compose.yml
└── README.md
```

---

## Compliance

PayGuard DQ is designed with data governance in mind:

- **No raw data storage** — Transaction data is processed in memory and discarded after scoring
- **Metadata only** — Only schema information, aggregate statistics, and scores are stored
- **Full audit trail** — Every agent execution is logged with inputs and outputs
- **Governance reports** — Each run includes a report confirming compliance

---

## License

This project was built for a hackathon. Use at your own discretion.
