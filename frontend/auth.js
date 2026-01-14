const API_URL = 'http://localhost:5000';

function showMessage(message, type = 'error') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    setTimeout(() => {
        messageEl.className = 'message';
    }, 5000);
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
}

function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/api/tenants/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('tenant', JSON.stringify(data.tenant));
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showMessage(data.error || 'Login failed');
        }
    } catch (error) {
        showMessage('Server connection error. Please try again.');
    }
}

async function handleSignup(e) {
    e.preventDefault();

    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const store_name = document.getElementById('signupStoreName').value;

    try {
        const response = await fetch(`${API_URL}/api/tenants/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, store_name })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Account created successfully! Please login.', 'success');
            setTimeout(() => {
                showLogin();
                document.getElementById('loginEmail').value = email;
            }, 1500);
        } else {
            const errorMsg = data.details
                ? data.details.map(d => d.message).join(', ')
                : data.error || 'Signup failed';
            showMessage(errorMsg);
        }
    } catch (error) {
        showMessage('Server connection error. Please try again.');
    }
}

// Check if already logged in
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'dashboard.html';
    }
}
