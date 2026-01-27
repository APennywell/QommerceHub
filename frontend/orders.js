// API_URL is set by theme-loader.js
const API_URL = window.API_URL || 'http://localhost:5000';
let currentPage = 1;
let statusFilter = '';

// Check authentication (uses shared utils.js)
const { token, tenant } = requireAuth();

document.getElementById('storeName').textContent = tenant.store_name || '';

// handleLogout and apiRequest are now in utils.js

async function loadOrders(page = 1, status = '') {
    try {
        const params = new URLSearchParams({ page, limit: 10, status });
        const response = await apiRequest(`/api/orders?${params}`);
        if (!response) return;
        const data = await response.json();

        if (data.items) {
            renderOrdersTable(data.items);
            renderPagination(data.pagination);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function renderOrdersTable(items) {
    const tableContainer = document.getElementById('ordersTable');

    if (items.length === 0) {
        tableContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <p>No orders found</p>
                <button class="btn btn-success" onclick="openCreateOrderModal()">Create Your First Order</button>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString();
        const statusClass =
            order.status === 'completed' ? 'success' :
            order.status === 'processing' ? 'warning' :
            order.status === 'cancelled' ? 'danger' : 'warning';

        html += `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>${escapeHtml(order.customer_name || 'N/A')}</td>
                <td>$${parseFloat(order.total_amount).toFixed(2)}</td>
                <td><span class="badge badge-${getStatusClass(order.status)}">${order.status}</span></td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn" style="background: var(--primary); color: white; padding: 6px 12px; margin-right: 5px;"
                            onclick="viewOrderDetails(${order.id})">View</button>
                    <select onchange="updateOrderStatus(${order.id}, this.value)" style="padding: 6px;">
                        <option value="">Change Status...</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
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
    loadOrders(page, statusFilter);
}

function handleStatusFilter() {
    statusFilter = document.getElementById('statusFilter').value;
    currentPage = 1;
    loadOrders(1, statusFilter);
}

let orderItemsCount = 0;
let inventory = [];

async function openCreateOrderModal() {
    // Load customers
    const customersResponse = await apiRequest('/api/customers?limit=100');
    if (!customersResponse) return;
    const customersData = await customersResponse.json();

    const customerSelect = document.getElementById('orderCustomer');
    customerSelect.innerHTML = '<option value="">Select Customer</option>';
    customersData.items.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${c.name} (${c.email})`;
        customerSelect.appendChild(option);
    });

    // Load inventory for order items
    const inventoryResponse = await apiRequest('/api/inventory?limit=100');
    if (!inventoryResponse) return;
    const inventoryData = await inventoryResponse.json();
    window.inventoryItems = inventoryData.items;

    document.getElementById('createOrderModal').classList.add('active');
    document.getElementById('orderItems').innerHTML = '';
    addOrderItem();
}

function closeCreateOrderModal() {
    document.getElementById('createOrderModal').classList.remove('active');
    document.getElementById('orderItems').innerHTML = '';
}

function addOrderItem() {
    const container = document.getElementById('orderItems');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'order-item';
    itemDiv.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; margin-bottom: 10px; align-items: center;';

    itemDiv.innerHTML = `
        <select class="item-product" onchange="updateItemPrice(this)" required>
            <option value="">Select Product</option>
        </select>
        <input type="number" class="item-quantity" min="1" value="1" placeholder="Qty" required onchange="calculateTotal()">
        <input type="number" class="item-price" step="0.01" min="0" placeholder="Price" readonly>
        <button type="button" onclick="removeOrderItem(this)" style="padding: 8px 12px; background: var(--danger); color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
    `;

    container.appendChild(itemDiv);
    loadProductsForSelect(itemDiv.querySelector('.item-product'));
}

async function loadProductsForSelect(selectElement) {
    try {
        const response = await apiRequest('/api/inventory?page=1&limit=100');
        if (!response) return;
        const data = await response.json();

        data.items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.dataset.price = item.price;
            option.textContent = `${item.name} - $${item.price} (Stock: ${item.quantity})`;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function updateItemPrice(selectElement) {
    const row = selectElement.closest('.order-item');
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const price = selectedOption.dataset.price || 0;
    row.querySelector('.item-price').value = price;
    calculateTotal();
}

function removeOrderItem(button) {
    button.closest('.order-item').remove();
    calculateTotal();
}

function calculateTotal() {
    const items = document.querySelectorAll('.order-item');
    let total = 0;

    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(item.querySelector('.item-price').value) || 0;
        total += quantity * price;
    });

    document.getElementById('orderTotal').textContent = total.toFixed(2);
}

async function handleOrderSubmit(e) {
    e.preventDefault();

    const customerId = parseInt(document.getElementById('orderCustomer').value);
    const notes = document.getElementById('orderNotes').value;
    const itemElements = document.querySelectorAll('.order-item');

    const items = [];
    itemElements.forEach(el => {
        const inventoryId = parseInt(el.querySelector('.item-product').value);
        const quantity = parseInt(el.querySelector('.item-quantity').value);
        const price = parseFloat(el.querySelector('.item-price').value);

        if (inventoryId && quantity && price) {
            items.push({ inventory_id: inventoryId, quantity, price });
        }
    });

    if (items.length === 0) {
        alert('Please add at least one item to the order');
        return;
    }

    // Get button and show loading state
    const button = e.target.querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Creating order...';

    try {
        const response = await apiRequest('/api/orders', {
            method: 'POST',
            body: JSON.stringify({ customer_id: customerId, items, notes })
        });

        if (response.ok) {
            closeCreateOrderModal();
            loadOrders();
            alert('Order created successfully!');
            // Restore button for next use
            button.disabled = false;
            button.innerHTML = originalText;
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to create order');
            // Restore button on error
            button.disabled = false;
            button.innerHTML = originalText;
        }
    } catch (error) {
        alert('Error creating order');
        // Restore button on error
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

async function viewOrderDetails(orderId) {
    try {
        const response = await apiRequest(`/api/orders/${orderId}`);
        if (!response) return;
        const order = await response.json();

        let itemsHtml = '<table style="width: 100%; margin-top: 15px;"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>';
        order.items.forEach(item => {
            const total = item.quantity * parseFloat(item.price);
            itemsHtml += `
                <tr>
                    <td>${item.product_name} (${item.sku})</td>
                    <td>${item.quantity}</td>
                    <td>$${parseFloat(item.price).toFixed(2)}</td>
                    <td>$${total.toFixed(2)}</td>
                </tr>
            `;
        });
        itemsHtml += '</tbody></table>';

        const detailsContent = `
            <div>
                <p><strong>Order ID:</strong> #${order.id}</p>
                <p><strong>Customer:</strong> ${order.customer_name} (${order.customer_email})</p>
                <p><strong>Status:</strong> <span class="badge badge-${getStatusBadgeClass(order.status)}">${order.status}</span></p>
                <p><strong>Total:</strong> $${parseFloat(order.total_amount).toFixed(2)}</p>
                <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
                ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
                <h3 style="margin-top: 20px;">Order Items:</h3>
                ${itemsHtml}
                <div style="margin-top: 20px; display: flex; gap: 15px; align-items: flex-end;">
                    <div style="flex: 1;">
                        <label><strong>Change Status:</strong></label>
                        <select id="newStatus" style="padding: 8px; border-radius: 4px; border: 1px solid var(--gray-300); margin: 10px 0; width: 100%;">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                    <button onclick="updateOrderStatus(${order.id}, null, event)" class="btn btn-success" style="margin-bottom: 10px;">Update Status</button>
                    <button onclick="downloadInvoice(${order.id})" class="btn" style="background: var(--primary); color: white; margin-bottom: 10px;">📄 Download Invoice</button>
                    <button onclick="openPaymentModal(${order.id}, '${escapeHtml(order.customer_name)}', ${parseFloat(order.total_amount)}, '${escapeHtml(order.customer_email || '')}')" class="btn" style="background: var(--success); color: white; margin-bottom: 10px;">💳 Process Payment</button>
                </div>
            </div>
        `;

        document.getElementById('orderDetailsContent').innerHTML = detailsContent;
        document.getElementById('orderDetailsModal').classList.add('active');
    } catch (error) {
        alert('Error loading order details');
    }
}

async function updateOrderStatus(orderId, newStatusFromDropdown, e) {
    // Handle both call contexts: from table dropdown (with status param) or from modal button (without)
    const newStatus = newStatusFromDropdown || document.getElementById('newStatus').value;

    // Get the update status button (only exists in modal context, passed via event parameter)
    const button = e ? e.target.closest('button') : null;
    let originalText = '';
    if (button) {
        originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Updating...';
    }

    try {
        const response = await apiRequest(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            // Only close modal if it was open (button context)
            if (button) {
                closeOrderDetailsModal();
            }
            loadOrders(currentPage, statusFilter);
        } else {
            alert('Failed to update status');
            // Restore button on error
            if (button) {
                button.disabled = false;
                button.innerHTML = originalText;
            }
        }
    } catch (error) {
        alert('Error updating status');
        // Restore button on error
        if (button) {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
}

function closeOrderDetailsModal() {
    document.getElementById('orderDetailsModal').classList.remove('active');
}

async function downloadInvoice(orderId) {
    try {
        const response = await fetch(`${API_URL}/api/orders/${orderId}/invoice`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to download invoice');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        alert('Error downloading invoice');
        console.error(error);
    }
}

function getStatusClass(status) {
    const statusMap = {
        'completed': 'success',
        'processing': 'warning',
        'pending': 'warning',
        'cancelled': 'danger'
    };
    return statusMap[status] || 'info';
}

function getStatusBadgeClass(status) {
    return getStatusClass(status);
}

// escapeHtml is now in utils.js

// Payment modal functions
let currentPaymentOrder = null;
let stripe = null;
let cardElement = null;
let stripeConfigured = false;

// Initialize Stripe
function initializeStripe() {
    // Check for Stripe publishable key - can be set via window config or hardcoded for demo
    const stripeKey = window.STRIPE_PUBLISHABLE_KEY || '';

    if (stripeKey && typeof Stripe !== 'undefined') {
        try {
            stripe = Stripe(stripeKey);
            const elements = stripe.elements();
            cardElement = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': { color: '#aab7c4' }
                    },
                    invalid: {
                        color: '#ef4444',
                        iconColor: '#ef4444'
                    }
                }
            });
            stripeConfigured = true;
        } catch (e) {
            console.warn('Stripe initialization failed:', e);
            stripeConfigured = false;
        }
    } else {
        stripeConfigured = false;
    }
}

// Initialize on page load
initializeStripe();

function togglePaymentMethod() {
    const method = document.getElementById('paymentMethod').value;
    const cardContainer = document.getElementById('cardElementContainer');
    const offlineContainer = document.getElementById('offlinePaymentContainer');

    if (method === 'card') {
        cardContainer.style.display = 'block';
        offlineContainer.style.display = 'none';
    } else {
        cardContainer.style.display = 'none';
        offlineContainer.style.display = 'block';
    }
}

async function openPaymentModal(orderId, customerName, amount, customerEmail) {
    currentPaymentOrder = { orderId, customerName, amount, customerEmail };
    document.getElementById('paymentOrderId').textContent = '#' + orderId;
    document.getElementById('paymentCustomer').textContent = customerName;
    document.getElementById('paymentEmail').textContent = customerEmail || 'N/A';
    document.getElementById('paymentAmount').textContent = amount.toFixed(2);
    document.getElementById('paymentError').style.display = 'none';
    document.getElementById('paymentMethod').value = 'card';

    // Reset payment notes
    const notesEl = document.getElementById('paymentNotes');
    if (notesEl) notesEl.value = '';

    togglePaymentMethod();

    // Mount Stripe card element if configured
    if (stripeConfigured && cardElement) {
        const cardElementDiv = document.getElementById('card-element');
        cardElementDiv.innerHTML = '';
        cardElement.mount('#card-element');

        cardElement.on('change', (event) => {
            const displayError = document.getElementById('card-errors');
            displayError.textContent = event.error ? event.error.message : '';
        });

        document.getElementById('stripeNotConfigured').style.display = 'none';
    } else {
        document.getElementById('stripeNotConfigured').style.display = 'block';
        document.getElementById('card-element').innerHTML = '<p style="color: var(--gray-500); margin: 0;">Card payments unavailable - Stripe not configured</p>';
    }

    document.getElementById('paymentModal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    if (cardElement) {
        cardElement.unmount();
    }
    currentPaymentOrder = null;
}

function showPaymentError(message) {
    const errorEl = document.getElementById('paymentError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

async function processPayment() {
    if (!currentPaymentOrder) return;

    const paymentMethod = document.getElementById('paymentMethod').value;
    const btn = document.getElementById('paymentButton');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Processing...';
    document.getElementById('paymentError').style.display = 'none';

    try {
        if (paymentMethod === 'card') {
            if (!stripeConfigured) {
                showPaymentError('Stripe is not configured. Please use cash or bank transfer.');
                btn.disabled = false;
                btn.innerHTML = originalText;
                return;
            }

            // Create payment intent on backend
            const intentResponse = await apiRequest('/api/payments/create-intent', {
                method: 'POST',
                body: JSON.stringify({
                    amount: currentPaymentOrder.amount,
                    orderId: currentPaymentOrder.orderId,
                    customerEmail: currentPaymentOrder.customerEmail || 'customer@example.com'
                })
            });

            const intentData = await intentResponse.json();

            if (!intentData.success) {
                throw new Error(intentData.error || 'Failed to create payment intent');
            }

            // Confirm payment with Stripe
            const { error, paymentIntent } = await stripe.confirmCardPayment(intentData.clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: currentPaymentOrder.customerName,
                        email: currentPaymentOrder.customerEmail
                    }
                }
            });

            if (error) {
                throw new Error(error.message);
            }

            if (paymentIntent.status === 'succeeded') {
                // Update order status to processing
                await apiRequest(`/api/orders/${currentPaymentOrder.orderId}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: 'processing' })
                });

                closePaymentModal();
                closeOrderDetailsModal();
                loadOrders(currentPage, statusFilter);
                alert('Payment successful! Order status updated to processing.');
            } else {
                throw new Error('Payment was not completed. Status: ' + paymentIntent.status);
            }
        } else {
            // Cash or Bank Transfer - just update order status
            const confirmed = confirm(
                `Record ${paymentMethod === 'cash' ? 'cash' : 'bank transfer'} payment of $${currentPaymentOrder.amount.toFixed(2)}?\n\n` +
                `This will mark the order as processing.`
            );

            if (!confirmed) {
                btn.disabled = false;
                btn.innerHTML = originalText;
                return;
            }

            // Update order status
            await apiRequest(`/api/orders/${currentPaymentOrder.orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'processing' })
            });

            closePaymentModal();
            closeOrderDetailsModal();
            loadOrders(currentPage, statusFilter);
            alert(`${paymentMethod === 'cash' ? 'Cash' : 'Bank transfer'} payment recorded. Order status updated to processing.`);
        }
    } catch (error) {
        console.error('Payment error:', error);
        showPaymentError(error.message || 'Payment failed. Please try again.');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Setup event listeners (CSP-compliant)
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

loadOrders();
