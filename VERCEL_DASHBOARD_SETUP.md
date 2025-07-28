# 🎯 Vercel Dashboard Environment Setup Guide

## Step-by-Step Instructions

### 1. Open Vercel Dashboard
Go to: **https://vercel.com/dashboard**

### 2. Select Your Project
Click on your LastMile delivery project from the list

### 3. Navigate to Environment Variables
- Click **"Settings"** tab
- Click **"Environment Variables"** in the left sidebar

### 4. Add Each Variable

Click **"Add New"** for each variable below:

---

## 📋 **Variable 1: MONGODB_URI**

**Name:** `MONGODB_URI`

**Value:** 
```
mongodb+srv://olakumaps:JdE3fCzP1ZexSeHr@cluster0.qpnev0l.mongodb.net/lastmile-delivery?retryWrites=true&w=majority&appName=Cluster0
```

**Environment:** Select **"Production"**

**Click:** "Save"

---

## 📋 **Variable 2: JWT_SECRET**

**Name:** `JWT_SECRET`

**Value:** 
```
f17491dc9936725de57680174e1c705ed31cfb831ab609f7dc5718404baa16ac
```

**Environment:** Select **"Production"**

**Click:** "Save"

---

## 📋 **Variable 3: NEXTAUTH_SECRET**

**Name:** `NEXTAUTH_SECRET`

**Value:** 
```
99d9d31527cdbf9f6ad3379fd370204b70d3df2016098fe2022bbf60810ef0cd
```

**Environment:** Select **"Production"**

**Click:** "Save"

---

## 📋 **Variable 4: NEXTAUTH_URL**

**Name:** `NEXTAUTH_URL`

**Value:** 
```
https://your-project-name.vercel.app
```

⚠️ **IMPORTANT:** Replace `your-project-name` with your actual Vercel project name!

**Environment:** Select **"Production"**

**Click:** "Save"

---

## ✅ Verification Checklist

After adding all variables, you should see:

- [ ] MONGODB_URI ✓
- [ ] JWT_SECRET ✓  
- [ ] NEXTAUTH_SECRET ✓
- [ ] NEXTAUTH_URL ✓

All set to **"Production"** environment.

---

## 🚀 Next Steps

Once all 4 variables are added:

1. **Deploy your app:**
   ```bash
   npm run deploy:vercel
   ```

2. **Test your backend:**
   - Visit: `https://your-project-name.vercel.app/api/health`
   - Should return: `{"status": "healthy"}`

3. **Test your app:**
   - Visit: `https://your-project-name.vercel.app`
   - Should load your LastMile delivery platform

---

## 🔍 Troubleshooting

**If deployment fails:**
1. Check all 4 variables are saved correctly
2. Verify NEXTAUTH_URL matches your actual Vercel URL
3. Check Vercel function logs: `vercel logs`

**If variables are missing:**
- Go back to Settings → Environment Variables
- Verify all 4 are listed under "Production"

---

## 📞 Need Help?

If you encounter issues:
1. Double-check each variable name and value
2. Make sure environment is set to "Production"
3. Ensure NEXTAUTH_URL uses your actual project URL
4. Try redeploying after adding variables

**Ready to proceed?** Add the variables above and then run `npm run deploy:vercel`!