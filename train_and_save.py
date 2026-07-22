import os
import json
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
import joblib

def main():
    print("Loading dataset...")
    dataset_url = "https://raw.githubusercontent.com/treselle-systems/customer_churn_analysis/master/WA_Fn-UseC_-Telco-Customer-Churn.csv"
    df = pd.read_csv(dataset_url)
    
    print("Preprocessing data...")
    # 1. Drop redundant columns
    df_clean = df.drop(columns=['customerID'])

    # 2. Clean TotalCharges (convert to numeric, replace spaces with NaN, fill with 0.0)
    df_clean['TotalCharges'] = pd.to_numeric(df_clean['TotalCharges'], errors='coerce').fillna(0.0)

    # 3. Map binary columns to 1/0
    binary_cols = ['Partner', 'Dependents', 'PhoneService', 'MultipleLines', 
                   'OnlineSecurity', 'OnlineBackup', 'DeviceProtection', 
                   'TechSupport', 'StreamingTV', 'StreamingMovies', 
                   'PaperlessBilling', 'Churn']
    for col in binary_cols:
        df_clean[col] = df_clean[col].apply(lambda x: 1 if x == 'Yes' else 0)

    df_clean['gender'] = df_clean['gender'].apply(lambda x: 1 if x == 'Female' else 0)

    # 4. One-Hot Encode multi-class categories (Contract, InternetService, PaymentMethod)
    multi_cat_cols = ['InternetService', 'Contract', 'PaymentMethod']
    df_clean = pd.get_dummies(df_clean, columns=multi_cat_cols, drop_first=True)

    # Convert bool columns to int
    bool_cols = df_clean.select_dtypes(include=['bool']).columns
    df_clean[bool_cols] = df_clean[bool_cols].astype(int)

    # Separate X and y
    X = df_clean.drop(columns=['Churn'])
    y = df_clean['Churn']

    # Scale numerical features (tenure, MonthlyCharges, TotalCharges)
    print("Fitting Scaler and Model...")
    scaler = StandardScaler()
    num_cols = ['tenure', 'MonthlyCharges', 'TotalCharges']
    
    X_scaled = X.copy()
    X_scaled[num_cols] = scaler.fit_transform(X[num_cols])

    # Train Balanced Random Forest
    rf_balanced = RandomForestClassifier(class_weight='balanced', max_depth=8, random_state=42)
    rf_balanced.fit(X_scaled, y)

    # Ensure models directory exists
    os.makedirs('models', exist_ok=True)

    # Save artifacts
    print("Saving artifacts to 'models/'...")
    joblib.dump(rf_balanced, 'models/model.joblib')
    joblib.dump(scaler, 'models/scaler.joblib')
    
    # Save training columns list to keep column order consistent
    columns = list(X.columns)
    with open('models/columns.json', 'w') as f:
        json.dump(columns, f)

    print("Success! Model, Scaler, and Column Schema saved in 'models/'.")

if __name__ == "__main__":
    main()
