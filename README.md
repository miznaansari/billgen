# BillGen — Simple Invoice Maker

React + Vite + Tailwind/DaisyUI + Firebase bill generator for freelance film crews.
Create bills, save them to your account, duplicate past bills, and download them as
PDF in two designs (Classic & Premium).

## Run locally

```bash
npm install
npm run dev
```

## One-time Firebase setup (free Spark plan)

Everything runs on the Firebase **free tier** — Auth, Firestore and Analytics only.
No Cloud Storage is used (signatures are stored as base64 inside Firestore).

1. **Enable Email/Password sign-in** (Google is already enabled):
   Firebase console → Authentication → Sign-in method → Email/Password → Enable.
2. **Set Firestore security rules**: copy the contents of [`firestore.rules`](./firestore.rules)
   into Firebase console → Firestore Database → Rules → Publish.
   This locks every user's bills, suggestions and company profile to their own account.

## Data model

| Path | Purpose |
| --- | --- |
| `users/{uid}` | Account info + download counter |
| `companyProfiles/{uid}` | Your company details, bank info & signature (shown on the PDF) |
| `users/{uid}/bills/{id}` | Every saved bill (full form data + design + totals) |
| `users/{uid}/meta/suggestions` | One small doc powering autocomplete: recent clients (with address/GST/PAN), projects, campaigns and the last bill number |

Reads are cached per session, so a normal visit costs only a handful of Firestore
reads — far below the free-tier daily limits.

## Features

- Google **and** email/password sign-in, password reset
- Dashboard with billing stats and recent bills
- Bill history: search, preview, re-download, **duplicate**, edit, delete
- Autocomplete for clients (autofills address/GST/PAN), projects and campaigns
- Auto-suggested next bill number + duplicate bill-number warning
- Two PDF designs (Classic / Premium) with typed or drawn signature
- Fully responsive — sidebar on desktop, bottom tabs on mobile
