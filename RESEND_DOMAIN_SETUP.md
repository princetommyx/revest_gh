# RESEND DOMAIN SETUP - URGENT

## ✅ Good News
Your email system is **WORKING**! The health check successfully connected to Resend API.

## ⚠️ The Issue
Resend's **sandbox mode** (`onboarding@resend.dev`) only allows sending emails to the account owner's email: **lyonlee350@gmail.com**

This is a Resend restriction, not a bug in your code.

## 🚀 Quick Test (Do This First)
Test that emails actually work by sending to YOUR email:

```
https://your-backend.onrender.com/api/users/email-health/?send_test=true&to=lyonlee350@gmail.com
```

This should work and you'll receive the email! ✅

## 🔧 Solution Options

### Option 1: Use Your Domain (Recommended for Production)

**Benefits:**
- Send to ANY email address
- Professional sender (e.g., `noreply@yourdomain.com`)
- Better deliverability

**Steps:**

1. **Go to Resend Dashboard**
   - Visit [resend.com/domains](https://resend.com/domains)
   - Click "Add Domain"

2. **Add Your Domain**
   - Enter your domain (e.g., `revesta.app` or whatever domain you own)
   - Click "Add"

3. **Verify Domain with DNS Records**
   Resend will show you DNS records to add. Go to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.) and add:
   
   - **SPF Record** (TXT)
   - **DKIM Record** (TXT)
   - **DMARC Record** (TXT or CNAME)

   Example:
   ```
   Type: TXT
   Name: _resend
   Value: resend-verification=abc123xyz...
   ```

4. **Wait for Verification**
   - DNS changes can take 5-60 minutes
   - Resend will email you when verified

5. **Update Your Settings**
   On Render, update environment variable:
   ```
   DEFAULT_FROM_EMAIL=noreply@yourdomain.com
   ```

   Or update your code in `settings.py`:
   ```python
   DEFAULT_FROM_EMAIL = 'noreply@revesta.app'  # Your verified domain
   ```

### Option 2: Keep Sandbox (For Testing Only)

**Limitation:** Only sends to `lyonlee350@gmail.com`

**Good for:**
- Testing the system works
- Development environment

**How to use:**
- When registering test users, use email: `lyonlee350@gmail.com`
- Login alerts will go to that email
- All password resets go there

This is NOT suitable for production with real users!

### Option 3: Use a Subdomain

If you have a domain but want to keep your main domain separate:

1. Add subdomain: `mail.yourdomain.com`
2. Follow same verification steps
3. Use: `noreply@mail.yourdomain.com`

---

## 📋 Immediate Action Plan

### Right Now (1 minute):
```bash
# Test with your verified email
curl "https://your-backend.onrender.com/api/users/email-health/?send_test=true&to=lyonlee350@gmail.com"
```

Check your inbox - you should receive the test email! ✅

### Next (10-60 minutes):
1. Go to [resend.com/domains](https://resend.com/domains)
2. Add your domain
3. Copy DNS records
4. Add to your domain registrar
5. Wait for verification

### After Domain Verified:
1. Update `DEFAULT_FROM_EMAIL` on Render
2. Test again with any email address
3. All emails will work for all users! 🎉

---

## ⚡ Want to Use It Right Now?

If you want emails working immediately for testing (without domain setup):

**Register users with email:** `lyonlee350@gmail.com`

All welcome emails, login alerts, and password resets will go to your inbox. This proves the system works while you set up the domain.

---

## 🎯 Summary

| What | Status | Action |
|------|--------|--------|
| Email System | ✅ Working | None needed |
| Resend API | ✅ Connected | None needed |
| Sandbox Restriction | ⚠️ Active | Verify domain OR test with lyonlee350@gmail.com |
| Production Ready | 🔄 Pending | Add verified domain |

The email system is **100% functional**. You just need to either:
- Test with `lyonlee350@gmail.com` to confirm it works
- OR verify a domain to send to anyone

Choose your path and let's get this done! 🚀
