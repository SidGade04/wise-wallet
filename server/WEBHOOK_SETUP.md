# Webhook Setup Guide

## 🎯 **Goal**
Set up automatic payment processing so users become PRO immediately after successful payment.

## 🔧 **Step 1: Install ngrok**

### Windows (Manual Installation)
1. Go to [ngrok.com/download](https://ngrok.com/download)
2. Download Windows version
3. Extract `ngrok.exe` to a folder (e.g., `C:\ngrok\`)
4. Add folder to PATH or run from that location

### Alternative: Download directly
```bash
# Download ngrok
curl -O https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip
# Extract and add to PATH
```

## 🚀 **Step 2: Start Your Server**

```bash
# In your server directory
python main.py
```

Your server should be running on `http://localhost:8000`

## 🌐 **Step 3: Create Public Tunnel**

In a new terminal:
```bash
ngrok http 8000
```

You'll see output like:
```
Forwarding    https://abc123.ngrok.io -> http://localhost:8000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

## 🔗 **Step 4: Configure Stripe Webhook**

1. **Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)**
2. **Click "Add endpoint"**
3. **Set endpoint URL**: `https://3158H9QoD5aCVBGFUptgESHBHqB_6nE4bypxLmKxfW9vaWnjL.ngrok.io/api/stripe/webhook`
4. **Select events**:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
5. **Click "Add endpoint"**
6. **Copy the signing secret** (starts with `whsec_`)

## 🔐 **Step 5: Add Webhook Secret**

Add this line to your `.env` file:
```
STRIPE_WEBHOOK_SECRET=whsec_e9400b3cef4b55224e9a71308016e204813f709a2dfa08a0d2c23eb06b3265e3
```

## 🔄 **Step 6: Restart Server**

```bash
# Stop your server (Ctrl+C)
# Then restart it
python main.py
```

## ✅ **Step 7: Test the Setup**

1. **Make a test payment** in your app
2. **Check webhook delivery** in Stripe Dashboard
3. **Verify user becomes PRO** automatically

## 🐛 **Troubleshooting**

### Webhook Not Receiving Events
- Check ngrok tunnel is active
- Verify webhook URL is correct
- Ensure server is running

### Webhook Failing
- Check `STRIPE_WEBHOOK_SECRET` is set
- Verify webhook secret matches Stripe Dashboard
- Check server logs for errors

### User Not Becoming PRO
- Check webhook delivery status in Stripe
- Verify webhook processing in server logs
- Ensure user profile exists in database

## 📝 **Environment Variables Needed**

```bash
# Required for webhooks
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Already configured
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 🎉 **Result**

After setup, when a user makes a successful payment:
1. Stripe sends webhook to your server
2. Server processes the payment
3. User's profile is updated to `is_pro: True`
4. User can access Pro features immediately
