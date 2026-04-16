# 🛠️ IPE-24 Classroom: Admin & Operations Manual

This document provides all necessary instructions for setting up, managing, and maintaining the IPE-24 Classroom platform.

---

## 1. Infrastructure Setup

### Google Cloud Console (APIs & OAuth)
1.  **Project**: Create a project labeled `IPE-24-Classroom`.
2.  **APIs**: Enable the following APIs:
    *   Google Drive API
    *   Google Sheets API
3.  **OAuth Consent**: Configure the OAuth consent screen with the domain `iut-dhaka.edu` restricted (optional but recommended).
4.  **Credentials**: 
    *   Create **OAuth 2.0 Client IDs** (Web Application) for user login.
    *   Download the Client ID and Secret and add them to `.env`.

### Firebase (Push Notifications)
1.  **Project**: Create a Firebase project.
2.  **Web App**: Register a Web App to get your Firebase config.
3.  **Cloud Messaging**:
    *   Go to Project Settings > Cloud Messaging.
    *   Generate a **Web Push certificate (VAPID Key)**.
    *   Add this key to `NEXT_PUBLIC_FCM_VAPID_KEY`.
4.  **Service Account**:
    *   Go to Project Settings > Service Accounts.
    *   Generate a new Private Key (JSON).
    *   Base64 encode this JSON and add it to `FIREBASE_SERVICE_ACCOUNT_KEY`.

---

## 2. Environment Configuration

The `.env` file uses Base64 encoding for multiline JSON keys to avoid formatting issues in production environments.

### Encoding a JSON Key (Service Account)
If you have a `key.json` file, use the following commands to get the string for your `.env`:

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("key.json"))
```

**Linux/Mac (Bash):**
```bash
base64 -w 0 key.json
```

---

## 3. Third-Party Integrations

### Google Drive (File Management)
The platform allows admins to upload materials directly to a shared Drive folder.
1.  **The "Manager" Identity**: Use the Service Account email found in your Google JSON key (e.g., `ipe-24-bot@project.iam.gserviceaccount.com`).
2.  **Sharing**: You **MUST** share your target Google Drive folder with this email as an **Editor**.
3.  **Folder ID**: The ID is found in the browser URL: `drive.google.com/drive/u/0/folders/YOUR_FOLDER_ID`.

### Google Sheets (Routine Sync)
While the app uses a database for daily display, it can sync from a Master Sheet.
1.  **Permission**: Share the spreadsheet with the Service Account email as an **Editor**.
2.  **Spreadsheet ID**: Found in the URL: `docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit`.

---

## 4. Platform Management

### User Role Elevation
By default, new users are `student`. To promote a user to `admin` or `super_admin`, you must run a SQL command (via Supabase SQL Editor or Prisma Studio):

```sql
-- Promote a user to Admin
UPDATE users SET role = 'admin' WHERE email = 'target-user@iut-dhaka.edu';

-- Promote a user to Super Admin (Requires 2FA)
UPDATE users SET role = 'super_admin' WHERE email = 'your-email@iut-dhaka.edu';
```

### Student Grouping Logic (Odd/Even)
Groups are determined automatically based on the **last digit of the Student ID**:
*   **ODD**: Last digit is `1, 3, 5, 7, 9`.
*   **EVEN**: Last digit is `0, 2, 4, 6, 8`.
*   The system uses this to filter lab routines marked as `targetGroup: "ODD"` or `"EVEN"`.

### AI Knowledge Base Indexing
The chatbot uses **vector search**. When you add a document to the Knowledge Base:
1.  **Chunking**: The system breaks the text into 500-character segments.
2.  **Embedding**: It generates a mathematical vector (via Gemini) for each chunk.
3.  **Search**: When a student asks a question, the system finds the most similar chunks and feeds them to the AI for a grounded answer.

---

## 5. Maintenance & Deployment

### Deployment (Docker)
The repository includes a `Dockerfile` for easy deployment:
```bash
docker build -t ipe24-classroom .
docker run -p 3000:3000 --env-file .env ipe24-classroom
```

### Database Updates
Whenever you modify the data structure (Prisma):
1.  `npx prisma generate` (Updates the local client libraries).
2.  `npx prisma migrate deploy` (Applies changes to the production/Supabase database).

### Routine Lifecycle
*   **BaseRoutine**: The skeleton schedule. Edit this only for permanent semester changes.
*   **RoutineOverride**: Used for date-specific changes.
    *   `CANCELLED`: Hides a specific class on a specific day.
    *   `MAKEUP`: Adds a class that wasn't previously in the schedule.
    *   `ROOM_CHANGE`: Keeps the time but updates the location.

---

> [!CAUTION]
> Never commit your `.env` file or JSON keys to Public GitHub repositories. Always use secret management tools for production.
