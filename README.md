# Allowance Manager (Firebase Firestore Migration)

A minimalist, elegant private admin dashboard to manage your monthly allowance, savings, and Mama Account transfers, powered by **Next.js 16 (App Router)** and **Firebase Firestore & Authentication**.

---

## 🚀 Features

- **Wallet & Savings Balances**: Complete dynamic tracking with manual offset capability.
- **Mama Account**: Direct transfers management with real-time updates.
- **Money Flow visualizer**: Elegant layout indicating allocations.
- **Smart Insights**: Smart spending alerts and projected exhaustion countdowns.
- **Action Log / Permanent Ledger**: Comprehensive history log with robust **Undo/Redo** functionality.
- **Real-time Synchronization**: Powered by Firestore `onSnapshot` listeners to instantly propagate updates across all sessions and pages without manual page refreshes.

---

## 🛠️ Firebase Setup Guide

Follow these steps to create and configure your Firebase project.

### 1. Create a Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**, enter a project name (e.g., `allowance-manager`), and click **Continue**.
3. (Optional) Disable Google Analytics for simplicity, then click **Create project**.

### 2. Enable Firebase Authentication
1. In the left sidebar, click **Build** > **Authentication** and then click **Get Started**.
2. Select the **Sign-in method** tab.
3. Click **Email/Password**, toggle **Enable**, and click **Save**.
4. Go to the **Users** tab, and click **Add user**.
5. Add the primary admin credentials:
   - **Email**: `aeylszh7@allowance-manager.com`
   - **Password**: `aeylSzh@7`
6. Click **Add user**.

### 3. Enable Cloud Firestore Database
1. In the left sidebar, click **Build** > **Firestore Database** and then click **Create database**.
2. Select your Firestore location and click **Next**.
3. Choose to start in **Production mode** or **Test mode**.
4. Click **Create** to initialize your database.

#### Firestore Security Rules
Go to the **Rules** tab in your Firestore Database page, paste the following security rules, and click **Publish**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Restrict all data access to authenticated users only
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Create Database Structure & Collections
Firestore will automatically initialize the collections when the first document is added, but for full reference, the following collections are used:

- **transactions**
  - Typical document fields:
    - `id`: `string` (auto-generated ID)
    - `date`: `string` (e.g., `"2025-02-15"`)
    - `type`: `string` (`income` | `refill` | `savings_usage` | `savings_topup` | `expense` | `transfer` | `allowance` | `adjustment`)
    - `amount`: `number` (negative for debit/expense, positive for credit/allowance)
    - `note`: `string` (the transaction description)
    - `category`: `string` (for expenses)
    - `notes`: `string` (for long descriptions)
    - `timestamp`: `serverTimestamp`

- **allowance_stats**
  - Typical document fields:
    - `month`: `string` (e.g., `"2025-02"`)
    - `dateReceived`: `string`
    - `allowanceAmount`: `number`
    - `usage`: `number`
    - `savings`: `number`
    - `balance`: `number`

- **savings_stats**
  - Typical document fields:
    - `month`: `string`
    - `savings`: `number`
    - `usage`: `number`
    - `balance`: `number`

- **manual_offsets**
  - Create a single document with ID: `offsets`
  - Typical document fields:
    - `wallet_offset`: `number`
    - `savings_offset`: `number`

- **history**
  - Typical document fields:
    - `actionType`: `string`
    - `details`: `string`
    - `timestamp`: `serverTimestamp`
    - `undoId`: `string`
    - `isUndone`: `boolean`
    - `payload`: `map` (flexible JSON parameters for reverting actions)

- **settings**
  - Create a single document with ID: `default`
  - Typical document fields:
    - `monthlyAllowance`: `number` (e.g. `430.00`)
    - `monthlySavings`: `number` (e.g. `30.00`)
    - `maybankAllocation`: `number` (e.g. `300.00`)
    - `alertEmail`: `string`

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root of the project for local development (and add these to your Vercel settings):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 💡 Graceful Fallback Mode
If these environment variables are missing (for instance, on initial clones, test workflows, or local preview builds), the application **gracefully falls back to a highly realistic in-memory / local storage Mock Firebase Engine**!
It writes and reads mock state dynamically from `firebase_mock_db.json` inside the repository. This guarantees that developers can immediately boot, compile, test, and preview the full application without having to hook up Firebase first.

---

## 💻 Local Development

1. **Install dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```
2. **Run the Next.js development server**:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) and log in with the admin credentials:
   - **Username**: `aeylszh7`
   - **Password**: `aeylSzh@7`

---

## ☁️ Vercel Production Deployment

To host this application live on **Vercel**:

1. **Push your code**: Commit and push your local workspace to your GitHub repository.
2. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com).
   - Click **Add New** > **Project** and import your Git repository.
3. **Configure Environment Variables**:
   In the **Environment Variables** accordion, add the Firebase credentials:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
4. **Deploy**: Click **Deploy**. Vercel will build the Next.js bundle and deploy it with auto-updates on every subsequent commit push!

---

## 🛡️ License
MIT License
