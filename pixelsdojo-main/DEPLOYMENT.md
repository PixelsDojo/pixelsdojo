# 🚀 Deployment Guide - Step by Step

This guide will walk you through deploying your Pixels Dojo Wiki to production.

## Prerequisites

1. ✅ Your code ready in this folder
2. ✅ A GitHub account (free)
3. ✅ Choose a hosting platform account (all free options below)

---

## 📦 Step 1: Push to GitHub

If you haven't already created a GitHub repository:

### Create Repository on GitHub

1. Go to [github.com](https://github.com)
2. Click the **"+"** icon (top right) → **"New repository"**
3. Name it: `pixels-dojo-wiki` (or your choice)
4. Set to **Public** (or Private, your choice)
5. **Do NOT** initialize with README (we already have one)
6. Click **"Create repository"**

### Push Your Code

In your terminal, from the `pixels-dojo-final` directory:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Pixels Dojo Wiki with NPC management"

# Rename branch to main
git branch -M main

# Add your GitHub repo as remote (replace YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/pixels-dojo-wiki.git

# Push to GitHub
git push -u origin main
```

✅ Your code is now on GitHub!

---

## 🌟 Step 2: Choose Your Deployment Platform

Pick ONE of these options (I recommend Vercel):

---

### Option A: Vercel (⭐ RECOMMENDED)

**Why Vercel?** Automatic deployments, free SSL, zero config needed, integrates perfectly with GitHub.

#### Steps:

1. **Sign up for Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Sign Up"
   - Choose "Continue with GitHub" (easiest)
   - Authorize Vercel to access your GitHub

2. **Create New Project**
   - Click "Add New..." → "Project"
   - You'll see a list of your GitHub repos
   - Find `pixels-dojo-wiki` and click **"Import"**

3. **Configure (Auto-Detected!)**
   - Vercel automatically detects it's a Node.js project
   - **Framework Preset**: Other
   - **Build Command**: `npm install` (auto-filled)
   - **Output Directory**: Leave default
   - **Install Command**: `npm install` (auto-filled)
   - Click **"Deploy"**

4. **Wait for Deployment** (2-3 minutes)
   - Vercel will build and deploy your site
   - You'll see a success screen with your URL
   - Example: `pixels-dojo-wiki.vercel.app`

5. **Visit Your Site!**
   - Click the URL to visit your live site
   - Test the admin panel at `your-url.vercel.app/admin`
   - Default login: `lizzylizzysims@gmail.com` / `changeme123`

#### Add Custom Domain (Optional)

1. In Vercel dashboard → **Settings** → **Domains**
2. Add your domain (e.g., `pixelsdojo.com`)
3. Follow DNS instructions from Vercel
4. Wait for DNS to propagate (10-60 minutes)

#### Environment Variables (Optional - For Email)

1. In Vercel dashboard → **Settings** → **Environment Variables**
2. Add:
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASS`: Your Gmail app password
3. Redeploy if needed

---

### Option B: Netlify

**Why Netlify?** Great for static sites with serverless functions.

#### Steps:

1. **Sign up for Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub

2. **Deploy**
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub"
   - Select `pixels-dojo-wiki`
   - Build settings (auto-detected):
     - Build command: `npm install`
     - Publish directory: `public`
   - Click "Deploy site"

3. **Get Your URL**
   - Netlify gives you a random URL: `random-name-123.netlify.app`
   - You can customize it in **Site settings** → **Change site name**

---

### Option C: Railway

**Why Railway?** Dead simple, handles databases well.

#### Steps:

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `pixels-dojo-wiki`
5. Railway auto-deploys! ✅
6. Get your URL from the deployment

---

### Option D: Render

**Why Render?** Good free tier, persistent storage.

#### Steps:

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repo `pixels-dojo-wiki`
5. Settings:
   - **Name**: pixels-dojo
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Click "Create Web Service"
7. Wait for deployment (3-5 minutes)

---

## 🖼️ Step 3: Add Your NPC Images

After deployment, you need to add images for your NPCs:

### Method 1: Via Admin Panel (Recommended)

1. Visit `your-deployed-url.com/admin`
2. Login with default credentials
3. For each NPC:
   - Click "✏️ Edit"
   - Upload the NPC image
   - Click "Update NPC"

### Method 2: Bulk Upload (Advanced)

If you have all images ready:

1. Create `public/images/npcs/` folder locally
2. Add all your NPC images (name them clearly)
3. Update your GitHub repo:
   ```bash
   git add public/images/npcs/*
   git commit -m "Add NPC images"
   git push
   ```
4. Your platform will auto-redeploy
5. Use admin panel to assign images to NPCs

---

## 🔒 Step 4: Change Default Password

**CRITICAL SECURITY STEP**

1. Login to your admin panel
2. Change the password from `changeme123`
3. Important: Update it in the database directly or via admin panel (coming soon)

---

## ✅ Step 5: Verify Everything Works

Test these pages on your live site:

- ✅ Homepage: `your-url.com`
- ✅ NPCs page: `your-url.com/npcs`
- ✅ Admin panel: `your-url.com/admin`
- ✅ Login works
- ✅ NPCs display correctly
- ✅ Images load properly

---

## 🔄 Future Updates

When you want to update your site:

```bash
# Make your changes locally
# Then:
git add .
git commit -m "Description of changes"
git push
```

**Vercel/Netlify/Railway will automatically redeploy!** 🎉

---

## 🆘 Troubleshooting

### "Database not found" error
- Your hosting might not persist the SQLite database
- Consider using PostgreSQL (upgrade guide available)

### Images not uploading
- Check file size limits (Vercel: 4.5MB limit)
- Verify `public/images/npcs/` folder exists
- Check write permissions on hosting platform

### Site not updating after push
- Wait 2-3 minutes for rebuild
- Check deployment logs in your platform dashboard
- Force redeploy if needed

---

## 🎉 You're Live!

Congratulations! Your Pixels Dojo Wiki is now live and accessible to the world.

**Share it with the community:**
- Discord: Post in Pixels Discord
- Twitter/X: Tag @pixels_online
- Reddit: Share in r/PixelsOnline

---

## 📞 Need Help?

- **GitHub Issues**: Open an issue in your repo
- **Email**: lizzylizzysims@gmail.com
- **Discord**: Pixels community server

Good luck with your launch! 🚀
