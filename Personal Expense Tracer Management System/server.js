
require("dotenv").config();

const express = require("express");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// HOME
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// AUTHENTICATION
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Please login first" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }

        req.user = user;
        next();
    });
}

// REGISTER
app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password || password.length < 8) {
        return res.status(400).json({
            message: "Enter valid details. Password must be at least 8 characters."
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name.trim(), email.trim().toLowerCase(), hashedPassword],
            (err) => {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({ message: "Email already registered" });
                    }

                    return res.status(500).json({ message: "Registration failed" });
                }

                res.status(201).json({ message: "Registration successful!" });
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// LOGIN
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Enter email and password" });
    }

    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email.trim().toLowerCase()],
        async (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Database error" });
            }

            if (results.length === 0) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            const user = results[0];

            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            const token = jwt.sign(
                { user_id: user.user_id },
                process.env.JWT_SECRET,
                { expiresIn: "2h" }
            );

            res.json({
                message: "Login successful",
                token,
                user: {
                    user_id: user.user_id,
                    name: user.name,
                    email: user.email
                }
            });
        }
    );
});

// GET CATEGORIES
app.get("/api/categories", authenticateToken, (req, res) => {
    const userId = req.user.user_id;
    const type = req.query.type || "expense";

    if (!["income", "expense"].includes(type)) {
        return res.status(400).json({ message: "Invalid category type" });
    }

    db.query(
        "SELECT category_id, category_name, category_type FROM categories WHERE user_id = ? AND category_type = ?",
        [userId, type],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Unable to load categories" });
            }

            if (results.length > 0) {
                return res.json(results);
            }

            const defaults = type === "expense"
                ? ["Food", "Transport", "Shopping", "Bills", "Education", "Health", "Entertainment", "Other"]
                : ["Salary", "Business", "Freelance", "Investment", "Other"];

            const values = defaults.map(name => [userId, name, type]);

            db.query(
                "INSERT INTO categories (user_id, category_name, category_type) VALUES ?",
                [values],
                (insertError) => {
                    if (insertError) {
                        return res.status(500).json({ message: "Unable to create categories" });
                    }

                    db.query(
                        "SELECT category_id, category_name, category_type FROM categories WHERE user_id = ? AND category_type = ?",
                        [userId, type],
                        (fetchError, categories) => {
                            if (fetchError) {
                                return res.status(500).json({ message: "Unable to load categories" });
                            }

                            res.json(categories);
                        }
                    );
                }
            );
        }
    );
});

