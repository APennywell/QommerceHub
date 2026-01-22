// API_URL is set by theme-loader.js
const API_URL = window.API_URL || 'http://localhost:5000';
let currentPeriod = 30;
let salesChart = null;
let statusChart = null;

const token = localStorage.getItem('token');
let tenant = {};
try {
    tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
} catch (e) {
    console.error('Failed to parse tenant data:', e);
    localStorage.removeItem('tenant');
}

if (!token) window.location.href = 'login.html';

document.getElementById('storeName').textContent = tenant.store_name || '';

async function handleLogout() {
    try {
        await fetch(`${API_URL}/api/tenants/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (error) {
        console.error('Logout API error:', error);
    }
    localStorage.clear();
    window.location.href = 'login.html';
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

async function loadAnalytics(days = 30) {
    try {
        const response = await apiRequest(`/api/analytics/sales?days=${days}`);
        if (!response) return;
        const data = await response.json();

        // Update revenue stats
        document.getElementById('totalRevenue').textContent =
            '$' + parseFloat(data.revenue.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('totalOrders').textContent = data.revenue.total_orders;
        document.getElementById('avgOrderValue').textContent =
            '$' + parseFloat(data.revenue.avg_order_value).toFixed(2);
        document.getElementById('lowStockCount').textContent = data.lowStock.length;

        // Render charts
        renderSalesChart(data.salesByDate);
        renderStatusChart(data.ordersByStatus);
        renderTopProducts(data.topProducts);
        renderTopCustomers(data.topCustomers);
        renderLowStockTable(data.lowStock);

    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function renderSalesChart(salesData) {
    const ctx = document.getElementById('salesChart').getContext('2d');

    if (salesChart) {
        salesChart.destroy();
    }

    const labels = salesData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const revenues = salesData.map(d => parseFloat(d.revenue));
    const orders = salesData.map(d => parseInt(d.order_count));

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Revenue ($)',
                    data: revenues,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Orders',
                    data: orders,
                    borderColor: '#f5576c',
                    backgroundColor: 'rgba(245, 87, 108, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Revenue ($)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Orders'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function renderStatusChart(statusData) {
    const ctx = document.getElementById('statusChart').getContext('2d');

    if (statusChart) {
        statusChart.destroy();
    }

    const statusColors = {
        'pending': '#fbbf24',
        'processing': '#3b82f6',
        'completed': '#10b981',
        'cancelled': '#ef4444'
    };

    const labels = statusData.map(s => s.status.charAt(0).toUpperCase() + s.status.slice(1));
    const counts = statusData.map(s => parseInt(s.count));
    const colors = statusData.map(s => statusColors[s.status] || '#9ca3af');

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });
}

function renderTopProducts(products) {
    const container = document.getElementById('topProductsList');

    if (products.length === 0) {
        container.innerHTML = '<p style="color: var(--gray-500); text-align: center;">No sales data yet</p>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';

    products.forEach((product, index) => {
        const total = parseFloat(product.total_revenue);
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--gray-50); border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                border-radius: 50%; display: flex; align-items: center; justify-content: center;
                                color: white; font-weight: 600; font-size: 14px;">${index + 1}</div>
                    <div>
                        <div style="font-weight: 600; color: var(--gray-900);">${escapeHtml(product.name)}</div>
                        <div style="font-size: 12px; color: var(--gray-500);">SKU: ${product.sku}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600; color: var(--success);">$${total.toFixed(2)}</div>
                    <div style="font-size: 12px; color: var(--gray-500);">${product.total_sold} sold</div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderTopCustomers(customers) {
    const container = document.getElementById('topCustomersList');

    if (customers.length === 0) {
        container.innerHTML = '<p style="color: var(--gray-500); text-align: center;">No customer data yet</p>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';

    customers.forEach((customer, index) => {
        const total = parseFloat(customer.total_spent);
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--gray-50); border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                                border-radius: 50%; display: flex; align-items: center; justify-content: center;
                                color: white; font-weight: 600; font-size: 14px;">${index + 1}</div>
                    <div>
                        <div style="font-weight: 600; color: var(--gray-900);">${escapeHtml(customer.name)}</div>
                        <div style="font-size: 12px; color: var(--gray-500);">${customer.email}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600; color: var(--success);">$${total.toFixed(2)}</div>
                    <div style="font-size: 12px; color: var(--gray-500);">${customer.order_count} orders</div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderLowStockTable(items) {
    const container = document.getElementById('lowStockTable');

    if (items.length === 0) {
        container.innerHTML = '<p style="color: var(--success); text-align: center; font-weight: 600;">✅ All products are well stocked!</p>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Current Stock</th>
                    <th>Price</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(item => {
        const urgency = item.quantity <= 3 ? 'critical' : item.quantity <= 6 ? 'warning' : 'low';
        const badgeClass = urgency === 'critical' ? 'danger' : urgency === 'warning' ? 'warning' : 'info';
        const statusText = urgency === 'critical' ? 'CRITICAL' : urgency === 'warning' ? 'LOW' : 'REORDER';

        html += `
            <tr style="${urgency === 'critical' ? 'background: #fee2e2;' : ''}">
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td>${item.sku}</td>
                <td><strong>${item.quantity}</strong></td>
                <td>$${parseFloat(item.price).toFixed(2)}</td>
                <td><span class="badge badge-${badgeClass}">${statusText}</span></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function changePeriod() {
    currentPeriod = parseInt(document.getElementById('periodFilter').value);
    loadAnalytics(currentPeriod);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Report download functions
async function downloadSalesReport(e) {
    const btn = e ? e.target.closest('button') : null;
    const originalText = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; gap: 10px;"><span>⏳</span><div>Generating...</div></div>';
        }

        const response = await fetch(`${API_URL}/api/reports/sales/csv`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to generate report');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        alert('Sales report downloaded successfully!');
    } catch (err) {
        console.error('Error downloading sales report:', err);
        alert('Failed to download sales report. Please try again.');
        if (btn) btn.disabled = false;
    }
}

async function downloadInventoryReport(e) {
    const btn = e ? e.target.closest('button') : null;
    const originalText = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; gap: 10px;"><span>⏳</span><div>Generating...</div></div>';
        }

        const response = await fetch(`${API_URL}/api/reports/inventory/excel`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to generate report');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        alert('Inventory report downloaded successfully!');
    } catch (err) {
        console.error('Error downloading inventory report:', err);
        alert('Failed to download inventory report. Please try again.');
        if (btn) btn.disabled = false;
    }
}

async function downloadCustomersReport(e) {
    const btn = e ? e.target.closest('button') : null;
    const originalText = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; gap: 10px;"><span>⏳</span><div>Generating...</div></div>';
        }

        const response = await fetch(`${API_URL}/api/reports/customers/csv`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to generate report');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        alert('Customers report downloaded successfully!');
    } catch (err) {
        console.error('Error downloading customers report:', err);
        alert('Failed to download customers report. Please try again.');
        if (btn) btn.disabled = false;
    }
}

// Setup event listeners (CSP-compliant)
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

loadAnalytics(currentPeriod);
