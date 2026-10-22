# Cinerolls

Cinerolls is an open web platform where writers post movie loglines (one-sentence story pitches) and readers rate them on a 1–5 "Would you watch this?" scale.

The platform stores **loglines only, never scripts**.

---

## Architecture & Security Model

- **Frontend**: Plain HTML, CSS, and vanilla JavaScript using modern ES modules. Zero React, zero bundlers, zero build steps.
- **Serverless & Blaze-Free**: Powered strictly by **Firebase Hosting**, **Firebase Authentication (Email Link)**, and **Cloud Firestore**. No Cloud Functions and no Node.js runtime required in deployment. Runs cleanly on the Firebase Spark (free) plan.
- **Client-Side Enforcement with Firestore Rules**:
  - **Ratings**: Ratings live at `loglines/{id}/ratings/{uid}`. Transactions in the browser update both the rating and the parent logline. Security rules verify that `ratingCount` and `ratingSum` deltas match the rating document using `get()` and `getAfter()`.
  - **Fixed Prior Scoring**: Drops `stats/site` and daily scheduled rescoring jobs in favor of a closed-form fixed Bayesian prior:
    $$\text{weightedScore} = \frac{\text{ratingSum} + 30}{\text{ratingCount} + 10}$$
    (derived from $m = 10$ and prior mean $C = 3$). Firestore rules verify that the client-computed `weightedScore` equals this formula within $\pm 0.0001$, and that `isRanked` is true if and only if $\text{ratingCount} \ge 10$.
  - **Duplicate Prevention**: A dedicated `hashes/{contentHash}` collection stores SHA-256 hashes of normalized logline text (computed in the browser via `crypto.subtle`). Creating a logline requires an atomic batch write creating both the logline and the hash document. Rules reject hashes that already exist, deny hash updates, and allow authors to delete their hash upon editing or withdrawing.
  - **Submission Throttle**: Limits users to 1 logline every 10 minutes by recording `lastSubmitAt` on `users/{uid}`. Rules enforce that `lastSubmitAt` was older than 10 minutes prior to submission and equals `request.time` in the submission batch.
  - **Admin System**: Admins are authorized by the presence of a document in the `admins/{uid}` collection added manually in the Firebase Console. No custom claims or server scripts needed.

---

## Directory Structure

```
.
├── firebase.json                 # Firebase Hosting, Firestore, & Emulators config (no functions)
├── firestore.rules               # Security rules enforcing all rating math, throttling, & permissions
├── firestore.indexes.json        # Composite query indexes (including collection-group reports)
├── public/
│   ├── index.html                # Discovery feed (Top Ranked & New tabs)
│   ├── logline.html              # Full pitch, 1-5 rating control, audience feedback, reports, outcomes
│   ├── submit.html               # Pitch submission form with live 10-50 word counter & hash batching
│   ├── account.html              # Author dashboard (edit within 24h, withdraw, handle setting)
│   ├── signin.html               # Passwordless email link sign-in flow
│   ├── admin.html                # Admin portal (review reports collection group, hidden queue, outcomes)
│   ├── terms.html                # Legal terms draft (writers retain full rights)
│   ├── privacy.html              # Privacy policy draft (zero ads, zero 3rd-party trackers)
│   ├── css/
│   │   └── style.css             # Mobile-first stylesheet (CSS custom properties, WCAG AA contrast)
│   └── js/
│       ├── firebase-config.js    # Public web client configuration placeholder
│       ├── firebase-init.js      # Modular SDK initialization and local emulator routing
│       ├── hash.js               # Browser native Web Crypto API (SHA-256) and text normalization
│       └── nav.js                # Dynamic navigation bar with admin document detection
├── README.md                     # Platform documentation and deployment instructions
```

---

## Setup & Deployment Guide

### Step 1: Create the Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**, enter your project name (e.g. `Cinerolls`), and create the project.

### Step 2: Enable Firestore in Production Mode
1. In your Firebase Console, navigate to **Build** -> **Firestore Database**.
2. Click **Create database**.
3. Choose your database location.
4. Select **Start in production mode**.

### Step 3: Enable Email Link (Passwordless) Sign-In
1. Navigate to **Build** -> **Authentication**.
2. Click **Get started**, then open the **Sign-in method** tab.
3. Select **Email/Password**.
4. Enable the **Email/Password** provider toggle.
5. Turn on the **Email link (passwordless sign-in)** toggle and click **Save**.
6. Under the **Settings** tab -> **Authorized domains**, ensure your deployment domain (e.g. `localhost` and `<your-project-id>.web.app`) is listed.

### Step 4: Install the Firebase CLI (Optional for Deployment)
```bash
npm install -g firebase-tools
```
Log in and connect your project:
```bash
firebase login
firebase use --add
```

### Step 5: Paste Web Client Configuration
1. In the Firebase Console, go to **Project settings** (gear icon) -> **General**.
2. Under **Your apps**, click the web icon (`</>`) to register a web app.
3. Copy the configuration object and replace the placeholder in `public/js/firebase-config.js`:
```javascript
export const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### Step 6: Preview the Project Locally
Since the frontend uses ES modules (`<script type="module">`), pages must be served over HTTP rather than opened as raw `file://` URLs.

