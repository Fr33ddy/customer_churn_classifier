/**
 * Churn Analyzer AI - Enterprise Analytics Dashboard
 * Interactive Client Application Logic
 */

document.addEventListener("DOMContentLoaded", () => {
    // =========================================================================
    // DOM Element References
    // =========================================================================
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");

    // Form elements
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
    const quickAnalyzeBtn = document.getElementById("quick-analyze-btn");

    // Personas
    const personaHighRisk = document.getElementById("persona-high-risk");
    const personaLoyal = document.getElementById("persona-loyal");
    const personaMid = document.getElementById("persona-mid");
    const personaBudget = document.getElementById("persona-budget");

    // Results Display
    const resultsPlaceholder = document.getElementById("results-placeholder");
    const resultsDisplay = document.getElementById("results-display");
    const riskBadge = document.getElementById("risk-badge");
    const gaugePercentage = document.getElementById("gauge-percentage");
    const gaugeFill = document.getElementById("gauge-fill");
    const gaugeStatusNote = document.getElementById("gauge-status-note");

    const healthScoreVal = document.getElementById("health-score-val");
    const healthScoreBar = document.getElementById("health-score-bar");
    const healthStatusText = document.getElementById("health-status-text");

    const annualRiskVal = document.getElementById("annual-risk-val");
    const annualRevTotal = document.getElementById("annual-rev-total");
    const riskSeverityPill = document.getElementById("risk-severity-pill");

    const clvVal = document.getElementById("clv-val");
    const lifespanVal = document.getElementById("lifespan-val");

    // Benchmarks
    const bmChurnDelta = document.getElementById("bm-churn-delta");
    const bmMonthlyDelta = document.getElementById("bm-monthly-delta");
    const bmTenureDelta = document.getElementById("bm-tenure-delta");
    const bmAddonsVal = document.getElementById("bm-addons-val");

    const actionItemsContainer = document.getElementById("action-items-container");
    const transferToSimBtn = document.getElementById("transfer-to-sim-btn");
    const printAssessmentBtn = document.getElementById("print-assessment-btn");

    // Simulator Elements
    const simContract = document.getElementById("sim-contract");
    const simPayment = document.getElementById("sim-payment");
    const simTechSupport = document.getElementById("sim-tech-support");
    const simOnlineSecurity = document.getElementById("sim-online-security");
    const simDiscount = document.getElementById("sim-discount");
    const simDiscountVal = document.getElementById("sim-discount-val");
    const runSimBtn = document.getElementById("run-sim-btn");

    const simBaseRisk = document.getElementById("sim-base-risk");
    const simNewRisk = document.getElementById("sim-new-risk");
    const simDeltaBadge = document.getElementById("sim-delta-badge");
    const simRevenueSaved = document.getElementById("sim-revenue-saved");
    const simNetRoi = document.getElementById("sim-net-roi");
    const simCostNote = document.getElementById("sim-cost-note");
    const verdictTitle = document.getElementById("verdict-title");
    const verdictDesc = document.getElementById("verdict-desc");

    // Max stroke-dasharray of SVG gauge semi-circle
    const MAX_DASH_OFFSET = 125.6;

    // Chart.js instances storage
    let driversChartInstance = null;
    let radarChartInstance = null;
    let simChartInstance = null;
    let cohortChartsLoaded = false;

    // Current analyzed customer cache for simulator
    let currentCustomerPayload = null;
    let currentAnalysisResult = null;

    // Chart.js Theme Defaults for Dark Mode
    if (window.Chart) {
        Chart.defaults.color = "#94a3b8";
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.font.size = 11;
        Chart.defaults.borderColor = "rgba(255, 255, 255, 0.06)";
    }

    // =========================================================================
    // 1. Tab Navigation Handling
    // =========================================================================
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTabId = btn.getAttribute("data-tab");

            tabButtons.forEach(b => b.classList.remove("active"));
            tabPanes.forEach(p => p.classList.remove("active"));

            btn.classList.add("active");
            const targetPane = document.getElementById(targetTabId);
            if (targetPane) {
                targetPane.classList.add("active");
            }

            // Lazy load Cohort Analytics Tab on first view
            if (targetTabId === "tab-cohorts" && !cohortChartsLoaded) {
                loadCohortAnalytics();
            }

            // Trigger simulator sync when navigating to sandbox
            if (targetTabId === "tab-simulator" && currentCustomerPayload) {
                runSimulation();
            }
        });
    });

    // =========================================================================
    // 2. Dynamic Sliders & Calculated Inputs
    // =========================================================================
    tenureInput.addEventListener("input", (e) => {
        const val = parseInt(e.target.value) || 0;
        const years = (val / 12).toFixed(1);
        tenureVal.textContent = `${val} Months (${years} Yr)`;
        calculateTotalCharges();
    });

    chargesInput.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value) || 0;
        chargesVal.textContent = `$${val.toFixed(2)}`;
        calculateTotalCharges();
    });

    function calculateTotalCharges() {
        const tenure = parseInt(tenureInput.value) || 0;
        const monthly = parseFloat(chargesInput.value) || 0;
        totalChargesInput.value = (tenure * monthly).toFixed(2);
    }
    // Initialize
    calculateTotalCharges();

    // =========================================================================
    // 3. Internet Service Addon Dependencies
    // =========================================================================
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

        internetAddonsContainers.forEach(container => {
            if (hasNoInternet) {
                container.classList.add("disabled");
            } else {
                container.classList.remove("disabled");
            }
        });
    });
    // Trigger initial state
    internetServiceSelect.dispatchEvent(new Event("change"));

    // =========================================================================
    // 4. Persona Quick-Fill Shortcuts
    // =========================================================================
    function setFormValues(data) {
        for (const [key, val] of Object.entries(data)) {
            const el = document.getElementById(key);
            if (el) {
                el.value = val;
            }
        }
        // Update range bubbles & handlers
        tenureInput.dispatchEvent(new Event("input"));
        chargesInput.dispatchEvent(new Event("input"));
        internetServiceSelect.dispatchEvent(new Event("change"));

        // Trigger analysis automatically
        predictForm.dispatchEvent(new Event("submit"));
    }

    if (personaHighRisk) {
        personaHighRisk.addEventListener("click", () => {
            setFormValues({
                gender: "Male",
                SeniorCitizen: 0,
                Partner: "No",
                Dependents: "No",
                tenure: 8,
                PhoneService: "Yes",
                MultipleLines: "No",
                InternetService: "Fiber optic",
                OnlineSecurity: "No",
                OnlineBackup: "No",
                DeviceProtection: "No",
                TechSupport: "No",
                StreamingTV: "Yes",
                StreamingMovies: "Yes",
                Contract: "Month-to-month",
                PaperlessBilling: "Yes",
                PaymentMethod: "Electronic check",
                MonthlyCharges: 89.50
            });
        });
    }

    if (personaLoyal) {
        personaLoyal.addEventListener("click", () => {
            setFormValues({
                gender: "Female",
                SeniorCitizen: 0,
                Partner: "Yes",
                Dependents: "Yes",
                tenure: 54,
                PhoneService: "Yes",
                MultipleLines: "Yes",
                InternetService: "DSL",
                OnlineSecurity: "Yes",
                OnlineBackup: "Yes",
                DeviceProtection: "Yes",
                TechSupport: "Yes",
                StreamingTV: "No",
                StreamingMovies: "No",
                Contract: "Two year",
                PaperlessBilling: "No",
                PaymentMethod: "Credit card (automatic)",
                MonthlyCharges: 62.00
            });
        });
    }

    if (personaMid) {
        personaMid.addEventListener("click", () => {
            setFormValues({
                gender: "Female",
                SeniorCitizen: 0,
                Partner: "Yes",
                Dependents: "No",
                tenure: 18,
                PhoneService: "Yes",
                MultipleLines: "No",
                InternetService: "Fiber optic",
                OnlineSecurity: "Yes",
                OnlineBackup: "No",
                DeviceProtection: "No",
                TechSupport: "Yes",
                StreamingTV: "No",
                StreamingMovies: "Yes",
                Contract: "One year",
                PaperlessBilling: "Yes",
                PaymentMethod: "Bank transfer (automatic)",
                MonthlyCharges: 76.50
            });
        });
    }

    if (personaBudget) {
        personaBudget.addEventListener("click", () => {
            setFormValues({
                gender: "Male",
                SeniorCitizen: 1,
                Partner: "No",
                Dependents: "No",
                tenure: 15,
                PhoneService: "Yes",
                MultipleLines: "No",
                InternetService: "No",
                OnlineSecurity: "No internet service",
                OnlineBackup: "No internet service",
                DeviceProtection: "No internet service",
                TechSupport: "No internet service",
                StreamingTV: "No internet service",
                StreamingMovies: "No internet service",
                Contract: "Month-to-month",
                PaperlessBilling: "No",
                PaymentMethod: "Mailed check",
                MonthlyCharges: 22.00
            });
        });
    }

    if (quickAnalyzeBtn) {
        quickAnalyzeBtn.addEventListener("click", () => {
            if (personaHighRisk) personaHighRisk.click();
        });
    }

    // =========================================================================
    // 5. Prediction Form Submit & Deep Analytics
    // =========================================================================
    predictForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Show loading state
        btnText.textContent = "Calculating Diagnostics...";
        spinner.classList.remove("hidden");
        submitBtn.disabled = true;

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

        currentCustomerPayload = payload;

        try {
            const response = await fetch("/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("Prediction API call failed.");
            }

            const data = await response.json();
            currentAnalysisResult = data;
            displayResults(data, payload);
        } catch (error) {
            console.error(error);
            alert("Error communicating with Churn Analytics server. Make sure app.py is running!");
        } finally {
            btnText.textContent = "Run Deep Churn Analytics";
            spinner.classList.add("hidden");
            submitBtn.disabled = false;
        }
    });

    // =========================================================================
    // 6. Display Analytics Results
    // =========================================================================
    function displayResults(data, inputs) {
        resultsPlaceholder.classList.add("hidden");
        resultsDisplay.classList.remove("hidden");

        const probPercent = Math.round(data.probability * 100);
        const riskLevel = data.risk_level.toLowerCase(); // 'low', 'medium', 'high'

        // Threat Badge
        riskBadge.textContent = `${data.risk_level} Risk`;
        riskBadge.className = `badge ${riskLevel}`;

        // SVG Gauge Fill
        gaugePercentage.textContent = `${probPercent}%`;
        const offset = MAX_DASH_OFFSET - (data.probability * MAX_DASH_OFFSET);
        gaugeFill.style.strokeDashoffset = offset;
        gaugeFill.className = `gauge-fill ${riskLevel}`;

        if (probPercent > 26.5) {
            gaugeStatusNote.textContent = `+${(probPercent - 26.5).toFixed(1)}% vs Fleet Avg (26.5%)`;
            gaugeStatusNote.style.color = "var(--clr-danger)";
        } else {
            gaugeStatusNote.textContent = `${(26.5 - probPercent).toFixed(1)}% below Fleet Avg`;
            gaugeStatusNote.style.color = "var(--clr-success)";
        }

        // Customer Health Score
        healthScoreVal.textContent = data.health_score;
        healthScoreBar.style.width = `${data.health_score}%`;
        if (data.health_score >= 70) {
            healthScoreBar.style.backgroundColor = "var(--clr-success)";
            healthStatusText.textContent = "Stable & Resilient";
            healthStatusText.style.color = "var(--clr-success)";
        } else if (data.health_score >= 40) {
            healthScoreBar.style.backgroundColor = "var(--clr-warning)";
            healthStatusText.textContent = "Elevated Flight Risk";
            healthStatusText.style.color = "var(--clr-warning)";
        } else {
            healthScoreBar.style.backgroundColor = "var(--clr-danger)";
            healthStatusText.textContent = "Critical Vulnerability";
            healthStatusText.style.color = "var(--clr-danger)";
        }

        // Revenue At Risk
        annualRiskVal.textContent = `$${data.annual_revenue_at_risk.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        annualRevTotal.textContent = `$${data.annual_revenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}/yr`;

        if (data.probability >= 0.5) {
            riskSeverityPill.textContent = "High Financial Exposure";
            riskSeverityPill.className = "kpi-pill-badge";
            riskSeverityPill.style.backgroundColor = "var(--clr-danger-bg)";
            riskSeverityPill.style.color = "var(--clr-danger)";
        } else if (data.probability >= 0.25) {
            riskSeverityPill.textContent = "Moderate Financial Exposure";
            riskSeverityPill.className = "kpi-pill-badge";
            riskSeverityPill.style.backgroundColor = "var(--clr-warning-bg)";
            riskSeverityPill.style.color = "var(--clr-warning)";
        } else {
            riskSeverityPill.textContent = "Low Financial Exposure";
            riskSeverityPill.className = "kpi-pill-badge";
            riskSeverityPill.style.backgroundColor = "var(--clr-success-bg)";
            riskSeverityPill.style.color = "var(--clr-success)";
        }

        // Projected Lifetime Value
        clvVal.textContent = `$${data.clv_estimate.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        lifespanVal.textContent = data.expected_lifespan_months;

        // Peer Benchmark Metrics
        const bm = data.peer_benchmarks;
        bmChurnDelta.textContent = bm.churn_delta >= 0 ? `+${bm.churn_delta}%` : `${bm.churn_delta}%`;
        bmChurnDelta.style.color = bm.churn_delta > 0 ? "var(--clr-danger)" : "var(--clr-success)";

        bmMonthlyDelta.textContent = bm.monthly_delta >= 0 ? `+$${bm.monthly_delta.toFixed(2)}` : `-$${Math.abs(bm.monthly_delta).toFixed(2)}`;
        bmMonthlyDelta.style.color = bm.monthly_delta > 0 ? "var(--clr-warning)" : "var(--clr-success)";

        bmTenureDelta.textContent = bm.tenure_delta >= 0 ? `+${bm.tenure_delta} Mo` : `${bm.tenure_delta} Mo`;
        bmTenureDelta.style.color = bm.tenure_delta >= 0 ? "var(--clr-success)" : "var(--clr-warning)";

        bmAddonsVal.textContent = `${bm.addons_active} / ${bm.addons_total}`;
        bmAddonsVal.style.color = bm.addons_active >= 3 ? "var(--clr-success)" : "var(--clr-warning)";

        // Render Visual Diagnostic Charts
        renderDriversChart(data.feature_contributions || []);
        renderRadarChart(data.radar_scores || {});

        // Render Actionable Retention Playbook Cards
        renderPlaybookCards(data.retention_strategies || []);
    }

    // =========================================================================
    // 7. Visual Diagnostic Charts (Chart.js)
    // =========================================================================
    function renderDriversChart(contributions) {
        const ctx = document.getElementById("driversChart");
        if (!ctx) return;

        if (driversChartInstance) {
            driversChartInstance.destroy();
        }

        // Take top 6 drivers
        const slice = contributions.slice(0, 6);
        const labels = slice.map(item => item.feature);
        const values = slice.map(item => item.weight);
        const bgColors = slice.map(item => item.type === "risk" ? "rgba(244, 63, 94, 0.75)" : "rgba(16, 185, 129, 0.75)");
        const borderColors = slice.map(item => item.type === "risk" ? "#f43f5e" : "#10b981");

        driversChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Model Importance Impact (%)",
                    data: values,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const item = slice[context.dataIndex];
                                const typeLabel = item.type === "risk" ? "Risk Catalyst" : "Protective Factor";
                                return `${typeLabel}: ${context.raw}% impact (${item.detail})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { callback: val => `${val}%` }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    function renderRadarChart(radarScores) {
        const ctx = document.getElementById("radarChart");
        if (!ctx) return;

        if (radarChartInstance) {
            radarChartInstance.destroy();
        }

        const labels = [
            "Contract Stability",
            "Payment Safety",
            "Ecosystem Depth",
            "Tenure Maturity",
            "Price Comfort"
        ];

        const values = [
            radarScores.contract_stability || 20,
            radarScores.payment_safety || 30,
            radarScores.ecosystem_depth || 20,
            radarScores.tenure_maturity || 20,
            radarScores.pricing_comfort || 50
        ];

        radarChartInstance = new Chart(ctx, {
            type: "radar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Current Customer Profile",
                        data: values,
                        backgroundColor: "rgba(99, 102, 241, 0.25)",
                        borderColor: "#6366f1",
                        borderWidth: 2,
                        pointBackgroundColor: "#6366f1",
                        pointRadius: 3
                    },
                    {
                        label: "Optimal Retention Benchmark",
                        data: [100, 100, 100, 100, 100],
                        backgroundColor: "transparent",
                        borderColor: "rgba(16, 185, 129, 0.4)",
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 10, font: { size: 10 } }
                    }
                },
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: { display: false, stepSize: 25 },
                        angleLines: { color: "rgba(255, 255, 255, 0.06)" },
                        grid: { color: "rgba(255, 255, 255, 0.06)" },
                        pointLabels: {
                            font: { size: 10, weight: '600' },
                            color: "#94a3b8"
                        }
                    }
                }
            }
        });
    }

    function renderPlaybookCards(strategies) {
        actionItemsContainer.innerHTML = "";
        if (!strategies || strategies.length === 0) {
            actionItemsContainer.innerHTML = `<div class="action-card"><p>No critical interventions required.</p></div>`;
            return;
        }

        strategies.forEach(item => {
            const card = document.createElement("div");
            card.className = "action-card";
            card.innerHTML = `
                <div class="action-left">
                    <div class="action-icon">${item.icon}</div>
                    <div class="action-content">
                        <h5>${item.title}</h5>
                        <p>${item.desc}</p>
                    </div>
                </div>
                <div class="action-metrics">
                    <span class="risk-drop-pill">📉 -${item.risk_reduction_pct}% Risk</span>
                    <span class="savings-label">Est. Save: <strong>$${item.projected_savings.toFixed(2)}</strong></span>
                </div>
            `;
            actionItemsContainer.appendChild(card);
        });
    }

    // =========================================================================
    // 8. What-If Retention ROI Simulator (Tab 3)
    // =========================================================================
    if (simDiscount) {
        simDiscount.addEventListener("input", (e) => {
            simDiscountVal.textContent = `$${parseFloat(e.target.value).toFixed(2)} / mo`;
        });
    }

    if (transferToSimBtn) {
        transferToSimBtn.addEventListener("click", () => {
            const simTabBtn = document.getElementById("nav-simulator");
            if (simTabBtn) {
                simTabBtn.click();
            }
        });
    }

    if (runSimBtn) {
        runSimBtn.addEventListener("click", runSimulation);
    }

    // Auto-run simulation on change of controls
    [simContract, simPayment, simTechSupport, simOnlineSecurity, simDiscount].forEach(el => {
        if (el) {
            el.addEventListener("change", runSimulation);
        }
    });

    async function runSimulation() {
        if (!currentCustomerPayload) {
            // Default payload if user opened simulator before running Tab 1
            currentCustomerPayload = {
                gender: "Male",
                SeniorCitizen: 0,
                Partner: "No",
                Dependents: "No",
                tenure: 8,
                PhoneService: "Yes",
                MultipleLines: "No",
                InternetService: "Fiber optic",
                OnlineSecurity: "No",
                OnlineBackup: "No",
                DeviceProtection: "No",
                TechSupport: "No",
                StreamingTV: "Yes",
                StreamingMovies: "Yes",
                Contract: "Month-to-month",
                PaperlessBilling: "Yes",
                PaymentMethod: "Electronic check",
                MonthlyCharges: 85.50
            };
        }

        const simPayload = {
            customer: currentCustomerPayload,
            new_contract: simContract.value || null,
            new_payment: simPayment.value || null,
            add_tech_support: simTechSupport.checked,
            add_online_security: simOnlineSecurity.checked,
            monthly_discount: parseFloat(simDiscount.value) || 0.0
        };

        try {
            const res = await fetch("/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(simPayload)
            });

            if (!res.ok) throw new Error("Simulation failed");
            const simResult = await res.json();
            displaySimulationResult(simResult);
        } catch (err) {
            console.error(err);
        }
    }

    function displaySimulationResult(sim) {
        const basePct = Math.round(sim.original_probability * 100);
        const newPct = Math.round(sim.simulated_probability * 100);
        const dropPct = (sim.pct_reduction || 0).toFixed(1);

        simBaseRisk.textContent = `${basePct}%`;
        simNewRisk.textContent = `${newPct}%`;
        simDeltaBadge.textContent = `-${dropPct}% relative reduction`;
        simRevenueSaved.textContent = `$${sim.annual_saved.toLocaleString('en-US', { minimumFractionDigits: 2 })}/yr`;
        simNetRoi.textContent = `$${sim.net_roi.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        simCostNote.textContent = `Discount Cost: $${sim.annual_cost.toFixed(2)}/yr`;

        // Update Verdict Text
        if (sim.net_roi > 150) {
            verdictTitle.textContent = "High-Impact Retention Package (Strong Positive ROI)";
            verdictTitle.style.color = "var(--clr-success)";
            verdictDesc.textContent = `This scenario slashes churn probability by ${dropPct}%, securing $${sim.annual_saved.toFixed(2)} in preserved annual revenue with a net ROI of +$${sim.net_roi.toFixed(2)} after discount costs.`;
        } else if (sim.net_roi > 0) {
            verdictTitle.textContent = "Moderate Positive ROI Intervention";
            verdictTitle.style.color = "var(--clr-cyan)";
            verdictDesc.textContent = `This counter-measure yields a solid ${dropPct}% reduction in flight risk while remaining budget-positive (+$${sim.net_roi.toFixed(2)} net saved).`;
        } else {
            verdictTitle.textContent = "Neutral / Low Financial Margin Offer";
            verdictTitle.style.color = "var(--clr-warning)";
            verdictDesc.textContent = `The proposed discount cost ($${sim.annual_cost.toFixed(2)}/yr) exceeds or balances out the immediate revenue saved. Consider lower discounts and emphasizing service add-ons.`;
        }

        // Render Simulation Comparative Chart
        renderSimComparisonChart(basePct, newPct);
    }

    function renderSimComparisonChart(basePct, newPct) {
        const ctx = document.getElementById("simComparisonChart");
        if (!ctx) return;

        if (simChartInstance) {
            simChartInstance.destroy();
        }

        simChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["Current Baseline Risk", "Simulated Offer Outcome"],
                datasets: [{
                    label: "Churn Probability (%)",
                    data: [basePct, newPct],
                    backgroundColor: [
                        "rgba(244, 63, 94, 0.75)",
                        "rgba(16, 185, 129, 0.75)"
                    ],
                    borderColor: [
                        "#f43f5e",
                        "#10b981"
                    ],
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `Churn Risk: ${ctx.raw}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: val => `${val}%` },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // =========================================================================
    // 9. Portfolio & Fleet Macro Analytics (Tab 2)
    // =========================================================================
    async function loadCohortAnalytics() {
        try {
            const res = await fetch("/analytics/cohorts");
            if (!res.ok) throw new Error("Could not fetch cohort analytics");
            const data = await res.json();
            cohortChartsLoaded = true;

            renderCohortContractChart(data.churn_by_contract);
            renderCohortInternetChart(data.churn_by_internet);
            renderCohortTenureChart(data.churn_by_tenure_cohort);
            renderCohortPaymentChart(data.churn_by_payment);
            renderGlobalImportanceChart(data.top_feature_importance);
        } catch (e) {
            console.error("Error loading cohort charts:", e);
        }
    }

    function renderCohortContractChart(contractData) {
        const ctx = document.getElementById("cohortContractChart");
        if (!ctx || !contractData) return;

        new Chart(ctx, {
            type: "bar",
            data: {
                labels: contractData.map(d => d.category),
                datasets: [{
                    label: "Churn Rate (%)",
                    data: contractData.map(d => d.churn_rate),
                    backgroundColor: ["rgba(244, 63, 94, 0.75)", "rgba(245, 158, 11, 0.75)", "rgba(16, 185, 129, 0.75)"],
                    borderColor: ["#f43f5e", "#f59e0b", "#10b981"],
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `Churn Rate: ${ctx.raw}% (${contractData[ctx.dataIndex].customer_count.toLocaleString()} customers)`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 50,
                        ticks: { callback: val => `${val}%` },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function renderCohortInternetChart(internetData) {
        const ctx = document.getElementById("cohortInternetChart");
        if (!ctx || !internetData) return;

        new Chart(ctx, {
            type: "bar",
            data: {
                labels: internetData.map(d => d.category),
                datasets: [{
                    label: "Churn Rate (%)",
                    data: internetData.map(d => d.churn_rate),
                    backgroundColor: ["rgba(244, 63, 94, 0.75)", "rgba(99, 102, 241, 0.75)", "rgba(16, 185, 129, 0.75)"],
                    borderColor: ["#f43f5e", "#6366f1", "#10b981"],
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `Churn Rate: ${ctx.raw}% (${internetData[ctx.dataIndex].customer_count.toLocaleString()} accounts)`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 50,
                        ticks: { callback: val => `${val}%` },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function renderCohortTenureChart(tenureData) {
        const ctx = document.getElementById("cohortTenureChart");
        if (!ctx || !tenureData) return;

        new Chart(ctx, {
            type: "line",
            data: {
                labels: ["0-12 Mo (Early)", "13-24 Mo (Growth)", "25-48 Mo (Mature)", "49-72 Mo (Loyal)"],
                datasets: [
                    {
                        label: "Churn Rate (%)",
                        data: tenureData.map(d => d.churn_rate),
                        borderColor: "#f43f5e",
                        backgroundColor: "rgba(244, 63, 94, 0.15)",
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: "#f43f5e"
                    },
                    {
                        label: "Retention Rate (%)",
                        data: tenureData.map(d => d.retention_rate),
                        borderColor: "#10b981",
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: "#10b981"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { boxWidth: 12, font: { size: 10 } }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: val => `${val}%` },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function renderCohortPaymentChart(paymentData) {
        const ctx = document.getElementById("cohortPaymentChart");
        if (!ctx || !paymentData) return;

        new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: paymentData.map(d => d.category),
                datasets: [{
                    data: paymentData.map(d => d.churn_rate),
                    backgroundColor: [
                        "rgba(244, 63, 94, 0.8)",
                        "rgba(245, 158, 11, 0.8)",
                        "rgba(56, 189, 248, 0.8)",
                        "rgba(16, 185, 129, 0.8)"
                    ],
                    borderColor: "#111726",
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, padding: 8, font: { size: 10 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${paymentData[ctx.dataIndex].category}: ${ctx.raw}% churn rate`
                        }
                    }
                },
                cutout: "60%"
            }
        });
    }

    function renderGlobalImportanceChart(importanceData) {
        const ctx = document.getElementById("globalImportanceChart");
        if (!ctx || !importanceData) return;

        new Chart(ctx, {
            type: "bar",
            data: {
                labels: importanceData.map(d => d.feature),
                datasets: [{
                    label: "Random Forest Importance Score (%)",
                    data: importanceData.map(d => d.importance),
                    backgroundColor: "rgba(99, 102, 241, 0.75)",
                    borderColor: "#6366f1",
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: ctx => `Description: ${importanceData[ctx.dataIndex].description}`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { callback: val => `${val}%` },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    // =========================================================================
    // 10. Export / Print Assessment Sheet
    // =========================================================================
    if (printAssessmentBtn) {
        printAssessmentBtn.addEventListener("click", () => {
            window.print();
        });
    }
});
