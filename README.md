# ChurnShield AI - Customer Retention Dashboard

ChurnShield AI is a complete web application designed to predict telecom customer churn in real-time and provide tailored marketing & customer service retention recommendations.

The app uses a **Balanced Random Forest Classifier** trained on historical customer demographics, subscribed service records, contract terms, and billing metrics to compute accurate churn probability scores.

---

## Key Features

1. **Interactive Customer Profiler:** Real-time form sliders and toggles with automatic charge estimating and reactive input controls (e.g. graying out internet add-ons if a customer does not subscribe to internet service).
2. **Dynamic Risk Gauge:** Visual circular SVG gauge displaying risk percentage with matching threat level color tags (Low, Medium, High).
3. **Driver Diagnostics:** Transparent audit log highlighting the specific customer attributes driving their churn score (e.g. monthly billing spikes, short customer tenure, manual payment methods).
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

### 2. Train and Save the Model
Before running the server, you need to generate the machine learning artifacts (model, scaler, and column structure):
```bash
python train_and_save.py
```
This script will download the dataset, execute the cleaning and scale transforms, train the classifier, and save the binary files to the `models/` directory.

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
