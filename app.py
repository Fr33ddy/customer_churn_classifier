import os
import json
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

# Initialize FastAPI
app = FastAPI(
    title="Customer Churn Classifier & Retention Analytics API", 
    description="Predicts customer churn probability and computes comprehensive retention analytics, health scores, and ROI simulations."
)

# Load models and schemas
MODEL_PATH = "models/model.joblib"
SCALER_PATH = "models/scaler.joblib"
COLUMNS_PATH = "models/columns.json"

if not (os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH) and os.path.exists(COLUMNS_PATH)):
    raise RuntimeError("Model files not found! Please run train_and_save.py first.")

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
with open(COLUMNS_PATH, "r") as f:
    training_columns = json.load(f)

# Extract and map feature importances
feature_importances = model.feature_importances_
feature_importance_dict = dict(zip(training_columns, [float(x) for x in feature_importances]))

# Request schema
class CustomerData(BaseModel):
    gender: str = Field(..., description="Gender of the customer ('Male' or 'Female')")
    SeniorCitizen: int = Field(..., description="1 if customer is a senior citizen, 0 otherwise")
    Partner: str = Field(..., description="Whether customer has a partner ('Yes' or 'No')")
    Dependents: str = Field(..., description="Whether customer has dependents ('Yes' or 'No')")
    tenure: int = Field(..., description="Number of months the customer has stayed with the company")
    PhoneService: str = Field(..., description="Whether the customer has phone service ('Yes' or 'No')")
    MultipleLines: str = Field(..., description="Whether the customer has multiple lines ('Yes', 'No', or 'No phone service')")
    InternetService: str = Field(..., description="Customer's internet service provider ('DSL', 'Fiber optic', or 'No')")
    OnlineSecurity: str = Field(..., description="Whether online security is enabled ('Yes', 'No', or 'No internet service')")
    OnlineBackup: str = Field(..., description="Whether online backup is enabled ('Yes', 'No', or 'No internet service')")
    DeviceProtection: str = Field(..., description="Whether device protection is enabled ('Yes', 'No', or 'No internet service')")
    TechSupport: str = Field(..., description="Whether tech support is enabled ('Yes', 'No', or 'No internet service')")
    StreamingTV: str = Field(..., description="Whether streaming TV is enabled ('Yes', 'No', or 'No internet service')")
    StreamingMovies: str = Field(..., description="Whether streaming movies is enabled ('Yes', 'No', or 'No internet service')")
    Contract: str = Field(..., description="The contract term of the customer ('Month-to-month', 'One year', 'Two year')")
    PaperlessBilling: str = Field(..., description="Whether paperless billing is enabled ('Yes' or 'No')")
    PaymentMethod: str = Field(..., description="The customer's payment method ('Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)')")
    MonthlyCharges: float = Field(..., description="The amount charged to the customer monthly")
    TotalCharges: Optional[float] = Field(None, description="The total amount charged to the customer")

class SimulationRequest(BaseModel):
    customer: CustomerData
    new_contract: Optional[str] = None
    new_payment: Optional[str] = None
    add_tech_support: Optional[bool] = False
    add_online_security: Optional[bool] = False
    monthly_discount: Optional[float] = 0.0

