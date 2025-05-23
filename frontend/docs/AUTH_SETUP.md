# SUI FacePay - zkLogin Authentication Setup

This guide explains how to set up zkLogin authentication with Google OAuth for the SUI FacePay application.

## Overview

SUI FacePay uses zkLogin technology to provide secure, privacy-preserving authentication. Users can log in with their Google account and get a SUI wallet address generated using zero-knowledge proofs.

## Prerequisites

1. **Google Cloud Console Account**: You need access to Google Cloud Console to create OAuth credentials
2. **Shinami Account**: Required for zkLogin infrastructure
3. **SUI Testnet**: The application runs on SUI testnet

## Step 1: Google OAuth Setup

### 1.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (if not already enabled)
4. Go to "Credentials" in the left sidebar
5. Click "Create Credentials" → "OAuth 2.0 Client IDs"
6. Configure the OAuth consent screen if prompted
7. Select "Web application" as the application type
8. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google` (for development)
   - `https://yourdomain.com/auth/google` (for production)

### 1.2 Configure OAuth Consent Screen

1. Go to "OAuth consent screen" in Google Cloud Console
2. Choose "External" user type (unless you have a Google Workspace)
3. Fill in the required information:
   - App name: "SUI FacePay"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
5. Add test users (for development)

## Step 2: Shinami Setup

### 2.1 Get Shinami Access Key

1. Sign up at [Shinami](https://www.shinami.com/)
2. Create a new project
3. Get your Node Access Key from the dashboard
4. Note down your access key for environment configuration

## Step 3: Environment Configuration

Create a `.env.local` file in the frontend directory with the following variables:

```bash
# SUI Network Configuration
NEXT_PUBLIC_SUI_NETWORK=testnet

# Shinami Configuration
NEXT_PUBLIC_SHINAMI_NODE_ACCESS_KEY=your_shinami_access_key_here

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here

# zkLogin Configuration
NEXT_PUBLIC_LOGIN_PAGE_PATH=/auth/login
NEXT_PUBLIC_REDIRECT_URL=http://localhost:3000

# Development
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Application Configuration

### 4.1 Callback Routes

The application includes the following callback routes:

- `/auth/google` - Google OAuth callback
- `/auth/facebook` - Facebook OAuth callback (optional)
- `/auth/twitch` - Twitch OAuth callback (optional)
- `/auth/apple` - Apple OAuth callback (optional)

### 4.2 API Routes

The following API routes handle authentication:

- `GET /api/auth/user` - Get current user status
- `POST /api/auth/logout` - Logout user

## Step 5: Testing the Setup

### 5.1 Start the Development Server

```bash
cd frontend
npm run dev
```

### 5.2 Test Authentication Flow

1. Navigate to `http://localhost:3000/auth/login`
2. Click "Continue with Google"
3. Complete the Google OAuth flow
4. You should be redirected back to the application with a SUI wallet address

### 5.3 Verify Wallet Generation

After successful authentication, the user should have:
- A SUI wallet address generated via zkLogin
- Access to SUI testnet functionality
- Ability to interact with SUI smart contracts

## Step 6: Production Deployment

### 6.1 Update OAuth Redirect URIs

1. Add your production domain to Google OAuth redirect URIs
2. Update environment variables for production
3. Ensure HTTPS is enabled for production

### 6.2 Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **Secure Cookies**: Session cookies should be secure and httpOnly
3. **CORS Configuration**: Properly configure CORS for your domain
4. **Rate Limiting**: Implement rate limiting for authentication endpoints

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" Error**
   - Ensure the redirect URI in Google Console matches exactly
   - Check for trailing slashes and protocol (http vs https)

2. **"invalid_client" Error**
   - Verify the Google Client ID is correct
   - Ensure the OAuth consent screen is properly configured

3. **zkLogin Session Issues**
   - Check Shinami access key is valid
   - Verify SUI network configuration

4. **Wallet Not Generated**
   - Ensure all required scopes are granted
   - Check browser console for errors

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=zklogin:*
```

## Security Best Practices

1. **Environment Variables**: Never commit sensitive keys to version control
2. **Session Management**: Use secure session storage
3. **Input Validation**: Validate all user inputs
4. **Error Handling**: Don't expose sensitive information in error messages
5. **Audit Logging**: Log authentication events for security monitoring

## Additional Resources

- [SUI zkLogin Documentation](https://docs.sui.io/concepts/cryptography/zklogin)
- [Shinami Documentation](https://docs.shinami.com/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Authentication Patterns](https://nextjs.org/docs/authentication)

## Support

For issues related to:
- **zkLogin**: Contact Shinami support
- **Google OAuth**: Check Google Cloud Console documentation
- **SUI Blockchain**: Visit SUI Discord or documentation
- **Application Issues**: Create an issue in the project repository 