// ADD TRANSACTION
app.post("/api/transactions", authenticateToken, (req, res) => {
    const userId = req.user.user_id;

    const {
        category_id,
        amount,
        transaction_type,
        description,
        transaction_date
    } = req.body;

    if (
        !category_id ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0 ||
        !["income", "expense"].includes(transaction_type) ||
        !transaction_date
    ) {
        return res.status(400).json({ message: "Enter valid transaction details" });
    }

    db.query(
        "SELECT category_id FROM categories WHERE category_id = ? AND user_id = ? AND category_type = ?",
        [category_id, userId, transaction_type],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Database error" });
            }

            if (results.length === 0) {
                return res.status(400).json({ message: "Invalid category" });
            }

            db.query(
                `INSERT INTO transactions
                (user_id, category_id, amount, transaction_type, description, transaction_date)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    category_id,
                    amount,
                    transaction_type,
                    description || "",
                    transaction_date
                ],
                (insertError) => {
                    if (insertError) {
                        return res.status(500).json({ message: "Unable to save transaction" });
                    }

                    res.status(201).json({ message: "Transaction saved successfully!" });
                }
            );
        }
    );
});

// GET TRANSACTIONS
app.get("/api/transactions", authenticateToken, (req, res) => {
    db.query(
        `SELECT t.transaction_id, t.amount, t.transaction_type,
                t.description, t.transaction_date, c.category_name
         FROM transactions t
         JOIN categories c ON t.category_id = c.category_id
         WHERE t.user_id = ?
         ORDER BY t.transaction_date DESC, t.transaction_id DESC`,
        [req.user.user_id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Unable to load transactions" });
            }

            res.json(results);
        }
    );
});

// SAVE BUDGET
app.post("/api/budgets", authenticateToken, (req, res) => {
    const userId = req.user.user_id;
    const { category_id, monthly_limit, month, year } = req.body;

    if (
        !category_id ||
        !Number.isFinite(Number(monthly_limit)) ||
        Number(monthly_limit) <= 0 ||
        !Number.isInteger(Number(month)) ||
        Number(month) < 1 ||
        Number(month) > 12 ||
        !Number.isInteger(Number(year)) ||
        Number(year) < 2026
    ) {
        return res.status(400).json({ message: "Invalid budget details" });
    }

    db.query(
        "SELECT category_id FROM categories WHERE category_id = ? AND user_id = ? AND category_type = 'expense'",
        [category_id, userId],
        (err, categories) => {
            if (err) {
                return res.status(500).json({ message: "Database error" });
            }

            if (categories.length === 0) {
                return res.status(400).json({ message: "Invalid expense category" });
            }

            db.query(
                "SELECT budget_id FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?",
                [userId, category_id, month, year],
                (checkError, existing) => {
                    if (checkError) {
                        return res.status(500).json({ message: "Database error" });
                    }

                    const query = existing.length > 0
                        ? "UPDATE budgets SET monthly_limit = ? WHERE budget_id = ?"
                        : "INSERT INTO budgets (user_id, category_id, monthly_limit, month, year) VALUES (?, ?, ?, ?, ?)";

                    const values = existing.length > 0
                        ? [monthly_limit, existing[0].budget_id]
                        : [userId, category_id, monthly_limit, month, year];

                    db.query(query, values, (saveError) => {
                        if (saveError) {
                            return res.status(500).json({ message: "Unable to save budget" });
                        }

                        res.status(201).json({ message: "Budget saved successfully!" });
                    });
                }
            );
        }
    );
});

// GET BUDGETS
app.get("/api/budgets", authenticateToken, (req, res) => {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    db.query(
        `SELECT b.budget_id, b.monthly_limit, b.month, b.year,
                c.category_name
         FROM budgets b
         JOIN categories c ON b.category_id = c.category_id
         WHERE b.user_id = ? AND b.month = ? AND b.year = ?`,
        [req.user.user_id, month, year],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Unable to load budgets" });
            }

            res.json(results);
        }
    );
});

// DASHBOARD SUMMARY
app.get("/api/dashboard/summary", authenticateToken, (req, res) => {
    const userId = req.user.user_id;

    db.query(
        `SELECT
            COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) AS totalIncome,
            COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) AS totalExpense
         FROM transactions
         WHERE user_id = ?
         AND MONTH(transaction_date) = MONTH(CURRENT_DATE())
         AND YEAR(transaction_date) = YEAR(CURRENT_DATE())`,
        [userId],
        (err, monthly) => {
            if (err) {
                return res.status(500).json({ message: "Unable to load summary" });
            }

            db.query(
                `SELECT
                    COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -amount END), 0) AS balance
                 FROM transactions
                 WHERE user_id = ?`,
                [userId],
                (balanceError, balanceResults) => {
                    if (balanceError) {
                        return res.status(500).json({ message: "Unable to load balance" });
                    }

                    db.query(
                        `SELECT COALESCE(SUM(monthly_limit), 0) AS totalBudget
                         FROM budgets
                         WHERE user_id = ?
                         AND month = MONTH(CURRENT_DATE())
                         AND year = YEAR(CURRENT_DATE())`,
                        [userId],
                        (budgetError, budgetResults) => {
                            if (budgetError) {
                                return res.status(500).json({ message: "Unable to load budget summary" });
                            }

                            res.json({
                                totalBalance: Number(balanceResults[0].balance),
                                totalIncome: Number(monthly[0].totalIncome),
                                totalExpense: Number(monthly[0].totalExpense),
                                totalBudget: Number(budgetResults[0].totalBudget)
                            });
                        }
                    );
                }
            );
        }
    );
});

// TEST
app.get("/test", (req, res) => {
    res.send("Personal Expense Tracker Server Working!");
});

// START SERVER
app.listen(process.env.PORT || 3000, () => {
    console.log("Server running at http://localhost:3000");
});
