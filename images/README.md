# Images Folder

## 📁 Required Images

Upload these images to this folder:

### Logo Files
- `pixels-dojo-logo-round.png` - Your round logo (square image that appears round in circular frames)
- `banner.png` - Your hero banner image

### Additional Logos (Optional)
Add any other logo variations you have for use in footer or other locations.

## 🖼️ Image Guidelines

### File Naming
- Use lowercase
- Use hyphens for spaces
- Be descriptive
- Examples:
  - ✅ `farming-crops-overview.png`
  - ✅ `mining-location-map.png`
  - ❌ `IMG_1234.png`
  - ❌ `Screen Shot.png`

### Image Sizes
- **Screenshots:** 800-1200px wide, under 500KB
- **Icons/Logos:** 100-300px, PNG with transparency
- **Banners:** 1200-1600px wide, under 800KB
- **Thumbnails:** 300-400px, under 200KB

### Optimization
Before uploading, compress your images:
- Use [TinyPNG](https://tinypng.com)
- Use [Squoosh](https://squoosh.app)
- Or use any image compression tool

### Formats
- **PNG:** For logos, icons, graphics with transparency
- **JPG:** For screenshots, photos, complex images
- **WebP:** For better compression (optional, modern browsers)

## 📂 Organizing Images

You can create subfolders for organization:

```
images/
├── logos/
│   ├── pixels-dojo-logo-round.png
│   └── banner.png
├── farming/
│   ├── crop-cycles.png
│   └── farming-overview.png
├── mining/
│   ├── mining-locations.png
│   └── stone-types.png
└── ui/
    ├── inventory-screen.png
    └── market-interface.png
```

Just remember to update your HTML paths accordingly:
```html
<img src="../images/farming/crop-cycles.png" alt="Crop Cycles">
```

## 🚀 Uploading Images

### Via GitHub Web Interface:
1. Navigate to this `images/` folder
2. Click **Add file** → **Upload files**
3. Drag and drop your images
4. Commit with message like "Add farming guide screenshots"

### Via GitHub Desktop:
1. Copy images to your local `images/` folder
2. Commit and push

## ✅ Checklist

Before uploading, make sure:
- [ ] Image is compressed/optimized
- [ ] File name is descriptive and lowercase
- [ ] Image is appropriate size
- [ ] You have the rights to use the image

---

**Note:** This README will not appear on the website - it's just for your reference!
