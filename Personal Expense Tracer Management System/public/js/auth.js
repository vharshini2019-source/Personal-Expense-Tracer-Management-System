
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        };

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            document.getElementById("message").textContent =
                result.message;

            if (response.ok) {
                registerForm.reset();
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1000);
            }
        } catch (error) {
            document.getElementById("message").textContent =
                "Server connection failed";
        }
    });
}

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = {
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        };

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            document.getElementById("message").textContent =
                result.message;

            if (response.ok) {
                localStorage.setItem("token", result.token);
                localStorage.setItem("user", JSON.stringify(result.user));

                window.location.href = "dashboard.html";
            }
        } catch (error) {
            document.getElementById("message").textContent =
                "Server connection failed";
        }
    });
}
