# Changelog - Pixels Dojo Wiki

## Version 3.0.0 - NPC Management & GitHub Ready (February 2026)

### ✨ New Features

#### NPC System
- ✅ **NPC Database Table** - Full CRUD operations for NPCs
- ✅ **Public NPC Page** (`/npcs`) - Beautiful columnar grid layout with images
- ✅ **Admin Panel** (`/admin`) - Complete NPC management interface
  - Add new NPCs with image upload
  - Edit existing NPCs
  - Delete NPCs
  - Reorder NPCs with display_order field
- ✅ **54 NPCs Pre-seeded** - All NPCs from alphabetical list automatically added
- ✅ **Image Upload System** - Multer integration for file uploads
- ✅ **Responsive Design** - NPCs display beautifully on all devices

#### Developer Experience
- ✅ **GitHub Ready** - Proper `.gitignore`, comprehensive README
- ✅ **Deployment Guides** - Step-by-step for Vercel, Netlify, Railway, Render
- ✅ **Environment Setup** - Clear documentation for local development
- ✅ **File Structure** - Well-organized, documented codebase

#### UI Improvements
- ✅ **NPC Grid Layout** - Modern card-based design with hover effects
- ✅ **Admin Interface** - Clean table view with action buttons
- ✅ **Modal Forms** - Smooth UX for adding/editing NPCs
- ✅ **Image Fallback** - Default placeholder for NPCs without images

### 📁 New Files

**Views:**
- `views/npcs.ejs` - Public NPC directory page
- `views/admin.ejs` - Admin panel for NPC management

**Stylesheets:**
- `public/css/npcs.css` - NPC page specific styles
- `public/css/admin.css` - Admin panel specific styles

**JavaScript:**
- `public/js/admin.js` - Admin panel functionality (modals, AJAX)

**Configuration:**
- `.gitignore` - GitHub ignore rules
- `vercel.json` - Vercel deployment config
- `netlify.toml` - Netlify deployment config

**Documentation:**
- `README.md` - Comprehensive project documentation
- `DEPLOYMENT.md` - Step-by-step deployment guide
- `CHANGELOG.md` - This file
- `public/images/npcs/README.md` - Instructions for NPC images

**Assets:**
- `public/images/npcs/default-npc.png` - Default NPC placeholder image

### 🔧 Modified Files

**Backend:**
- `server.js` - Added NPC routes (public + admin), multer config
- `database.js` - Added NPCs table, seeded 54 NPCs
- `package.json` - Added multer dependency

**Frontend:**
- `views/index.ejs` - Added NPCs link to navigation

### 🗃️ Database Changes

**New Table: `npcs`**
```sql
CREATE TABLE npcs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  image_path TEXT DEFAULT '/images/npcs/default-npc.png',
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Seeded Data:**
- 54 NPCs from alphabetical list
- Each with name, location, and display order
- Ready for image assignment

### 📦 Dependencies Added

- `multer` ^1.4.5-lts.1 - File upload handling

### 🚀 Deployment Ready

**Supported Platforms:**
- ✅ Vercel (recommended)
- ✅ Netlify
- ✅ Railway
- ✅ Render
- ✅ Any Node.js hosting

### 🔐 Security Notes

- Admin routes protected (requires authentication)
- File upload validation (image types only)
- SQL injection protection (parameterized queries)
- Session-based authentication

### 📝 TODO / Future Enhancements

- [ ] Search/filter functionality for NPCs
- [ ] Bulk image upload interface
- [ ] NPC categories/tags
- [ ] Import/export NPC data
- [ ] Admin panel: user management
- [ ] Admin panel: page management
- [ ] PostgreSQL option for production
- [ ] Image optimization/resizing

---

## Version 2.0.0 - Database & Authentication (February 2026)

- ✅ User authentication system
- ✅ SQLite database integration
- ✅ Like/dislike system for pages
- ✅ Question submission with email
- ✅ Admin user seeded (Lizzy Sims)

## Version 1.0.0 - Initial Release

- ✅ Static homepage
- ✅ Beautiful dark theme
- ✅ $PIXEL price widget
- ✅ Three main content sections
- ✅ Responsive design
