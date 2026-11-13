# Clerk Authentication Configuration

## Password Requirements

By default, Clerk enforces the following password requirements:
- Minimum 8 characters (recommended)
- Maximum 128 characters
- Must contain at least one letter and one number
- May include special characters

### Adjusting Password Requirements

For Replit's built-in Clerk authentication, password requirements are managed through the Clerk dashboard:

1. **For Replit Projects:**
   - Go to your Replit project
   - Click on the "Auth" tab in the sidebar
   - Click "Configure" next to Clerk
   - Adjust password requirements in the Clerk dashboard

2. **For Self-Hosted Clerk:**
   - Visit [https://dashboard.clerk.com](https://dashboard.clerk.com)
   - Navigate to your instance settings
   - Go to "Authentication" > "Password Policies"
   - Adjust the minimum password length to 8 characters
   - Optionally disable "Password breach detection" if desired

### Disabling Password Breach Detection

Clerk's "password found in breach" check is a security feature that prevents users from using passwords that have been exposed in known data breaches. 

**To disable this feature:**
- In Clerk dashboard: Go to "Authentication" > "Password Policies"
- Toggle off "Check for compromised passwords"

**Note:** Disabling this feature reduces security. It's recommended to keep it enabled for production applications.

### Environment Variables

Clerk requires the following environment variable for Replit:
- `CLERK_PUBLISHABLE_KEY` - Automatically provisioned by Replit

For local development, create a `.env.local` file with your Clerk keys:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
```

## Recommended Settings for CodeMechanic

- **Minimum password length:** 8 characters
- **Password breach detection:** Enabled (recommended) or Disabled (if causing issues)
- **Sign-in methods:** Email/password, OAuth (GitHub, Google, Discord)
- **Redirect URLs:** `/sign-in`, `/sign-up`, `/projects`
