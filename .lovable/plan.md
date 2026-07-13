## Diagnosis

The 403 comes from Google's OAuth server, not your app. Your callback (`/auth/google/callback`) and secrets are wired correctly — Google is refusing to show the consent screen to your account. With the scopes this integration requests (Gmail readonly + Calendar read/write), the two realistic causes are:

1. **Consent screen is in "Testing" and your email isn't a Test user.** Google returns exactly this 403 page.
2. **`gmail.readonly` is a "restricted" scope.** In Testing mode it works for listed test users only. In Production mode it requires Google verification (and a security assessment) — without that, users see 403/access-denied.

No code change will fix this — it's a Google Cloud Console config issue.

## Fix (in Google Cloud Console, on the same project that owns your OAuth Client ID)

**APIs & Services → OAuth consent screen**
- User type: **External**
- Publishing status: **Testing** (leave it here for now)
- **Test users** → Add your Google account (`georgia@alicelanecapital.com`) and any teammate who needs to connect. Save.
- **Scopes** → confirm these are added:
  - `openid`, `.../auth/userinfo.email`
  - `.../auth/calendar.readonly`
  - `.../auth/calendar.events`
  - `.../auth/gmail.readonly`

**APIs & Services → Enabled APIs**
- Enable **Google Calendar API** and **Gmail API** on the same project.

**APIs & Services → Credentials → your OAuth 2.0 Client ID (Web application)**
- Authorized redirect URIs must include **both** exactly:
  - `https://id-preview--11ff6cba-0e12-4f91-9089-4c2aaab66c8a.lovable.app/auth/google/callback`
  - `https://alcintelligenceops.lovable.app/auth/google/callback`
- Confirm the Client ID saved in Lovable is from **this same client** (Web application type, not iOS/Android/Desktop).

Then retry **Connect Google** while signed into a listed Test user account.

## If you want any Google user (not just test users) to connect

You'll need to either:
- Publish the consent screen and complete Google's **verification + Gmail restricted-scope security assessment**, or
- Drop `gmail.readonly` from `GOOGLE_SCOPES` in `src/lib/google-oauth.functions.ts` (Calendar-only stays in the lighter "sensitive" tier and is much easier to verify).

Tell me which path you want and I'll take it from there — no code changes needed for the immediate 403 fix.
