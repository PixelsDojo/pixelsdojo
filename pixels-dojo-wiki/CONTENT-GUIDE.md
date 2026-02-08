# 📝 Content Management Guide

## Quick Guide to Adding & Editing Wiki Content

This guide shows you exactly how to add new pages and update existing content without needing to know much about code.

---

## 🎯 Quick Start: Adding a New Wiki Page

### Step 1: Create the File
1. Go to your GitHub repository
2. Navigate to the `pages/` folder
3. Click **Add file** → **Create new file**
4. Name your file: `your-topic-name.html` (use lowercase and hyphens)

### Step 2: Copy This Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YOUR TITLE HERE - Pixels Dojo</title>
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="stylesheet" href="../css/wiki-page.css">
    <link rel="icon" type="image/png" href="../images/pixels-dojo-logo-round.png">
</head>
<body>
    <!-- HEADER - Keep as is -->
    <header class="site-header">
        <div class="container">
            <div class="header-content">
                <div class="logo-section">
                    <a href="../index.html">
                        <img src="../images/pixels-dojo-logo-round.png" alt="Pixels Dojo Logo" class="logo">
                    </a>
                    <h1><a href="../index.html" style="color: white; text-decoration: none;">Pixels Dojo</a></h1>
                </div>
                <nav class="main-nav">
                    <input type="text" id="search" placeholder="Search the wiki..." class="search-bar">
                    <button class="login-btn">Login</button>
                </nav>
            </div>
        </div>
    </header>

    <!-- PAGE HEADER - Edit this section -->
    <div class="page-header">
        <div class="container">
            <div class="breadcrumb">
                <a href="../index.html">Home</a> > <a href="CATEGORY-PAGE.html">Category Name</a> > Your Page Title
            </div>
            <h1>YOUR PAGE TITLE HERE</h1>
            <div class="page-meta">
                <span class="meta-item"><strong>Last Updated:</strong> Month Day, Year</span>
                <span class="meta-item"><strong>Difficulty:</strong> <span class="badge beginner">Beginner</span></span>
                <span class="meta-item"><strong>Time to Read:</strong> X minutes</span>
                <span class="meta-item"><strong>Author:</strong> Your Name</span>
            </div>
        </div>
    </div>

    <!-- MAIN CONTENT - Edit everything below -->
    <main class="wiki-content">
        <div class="container">
            <div class="content-grid">
                <!-- Sidebar Table of Contents -->
                <aside class="sidebar">
                    <div class="toc-card">
                        <h3>Table of Contents</h3>
                        <ul class="toc">
                            <li><a href="#quick-summary">Quick Summary</a></li>
                            <li><a href="#introduction">Introduction</a></li>
                            <li><a href="#section1">Section 1 Name</a></li>
                            <li><a href="#section2">Section 2 Name</a></li>
                            <li><a href="#key-takeaways">Key Takeaways</a></li>
                        </ul>
                    </div>
                </aside>

                <!-- Main Article -->
                <article class="wiki-article">
                    <!-- Quick Summary Box -->
                    <section id="quick-summary" class="summary-box">
                        <h2>Quick Summary</h2>
                        <p>Write 2-3 sentences summarizing what this page covers.</p>
                    </section>

                    <!-- Introduction -->
                    <section id="introduction">
                        <h2>Introduction</h2>
                        <p>Write your introduction here. Explain why this topic matters.</p>
                    </section>

                    <!-- Main Section 1 -->
                    <section id="section1">
                        <h2>Section 1 Title</h2>
                        <p>Your content here...</p>
                        
                        <h3>Subsection</h3>
                        <p>More details...</p>
                        
                        <ul>
                            <li>Bullet point 1</li>
                            <li>Bullet point 2</li>
                            <li>Bullet point 3</li>
                        </ul>
                    </section>

                    <!-- Main Section 2 -->
                    <section id="section2">
                        <h2>Section 2 Title</h2>
                        <p>Your content here...</p>
                    </section>

                    <!-- Key Takeaways -->
                    <section id="key-takeaways">
                        <h2>Key Takeaways</h2>
                        <ul class="takeaways">
                            <li>✅ Important point 1</li>
                            <li>✅ Important point 2</li>
                            <li>✅ Important point 3</li>
                        </ul>
                    </section>

                    <!-- Related Pages -->
                    <section id="related-pages">
                        <h2>Related Pages</h2>
                        <div class="related-links">
                            <a href="related-page-1.html" class="related-card">
                                <h4>📄 Related Page 1</h4>
                                <p>Brief description</p>
                            </a>
                            <a href="related-page-2.html" class="related-card">
                                <h4>📄 Related Page 2</h4>
                                <p>Brief description</p>
                            </a>
                        </div>
                    </section>
                </article>
            </div>
        </div>
    </main>

    <!-- FOOTER - Keep as is -->
    <footer class="site-footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-logo">
                    <img src="../images/pixels-dojo-logo-round.png" alt="Pixels Dojo">
                    <p>Your comprehensive guide to Pixels Online</p>
                </div>
                <div class="footer-links">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="about.html">About</a></li>
                        <li><a href="contribute.html">Contribute</a></li>
                        <li><a href="https://discord.gg/pixels" target="_blank">Discord</a></li>
                        <li><a href="https://x.com/pixelsdojo" target="_blank">@pixelsdojo</a></li>
                    </ul>
                </div>
                <div class="footer-contact">
                    <h4>Contact Us</h4>
                    <p>Discord or X.com: <a href="https://x.com/pixelsdojo" target="_blank">@pixelsdojo</a></p>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2025 Pixels Dojo. Community-driven wiki for Pixels Online.</p>
            </div>
        </div>
    </footer>

    <script src="../js/main.js"></script>
