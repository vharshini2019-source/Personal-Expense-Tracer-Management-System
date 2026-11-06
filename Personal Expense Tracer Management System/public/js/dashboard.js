
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
    window.location.replace("/login.html");
}

const userName = document.getElementById("userName");

if (userName && user) {
    userName.textContent = user.name || "User";
}

// LOGOUT
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.replace("/login.html");
});

// API HELPER
async function getData(url) {
    const response = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error("Unable to load data");
    }

    return response.json();
}

// LOAD SUMMARY
async function loadSummary() {
    try {
        const data = await getData("/api/dashboard/summary");

        document.getElementById("totalBalance").textContent =
            "₹" + Number(data.totalBalance).toFixed(2);

        document.getElementById("totalIncome").textContent =
            "₹" + Number(data.totalIncome).toFixed(2);

        document.getElementById("totalExpense").textContent =
            "₹" + Number(data.totalExpense).toFixed(2);

        document.getElementById("totalBudget").textContent =
            "₹" + Number(data.totalBudget).toFixed(2);

    } catch (error) {
        console.error("Summary error:", error);
    }
}

// LOAD TRANSACTIONS
async function loadTransactions() {
    const tbody = document.getElementById("transactionList");

    try {
        const transactions = await getData("/api/transactions");

        tbody.innerHTML = "";

        if (transactions.length === 0) {
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
            category.textContent = item.category_name;

            const dateCell = document.createElement("td");
            dateCell.textContent = formattedDate;

            const type = document.createElement("td");
            type.textContent = item.transaction_type;

            const amount = document.createElement("td");
            amount.textContent =
                "₹" + Number(item.amount).toFixed(2);

            row.append(description, category, dateCell, type, amount);
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Transaction error:", error);
        tbody.innerHTML =
            '<tr><td colspan="5">Unable to load transactions.</td></tr>';
    }
}

// LOAD BUDGETS
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

        if (budgets.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="4">No budgets available yet.</td></tr>';
            return;
        }

        budgets.forEach(item => {
            const row = document.createElement("tr");

            const values = [
                item.category_name,
                "₹" + Number(item.monthly_limit).toFixed(2),
                new Date(year, month - 1).toLocaleString("en-IN", { month: "long" }),
                item.year
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

// CHART
async function loadChart() {
    try {
        const transactions = await getData("/api/transactions");

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
                        y: { beginAtZero: true }
                    }
                }
            });
        }

    } catch (error) {
        console.error("Chart error:", error);
    }
}

// LOAD ALL DASHBOARD DATA
async function loadDashboard() {
    await Promise.all([
        loadSummary(),
        loadTransactions(),
        loadBudgets(),
        loadChart()
    ]);
}

loadDashboard();