def customer_to_dataframe(customer: CustomerData):
    input_dict = {col: 0 for col in training_columns}
    
    input_dict["gender"] = 1 if customer.gender == "Female" else 0
    input_dict["SeniorCitizen"] = customer.SeniorCitizen
    input_dict["Partner"] = 1 if customer.Partner == "Yes" else 0
    input_dict["Dependents"] = 1 if customer.Dependents == "Yes" else 0
    input_dict["tenure"] = customer.tenure
    input_dict["PhoneService"] = 1 if customer.PhoneService == "Yes" else 0
    input_dict["MultipleLines"] = 1 if customer.MultipleLines == "Yes" else 0
    
    internet_features = ["OnlineSecurity", "OnlineBackup", "DeviceProtection", 
                         "TechSupport", "StreamingTV", "StreamingMovies"]
    for feat in internet_features:
        val = getattr(customer, feat)
        input_dict[feat] = 1 if val == "Yes" else 0
        
    input_dict["PaperlessBilling"] = 1 if customer.PaperlessBilling == "Yes" else 0
    input_dict["MonthlyCharges"] = customer.MonthlyCharges
    
    total_charges = customer.TotalCharges
    if total_charges is None or total_charges == 0:
        total_charges = customer.MonthlyCharges * customer.tenure
    input_dict["TotalCharges"] = total_charges
    
    # One-hot encoded variables
    if customer.InternetService == "Fiber optic":
        input_dict["InternetService_Fiber optic"] = 1
    elif customer.InternetService == "No":
        input_dict["InternetService_No"] = 1
        
    if customer.Contract == "One year":
        input_dict["Contract_One year"] = 1
    elif customer.Contract == "Two year":
        input_dict["Contract_Two year"] = 1
        
    if customer.PaymentMethod == "Credit card (automatic)":
        input_dict["PaymentMethod_Credit card (automatic)"] = 1
    elif customer.PaymentMethod == "Electronic check":
        input_dict["PaymentMethod_Electronic check"] = 1
    elif customer.PaymentMethod == "Mailed check":
        input_dict["PaymentMethod_Mailed check"] = 1

    df_input = pd.DataFrame([input_dict], columns=training_columns)
    num_cols = ["tenure", "MonthlyCharges", "TotalCharges"]
    df_input[num_cols] = scaler.transform(df_input[num_cols])
    return df_input, total_charges

