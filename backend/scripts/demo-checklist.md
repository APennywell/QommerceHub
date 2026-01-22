# QommerceHub Demo Walkthrough Checklist

## Demo Account Credentials
- **Email:** demo@urbanstyle.shop
- **Password:** DemoPassword123!
- **Store Name:** Urban Style Boutique

---

## Pre-Demo Setup (15 minutes before)

### 1. Environment Check
- [ ] PostgreSQL database is running
- [ ] `.env` file has correct database credentials
- [ ] Node.js installed (v18+)

### 2. Database Setup
```bash
cd backend
npm run migrate
```
- [ ] Migrations completed successfully

### 3. Start Backend Server
```bash
npm start
```
- [ ] Server running on http://localhost:5000
- [ ] Verify: http://localhost:5000/health shows `{"status":"ok",...}`

### 4. Seed Demo Data
```bash
npm run seed:demo
```
- [ ] Demo tenant created
- [ ] 18 products created
- [ ] 10 customers created
- [ ] 15 orders created (various statuses)

### 5. Run Test Suite (Optional but Recommended)
```bash
npm run test:all
```
- [ ] All tests pass (green)

### 6. Browser Setup
- [ ] Open Chrome/Firefox (incognito recommended)
- [ ] Navigate to frontend (e.g., http://localhost:3000 or file:///.../frontend/index.html)
- [ ] Clear any cached login data

---

## Demo Script (20-25 minutes)

### Part 1: Login & Overview (2 min)
1. [ ] Show the login page
2. [ ] Enter demo credentials:
   - Email: `demo@urbanstyle.shop`
   - Password: `DemoPassword123!`
3. [ ] Click Login
4. [ ] Point out: Store name "Urban Style Boutique" in navbar

**Talking Points:**
- Multi-tenant architecture - each store is isolated
- Secure JWT authentication
- Clean, modern UI

---

### Part 2: Dashboard Overview (3 min)
1. [ ] Show the dashboard stats cards:
   - Total Products
   - Total Inventory Value
   - Low Stock Alerts
   - Total Quantity
2. [ ] Scroll through the product list
3. [ ] Point out the search functionality

**Talking Points:**
- Real-time metrics
- At-a-glance business insights
- Responsive design works on mobile

---

### Part 3: Inventory Management (5 min)
1. [ ] Browse existing products (18 items across categories)
2. [ ] Use search: Type "wireless" to find electronics
3. [ ] Click "Add Product" and create a new item:
   - Name: "Summer Collection Cap"
   - SKU: "ACC-006"
   - Quantity: 50
   - Price: 34.99
   - Category: Accessories
4. [ ] Edit an existing product (change quantity)
5. [ ] Show pagination (if many products)

**Talking Points:**
- Full CRUD operations
- SKU uniqueness enforced
- Category organization
- Image upload support (show the upload button)

---

### Part 4: Customer Management (3 min)
1. [ ] Navigate to Customers page
2. [ ] Show the customer list (10 pre-loaded)
3. [ ] Use search: Type "Sarah" to find Sarah Johnson
4. [ ] Click "Add Customer" and create:
   - Name: "Demo Client"
   - Email: "demo.client@company.com"
   - Phone: "555-1234"
5. [ ] View customer details

**Talking Points:**
- Customer profiles with contact info
- Order history tracking (coming up)
- Email validation

---

### Part 5: Order Management (5 min)
1. [ ] Navigate to Orders page
2. [ ] Show order list with status badges:
   - Green: Completed (5)
   - Blue: Processing (4)
   - Yellow: Pending (4)
   - Red: Cancelled (2)
3. [ ] Filter by status (click a status badge)
4. [ ] Click on a pending order to view details
5. [ ] Update order status: Pending -> Processing
6. [ ] Show the order items breakdown

**Talking Points:**
- Order workflow management
- Automatic inventory deduction on order creation
- Status email notifications
- Order notes for special instructions

---

### Part 6: Analytics Dashboard (3 min)
1. [ ] Navigate to Analytics page
2. [ ] Show the metrics cards at top
3. [ ] Point out the Sales Trend chart (line chart)
4. [ ] Show Order Status distribution (pie chart)
5. [ ] Scroll to Top Products and Top Customers
6. [ ] Show Low Stock Alerts table
7. [ ] Demonstrate Export buttons (CSV/Excel)

**Talking Points:**
- Real-time analytics
- Interactive Chart.js visualizations
- Exportable reports for accounting
- Low stock alerts for inventory management

---

### Part 7: Additional Features (3 min)
1. [ ] Navigate to Barcode Scanner page
   - Show camera scanning capability
   - Demonstrate manual barcode entry
2. [ ] Navigate to Settings page (if available)
   - Show store customization options
3. [ ] Show API Documentation
   - Navigate to http://localhost:5000/api-docs
   - Interactive Swagger UI

**Talking Points:**
- Barcode scanner for quick inventory lookup
- Store branding/customization
- Full API documentation for integrations
- PDF invoice generation (show from order details)

---

### Closing (2 min)
1. [ ] Recap key features:
   - Multi-tenant SaaS architecture
   - Complete inventory management
   - Order processing with status workflow
   - Real-time analytics
   - Barcode scanning
   - Email notifications
   - PDF invoices
   - API documentation
2. [ ] Open for Q&A

---

## Troubleshooting Guide

### Issue: Cannot connect to server
```bash
# Check if server is running
curl http://localhost:5000/health

# If not running, start it
cd backend && npm start
```

### Issue: Database connection failed
```bash
# Check PostgreSQL status
pg_isready

# Verify .env credentials match your database
```

### Issue: Login fails with demo account
```bash
# Re-run the seed script
npm run seed:demo
```

### Issue: No data showing
```bash
# Verify seed completed successfully
npm run seed:demo

# Check for errors in server console
```

### Issue: Tests failing
```bash
# Run verbose tests
npm test -- --verbose

# Check if mocks are set up correctly
```

---

## Quick Commands Reference

```bash
# Start everything for demo
cd backend
npm run migrate          # Run database migrations
npm start                # Start server (keep running)

# In another terminal
npm run seed:demo        # Populate demo data
npm run test:all         # Verify everything works

# Access points
# API:      http://localhost:5000
# API Docs: http://localhost:5000/api-docs
# Health:   http://localhost:5000/health
```

---

## Demo Data Summary

| Category | Count | Examples |
|----------|-------|----------|
| Products | 18 | Earbuds, Smart Watch, Denim Jacket, Sneakers |
| Customers | 10 | Sarah Johnson, Michael Chen, Emily Rodriguez |
| Orders | 15 | 5 completed, 4 processing, 4 pending, 2 cancelled |

**Product Categories:**
- Electronics (5 items)
- Clothing (5 items)
- Accessories (5 items)
- Footwear (3 items)

---

*Last Updated: January 2026*