</body>
</html>
```

### Step 3: Customize Your Content
Replace these parts:
- `YOUR TITLE HERE` - Your page title
- `YOUR PAGE TITLE HERE` - The big title at top
- `Category Name` and `CATEGORY-PAGE.html` - Which category this belongs to
- `Month Day, Year` - Today's date
- `Beginner/Intermediate/Advanced` - Difficulty level
- `X minutes` - Estimated reading time
- `Your Name` - Your author name
- All the section content

---

## 📦 Special Content Boxes

### Pro Tip Box (Yellow)
```html
<div class="pro-tip">
    <h4>💡 Pro Tip</h4>
    <p>Your helpful tip here!</p>
</div>
```

### Info Box (Green)
```html
<div class="info-box">
    <h4>ℹ️ Important Information</h4>
    <p>Important information here!</p>
</div>
```

### Summary Box (Purple)
```html
<section id="quick-summary" class="summary-box">
    <h2>Quick Summary</h2>
    <p>Quick overview here</p>
</section>
```

---

## 🖼️ Adding Images

### Step 1: Prepare Your Image
1. Resize to 800-1200px wide
2. Compress it (use tinypng.com)
3. Name it clearly: `farming-basics-crop-cycles.png`

### Step 2: Upload to GitHub
1. Go to `images/` folder
2. Click **Add file** → **Upload files**
3. Upload your image

### Step 3: Add to Your Page
```html
<img src="../images/your-image-name.png" alt="Description of the image" style="max-width: 100%; border-radius: 8px; margin: 20px 0;">
```

### Image with Caption
```html
<figure style="margin: 20px 0;">
    <img src="../images/your-image.png" alt="Description" style="max-width: 100%; border-radius: 8px;">
    <figcaption style="text-align: center; color: #8a8a8a; margin-top: 10px; font-size: 14px;">
        Your caption here
    </figcaption>
</figure>
```

---

## 📋 Common Elements Cheat Sheet

### Headings
```html
<h2>Main Section Title</h2>
<h3>Subsection Title</h3>
<h4>Small Section Title</h4>
```

### Paragraphs
```html
<p>Your paragraph text here.</p>
```

### Bullet List
```html
<ul>
    <li>First item</li>
    <li>Second item</li>
    <li>Third item</li>
</ul>
```

### Numbered List
```html
<ol>
    <li>Step 1</li>
    <li>Step 2</li>
    <li>Step 3</li>
</ol>
```

### Link to Another Page
```html
<a href="another-page.html">Click here</a>
```

### Link to External Site
```html
<a href="https://pixels.xyz" target="_blank">Pixels Online</a>
```

### Bold Text
```html
<strong>This text is bold</strong>
```

### Italic Text
```html
<em>This text is italic</em>
```

---

## 🎨 Difficulty Badges

Change the difficulty level:

**Beginner (Green):**
```html
<span class="badge beginner">Beginner</span>
```

**Intermediate (Yellow):**
```html
<span class="badge intermediate">Intermediate</span>
```

**Advanced (Purple):**
```html
<span class="badge advanced">Advanced</span>
```

---

## 🔗 Adding Your Page to Navigation

### Add to Homepage
Edit `index.html` and add your page to the recent posts section:

```javascript
{
    title: "Your New Page Title",
    author: "Your Name",
    date: "2025-02-08",
    excerpt: "Brief description of your page",
    tags: ["relevant", "tags", "here"],
    upvotes: 0,
    link: "pages/your-page-name.html"
}
```

### Add to Category Page
Create or edit category pages (e.g., `category-new-players.html`) to include links to your new page.

---

## ✏️ Editing Existing Pages

### Quick Edit on GitHub:
1. Navigate to the file
2. Click the **pencil icon** (Edit)
3. Make your changes
4. Scroll down
5. Add commit message: "Updated farming guide with new crop info"
6. Click **Commit changes**

### What to Update:
- **Last Updated date** - Always update this!
- **Content** - Fix errors, add new info
- **Images** - Add new screenshots
- **Links** - Update broken links

---

## 📊 Content Best Practices

### Writing Guidelines
1. **Be Clear** - Use simple language
2. **Be Concise** - Get to the point
3. **Use Examples** - Show, don't just tell
4. **Add Screenshots** - Visual aids help
5. **Link Related Content** - Help users navigate

### Structure Guidelines
1. Start with Quick Summary (2-3 sentences)
2. Introduction explains "why this matters"
3. Break content into logical sections
4. Use headings and subheadings
5. End with Key Takeaways
6. Link to related pages

### SEO Tips
- Use descriptive titles
- Include keywords naturally
- Add alt text to all images
- Use proper heading hierarchy (h2 → h3 → h4)

---

## 🚀 Publishing Workflow

1. **Write** your content locally or in GitHub
2. **Review** for errors
3. **Add images** if needed
4. **Commit** with clear message
5. **Wait 2 minutes** for GitHub Pages to rebuild
6. **Check** your live page
7. **Share** with the community!

---

## 🆘 Common Issues

### My changes aren't showing
- Wait 2 minutes for GitHub to rebuild
- Clear browser cache (Ctrl+Shift+R)
- Check you committed AND pushed changes

### Images not displaying
- Check file path: `../images/filename.png`
- Verify image was uploaded
- Check filename matches exactly (case-sensitive!)

### Page looks broken
- Check for missing closing tags
- Validate HTML at validator.w3.org
- Compare to working example page

---

## 📞 Getting Help

- Check `DEPLOYMENT-GUIDE.md` for technical issues
- Ask on Discord for content questions
- Reference `getting-started.html` as an example

Happy content creating! 🎮✨
