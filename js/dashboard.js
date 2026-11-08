
// ==========================================
// PERSONAL EXPENSE TRACKER - DASHBOARD
// ==========================================

// IMPORTANT:
// If backend is running locally, keep this as shown.
// After hosting your backend, replace with its URL.
const API_BASE_URL = "http://localhost:3000";

const token = localStorage.getItem("token");

let user = null;

try {
    user = JSON.parse(localStorage.getItem("user") || "null");
} catch (error) {
    console.error("Invalid user data:", error);
}

// CHECK LOGIN
if (!token || !user) {
    window.location.replace("login.html");
}

// DISPLAY USER NAME
const userName = document.getElementById("userName");

if (userName && user) {
    userName.textContent = user.name || "User";
}

// LOGOUT
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.replace("login.html");
    });
}

// ==========================================
// API HELPER
// ==========================================

async function getData(url) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error("Unable to load data");
    }

    return response.json();
}

// ==========================================
// LOAD SUMMARY
// ==========================================

async function loadSummary() {
    try {
        const data = await getData("/api/dashboard/summary");

        document.getElementById("totalBalance").textContent =
            "₹" + Number(data.totalBalance || 0).toFixed(2);

        document.getElementById("totalIncome").textContent =
            "₹" + Number(data.totalIncome || 0).toFixed(2);

        document.getElementById("totalExpense").textContent =
            "₹" + Number(data.totalExpense || 0).toFixed(2);

        document.getElementById("totalBudget").textContent =
            "₹" + Number(data.totalBudget || 0).toFixed(2);

    } catch (error) {
        console.error("Summary error:", error);
    }
}

// ==========================================
// LOAD TRANSACTIONS
// ==========================================

async function loadTransactions() {
    const tbody = document.getElementById("transactionList");

    if (!tbody) return;

    try {
        const transactions = await getData("/api/transactions");

        tbody.innerHTML = "";

        if (!Array.isArray(transactions) || transactions.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="5">No transactions available yet.</td></tr>';
            return;
        }

        transactions.forEach(item => {
            const row = document.createElement("tr");

            const date = new Date(item.transaction_date);

            const formattedDate = Number.isNaN(date.getTime())
                ? item.transaction_date
                : date.toLocaleDateString("en-IN");

            const description = document.createElement("td");
            description.textContent = item.description || "-";

            const category = document.createElement("td");
            category.textContent = item.category_name || "-";

            const dateCell = document.createElement("td");
            dateCell.textContent = formattedDate;

            const type = document.createElement("td");
            type.textContent = item.transaction_type || "-";

            const amount = document.createElement("td");
            amount.textContent =
                "₹" + Number(item.amount || 0).toFixed(2);

            row.append(description, category, dateCell, type, amount);

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Transaction error:", error);

        tbody.innerHTML =
            '<tr><td colspan="5">Unable to load transactions.</td></tr>';
    }
}

// ==========================================
// LOAD BUDGETS
// ==========================================

async function loadBudgets() {
    const tbody = document.getElementById("budgetList");

    if (!tbody) return;

    try {
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();

        const budgets = await getData(
            `/api/budgets?month=${month}&year=${year}`
        );

        tbody.innerHTML = "";

        if (!Array.isArray(budgets) || budgets.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="4">No budgets available yet.</td></tr>';
            return;
        }

        budgets.forEach(item => {
            const row = document.createElement("tr");

            const values = [
                item.category_name || "-",
                "₹" + Number(item.monthly_limit || 0).toFixed(2),
                new Date(year, month - 1).toLocaleString(
                    "en-IN",
                    { month: "long" }
                ),
                item.year || year
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Budget error:", error);

        tbody.innerHTML =
            '<tr><td colspan="4">Unable to load budgets.</td></tr>';
    }
}

// ==========================================
// LOAD INCOME & EXPENSE CHART
// ==========================================

async function loadChart() {
    try {
        const transactions = await getData("/api/transactions");

        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        const income = Array(12).fill(0);
        const expense = Array(12).fill(0);

        const currentYear = new Date().getFullYear();

        transactions.forEach(item => {
            const date = new Date(item.transaction_date);

            if (date.getFullYear() !== currentYear) return;

            const month = date.getMonth();

            if (item.transaction_type === "income") {
                income[month] += Number(item.amount);
            } else {
                expense[month] += Number(item.amount);
            }
        });

        const canvas = document.getElementById("incomeExpenseChart");

        if (canvas && typeof Chart !== "undefined") {
            new Chart(canvas, {
                type: "bar",

                data: {
                    labels: months,

                    datasets: [
                        {
                            label: "Income",
                            data: income,
                            backgroundColor: "#36b98a",
                            borderRadius: 6
                        },
                        {
                            label: "Expenses",
                            data: expense,
                            backgroundColor: "#ed7777",
                            borderRadius: 6
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

    } catch (error) {
        console.error("Chart error:", error);
    }
}

// ==========================================
// LOAD ALL DASHBOARD DATA
// ==========================================

async function loadDashboard() {
    if (!token || !user) return;

    await Promise.all([
        loadSummary(),
        loadTransactions(),
        loadBudgets(),
        loadChart()
    ]);
}

loadDashboard();
