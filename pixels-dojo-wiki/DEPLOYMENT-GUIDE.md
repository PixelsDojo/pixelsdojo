# Pixels Dojo Wiki - GitHub Deployment Guide

## 📋 Table of Contents
1. [Setting Up GitHub Account](#setting-up-github-account)
2. [Creating Your Repository](#creating-your-repository)
3. [Uploading Your Files](#uploading-your-files)
4. [Enabling GitHub Pages](#enabling-github-pages)
5. [Adding Content](#adding-content)
6. [Uploading Images](#uploading-images)
7. [Making Updates](#making-updates)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Setting Up GitHub Account

### Step 1: Create a GitHub Account
1. Go to [github.com](https://github.com)
2. Click **Sign up** in the top right
3. Enter your email: `lizzycreatescoolstuff@gmail.com`
4. Create a password (use a strong one!)
5. Choose a username (e.g., `pixelsdojo` or `pixelsdojowiki`)
6. Verify your email address

### Step 2: Verify Your Account
- Check your email for a verification link from GitHub
- Click the link to verify your account

---

## 📁 Creating Your Repository

### Step 1: Create a New Repository
1. Log into GitHub
2. Click the **+** icon in the top right corner
3. Select **New repository**

### Step 2: Configure Your Repository
- **Repository name:** `pixels-dojo-wiki`
- **Description:** "Community wiki and guide for Pixels Online"
- **Public/Private:** Choose **Public** (required for free GitHub Pages)
- **Initialize with README:** ✅ Check this box
- Click **Create repository**

---

## 📤 Uploading Your Files

### Method 1: Upload via Web Interface (Easiest for Beginners)

#### Step 1: Prepare Your Files
Make sure you have these folders:
```
pixels-dojo-wiki/
├── index.html
├── css/
│   ├── styles.css
│   └── wiki-page.css
├── js/
│   └── main.js
├── pages/
│   └── getting-started.html (and other pages)
└── images/
    └── (your images here)
```

#### Step 2: Upload Files to GitHub
1. In your repository, click **Add file** → **Upload files**
2. Drag and drop ALL your files and folders
3. Add a commit message: "Initial upload of Pixels Dojo wiki"
4. Click **Commit changes**

⚠️ **Important:** Upload the entire folder structure, including the `css/`, `js/`, `pages/`, and `images/` folders.

### Method 2: Using GitHub Desktop (Recommended for Regular Updates)

#### Step 1: Download GitHub Desktop
1. Go to [desktop.github.com](https://desktop.github.com)
2. Download and install GitHub Desktop
3. Log in with your GitHub account

#### Step 2: Clone Your Repository
1. Open GitHub Desktop
2. Click **File** → **Clone repository**
3. Find `pixels-dojo-wiki` in the list
4. Choose where to save it on your computer
5. Click **Clone**

#### Step 3: Add Your Files
1. Open the folder where you cloned the repository
2. Copy all your wiki files into this folder
3. GitHub Desktop will show all the new files

#### Step 4: Commit and Push
1. In GitHub Desktop, you'll see all your files listed
2. Add a summary: "Initial wiki upload"
3. Click **Commit to main**
4. Click **Push origin** to upload to GitHub

---

## 🌐 Enabling GitHub Pages

### Step 1: Navigate to Settings
1. In your repository, click **Settings** (top menu)
2. Scroll down and click **Pages** (left sidebar)

### Step 2: Configure GitHub Pages
1. Under "Source", select **main** branch
2. Keep the folder as **/ (root)**
3. Click **Save**

### Step 3: Wait for Deployment
- GitHub will build your site (takes 1-2 minutes)
- You'll see a message: "Your site is live at `https://yourusername.github.io/pixels-dojo-wiki/`"
- Click the URL to view your site!

### Step 4: Custom Domain (Optional)
If you want to use your own domain:
1. In the same Pages settings
2. Enter your custom domain in the "Custom domain" field
3. Follow GitHub's instructions for DNS setup

---

## ✍️ Adding Content

### Creating a New Wiki Page

#### Step 1: Create the HTML File
1. Go to the `pages/` folder in your repository
2. Click **Add file** → **Create new file**
3. Name it (e.g., `farming-guide.html`)

#### Step 2: Use the Page Template
Copy this template structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Page Title - Pixels Dojo</title>
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="stylesheet" href="../css/wiki-page.css">
    <link rel="icon" type="image/png" href="../images/pixels-dojo-logo-round.png">
</head>
<body>
    <!-- Copy header from getting-started.html -->
    
    <!-- Your content here -->
    <main class="wiki-content">
        <div class="container">
            <div class="content-grid">
                <aside class="sidebar">
                    <!-- Table of contents -->
                </aside>
                
                <article class="wiki-article">
                    <section id="quick-summary" class="summary-box">
                        <h2>Quick Summary</h2>
                        <p>Your 2-3 sentence summary here</p>
                    </section>
                    
                    <section id="introduction">
                        <h2>Introduction</h2>
                        <p>Your content...</p>
                    </section>
                    
                    <!-- More sections -->
                </article>
            </div>
        </div>
    </main>
    
    <!-- Copy footer from getting-started.html -->
</body>
</html>
```

#### Step 3: Add Your Content
Replace the placeholder text with your actual content following the structure:
- Quick Summary
- Introduction
- Main sections
- Key Takeaways
- Related Pages
- Community Tips

#### Step 4: Commit the New File
1. Scroll down to "Commit new file"
2. Add a message: "Add farming guide page"
3. Click **Commit new file**

### Content Writing Tips

1. **Use proper headings:**
   - `<h2>` for main sections
   - `<h3>` for subsections
   - `<h4>` for minor points

2. **Add helpful boxes:**
   ```html
   <div class="pro-tip">
       <h4>💡 Pro Tip</h4>
       <p>Your tip here</p>
   </div>
   ```

3. **Include lists:**
   ```html
   <ul>
       <li>Point 1</li>
       <li>Point 2</li>
   </ul>
   ```

4. **Link to other pages:**
   ```html
   <a href="farming-guide.html">Farming Guide</a>
   ```

---

## 🖼️ Uploading Images

### Step 1: Prepare Your Images
1. **Resize images** before uploading:
   - Screenshots: 800-1200px wide max
   - Icons: 100-200px
   - Banners: 1200-1600px wide max

2. **Optimize file size:**
   - Use tools like [TinyPNG](https://tinypng.com) to compress
   - Keep images under 500KB each
   - Use JPG for photos, PNG for graphics with transparency

3. **Name files clearly:**
   - Good: `farming-basics-screenshot.png`
   - Bad: `IMG_12345.png`

### Step 2: Upload to GitHub
1. Navigate to the `images/` folder in your repository
2. Click **Add file** → **Upload files**
3. Drag and drop your images
4. Commit with message: "Add farming guide screenshots"

### Step 3: Use Images in Your Pages
```html
<img src="../images/your-image-name.png" alt="Description of image">
```

### Image Best Practices
- Always include `alt` text for accessibility
- Use descriptive file names
- Group related images (e.g., all farming images in `images/farming/`)

---

## 🔄 Making Updates

### Editing Existing Pages

#### Via Web Interface:
1. Navigate to the file you want to edit
2. Click the **pencil icon** (Edit this file)
3. Make your changes
4. Scroll down and add a commit message
5. Click **Commit changes**

#### Via GitHub Desktop:
1. Open GitHub Desktop
2. Open the repository folder on your computer
3. Edit files with your favorite text editor
4. Save your changes
5. In GitHub Desktop, review changes
6. Add a commit message
7. Click **Commit to main**
8. Click **Push origin**

### Adding New Images After Publishing

Same process as initial upload:
1. Go to `images/` folder
2. Upload new images
3. Reference them in your HTML

### Updating Multiple Files

If you're making lots of changes:
1. Use GitHub Desktop for easier management
2. Make all your edits locally
3. Commit and push everything at once

---

## 🔧 Troubleshooting

### Site Not Loading After Upload
- **Wait 2-5 minutes** - GitHub Pages takes time to build
- Check **Settings → Pages** for error messages
- Make sure repository is **Public**
- Verify **index.html** is in the root folder

### Images Not Showing
- Check file paths: `../images/filename.png` (note the `../`)
- Ensure image files were uploaded to `images/` folder
- File names are **case-sensitive**: `Banner.png` ≠ `banner.png`
- Clear browser cache and refresh

### CSS Styles Not Applying
- Verify CSS files are in the `css/` folder
- Check that HTML files have correct links:
  ```html
  <link rel="stylesheet" href="../css/styles.css">
  ```
- Clear browser cache

### Page Shows Plain Text/Code
- Make sure file has `.html` extension
- Check for syntax errors in HTML
- Use GitHub's file editor to validate

### Links Not Working
- Use relative paths: `pages/farming-guide.html`
- From pages folder to home: `../index.html`
- From pages to pages: `another-page.html`
- To external sites: `https://full-url.com`

### Changes Not Appearing
- Wait 1-2 minutes for GitHub Pages to rebuild
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check if you pushed changes (GitHub Desktop)

---

## 📝 Quick Reference Commands

### File Paths Cheat Sheet
```
From index.html:
  → Images: images/filename.png
  → CSS: css/styles.css
  → Pages: pages/page-name.html

From pages/ folder:
  → Images: ../images/filename.png
  → CSS: ../css/styles.css
  → Home: ../index.html
  → Other pages: page-name.html
```

### Common HTML Elements
```html
<!-- Heading -->
<h2>Section Title</h2>

<!-- Paragraph -->
<p>Your text here</p>

<!-- List -->
<ul>
    <li>Item 1</li>
    <li>Item 2</li>
</ul>

<!-- Link -->
<a href="page.html">Link text</a>

<!-- Image -->
<img src="../images/pic.png" alt="Description">

<!-- Pro Tip Box -->
<div class="pro-tip">
    <h4>💡 Pro Tip</h4>
    <p>Your tip</p>
</div>
```

---

## 🎯 Next Steps

1. **Upload your logo and banner** to the `images/` folder
2. **Create your first few wiki pages** using the template
3. **Test everything** on your live site
4. **Share the link** with your community!

Your site will be at: `https://YOUR-USERNAME.github.io/pixels-dojo-wiki/`

---

## 💬 Need Help?

- **GitHub Docs:** [docs.github.com](https://docs.github.com)
- **GitHub Pages Guide:** [pages.github.com](https://pages.github.com)
- **HTML/CSS Help:** [w3schools.com](https://www.w3schools.com)

Happy wiki building! 🎮✨
