const API_URL = 'http://localhost:5000';
let currentPage = 1;
let searchQuery = '';
let isEditing = false;

// Check authentication
const token = localStorage.getItem('token');
const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');

if (!token) {
    window.location.href = 'index.html';
}

// Display store name
document.getElementById('storeName').textContent = tenant.store_name || '';

// Logout
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('tenant');
    window.location.href = 'index.html';
}

// API Helper
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

// Load Inventory
async function loadInventory(page = 1, search = '') {
    try {
        const params = new URLSearchParams({
            page,
            limit: 10,
            search,
            sortBy: 'created_at',
            sortOrder: 'DESC'
        });

        const response = await apiRequest(`/api/inventory?${params}`);

        if (!response) {
            // Session expired or unauthorized
            return;
        }

        const data = await response.json();

        if (data.items) {
            renderInventoryTable(data.items);
            renderPagination(data.pagination);
            updateStats(data.items, data.pagination.total);
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        const errorMessage = error.message.includes('Failed to fetch')
            ? 'Cannot connect to server. Please check your internet connection.'
            : 'Failed to load inventory. Please refresh the page.';
        document.getElementById('inventoryTable').innerHTML =
            `<div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>${errorMessage}</p>
                <button class="btn btn-primary" onclick="loadInventory()">Try Again</button>
            </div>`;
    }
}

// Render Inventory Table
function renderInventoryTable(items) {
    const tableContainer = document.getElementById('inventoryTable');

    if (items.length === 0) {
        tableContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <p>No products found</p>
                <button class="btn btn-success" onclick="openAddModal()">Add Your First Product</button>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(item => {
        const status = item.quantity === 0 ? 'Out of Stock' :
                      item.quantity < 10 ? 'Low Stock' : 'In Stock';
        const statusClass = item.quantity === 0 ? 'danger' :
                           item.quantity < 10 ? 'warning' : 'success';

        const imageHtml = item.image_url ?
            `<img src="${API_URL}${item.image_url}" alt="${escapeHtml(item.name)}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">` :
            `<div style="width: 50px; height: 50px; background: var(--gray-200); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--gray-500); font-size: 20px;">📦</div>`;

        html += `
            <tr>
                <td>${imageHtml}</td>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td>${escapeHtml(item.sku)}</td>
                <td>${item.quantity}</td>
                <td>$${parseFloat(item.price).toFixed(2)}</td>
                <td><span class="badge badge-${statusClass}">${status}</span></td>
                <td>
                    <button class="btn" style="background: var(--primary); color: white; padding: 6px 12px; margin-right: 5px;"
                            onclick="editProduct(${item.id})">Edit</button>
                    <button class="btn" style="background: var(--danger); color: white; padding: 6px 12px;"
                            onclick="deleteProduct(${item.id})">Delete</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    tableContainer.innerHTML = html;
}

// Render Pagination
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    const { page, totalPages } = pagination;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button onclick="changePage(${page - 1})" ${page === 1 ? 'disabled' : ''}>Previous</button>
        <span>Page ${page} of ${totalPages}</span>
        <button onclick="changePage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>Next</button>
    `;

    container.innerHTML = html;
}

// Update Stats
function updateStats(items, total) {
    document.getElementById('totalProducts').textContent = total;

    const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;

    const lowStock = items.filter(item => item.quantity < 10 && item.quantity > 0).length;
    document.getElementById('lowStock').textContent = lowStock;

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('totalQuantity').textContent = totalQuantity;
}

// Change Page
function changePage(page) {
    currentPage = page;
    loadInventory(page, searchQuery);
}

// Handle Search
let searchTimeout;
function handleSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchQuery = document.getElementById('searchInput').value;
        currentPage = 1;
        loadInventory(1, searchQuery);
    }, 300);
}

// Open Add Modal
function openAddModal() {
    isEditing = false;
    document.getElementById('modalTitle').textContent = 'Add Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModal').classList.add('active');
}

// Close Modal
function closeModal() {
    document.getElementById('productModal').classList.remove('active');
}

// Edit Product
async function editProduct(id) {
    try {
        const response = await apiRequest(`/api/inventory?search=&page=1&limit=100`);
        const data = await response.json();
        const product = data.items.find(item => item.id === id);

        if (product) {
            isEditing = true;
            document.getElementById('modalTitle').textContent = 'Edit Product';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productSku').value = product.sku;
            document.getElementById('productQuantity').value = product.quantity;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productModal').classList.add('active');
        }
    } catch (error) {
        alert('Error loading product details');
    }
}

// Handle Product Submit
async function handleProductSubmit(e) {
    e.preventDefault();

    const productData = {
        name: document.getElementById('productName').value,
        sku: document.getElementById('productSku').value,
        quantity: parseInt(document.getElementById('productQuantity').value),
        price: parseFloat(document.getElementById('productPrice').value)
    };

    const productId = document.getElementById('productId').value;
    const imageFile = document.getElementById('productImage').files[0];

    // Get button and show loading state
    const button = e.target.querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Saving...';

    try {
        let response;
        let savedProductId = productId;

        // Step 1: Save product data
        if (isEditing && productId) {
            response = await apiRequest(`/api/inventory/${productId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
        } else {
            response = await apiRequest('/api/inventory', {
                method: 'POST',
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                const result = await response.json();
                savedProductId = result.item.id;
            }
        }

        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Failed to save product');
            // Restore button on error
            button.disabled = false;
            button.innerHTML = originalText;
            return;
        }

        // Step 2: Upload image if provided
        if (imageFile && savedProductId) {
            button.innerHTML = '<span class="spinner"></span> Uploading image...';
            const formData = new FormData();
            formData.append('image', imageFile);

            const uploadResponse = await fetch(`${API_URL}/api/inventory/${savedProductId}/upload-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!uploadResponse.ok) {
                console.error('Image upload failed, but product was saved');
            }
        }

        closeModal();
        loadInventory(currentPage, searchQuery);
        alert(isEditing ? 'Product updated successfully!' : 'Product added successfully!');
        // Restore button for next use
        button.disabled = false;
        button.innerHTML = originalText;
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product');
        // Restore button on error
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Delete Product
async function deleteProduct(id, buttonElement) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    // Get the delete button that was clicked (passed from onclick or find it)
    const button = buttonElement || event.target.closest('button');
    let originalText = '';
    if (button) {
        originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span>';
    }

    try {
        const response = await apiRequest(`/api/inventory/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadInventory(currentPage, searchQuery);
            alert('Product deleted successfully!');
        } else {
            alert('Failed to delete product');
            // Restore button on error
            if (button) {
                button.disabled = false;
                button.innerHTML = originalText;
            }
        }
    } catch (error) {
        alert('Error deleting product');
        // Restore button on error
        if (button) {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
}

// Utility
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Image handling functions
function previewImage() {
    const file = document.getElementById('productImage').files[0];
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            document.getElementById('productImage').value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    document.getElementById('productImage').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('previewImg').src = '';
}

// Initial load
loadInventory();
