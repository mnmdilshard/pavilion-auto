# Reports Feature Documentation

## Overview
The Reports feature provides comprehensive reporting capabilities for the Pavilion Auto system. It allows users to generate various types of reports with advanced filtering options and export functionality.

## Available Reports

### 1. Seller Payments Report
- **Description**: View all payments made to sellers (Bank Transfers)
- **Key Data**: Payment date, amount, transfer mode, seller details, vehicle information
- **Filters**: Seller, Date range, Vehicle, Transfer mode, Amount range

### 2. LC Payments Report
- **Description**: View all Letter of Credit payment records
- **Key Data**: Payment date, amount, transfer mode, seller details, vehicle information
- **Filters**: Seller, Date range, Vehicle, Transfer mode, Amount range

### 3. Vehicle Financial Report
- **Description**: Complete financial breakdown by vehicle including costs, sales, and outstanding payments
- **Key Data**: Vehicle details, all cost components, sale price, profit, payment status
- **Filters**: Vehicle, Seller, Vehicle status, Cost range

### 4. Seller Summary Report
- **Description**: Outstanding balances and payment history summarized by seller
- **Key Data**: Total vehicles, payment amounts, outstanding balances
- **Filters**: Seller

### 5. Investment Summary Report
- **Description**: Investor contributions and returns (if investment tracking is enabled)
- **Key Data**: Investment amounts, dates, investor details, profit received
- **Filters**: Investor, Vehicle, Date range

### 6. Profit Distribution Report
- **Description**: Profit sharing among investors (if profit distribution is enabled)
- **Key Data**: Distribution amounts, percentages, dates, investor details
- **Filters**: Investor, Vehicle, Date range

### 7. Vehicle Status Report
- **Description**: Vehicles grouped by their current status
- **Key Data**: Status-wise counts, total costs, sales, and profits
- **Filters**: Vehicle status, Seller

### 8. Monthly Summary Report
- **Description**: Monthly breakdown of all transaction types
- **Key Data**: Monthly totals for all transaction types
- **Filters**: Date range

## Features

### Advanced Filtering
- **Date Range**: Filter by start and end dates
- **Seller Selection**: Filter by specific sellers
- **Vehicle Selection**: Filter by specific vehicles
- **Investor Selection**: Filter by specific investors (where applicable)
- **Transfer Mode**: Filter by payment method
- **Vehicle Status**: Filter by vehicle status
- **Amount Range**: Filter by minimum and maximum amounts

### Summary Statistics
Each report includes relevant summary statistics such as:
- Total amounts
- Record counts
- Unique entities (sellers, vehicles, investors)
- Calculated metrics (averages, outstanding balances, etc.)

### Export Functionality
- Export any report to CSV format
- Automatic filename generation with report type and date
- Properly formatted data for spreadsheet applications

### Responsive Design
- Mobile-friendly interface
- Adaptive layouts for different screen sizes
- Accessible navigation and controls

## Technical Implementation

### Frontend Components
- **ReportsPage.js**: Main component handling report generation and display
- **Filter System**: Dynamic filtering based on report type
- **Data Visualization**: Tabular display with formatted currency and dates
- **Export System**: Client-side CSV generation

### Backend API Endpoints
All endpoints are under `/api/reports/`:

- `GET /api/reports/seller-payments` - Seller payments report
- `GET /api/reports/lc-payments` - LC payments report
- `GET /api/reports/vehicle-financials` - Vehicle financial report
- `GET /api/reports/seller-summary` - Seller summary report
- `GET /api/reports/investment-summary` - Investment summary report
- `GET /api/reports/profit-distribution` - Profit distribution report
- `GET /api/reports/vehicle-status` - Vehicle status report
- `GET /api/reports/monthly-summary` - Monthly summary report

### Database Queries
- Optimized SQL queries with proper JOINs
- Parameter binding for security
- Aggregation functions for summary statistics
- Support for complex filtering conditions

## Usage Instructions

1. **Navigate to Reports**: Click on "Reports" in the main navigation
2. **Select Report Type**: Choose from the available report types
3. **Apply Filters**: Use the filter options to narrow down the data
4. **Generate Report**: The report will automatically update based on your selections
5. **Export Data**: Click "Export to CSV" to download the report

## Error Handling

The system gracefully handles:
- Missing database tables (for optional features)
- Network connectivity issues
- Invalid filter parameters
- Empty result sets

## Future Enhancements

Potential improvements that could be added:
- Chart and graph visualizations
- Scheduled report generation
- Email report delivery
- Additional report formats (PDF, Excel)
- Advanced analytics and trends
- Custom report builder
- Report templates and saved configurations

## Dependencies

- React for frontend components
- Express.js for backend API
- SQLite for database queries
- Tailwind CSS for styling
- Date handling utilities
- CSV export functionality
