# Churn Analyzer AI - Customer Retention Dashboard

Churn Analyzer AI is a complete web application designed to predict telecom customer churn in real-time and provide tailored marketing & customer service retention recommendations.

The app uses a **Random Forest Classifier** trained on Google Colab to compute accurate churn probability scores.

---

## Key Features

1. **Enterprise Customer Risk Profiler:**
   - Real-time prediction engine with automatic Total Charges calculation and dynamic dependencies.
   - 1-Click Persona Quick-Fill presets (🚨 High-Risk Fiber, 🛡️ Loyal Family, ⚖️ Mid-Tier Switcher, 📱 Phone-Only Senior).
   - Semi-circular animated Churn Risk Gauge with color-coded risk tier badges.
   - 4-Metric Executive KPI Ribbon: Churn Probability, Customer Health Score (0-100), Annual Revenue at Risk ($/yr), and Projected Lifetime Value (CLV).
   - Peer & Fleet Benchmark variance cards comparing the account against the 26.5% fleet churn average, $64.76 spend, and 29-month median tenure.
   - **Feature Drivers Chart (Chart.js):** Horizontal bar chart separating positive churn catalysts from protective anchors.
   - **5-Pillar Retention Radar (Chart.js):** Evaluates Contract Stability, Payment Safety, Ecosystem Depth, Tenure Maturity, and Price Comfort against optimal benchmarks.
   - Prioritized Retention Playbook with estimated risk drop and dollar savings.

2. **Portfolio & Fleet Analytics Dashboard:**
   - Empirical macro distributions across the 7,043-account dataset.
   - Interactive charts: Churn Rate by Contract Type, Churn by Internet Technology, Customer Lifecycle Churn Curve, and Payment Method Friction Matrix.
   - Global Random Forest Feature Importance Ranking chart.

3. **What-If Retention ROI Sandbox:**
   - Interactive simulation sandbox allowing retention teams to test offers (contract upgrades, auto-pay migration, free security & tech support trials, bill credit discounts).
   - Instant calculation of Simulated Risk Delta, Annual Gross Loss Prevented, and Net Retention ROI.

---

## Getting Started

### 1. Prerequisites
Ensure you are using Python 3.10. Install the required libraries using pip:
```bash
pip install pandas numpy scikit-learn joblib fastapi uvicorn
```

### 2. Setup the Google Colab Model Artifacts
Instead of training the model locally, copy the model files downloaded from your Colab notebook into the `models/` directory:
* `model.joblib`: The trained Random Forest classifier.
* `scaler.joblib`: The fitted `StandardScaler` used to normalize inputs.
* `columns.json`: The exact list and sequence of training feature columns.

*(Note: If you ever want to re-train a baseline model locally, you can still run `python train_and_save.py` to regenerate these files.)*

### 3. Run the FastAPI Application
Launch the dev server using Uvicorn:
```bash
uvicorn app:app --reload --port 8000
```

### 4. Open the Web Dashboard
Once the server starts running, open your web browser and navigate to:
```
http://127.0.0.1:8000
```
Input customer details to see predictions update in real-time.
