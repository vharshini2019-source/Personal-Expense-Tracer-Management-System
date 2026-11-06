
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
    window.location.replace("/login.html");
}

const typeSelect = document.getElementById("transactionType");
const categorySelect = document.getElementById("category");
const form = document.getElementById("transactionForm");

// Default date
document.getElementById("transactionDate").value =
    new Date().toISOString().split("T")[0];

// LOAD CATEGORIES
async function loadCategories() {
    const type = typeSelect.value;

    categorySelect.innerHTML =
        '<option value="">Loading categories...</option>';

    if (!type) {
        categorySelect.innerHTML =
            '<option value="">Select Category</option>';
        return;
    }

    try {
        const response = await fetch(
            `/api/categories?type=${type}`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const categories = await response.json();

        if (!response.ok) throw new Error(categories.message);

        categorySelect.innerHTML =
            '<option value="">Select Category</option>';

        categories.forEach(item => {
            const option = document.createElement("option");
            option.value = item.category_id;
            option.textContent = item.category_name;
            categorySelect.appendChild(option);
        });

    } catch (error) {
        categorySelect.innerHTML =
            '<option value="">Unable to load categories</option>';
        alert(error.message);
    }
}

typeSelect.addEventListener("change", loadCategories);

// SAVE TRANSACTION
form.addEventListener("submit", async event => {
    event.preventDefault();

    const transactionData = {
        category_id: Number(categorySelect.value),
        amount: Number(document.getElementById("amount").value),
        transaction_type: typeSelect.value,
        description: document.getElementById("description").value,
        transaction_date: document.getElementById("transactionDate").value
    };

    try {
        const response = await fetch("/api/transactions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(transactionData)
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.message);

        alert("Transaction saved successfully!");

        window.location.href = "/dashboard.html";

    } catch (error) {
        alert(error.message);
    }
});
