const API_URL = 'http://localhost:5000';
let currentPage = 1;
let searchQuery = '';
let isEditing = false;

const token = localStorage.getItem('token');
const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');

if (!token) window.location.href = 'index.html';

document.getElementById('storeName').textContent = tenant.store_name || '';

function handleLogout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
    if (response.status === 401) {
        handleLogout();
        return null;
    }
    return response;
}

async function loadCustomers(page = 1, search = '') {
    try {
        const params = new URLSearchParams({ page, limit: 10, search });
        const response = await apiRequest(`/api/customers?${params}`);
        const data = await response.json();

        if (data.items) {
            renderCustomersTable(data.items);
            renderPagination(data.pagination);
        }
    } catch (error) {
        console.error('Error loading customers:', error);
        document.getElementById('customersTable').innerHTML =
            '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Error loading customers</p></div>';
    }
}

function renderCustomersTable(items) {
    const tableContainer = document.getElementById('customersTable');

    if (items.length === 0) {
        tableContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>No customers found</p>
                <button class="btn btn-success" onclick="openAddModal()">Add Your First Customer</button>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Registered</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(customer => {
        const date = new Date(customer.created_at).toLocaleDateString();
        html += `
            <tr>
                <td><strong>${escapeHtml(customer.name)}</strong></td>
                <td>${escapeHtml(customer.email)}</td>
                <td>${customer.phone || '-'}</td>
                <td>${date}</td>
                <td>
                    <button class="btn" style="background: var(--primary); color: white; padding: 6px 12px; margin-right: 5px;"
                            onclick="editCustomer(${customer.id})">Edit</button>
                    <button class="btn" style="background: var(--danger); color: white; padding: 6px 12px;"
                            onclick="deleteCustomer(${customer.id})">Delete</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    tableContainer.innerHTML = html;
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    const { page, totalPages } = pagination;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <button onclick="changePage(${page - 1})" ${page === 1 ? 'disabled' : ''}>Previous</button>
        <span>Page ${page} of ${totalPages}</span>
        <button onclick="changePage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>Next</button>
    `;
}

function changePage(page) {
    currentPage = page;
    loadCustomers(page, searchQuery);
}

let searchTimeout;
function handleSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchQuery = document.getElementById('searchInput').value;
        currentPage = 1;
        loadCustomers(1, searchQuery);
    }, 300);
}

function openAddModal() {
    isEditing = false;
    document.getElementById('modalTitle').textContent = 'Add Customer';
    document.getElementById('customerForm').reset();
    document.getElementById('customerId').value = '';
    document.getElementById('customerModal').classList.add('active');
}

function closeModal() {
    document.getElementById('customerModal').classList.remove('active');
}

async function editCustomer(id) {
    try {
        const response = await apiRequest(`/api/customers?page=1&limit=100`);
        const data = await response.json();
        const customer = data.items.find(c => c.id === id);

        if (customer) {
            isEditing = true;
            document.getElementById('modalTitle').textContent = 'Edit Customer';
            document.getElementById('customerId').value = customer.id;
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerEmail').value = customer.email;
            document.getElementById('customerPhone').value = customer.phone || '';
            document.getElementById('customerAddress').value = customer.address || '';
            document.getElementById('customerModal').classList.add('active');
        }
    } catch (error) {
        alert('Error loading customer details');
    }
}

async function handleCustomerSubmit(e) {
    e.preventDefault();

    const customerData = {
        name: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        address: document.getElementById('customerAddress').value
    };

    const customerId = document.getElementById('customerId').value;

    try {
        let response;
        if (isEditing && customerId) {
            response = await apiRequest(`/api/customers/${customerId}`, {
                method: 'PUT',
                body: JSON.stringify(customerData)
            });
        } else {
            response = await apiRequest('/api/customers', {
                method: 'POST',
                body: JSON.stringify(customerData)
            });
        }

        if (response.ok) {
            closeModal();
            loadCustomers(currentPage, searchQuery);
            alert(isEditing ? 'Customer updated successfully!' : 'Customer added successfully!');
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to save customer');
        }
    } catch (error) {
        alert('Error saving customer');
    }
}

async function deleteCustomer(id) {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
        const response = await apiRequest(`/api/customers/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadCustomers(currentPage, searchQuery);
            alert('Customer deleted successfully!');
        } else {
            alert('Failed to delete customer');
        }
    } catch (error) {
        alert('Error deleting customer');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

loadCustomers();
