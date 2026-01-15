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

    // Get button and show loading state
    const button = e.target.querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Signing in...';

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
            button.innerHTML = 'Success! Redirecting...';
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            // Provide specific, user-friendly error messages
            let errorMessage = 'Login failed. Please try again.';

            if (response.status === 401) {
                errorMessage = 'Incorrect email or password. Please check your credentials and try again.';
            } else if (response.status === 429) {
                errorMessage = 'Too many login attempts. Please wait 15 minutes and try again.';
            } else if (response.status === 400) {
                errorMessage = 'Please enter a valid email and password.';
            } else if (data.error) {
                errorMessage = data.error;
            }

            showMessage(errorMessage);
            // Restore button on error
            button.disabled = false;
            button.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Cannot connect to server. Please check your internet connection and try again.');
        // Restore button on error
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

async function handleSignup(e) {
    e.preventDefault();

    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const store_name = document.getElementById('signupStoreName').value;

    // Get button and show loading state
    const button = e.target.querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Creating account...';

    try {
        const response = await fetch(`${API_URL}/api/tenants/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, store_name })
        });

        const data = await response.json();

        if (response.ok) {
            button.innerHTML = 'Account created!';
            showMessage('Account created successfully! Please login.', 'success');
            setTimeout(() => {
                showLogin();
                document.getElementById('loginEmail').value = email;
                // Restore button for next use
                button.disabled = false;
                button.innerHTML = originalText;
            }, 1500);
        } else {
            // Provide specific, user-friendly error messages
            let errorMessage = 'Signup failed. Please try again.';

            if (response.status === 409 || (data.error && data.error.includes('already exists'))) {
                errorMessage = 'This email is already registered. Try logging in instead.';
            } else if (response.status === 429) {
                errorMessage = 'Too many signup attempts. Please wait 15 minutes and try again.';
            } else if (response.status === 400) {
                if (data.details) {
                    errorMessage = data.details.map(d => d.message).join(', ');
                } else {
                    errorMessage = 'Please check your input: Email must be valid, password must be at least 8 characters.';
                }
            } else if (data.error) {
                errorMessage = data.error;
            }

            showMessage(errorMessage);
            // Restore button on error
            button.disabled = false;
            button.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('Cannot connect to server. Please check your internet connection and try again.');
        // Restore button on error
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Check if already logged in
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'dashboard.html';
    }
}
