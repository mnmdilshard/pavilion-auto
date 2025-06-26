# Adding Pavilion Motors Logo

## Instructions:

1. **Save the logo image:**
   - Save the provided Pavilion Motors logo image as `pavilion-logo.png`
   - Place it in the `/client/public/` folder
   - The full path should be: `/client/public/pavilion-logo.png`

2. **Logo locations updated:**
   - ✅ Login page: Logo appears at the top of the login form
   - ✅ Dashboard/Landing page: Logo in the header section  
   - ✅ Navigation bar: Logo in the top navigation across all pages

3. **Fallback behavior:**
   - If the logo file is not found, the components will show text fallbacks
   - Login page: Shows "Pavilion Motors" text
   - Dashboard: Shows "Pavilion Motors" text
   - Navigation: Shows "Pavilion Motors" text

4. **Logo specifications:**
   - Format: PNG (recommended)
   - Size: The logo will auto-scale to appropriate sizes:
     - Login: 80px height (h-20)
     - Dashboard: 48px height (h-12)  
     - Navigation: 40px height (h-10)

## File locations changed:
- `/client/src/components/Login.js` - Added logo to login page
- `/client/src/components/DashboardPage.js` - Added logo to dashboard header
- `/client/src/App.js` - Added logo to navigation bar

## Next steps:
1. Copy the Pavilion Motors logo image to `/client/public/pavilion-logo.png`
2. Refresh the application to see the logo appear
3. The logo will be visible on login, dashboard, and all page headers
