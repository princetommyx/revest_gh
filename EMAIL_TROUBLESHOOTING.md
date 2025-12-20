# Email Troubleshooting Guide for Production (Render)

## Quick Diagnosis

Visit your production health check endpoint to see the current email configuration status:

```
https://your-backend.onrender.com/api/users/email-health/
```

This will show:
- Which email backend is configured (Resend API or SMTP)
- Whether required environment variables are set
- Configuration status

## Common Issues and Solutions

### Issue 1: Emails Not Sending (No Error Messages)

**Symptoms:**
- Registration completes but no welcome email
- Login works but no security alert
- Password reset doesn't send email

**Solution:**
Check the health endpoint response:

```json
{
  "backend_type": "SMTP",
  "status": "OK",
  "email_host_user_configured": false,
  "email_host_password_configured": false
}
```

If you see `false` values, the `RESEND_API_KEY` is missing on Render.

**Fix:**
1. Go to [dashboard.render.com](https://dashboard.render.com/)
2. Select your `revesta-backend` service
3. Go to "Environment" tab
4. Add: `RESEND_API_KEY` = `re_xxxxxxxxx` (your API key from resend.com)
5. Click "Save Changes"
6. Render will automatically redeploy

### Issue 2: "RESEND_API_KEY is not configured"

**Symptoms:**
- 500 error when checking health endpoint
- Error in Render logs: `ValueError: RESEND_API_KEY must be set`

**Solution:**
Same as Issue 1 - add the `RESEND_API_KEY` environment variable on Render.

### Issue 3: Getting Resend API Key

1. Visit [resend.com](https://resend.com/)
2. Sign up for free account
3. Go to "API Keys" section
4. Click "Create API Key"
5. Copy the key (starts with `re_`)
6. Add it to Render environment variables

**Important:** The free tier allows:
- 100 emails/day
- `onboarding@resend.dev` sender address (no domain verification needed)

### Issue 4: Emails Work Locally But Not on Production

**Check:**
1. Visit the health endpoint on production
2. Compare with local: `http://127.0.0.1:8000/api/users/email-health/`
3. Check if production shows different backend or missing credentials

**Common Cause:**
- Local uses SMTP (gmail), production needs Resend API
- Environment variable not synced to Render

**Fix:**
Ensure `RESEND_API_KEY` is set on Render (not just locally)

### Issue 5: Test Sending an Email

To actually test if emails can be sent from production:

```
https://your-backend.onrender.com/api/users/email-health/?send_test=true&to=youremail@example.com
```

This will attempt to send a test email and show detailed error messages if it fails.

**Expected Success Response:**
```json
{
  "backend_type": "Resend API",
  "status": "SUCCESS",
  "test_email_sent": true,
  "test_email_recipient": "youremail@example.com"
}
```

**Failed Response Example:**
```json
{
  "backend_type": "Resend API",
  "status": "FAILED",
  "test_email_sent": false,
  "test_email_error": "Invalid API key",
  "test_email_error_type": "AuthenticationError"
}
```

## Checking Render Logs

1. Go to your Render dashboard
2. Click on `revesta-backend` service
3. Click "Logs" tab
4. Look for email-related messages:

**Success logs:**
```
✓ Email configured with Resend API (key length: 32)
ResendBackend initialized with API key
✓ Email sent successfully via Resend to user@example.com
```

**Error logs:**
```
⚠ Email NOT configured - missing RESEND_API_KEY
RESEND_API_KEY is not configured in settings!
Failed to send email via Resend: Invalid API key
```

## Environment Variables Checklist

On Render, you should have these environment variables set:

- ✅ `RESEND_API_KEY` - Your Resend API key (starts with `re_`)
- ✅ `CORS_ALLOWED_ORIGINS` - Your frontend URL (for email links) e.g., `https://your-app.vercel.app`
- ✅ `ALLOWED_HOSTS` - Your backend domain e.g., `revesta-backend.onrender.com`
- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `REDIS_URL` - Redis connection string
- ✅ `SECRET_KEY` - Django secret key

## Still Not Working?

1. **Check Resend Dashboard**: Log into resend.com and check if emails appear in the logs
2. **Verify API Key**: Make sure you copied the entire key (they're long!)
3. **Check Email Recipient**: Make sure you're checking the correct email inbox (check spam folder)
4. **Redeploy**: After adding environment variables, trigger a manual deploy
5. **Check Logs**: Look for the startup log `✓ Email configured with Resend API`

## Testing Flow

1. **Check Configuration**:
   ```
   GET /api/users/email-health/
   ```

2. **Send Test Email**:
   ```
   GET /api/users/email-health/?send_test=true&to=your@email.com
   ```

3. **Register New User** (triggers welcome email):
   ```
   POST /api/users/register/
   {
     "username": "testuser",
     "email": "test@example.com",
     "password": "testpass123"
   }
   ```

4. **Check Render Logs** for email sending confirmation

5. **Check Your Email Inbox** (including spam folder)

## Contact Support

If emails still don't work after following this guide:
1. Share the output from `/api/users/email-health/`
2. Share relevant Render logs
3. Confirm Resend API key is correctly set
