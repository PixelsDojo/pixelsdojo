# 🚀 QUICK START GUIDE

## Get Your Pixels Dojo Wiki Live in 15 Minutes!

Follow these simple steps to deploy your wiki:

---

## ⚡ Option 1: Deploy to Vercel (Easiest - 10 minutes)

### Step 1: Extract Files
1. Extract this folder to your computer
2. You should see: `server.js`, `package.json`, `views/`, `public/`, etc.

### Step 2: Push to GitHub
Open terminal in this folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
```

Create a new repo on GitHub.com, then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

### Step 3: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your GitHub repo
5. Click "Deploy" (Vercel auto-configures everything!)
6. **Done!** ✅ You'll get a live URL

---

## 💻 Option 2: Run Locally First (Test before deploy)

### Step 1: Install Dependencies
Open terminal in this folder:

```bash
npm install
```

### Step 2: Start Server
```bash
npm start
```

### Step 3: Visit Your Site
- Homepage: http://localhost:3000
- NPCs: http://localhost:3000/npcs
- Admin: http://localhost:3000/admin

**Login:**
- Email: `lizzylizzysims@gmail.com`
- Password: `changeme123`

---

## 📸 Adding Your NPC Images

### Quick Method (After deployment):
1. Visit `your-site.com/admin`
2. Login
3. Click "Edit" on each NPC
4. Upload the image
5. Save

### Bulk Method:
1. Put all images in `public/images/npcs/`
2. Push to GitHub:
   ```bash
   git add public/images/npcs/*
   git commit -m "Add NPC images"
   git push
   ```
3. Site auto-redeploys!
4. Use admin panel to assign images if needed

---

## 🎯 What You Get

✅ 54 NPCs pre-loaded (from your alphabetical list)
✅ Beautiful NPC directory with grid layout
✅ Admin panel to manage NPCs
✅ User authentication
✅ Like/dislike system
✅ Question submissions
✅ Responsive design
✅ Dark neon theme

---

## 📚 More Help?

- **Full README**: See `README.md`
- **Deployment Guide**: See `DEPLOYMENT.md`
- **Changelog**: See `CHANGELOG.md`

---

## 🆘 Stuck?

**Common Issues:**

**"npm: command not found"**
→ Install Node.js from nodejs.org

**"Permission denied"**
→ Run: `sudo npm install` (Mac/Linux)

**Database not creating**
→ Check folder write permissions

**Images not uploading**
→ Ensure `public/images/npcs/` exists

---

## 🎉 You're Ready!

Choose your path:
- **Fast deployment**: Use Vercel (Option 1)
- **Test first**: Run locally (Option 2)

Either way, you'll have a beautiful, working wiki in minutes!

**Questions?** Email: lizzylizzysims@gmail.com

---

Good luck! 🚀✨