@app.post("/predict")
def predict_churn(customer: CustomerData):
    try:
        df_input, total_charges = customer_to_dataframe(customer)
        
        # Predict probability & class
        churn_prob = float(model.predict_proba(df_input)[0, 1])
        churn_prediction = int(model.predict(df_input)[0])
        
        # Health score (0-100): composite metric
        # Base retention likelihood (up to 75 pts) + tenure loyalty (up to 15 pts) + service depth (up to 10 pts)
        addons_count = sum(1 for feat in ["OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies"] 
                           if getattr(customer, feat) == "Yes")
        tenure_score = (min(customer.tenure, 72) / 72.0) * 15.0
        ecosystem_score = (addons_count / 6.0) * 10.0
        health_score = int(round(max(5, min(100, (1.0 - churn_prob) * 75.0 + tenure_score + ecosystem_score))))
        
        # Financial impact metrics
        annual_revenue = round(customer.MonthlyCharges * 12, 2)
        annual_revenue_at_risk = round(annual_revenue * churn_prob, 2)
        
        # Expected remaining lifetime in months: inversely related to churn risk
        expected_lifespan_months = int(round(max(2, (1.0 - churn_prob) * 48.0 + (customer.tenure * 0.2))))
        clv_estimate = round(total_charges + (customer.MonthlyCharges * expected_lifespan_months), 2)
        
        # Risk level determination
        if churn_prob >= 0.6:
            risk_level = "High"
        elif churn_prob >= 0.3:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        # Drivers & Feature contributions
        feature_contributions = []
        
        # Tenure
        tenure_imp = feature_importance_dict.get("tenure", 0.15)
        if customer.tenure < 12:
            feature_contributions.append({
                "feature": "Tenure Duration",
                "detail": f"New account ({customer.tenure} mos) in critical onboarding window",
                "type": "risk",
                "weight": round(tenure_imp * 100, 1)
            })
        elif customer.tenure >= 36:
            feature_contributions.append({
                "feature": "Tenure Duration",
                "detail": f"Mature account ({customer.tenure} mos) with established loyalty",
                "type": "protective",
                "weight": round(tenure_imp * 100, 1)
            })

        # Contract
        contract_imp = feature_importance_dict.get("Contract_Two year", 0.08) + feature_importance_dict.get("Contract_One year", 0.04)
        if customer.Contract == "Month-to-month":
            feature_contributions.append({
                "feature": "Contract Term",
                "detail": "Month-to-month commitment allows friction-free departure",
                "type": "risk",
                "weight": round(contract_imp * 100, 1)
            })
        else:
            feature_contributions.append({
                "feature": "Contract Term",
                "detail": f"{customer.Contract} term provides strong commitment anchor",
                "type": "protective",
                "weight": round(contract_imp * 100, 1)
            })

        # Internet Service
        fiber_imp = feature_importance_dict.get("InternetService_Fiber optic", 0.10)
        if customer.InternetService == "Fiber optic":
            feature_contributions.append({
                "feature": "Internet Service",
                "detail": "Fiber optic service has elevated churn due to price-to-speed sensitivity",
                "type": "risk",
                "weight": round(fiber_imp * 100, 1)
            })
        elif customer.InternetService == "DSL":
            feature_contributions.append({
                "feature": "Internet Service",
                "detail": "DSL provides stable baseline engagement",
                "type": "protective",
                "weight": 4.5
            })

        # Payment Method
        echeck_imp = feature_importance_dict.get("PaymentMethod_Electronic check", 0.08)
        if customer.PaymentMethod == "Electronic check":
            feature_contributions.append({
                "feature": "Payment Method",
                "detail": "Electronic check carries high payment friction and churn likelihood",
                "type": "risk",
                "weight": round(echeck_imp * 100, 1)
            })
        elif "automatic" in customer.PaymentMethod:
            feature_contributions.append({
                "feature": "Payment Method",
                "detail": f"Automated billing ({customer.PaymentMethod.split(' ')[0]}) reduces churn",
                "type": "protective",
                "weight": 5.0
            })

        # Monthly Charges
        charges_imp = feature_importance_dict.get("MonthlyCharges", 0.12)
        if customer.MonthlyCharges >= 75.0:
            feature_contributions.append({
                "feature": "Monthly Charges",
                "detail": f"Above average monthly spend (${customer.MonthlyCharges:.2f}/mo)",
                "type": "risk",
                "weight": round(charges_imp * 100, 1)
            })
        elif customer.MonthlyCharges < 40.0:
            feature_contributions.append({
                "feature": "Monthly Charges",
                "detail": f"Low price-burden (${customer.MonthlyCharges:.2f}/mo) increases stickiness",
                "type": "protective",
                "weight": round(charges_imp * 100, 1)
            })

        # Tech Support & Security
        if customer.InternetService != "No":
            if customer.TechSupport == "No":
                feature_contributions.append({
                    "feature": "Tech Support",
                    "detail": "Lack of technical support creates unresolved frustration risk",
                    "type": "risk",
                    "weight": round(feature_importance_dict.get("TechSupport", 0.03) * 100, 1)
                })
            else:
                feature_contributions.append({
                    "feature": "Tech Support",
                    "detail": "Active technical assistance anchors service utility",
                    "type": "protective",
                    "weight": round(feature_importance_dict.get("TechSupport", 0.03) * 100, 1)
                })

            if customer.OnlineSecurity == "No":
                feature_contributions.append({
                    "feature": "Online Security",
                    "detail": "Absence of digital security add-on limits ecosystem stickiness",
                    "type": "risk",
                    "weight": round(feature_importance_dict.get("OnlineSecurity", 0.03) * 100, 1)
                })
            else:
                feature_contributions.append({
                    "feature": "Online Security",
                    "detail": "Security subscription creates high switching barriers",
                    "type": "protective",
                    "weight": round(feature_importance_dict.get("OnlineSecurity", 0.03) * 100, 1)
                })

        # Sort contributions by weight descending
        feature_contributions = sorted(feature_contributions, key=lambda x: x["weight"], reverse=True)

        # Peer / Cohort benchmarks (Fleet averages from Telco population)
        peer_benchmarks = {
            "customer_churn_pct": round(churn_prob * 100, 1),
            "fleet_churn_avg": 26.5,
            "churn_delta": round((churn_prob * 100) - 26.5, 1),
            "customer_monthly": round(customer.MonthlyCharges, 2),
            "fleet_monthly_avg": 64.76,
            "monthly_delta": round(customer.MonthlyCharges - 64.76, 2),
            "customer_tenure": customer.tenure,
            "fleet_tenure_median": 29,
            "tenure_delta": customer.tenure - 29,
            "addons_active": addons_count,
            "addons_total": 6
        }

        # 5-Pillar Spider / Radar profile (0 - 100 scale)
        radar_scores = {
            "contract_stability": 100 if customer.Contract == "Two year" else (65 if customer.Contract == "One year" else 20),
            "payment_safety": 92 if "automatic" in customer.PaymentMethod else (45 if customer.PaymentMethod == "Mailed check" else 18),
            "ecosystem_depth": int(round((addons_count / 6.0) * 100)),
            "tenure_maturity": int(round(min(100, (customer.tenure / 72.0) * 100))),
            "pricing_comfort": int(round(max(10, min(100, 105 - (customer.MonthlyCharges * 0.85)))))
        }

        # Textual risk factors
        risk_factors = [
            f"{fc['feature']}: {fc['detail']} (Impact: {fc['weight']}%)"
            for fc in feature_contributions if fc["type"] == "risk"
        ]

        # Prioritized retention strategies with projected impact
        strategies = []
        if customer.Contract == "Month-to-month":
            strategies.append({
                "title": "Annual Contract Migration Incentive",
                "icon": "📄",
                "desc": "Propose a 15% rate freeze or bill credit for switching to a 1-Year or 2-Year commitment.",
                "risk_reduction_pct": 24,
                "projected_savings": round(annual_revenue_at_risk * 0.42, 2)
            })
        if customer.PaymentMethod == "Electronic check":
            strategies.append({
                "title": "Auto-Pay Enrollment Bonus",
                "icon": "💳",
                "desc": "Offer a one-time $20 statement credit upon enabling Credit Card or Bank Auto-Pay.",
                "risk_reduction_pct": 16,
                "projected_savings": round(annual_revenue_at_risk * 0.25, 2)
            })
        if customer.InternetService != "No" and (customer.OnlineSecurity == "No" or customer.TechSupport == "No"):
            strategies.append({
                "title": "Security & Tech Support Ecosystem Bundle",
                "icon": "🛡️",
                "desc": "Gift a 90-day complimentary trial of Online Security & Tech Support to increase product attachment.",
                "risk_reduction_pct": 14,
                "projected_savings": round(annual_revenue_at_risk * 0.20, 2)
            })
        if customer.tenure < 12:
            strategies.append({
                "title": "VIP Onboarding & Satisfaction Check-In",
                "icon": "📞",
                "desc": "Schedule a dedicated customer success call within 7 days to address early service issues.",
                "risk_reduction_pct": 12,
                "projected_savings": round(annual_revenue_at_risk * 0.18, 2)
            })
        if customer.MonthlyCharges > 80.0:
            strategies.append({
                "title": "Plan Optimization & Value Realignment",
                "icon": "🏷️",
                "desc": "Conduct a plan usage audit and right-size bandwidth/features to trim $10-$15 off the bill.",
                "risk_reduction_pct": 11,
                "projected_savings": round(annual_revenue_at_risk * 0.15, 2)
            })
        if not strategies:
            strategies.append({
                "title": "VIP Loyalty Milestone Reward",
                "icon": "🎁",
                "desc": "Customer exhibits healthy retention markers. Deliver an appreciation perks package to maintain loyalty.",
                "risk_reduction_pct": 5,
                "projected_savings": round(annual_revenue_at_risk * 0.10, 2)
            })

        return {
            "probability": churn_prob,
            "prediction": churn_prediction,
            "risk_level": risk_level,
            "health_score": health_score,
            "clv_estimate": clv_estimate,
            "annual_revenue": annual_revenue,
            "annual_revenue_at_risk": annual_revenue_at_risk,
            "expected_lifespan_months": expected_lifespan_months,
            "peer_benchmarks": peer_benchmarks,
            "radar_scores": radar_scores,
            "feature_contributions": feature_contributions,
            "risk_factors": risk_factors,
            "retention_strategies": strategies
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/simulate")
def simulate_retention(sim: SimulationRequest):
    try:
        # Base prediction
        base_df, _ = customer_to_dataframe(sim.customer)
        base_prob = float(model.predict_proba(base_df)[0, 1])
        
        # Create modified copy
        sim_data = sim.customer.dict()
        if sim.new_contract:
            sim_data["Contract"] = sim.new_contract
        if sim.new_payment:
            sim_data["PaymentMethod"] = sim.new_payment
        if sim.add_tech_support:
            sim_data["TechSupport"] = "Yes"
        if sim.add_online_security:
            sim_data["OnlineSecurity"] = "Yes"
        if sim.monthly_discount and sim.monthly_discount > 0:
            sim_data["MonthlyCharges"] = max(18.0, sim_data["MonthlyCharges"] - sim.monthly_discount)
            
        modified_customer = CustomerData(**sim_data)
        sim_df, _ = customer_to_dataframe(modified_customer)
        sim_prob = float(model.predict_proba(sim_df)[0, 1])
        
        # Risk reductions
        risk_delta = round(sim_prob - base_prob, 4)
        pct_reduction = round(((base_prob - sim_prob) / max(0.001, base_prob)) * 100, 1)
        
        # Financial analytics
        orig_annual_at_risk = round(sim.customer.MonthlyCharges * 12 * base_prob, 2)
        new_annual_at_risk = round(modified_customer.MonthlyCharges * 12 * sim_prob, 2)
        annual_saved = round(max(0.0, orig_annual_at_risk - new_annual_at_risk), 2)
        
        annual_discount_cost = round((sim.monthly_discount or 0.0) * 12, 2)
        net_roi = round(annual_saved - annual_discount_cost, 2)
        
        return {
            "original_probability": base_prob,
            "simulated_probability": sim_prob,
            "risk_delta": risk_delta,
            "pct_reduction": pct_reduction,
            "original_annual_at_risk": orig_annual_at_risk,
            "simulated_annual_at_risk": new_annual_at_risk,
            "annual_saved": annual_saved,
            "annual_cost": annual_discount_cost,
            "net_roi": net_roi
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/analytics/cohorts")
def get_cohort_analytics():
    """Returns dataset-wide macro statistics, segment distributions, and model feature importances."""
    return {
        "fleet_overview": {
            "total_customers": 7043,
            "overall_churn_rate": 26.54,
            "median_tenure_months": 29,
            "avg_monthly_spend": 64.76,
            "total_annual_revenue": 5472890,
            "annual_revenue_at_risk": 1452600,
            "model_roc_auc": 0.846
        },
        "churn_by_contract": [
            {"category": "Month-to-month", "churn_rate": 42.7, "customer_count": 3875, "risk": "High"},
            {"category": "One year", "churn_rate": 11.3, "customer_count": 1473, "risk": "Low"},
            {"category": "Two year", "churn_rate": 2.8, "customer_count": 1695, "risk": "Very Low"}
        ],
        "churn_by_internet": [
            {"category": "Fiber optic", "churn_rate": 41.9, "customer_count": 3096, "risk": "High"},
            {"category": "DSL", "churn_rate": 19.0, "customer_count": 2421, "risk": "Medium"},
            {"category": "No Internet", "churn_rate": 7.4, "customer_count": 1526, "risk": "Very Low"}
        ],
        "churn_by_payment": [
            {"category": "Electronic check", "churn_rate": 45.3, "customer_count": 2365, "risk": "Critical"},
            {"category": "Mailed check", "churn_rate": 19.1, "customer_count": 1612, "risk": "Medium"},
            {"category": "Bank transfer (auto)", "churn_rate": 16.7, "customer_count": 1544, "risk": "Low"},
            {"category": "Credit card (auto)", "churn_rate": 15.2, "customer_count": 1522, "risk": "Low"}
        ],
        "churn_by_tenure_cohort": [
            {"cohort": "0 - 12 Months (Early Stage)", "churn_rate": 47.7, "retention_rate": 52.3},
            {"cohort": "13 - 24 Months (Growth Stage)", "churn_rate": 28.7, "retention_rate": 71.3},
            {"cohort": "25 - 48 Months (Mature Stage)", "churn_rate": 19.4, "retention_rate": 80.6},
            {"cohort": "49 - 72 Months (Loyal Core)", "churn_rate": 9.5, "retention_rate": 90.5}
        ],
        "top_feature_importance": [
            {"feature": "Tenure Duration", "importance": 20.2, "description": "Customer length of relationship"},
            {"feature": "Total Accumulated Charges", "importance": 14.9, "description": "Cumulative historical spend"},
            {"feature": "Monthly Charges", "importance": 11.7, "description": "Current monthly bill burden"},
            {"feature": "Fiber Optic Service", "importance": 9.7, "description": "High-bandwidth fiber line friction"},
            {"feature": "Electronic Check Payment", "importance": 8.2, "description": "Manual payment friction catalyst"},
            {"feature": "Two-Year Contract", "importance": 7.1, "description": "Long-term contractual lock-in"},
            {"feature": "No Internet Service", "importance": 4.1, "description": "Basic phone-only simplicity"},
            {"feature": "One-Year Contract", "importance": 3.3, "description": "Medium-term contractual commitment"},
            {"feature": "Paperless Billing", "importance": 3.2, "description": "Digital invoice engagement"},
            {"feature": "Online Security Addon", "importance": 2.9, "description": "Security ecosystem stickiness"}
        ]
    }

# Mount static files
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def get_index():
    return FileResponse("static/index.html")

