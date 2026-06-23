# Project Structure Organization

This document explains the organized file structure of the MediTrust project, optimized for GitHub upload.

## 📁 Folder Organization

### Root Level
Clean and minimal root directory containing only essential configuration files:
- `Cargo.toml` - Rust workspace configuration
- `package.json` - Node.js dependencies
- `vite.config.ts` - Frontend build configuration
- `tsconfig.json` - TypeScript configuration
- `.env.example` - Environment variables template
- `.gitignore` - Git ignore rules
- `README.md` - Main project documentation
- `index.html` - HTML entry point

### `/contracts/` - Smart Contracts
Soroban smart contracts written in Rust:
- `treatment-escrow/` - Individual escrow contract logic
- `escrow-factory/` - Factory pattern for escrow deployment
- `ARCHITECTURE.md` - System architecture documentation
- `SECURITY_REVIEW.md` - Security audit and review

### `/src/` - Frontend Application
React + TypeScript application:
- `components/` - React UI components
- `config/` - Configuration files
- `hooks/` - Custom React hooks
- `lib/` - Core libraries and integrations
- `tests/` - Vitest test suite
- `utils/` - Utility functions
- `index.css` - Global styles

### `/docs/` - Documentation
All project documentation files:
- `DEMO_SCRIPT.md` - Live demo walkthrough
- `DEPLOYMENT.md` - Deployment instructions
- `ONBOARDING_GUIDE.md` - Developer onboarding
- `PRIVACY.md` - Privacy policy
- `USER_FEEDBACK_LOG.md` - User testing feedback
- `UX_IMPROVEMENTS.md` - UX enhancement tracking

### `/media/` - Media Assets
Video and media files:
- `vedio.mp4` - Platform demo video

### `/screenshots/` - Application Screenshots
PNG/JPG screenshots used in README:
- `01_landing_page.png`
- `02_wallet_connect.png`
- `03_escrows_dashboard.png`
- `04_direct_payment.png`
- `05_after_payment.png`

### `/node_modules/` (gitignored)
NPM dependencies - automatically generated

### `/dist/` (gitignored)
Production build output - automatically generated

### `/target/` (gitignored)
Rust compilation artifacts - automatically generated

### `/.cargo/`
Cargo build configuration for WASM targets

### `/.git/`
Git version control metadata

## 🚫 Files Not Committed to Git

As per `.gitignore`:
- `.env` - Local environment variables (sensitive data)
- `node_modules/` - NPM dependencies
- `dist/` - Build artifacts
- `target/` - Rust build artifacts
- `Cargo.lock` - Rust dependency lock file
- OS-specific files (`.DS_Store`, `Thumbs.db`)

## ✅ Ready for GitHub Upload

The project is now organized with:
1. ✅ Clean root directory
2. ✅ Grouped documentation in `/docs/`
3. ✅ Media files in `/media/`
4. ✅ Proper `.gitignore` configuration
5. ✅ Updated README with correct paths
6. ✅ Logical folder structure
7. ✅ Professional organization

## 🚀 Next Steps for GitHub Upload

1. Initialize git repository (if not already done):
   ```bash
   git init
   ```

2. Add all files:
   ```bash
   git add .
   ```

3. Commit changes:
   ```bash
   git commit -m "Initial commit: MediTrust on-chain medical escrow platform"
   ```

4. Add GitHub remote:
   ```bash
   git remote add origin https://github.com/your-username/meditrust.git
   ```

5. Push to GitHub:
   ```bash
   git branch -M main
   git push -u origin main
   ```

## 📝 Notes

- All sensitive files (`.env`) are properly gitignored
- Build artifacts are excluded from version control
- Documentation is well-organized and accessible
- Media files are in a dedicated folder
- Project structure follows industry best practices
