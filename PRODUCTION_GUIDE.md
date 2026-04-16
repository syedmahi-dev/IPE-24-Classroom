# IPE-24 Classroom: Production & Administrative Guide

This document provides comprehensive instructions for maintaining and operating the IPE-24 Classroom portal.

---

## 🚀 Environment Configuration

The application requires several sensitive environment variables to be correctly set in the `.env` file (or your deployment platform's environment settings).

### 1. Service Account Keys (Base64 Encoded)
Both Google and Firebase require service account keys. For security and compatibility with `.env` files, these must be **Base64 encoded JSON strings**.

- **Google Service Account**: Used for Google Drive (Resources) and Google Sheets (Routine).
- **Firebase Service Account**: Used for Firebase Authentication and Push Notifications.

> [!TIP]
> If you need to re-encode a JSON key, use the provided utility script:
> `npx tsx scripts/encode-keys.ts` (Point it to your `.json` files first)

### 2. Google Integration IDs
Update these in `.env` to connect to your live data sources:
- `GOOGLE_DRIVE_FOLDER_ID`: The unique ID of the Google Drive folder where course materials are stored.
- `GOOGLE_SHEETS_ROUTINE_ID`: The unique ID of the Google Sheet containing the class routine.

### 3. Secretary & Security
- `NEXTAUTH_SECRET`: A random 64-character string used for encrypting session cookies.
- `INTERNAL_API_SECRET`: A secure key used for authenticating incoming webhooks (e.g., from n8n or automated bots).
- `GEMINI_API_KEY`: Your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 📅 Managing the Class Routine

The routine is fetched dynamically from a Google Sheet.

1. **Format**: The sheet must follow the prescribed column structure (Day, Time, Course, Teacher, Room).
2. **Access**: Ensure the Google Service Account email (found in your JSON key) has **"Viewer"** access to the spreadsheet.
3. **Caching**: The portal caches the routine to improve performance. Changes in the spreadsheet may take a few minutes to reflect.

---

## 📂 Managing Course Resources

Files are indexed from a specific Google Drive folder.

1. **Organization**: Create subfolders for each course (e.g., "IPE 2201", "MATH 2241"). The portal uses the folder names as course titles.
2. **Access**: Ensure the Google Service Account email has **"Viewer"** access to the parent folder.
3. **Links**: The portal provides direct download links. Ensure files are shared as "Anyone with the link can view" if you want users to download them without signing into Google.

---

## 🔔 Push Notifications

The portal uses Firebase Cloud Messaging (FCM).

1. **VAPID Key**: Found in Firebase Console → Project Settings → Cloud Messaging → Web Push certificates.
2. **Subscription**: Users must "Allow" notifications in their browser to receive alerts.
3. **Broadcast**: Admins can send notifications via the Admin Dashboard's announcement module.

---

## 🛠️ Infrastructure Maintenance

### 1. Database Management
The application uses **Supabase (PostgreSQL)**. 
- **Backups**: Managed automatically by Supabase.
- **Direct Access**: Use the [Supabase Dashboard](https://supabase.com/dashboard) to manually edit data or run SQL.
- **Prisma**: If you change the database schema, run:
  `npx prisma db push`

### 2. Quality Assurance (Smoke Tests)
Before every push to production, run the infrastructure smoke test to verify all connections:
```bash
npx tsx scripts/smoke-test.ts
```
This verifies Database, Google Auth, and Environment Variables.

### 3. Unit Testing
To verify the student portal logic remains intact:
```bash
npm test -- "src/app/(student)"
```

---

## 🔐 Administrative Access

1. **Super Admin**: The email defined in `SUPER_ADMIN_EMAIL` has absolute control.
2. **Promoting Admins**:
   - Log into the [Supabase Dashboard](https://supabase.com/dashboard).
   - Go to the `User` table.
   - Update the `role` column to `ADMIN` for the desired user.
   - Alternatively, use the Admin Portal's **User Management** page (CR only).

---

## 🤖 Support Bot (n8n / Telegram)

If using the external automation pipeline (e.g., n8n):
1. Use the `INTERNAL_API_SECRET` in the `x-api-secret` header for all requests to `/api/v1/internal/...`.
2. The bot should send announcements formatted as JSON to the broadcast endpoint.

---

> [!CAUTION]
> **Never commit your `.env` file to a public repository.** Use repository secrets or environment variables in your hosting provider (Vercel, Railway, etc.).
