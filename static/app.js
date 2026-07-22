document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const predictForm = document.getElementById("predict-form");
    const tenureInput = document.getElementById("tenure");
    const tenureVal = document.getElementById("tenure-val");
    const chargesInput = document.getElementById("MonthlyCharges");
    const chargesVal = document.getElementById("charges-val");
    const totalChargesInput = document.getElementById("TotalCharges");
    const internetServiceSelect = document.getElementById("InternetService");
    const internetAddons = document.querySelectorAll(".internet-addons select");
    const internetAddonsContainers = document.querySelectorAll(".internet-addons");

    const submitBtn = document.getElementById("submit-btn");
    const btnText = submitBtn.querySelector(".btn-text");
    const spinner = submitBtn.querySelector(".spinner");

    const resultsPlaceholder = document.getElementById("results-placeholder");
    const resultsDisplay = document.getElementById("results-display");
    const riskBadge = document.getElementById("risk-badge");
    const gaugePercentage = document.getElementById("gauge-percentage");
    const gaugeFill = document.getElementById("gauge-fill");
    const riskFactorsList = document.getElementById("risk-factors-list");
    const actionItemsContainer = document.getElementById("action-items-container");

    // Max stroke-dasharray of SVG gauge semi-circle
    const MAX_DASH_OFFSET = 125.6;

    // 1. Dynamic slider bubble updates
    tenureInput.addEventListener("input", (e) => {
        tenureVal.textContent = e.target.value;
        calculateTotalCharges();
    });

    chargesInput.addEventListener("input", (e) => {
        chargesVal.textContent = parseFloat(e.target.value).toFixed(2);
        calculateTotalCharges();
    });

    // 2. Auto-calculate total charges
    function calculateTotalCharges() {
        const tenure = parseInt(tenureInput.value) || 0;
        const monthly = parseFloat(chargesInput.value) || 0;
        totalChargesInput.value = (tenure * monthly).toFixed(2);
    }
    // Initialize calculation
    calculateTotalCharges();

    // 3. UX Micro-interaction: Disable internet addons if no internet service
    internetServiceSelect.addEventListener("change", () => {
        const hasNoInternet = internetServiceSelect.value === "No";
        internetAddons.forEach(select => {
            if (hasNoInternet) {
                select.value = "No internet service";
                select.disabled = true;
            } else {
                if (select.value === "No internet service") {
                    select.value = "No";
                }
                select.disabled = false;
            }
        });

        // Add grey-out visual effect
        internetAddonsContainers.forEach(container => {
            if (hasNoInternet) {
                container.classList.add("disabled");
            } else {
                container.classList.remove("disabled");
            }
        });
    });

    // Trigger initial internet service check
    internetServiceSelect.dispatchEvent(new Event("change"));

    // 4. Form Submit & Prediction Call
    predictForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Show loading state
        btnText.textContent = "Calculating...";
        spinner.classList.remove("hidden");
        submitBtn.disabled = true;

        // Extract Form Data
        const formData = new FormData(predictForm);
        const payload = {
            gender: formData.get("gender"),
            SeniorCitizen: parseInt(formData.get("SeniorCitizen")),
            Partner: formData.get("Partner"),
            Dependents: formData.get("Dependents"),
            tenure: parseInt(formData.get("tenure")),
            PhoneService: formData.get("PhoneService"),
            MultipleLines: formData.get("MultipleLines"),
            InternetService: formData.get("InternetService"),
            OnlineSecurity: formData.get("OnlineSecurity"),
            OnlineBackup: formData.get("OnlineBackup"),
            DeviceProtection: formData.get("DeviceProtection"),
            TechSupport: formData.get("TechSupport"),
            StreamingTV: formData.get("StreamingTV"),
            StreamingMovies: formData.get("StreamingMovies"),
            Contract: formData.get("Contract"),
            PaperlessBilling: formData.get("PaperlessBilling"),
            PaymentMethod: formData.get("PaymentMethod"),
            MonthlyCharges: parseFloat(formData.get("MonthlyCharges")),
            TotalCharges: parseFloat(formData.get("TotalCharges")) || null
        };

        try {
            const response = await fetch("/predict", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("Prediction API request failed.");
            }

            const data = await response.json();
            displayResults(data, payload);
        } catch (error) {
            console.error(error);
            alert("Error communicating with Churn Prediction server. Make sure FastAPI app.py is running!");
        } finally {
            // Restore button state
            btnText.textContent = "Predict Churn Risk";
            spinner.classList.add("hidden");
            submitBtn.disabled = false;
        }
    });

    // 5. Populate and Animate Results Display
    function displayResults(data, inputs) {
        // Toggle view container
        resultsPlaceholder.classList.add("hidden");
        resultsDisplay.classList.remove("hidden");

        const probPercent = Math.round(data.probability * 100);
        const riskLevel = data.risk_level.toLowerCase(); // 'low', 'medium', 'high'

        // Update badge
        riskBadge.textContent = `${data.risk_level} Risk`;
        riskBadge.className = `badge ${riskLevel}`;

        // Update probability percentage text
        gaugePercentage.textContent = `${probPercent}%`;

        // Animate SVG Gauge Fill
        // Set stroke-dashoffset: 125.6 is empty, 0 is full
        const offset = MAX_DASH_OFFSET - (data.probability * MAX_DASH_OFFSET);
        gaugeFill.style.strokeDashoffset = offset;
        gaugeFill.className = `gauge-fill ${riskLevel}`;

        // Populate Key Churn Drivers
        riskFactorsList.innerHTML = "";
        if (data.risk_factors && data.risk_factors.length > 0) {
            data.risk_factors.forEach(factor => {
                const li = document.createElement("li");
                li.textContent = factor;
                riskFactorsList.appendChild(li);
            });
        } else {
            const li = document.createElement("li");
            li.textContent = "No significant risk factors identified.";
            li.style.color = "var(--clr-green)";
            li.style.background = "rgba(16, 185, 129, 0.05)";
            riskFactorsList.appendChild(li);
        }

        // Generate tailored retention strategies
        generateRecommendations(inputs, data.probability);
    }

    // 6. Generate Custom Recommendations UI Cards
    function generateRecommendations(inputs, probability) {
        actionItemsContainer.innerHTML = "";
        const strategies = [];

        // Contract strategy
        if (inputs.Contract === "Month-to-month") {
            strategies.push({
                icon: "📄",
                title: "Contract Upgrade Discount",
                desc: "Propose a 15% discount on monthly charges if the customer upgrades to a 1-year contract."
            });
        }

        // Fiber optic audit strategy
        if (inputs.InternetService === "Fiber optic") {
            strategies.push({
                icon: "⚡",
                title: "Fiber Service Speed Audit",
                desc: "Fiber optic lines have high correlation with churn. Audit speed stability and offer $10/month credit for 6 months."
            });
        }

        // Billing payment method strategy
        if (inputs.PaymentMethod === "Electronic check") {
            strategies.push({
                icon: "💳",
                title: "Switch to Auto-Pay Incentive",
                desc: "Offer a one-time $15 account credit to enroll in Credit Card or Bank Auto-Pay, removing manual payment friction."
            });
        }

        // Addon strategies
        if (inputs.InternetService !== "No" && (inputs.OnlineSecurity === "No" || inputs.TechSupport === "No")) {
            strategies.push({
                icon: "🛡️",
                title: "Premium Security & Support Bundle",
                desc: "Include a 3-month free trial of Online Security and Tech Support to increase customer ecosystem attachment."
            });
        }

        // Short tenure strategy
        if (inputs.tenure < 12) {
            strategies.push({
                icon: "📞",
                title: "Proactive Onboarding Call",
                desc: "Early tenure customer. Assign customer success representative to schedule a service satisfaction check-in."
            });
        }

        // Fallback or generic loyalty offer if risk is low
        if (strategies.length === 0 || probability < 0.2) {
            strategies.push({
                icon: "🎁",
                title: "Loyalty Perks Offer",
                desc: "Low-risk customer. Send an appreciation email offering a free upgrade to high-speed streaming packages."
            });
        }

        // Append to UI
        strategies.forEach(item => {
            const card = document.createElement("div");
            card.className = "action-card";
            card.innerHTML = `
                <div class="action-icon">${item.icon}</div>
                <div class="action-content">
                    <h4>${item.title}</h4>
                    <p>${item.desc}</p>
                </div>
            `;
            actionItemsContainer.appendChild(card);
        });
    }
});
