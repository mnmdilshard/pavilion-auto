# Authentication & Role-Based Access Control

This application implements JWT-based authentication with two distinct user roles: **Admin** and **Read-Only**.

## User Roles

### Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Permissions**: Full access to all features
  - Create, read, update, and delete vehicles
  - Create, read, update, and delete sellers
  - Create, read, update, and delete investors
  - Create, read, update, and delete investments
  - Create bank transfers and LC payments
  - Calculate and manage profit distributions
  - Access all reports and export data
  - Change password

### Read-Only User
- **Username**: `readonly`
- **Password**: `readonly123`
- **Permissions**: View-only access
  - View all vehicles, sellers, investors, and investments
  - View bank transfers and LC payments
  - View profit distributions
  - Access all reports and export data
  - Change password
  - **Cannot**: Create, edit, or delete any records

## Technical Implementation

### Backend Protection
All create/update/delete API endpoints are protected with:
```javascript
app.post('/endpoint', authenticateToken, requireAdmin, (req, res) => {
  // Only admin users can access this endpoint
});
```

Protected endpoints include:
- `POST /vehicles` - Create vehicles
- `PUT /vehicles/:id` - Update vehicles
- `DELETE /vehicles/:id` - Delete vehicles
- `POST /sellers` - Create sellers
- `PUT /sellers/:id` - Update sellers
- `DELETE /sellers/:id` - Delete sellers
- `POST /bank-transfers` - Create bank transfers
- `POST /lc-records` - Create LC records
- `POST /api/investors` - Create investors
- `PUT /api/investors/:id` - Update investors
- `DELETE /api/investors/:id` - Delete investors
- `POST /api/investments` - Create investments
- `PUT /api/investments/:id` - Update investments
- `DELETE /api/investments/:id` - Delete investments
- `POST /api/profit-distribution/calculate/:vehicleId` - Calculate profit
- `DELETE /api/profit-distribution/vehicle/:vehicleId` - Clear profit

### Frontend Protection

#### Component-Level Protection
Forms that allow creation or editing automatically redirect read-only users:
- `VehicleForm` - Redirects to `/vehicles`
- `EditVehicleForm` - Redirects to `/vehicles`
- `SellerForm` - Redirects to `/sellers`
- `EditSellerForm` - Redirects to `/sellers`
- `InvestorForm` - Redirects to `/investment-tracking/investors`
- `VehicleInvestmentForm` - Redirects to `/investment-tracking`

#### UI Element Protection
Action buttons and links are hidden from read-only users using the `RoleBasedAccess` component:

```jsx
<RoleBasedAccess adminOnly>
  <button onClick={handleDelete}>Delete</button>
</RoleBasedAccess>
```

Protected UI elements include:
- "Add New" buttons across all listing pages
- Edit buttons in vehicle, seller, and investor lists
- Delete buttons in all contexts
- Form submission areas in Bank Transfer and LC pages
- All create/edit/delete actions

### Database Schema
Users table includes a `role` column:
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'readonly'
);
```

### JWT Token Structure
JWT tokens include the user's role:
```javascript
const token = jwt.sign(
  { id: user.id, username: user.username, role: user.role },
  JWT_SECRET,
  { expiresIn: '24h' }
);
```

### User Context
The React AuthContext provides:
- `user.username` - Current user's username
- `user.role` - Current user's role ('admin' or 'readonly')
- `user.token` - JWT token for API requests

## How to Use

1. **Login**: Navigate to the login page and use the credentials above
2. **Admin Access**: Full CRUD operations on all entities
3. **Read-Only Access**: View all data, generate reports, but cannot modify anything
4. **Role Display**: User role is displayed in the navigation bar
5. **Automatic Redirect**: Read-only users are redirected if they try to access creation/edit forms
6. **API Protection**: Backend will return 403 Forbidden if read-only users attempt restricted operations

## Security Features

- JWT tokens expire after 24 hours
- Passwords are hashed using bcrypt
- All sensitive endpoints require authentication
- Role-based authorization on both frontend and backend
- Automatic token validation on each request
- Protected routes redirect unauthorized users

## Future Enhancements

- Password strength requirements
- Account lockout after failed attempts
- Session timeout warnings
- Admin user management interface
- Audit logging for administrative actions