You can preview the site using any static HTTP server:
```bash
# Using Python
python -m http.server 5000 --directory public

# Or using the Firebase Emulator
firebase emulators:start
```
Then open [http://localhost:5000](http://localhost:5000) in your web browser.

### Step 7: Deploy Online

#### Option A: Deploy to GitHub Pages (Free & Automatic)
All asset paths and scripts are fully configured for GitHub Pages (repository subpath support):
1. In your GitHub repository (`https://github.com/vabs7/logline`), go to **Settings** -> **Pages**.
2. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
3. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Deploy Cinerolls to GitHub Pages"
   git push origin main
   ```
4. The workflow in `.github/workflows/deploy.yml` will automatically deploy the `public/` directory to:
   👉 `https://vabs7.github.io/logline/`
5. **Important**: In the Firebase Console, go to **Authentication** -> **Settings** -> **Authorized domains** and add `vabs7.github.io`.

#### Option B: Deploy to Firebase Hosting and Firestore
Deploy rules, indexes, and static hosting directly:
```bash
firebase deploy --only hosting,firestore
```

### Step 8: Designate Administrators
To grant admin access (for reviewing reports, unhiding/withdrawing loglines, and adding verified outcomes):
1. Sign in once on the website so your user account is created.
2. In the Firebase Console, go to **Firestore Database**.
3. Click **Start collection**, name it `admins`, and create a document with Document ID set to your user's UID (e.g. `admins/<YOUR_UID>`). An empty document `{}` is sufficient.
4. Next time you refresh the site, the **Admin** button will appear in the navigation bar.

---

## If You Already Deployed Functions

If you previously deployed the backend Cloud Functions to a Blaze-tier project, clean them up to eliminate all serverless compute costs and dependencies:

1. **Delete deployed Cloud Functions**:
   ```bash
   firebase functions:delete submitLogline editLogline withdrawLogline setHandle rateLogline reportLogline adminSetStatus adminAddOutcome nightlyRescore
   ```
2. **Remove leftovers from Cloud Scheduler**:
   - Open the [Google Cloud Console Cloud Scheduler](https://console.cloud.google.com/cloudscheduler).
   - Find the scheduled cron job `firebase-schedule-nightlyRescore` (or similar) and delete it.
3. **Downgrade to Spark Plan**:
   - Go to the Firebase Console -> Project Settings -> Usage and billing.
   - Downgrade the project from **Blaze (Pay as you go)** to **Spark (Free)**.

---

## What Changed

- **Rate Limits Replaced by Throttling**: The server-enforced rolling windows (5 loglines/day and 100 ratings/hour) were removed because Firestore rules cannot count historical arrays reliably. Submissions are now throttled to **one logline per user per 10 minutes** via `lastSubmitAt` on `users/{uid}`.
- **Fixed Prior Scoring**: Instead of a daily scheduled background job computing the site-wide average, ranking uses a fixed prior: $\text{weightedScore} = (\text{ratingSum} + 30) / (\text{ratingCount} + 10)$.
- **Reports No Longer Auto-Hide**: Flagging a pitch creates a document in `loglines/{id}/reports/{uid}`. Reports do not automatically hide loglines; instead, administrators review flagged pitches via collection-group queries on `reports` and decide whether to hide them.
- **Client Transactions with Rule Invariants**: All business logic (ratings, duplicate detection, edits, withdrawals) runs directly in the client browser with strict Firestore rules verifying all state transitions. While client code can theoretically craft arbitrary write payloads, the security rules guarantee that:
  - Users cannot rate their own pitches.
  - Rating count increases by at most 1, and sum increases by the exact score.
  - Scores must match the mathematical formula.
  - Duplicate bodies cannot create conflicting hash records.

---

## After Renaming

After updating the codebase name to **Cinerolls**, complete the following two configuration steps in the Firebase Console:

1. **Update Public-Facing Name**:
   - Go to **Project Settings** (gear icon) -> **General**.
   - Under **Public-facing name**, change the name to **Cinerolls** and click **Save**.
2. **Update Sender Name on Email Templates**:
   - Go to **Authentication** -> **Templates**.
   - Under **Email link sign-in**, click the edit icon.
   - Set the **Sender display name** to **Cinerolls** so that sign-in emails arrive clearly branded as Cinerolls.

---

## Assumptions

1. **Email Link Landing URL**: The passwordless sign-in flow redirects back to `window.location.origin + '/signin.html'`. The email entered before link generation is temporarily cached in browser `localStorage`. If opened on another device/browser, a browser prompt asks the user to confirm their email address.
2. **Body Normalization and Duplicate Detection**: Duplicate detection normalizes text by lowercasing, stripping punctuation, collapsing whitespace, and hashing with SHA-256 via browser `crypto.subtle`. The batch creation enforces that `hashes/{contentHash}` is created atomically with `loglines/{id}`.
3. **Word Count Tokenization**: Word counts are computed by splitting trimmed text on whitespace (`\s+`). Submissions must be between 10 and 50 words.
4. **Editable Window**: Authors can edit the body within 24 hours of submission (`request.time < editableUntil`). The edit batch deletes the old hash, sets the new hash, appends a revision to `revisions/{rid}`, and updates `body`, `contentHash`, and `updatedAt`.
5. **Withdrawal**: Withdrawing updates `status` to `withdrawn` and deletes the matching `hashes/{contentHash}` document so the text becomes available again.
6. **Admin Verification**: Admins are identified solely by the existence of `admins/{uid}` in Firestore.
