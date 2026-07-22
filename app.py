import os
import json
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# Initialize FastAPI
app = FastAPI(
    title="Customer Churn Classifier API", 
    description="Predicts customer churn probability using a balanced Random Forest model."
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
    TotalCharges: float = Field(None, description="The total amount charged to the customer")

@app.post("/predict")
def predict_churn(customer: CustomerData):
    try:
        # Create a dictionary matching the training columns with default value of 0
        input_dict = {col: 0 for col in training_columns}
        
        # Populate values
        input_dict["gender"] = 1 if customer.gender == "Female" else 0
        input_dict["SeniorCitizen"] = customer.SeniorCitizen
        input_dict["Partner"] = 1 if customer.Partner == "Yes" else 0
        input_dict["Dependents"] = 1 if customer.Dependents == "Yes" else 0
        input_dict["tenure"] = customer.tenure
        input_dict["PhoneService"] = 1 if customer.PhoneService == "Yes" else 0
        input_dict["MultipleLines"] = 1 if customer.MultipleLines == "Yes" else 0
        
        # Binary internet services mapping (using attribute names)
        internet_features = ["OnlineSecurity", "OnlineBackup", "DeviceProtection", 
                             "TechSupport", "StreamingTV", "StreamingMovies"]
        for feat in internet_features:
            val = getattr(customer, feat)
            input_dict[feat] = 1 if val == "Yes" else 0
            
        input_dict["PaperlessBilling"] = 1 if customer.PaperlessBilling == "Yes" else 0
        input_dict["MonthlyCharges"] = customer.MonthlyCharges
        
        # Default TotalCharges to (MonthlyCharges * tenure) if not provided/0
        total_charges = customer.TotalCharges
        if total_charges is None or total_charges == 0:
            total_charges = customer.MonthlyCharges * customer.tenure
        input_dict["TotalCharges"] = total_charges
        
        # One-hot encoded variables mapping
        # 1. InternetService
        if customer.InternetService == "Fiber optic":
            input_dict["InternetService_Fiber optic"] = 1
        elif customer.InternetService == "No":
            input_dict["InternetService_No"] = 1
            
        # 2. Contract
        if customer.Contract == "One year":
            input_dict["Contract_One year"] = 1
        elif customer.Contract == "Two year":
            input_dict["Contract_Two year"] = 1
            
        # 3. PaymentMethod
        if customer.PaymentMethod == "Credit card (automatic)":
            input_dict["PaymentMethod_Credit card (automatic)"] = 1
        elif customer.PaymentMethod == "Electronic check":
            input_dict["PaymentMethod_Electronic check"] = 1
        elif customer.PaymentMethod == "Mailed check":
            input_dict["PaymentMethod_Mailed check"] = 1

        # Create DataFrame ensuring columns are in the exact training order
        df_input = pd.DataFrame([input_dict], columns=training_columns)
        
        # Scale numerical variables
        num_cols = ["tenure", "MonthlyCharges", "TotalCharges"]
        df_input[num_cols] = scaler.transform(df_input[num_cols])
        
        # Predict probability & class
        churn_prob = float(model.predict_proba(df_input)[0, 1])
        churn_prediction = int(model.predict(df_input)[0])
        
        # Identify top risk factors dynamically
        risk_factors = []
        if customer.Contract == "Month-to-month":
            risk_factors.append("Month-to-month contract (flexible but high risk)")
        if customer.tenure < 12:
            risk_factors.append(f"Short tenure ({customer.tenure} months) - high early-churn susceptibility")
        if customer.InternetService == "Fiber optic":
            risk_factors.append("Fiber Optic service - high correlation with billing/speed friction")
        if customer.PaymentMethod == "Electronic check":
            risk_factors.append("Electronic check payment - highest churn correlation among payment types")
        if customer.MonthlyCharges > 70.0:
            risk_factors.append(f"High monthly charges (${customer.MonthlyCharges:.2f})")
        if customer.OnlineSecurity == "No":
            risk_factors.append("No Online Security addon")
        if customer.TechSupport == "No":
            risk_factors.append("No Tech Support addon")

        return {
            "probability": churn_prob,
            "prediction": churn_prediction,
            "risk_level": "High" if churn_prob >= 0.6 else ("Medium" if churn_prob >= 0.3 else "Low"),
            "risk_factors": risk_factors
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Mount static files (static folder will hold index.html, style.css, app.js)
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def get_index():
    return FileResponse("static/index.html")
