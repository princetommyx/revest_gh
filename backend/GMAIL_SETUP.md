# Gmail Setup Guide for ReVesta Email Notifications

## Overview
This guide will help you set up Gmail to send welcome emails to new users after registration.

## Prerequisites
- A Gmail account (can create a new one like `revesta.notifications@gmail.com`)
- Access to that Gmail account's settings

## Step-by-Step Setup

### 1. Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Scroll to "How you sign in to Google"
4. Click on **2-Step Verification**
5. Follow the prompts to enable 2FA (you'll need your phone)

### 2. Create an App Password
1. After enabling 2FA, go back to **Security**
2. Click on **2-Step Verification** again
3. Scroll down to the bottom
4. Click on **App passwords**
5. You may need to sign in again
6. In the "Select app" dropdown, choose **Mail**
7. In the "Select device" dropdown, choose **Other (Custom name)**
8. Type "ReVesta Backend" or similar
9. Click **Generate**
10. **IMPORTANT**: Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
    - You won't be able to see this again!
    - Remove spaces when using it: `xxxxxxxxxxxxxxxx`

### 3. Configure Local Environment (.env file)

Create or edit `backend/.env` file:

```env
EMAIL_HOST_USER=revesta.notifications@gmail.com
EMAIL_HOST_PASSWORD=your16characterapppassword
```

**Example:**
```env
EMAIL_HOST_USER=revesta.notifications@gmail.com
EMAIL_HOST_PASSWORD=abcdefghijklmnop
```

### 4. Configure Production (Render Dashboard)

1. Go to your Render Dashboard: https://dashboard.render.com/
2. Click on your `revesta-backend` service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add these two variables:
   - Key: `EMAIL_HOST_USER`, Value: `revesta.notifications@gmail.com`
   - Key: `EMAIL_HOST_PASSWORD`, Value: `your16characterapppassword`
6. Click **Save Changes**
7. Render will automatically redeploy your service

## Testing Email Functionality

### Local Testing
1. Start your Django server: `python manage.py runserver`
2. Register a new user with a valid email address
3. Check the terminal for log message: "Welcome email sent to [email]"
4. Check the inbox of the email you registered with

### Production Testing  
1. After deploying to Render with environment variables set
2. Register on your live site with a valid email
3. Check that email inbox for the welcome message

## Troubleshooting

### Email Not Sending
- **Check logs** for error messages
- **Verify** environment variables are set correctly (no spaces in app password)
- **Confirm** 2FA is enabled on the Gmail account
- **Try** generating a new app password

### "Authentication Failed" Error
- Make sure you're using the **app password**, not your regular Gmail password
- Remove any spaces from the app password
- Verify EMAIL_HOST_USER matches the Gmail account that generated the app password

### Email Goes to Spam
- This is normal initially with new sender addresses
- Ask recipients to mark as "Not Spam"
- Consider using a custom domain email in the future

## Security Best Practices
- ✅ Never commit `.env` file to git (it's in `.gitignore`)
- ✅ Use app passwords, never regular passwords
- ✅ Keep production credentials only in Render dashboard
- ✅ Consider rotating app passwords periodically

## Email Template Customization

Email templates are located at:
- HTML: `backend/users/templates/emails/welcome_email.html`
- Plain text: `backend/users/templates/emails/welcome_email.txt`

You can edit these files to customize the welcome message, branding, or styling.

---

**Questions?** Reach out for support!
