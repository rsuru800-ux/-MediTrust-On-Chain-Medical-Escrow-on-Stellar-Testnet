# MediTrust Frontend Deployment Guide

This guide provides instructions for deploying the MediTrust React + TypeScript frontend web application to popular hosting providers (Vercel, Netlify, Cloudflare Pages).

## Build Requirements

- **Node.js**: `v18.x` or later (tested with Node `v20` and `v22`).
- **NPM**: `v9.x` or later.
- **Vite Build Command**: `npm run build` (runs TypeScript checks and build compiles).

---

## Environment Variables Configuration

The app requires configuration to interact with Stellar Testnet. In production, configure the following environment variables in your hosting provider's dashboard:

| Variable Name | Type | Description | Production/Testnet Default |
| :--- | :--- | :--- | :--- |
| `VITE_STELLAR_NETWORK` | String | Net passphrase target (`testnet` or `mainnet`) | `testnet` |
| `VITE_HORIZON_URL` | URL | Stellar Horizon Endpoint | `https://horizon-testnet.stellar.org` |
| `VITE_SOROBAN_RPC_URL` | URL | Soroban RPC Server Endpoint | `https://soroban-testnet.stellar.org` |
| `VITE_ESCROW_FACTORY_CONTRACT_ID` | String | Escrow Factory Contract ID | `CAUCNUPYKUHM5OTSR4KJWYP4CFBWUTO5GKBQJY26UOXBUGEF6CAIIABM` |
| `VITE_NATIVE_TOKEN_ADDRESS` | String | Native SAC token address for XLM | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

---

## Deploying to Vercel

### Option 1: Via Vercel CLI
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root directory.
3. Configure the settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install --legacy-peer-deps`
4. Add environment variables listed above.

### Option 2: Via GitHub Integration
1. Connect your Github repository to your Vercel Dashboard.
2. Choose **Vite** preset.
3. In **Build & Development Settings**:
   - Build Command: `tsc && vite build` or `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install --legacy-peer-deps`
4. Under **Environment Variables**, paste the keys and values from your `.env` file.
5. Click **Deploy**.

---

## Deploying to Netlify

1. In the Netlify UI, select **New site from Git**.
2. Select your repository.
3. In **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. In **Environment variables**, define the required environment variables.
5. Create a `netlify.toml` in your root for routing rules (Single Page App):
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
6. Deploy the site.

---

## Deploying to Cloudflare Pages

1. In the Cloudflare Dashboard, go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
2. Choose the repository and click **Begin setup**.
3. Select **Vite** as the framework preset.
4. Set Build Settings:
   - Build command: `npm run build`
   - Build output directory: `/dist`
5. Click **Save and Deploy**.
6. Navigate to **Settings** -> **Environment variables** to add the required `VITE_` prefix environment variables. Trigger a redeploy to apply.
