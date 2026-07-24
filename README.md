# Churn Analyzer AI - Customer Retention Dashboard

Churn Analyzer AI is a complete web application designed to predict telecom customer churn in real-time and provide tailored marketing & customer service retention recommendations.

The app uses a **Random Forest Classifier** trained on Google Colab to compute accurate churn probability scores.

---

## Key Features

1. **Interactive Customer Profiler:** Real-time form sliders and toggles with automatic charge estimating and reactive input controls (e.g. graying out internet add-ons if a customer does not subscribe to internet service).
2. **Dynamic Risk Gauge:** Visual circular SVG gauge displaying risk percentage with matching threat level color tags (Low, Medium, High).
3. **Model-Driven Driver Diagnostics:** Transparent audit log dynamically ranking the specific customer attributes driving the churn score, calculated directly from the model's feature importances.
4. **Tailored Retention Cards:** Actionable business strategies dynamically recommended depending on risk indicators (e.g. contract migration incentives, auto-pay bonuses, support trials).

---

## Technical Architecture

* **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10) - serves index templates and implements the machine learning prediction endpoint.
* **Frontend:** Vanilla HTML5, premium responsive custom CSS (glassmorphism dark theme), and Vanilla JS for gauge animations and recommendation engines.
* **Model Pipeline:** Built using `scikit-learn`, `pandas`, and serialized with `joblib`. Preprocessing normalizes numeric variables using `StandardScaler` and applies drop-first dummy encoding.

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
