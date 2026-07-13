## The issue

The error "GOOGLE_OAUTH_CLIENT_ID missing on the server" is accurate — checking the project secrets, only `GOOGLE_OAUTH_CLIENT_SECRET` is currently saved. `GOOGLE_OAUTH_CLIENT_ID` is **not** stored, even though you mentioned having it. That's why the server function `getGoogleOAuthClientId` returns `null` and the Connect Google button short-circuits with the toast.

## Fix

Add the missing `GOOGLE_OAUTH_CLIENT_ID` secret. It should be the same Client ID from your Google Cloud OAuth 2.0 Web Client (looks like `1234567890-abc123def456.apps.googleusercontent.com`) — the counterpart to the `GOOGLE_OAUTH_CLIENT_SECRET` you already saved.

On approve, I'll open the secure secrets form (via `add_secret`) for you to paste the Client ID. No code changes are needed — the existing `getGoogleOAuthClientId` server function will pick it up from `process.env` immediately.

## Also make sure

In your Google Cloud OAuth client's **Authorized redirect URIs**, both of these are listed so the callback works from preview and production:
- `https://id-preview--11ff6cba-0e12-4f91-9089-4c2aaab66c8a.lovable.app/auth/google/callback`
- `https://alcintelligenceops.lovable.app/auth/google/callback`
