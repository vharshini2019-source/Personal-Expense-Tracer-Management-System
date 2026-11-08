
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
    window.location.replace("/login.html");
}

const budgetForm = document.getElementById("budgetForm");
const categorySelect = document.getElementById("category");
const message = document.getElementById("budgetMessage");

// Set current month and year
const today = new Date();

document.getElementById("budgetMonth").value =
    String(today.getMonth() + 1);

document.getElementById("budgetYear").value =
    today.getFullYear();

// Load expense categories from backend
async function loadCategories() {
    try {
        const response = await fetch("/api/categories?type=expense", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Could not load categories");
        }

        const categories = await response.json();

        categorySelect.innerHTML =
            '<option value="">Select Category</option>';

        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category.category_id;
            option.textContent = category.category_name;
            categorySelect.appendChild(option);
        });

    } catch (error) {
        message.textContent =
            "Categories will load after backend setup.";
    }
}

// Save budget
budgetForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const budgetData = {
        category_id: Number(categorySelect.value),
        monthly_limit: Number(
            document.getElementById("monthlyLimit").value
        ),
        month: Number(
            document.getElementById("budgetMonth").value
        ),
        year: Number(
            document.getElementById("budgetYear").value
        )
    };

    if (!budgetData.category_id || budgetData.monthly_limit <= 0) {
        message.textContent = "Please enter valid budget details.";
        return;
    }

    try {
        const response = await fetch("/api/budgets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(budgetData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to save budget");
        }

        message.textContent = "Budget saved successfully!";
        budgetForm.reset();

    } catch (error) {
        message.textContent = error.message;
    }
});

loadCategories();
