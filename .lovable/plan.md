## Goal
You've regenerated your Google OAuth Client ID/Secret in Google Cloud Console. We need to replace the stored secrets in Lovable Cloud so the "Connect Google" button on `/admin/accounts` uses the new credentials.

## Steps

1. **Update `GOOGLE_OAUTH_CLIENT_ID`** — open the secure form via `update_secret` and paste the new Client ID.
2. **Update `GOOGLE_OAUTH_CLIENT_SECRET`** — open the secure form via `update_secret` and paste the new Client Secret.
3. **Verify redirect URI** — in your Google Cloud Console OAuth client, confirm this exact Authorized redirect URI is registered (both, if you use both environments):
   - Preview: `https://id-preview--11ff6cba-0e12-4f91-9089-4c2aaab66c8a.lovable.app/auth/google/callback`
   - Published: `https://alcintelligenceops.lovable.app/auth/google/callback`
4. **Confirm required scopes** are enabled on the OAuth consent screen: `calendar.readonly`, `calendar.events`, `gmail.readonly`, `openid`, `email`.
5. **Test** — go to `/admin/accounts`, click **Connect Google**, complete consent, verify the toast says "Google account connected" and the card shows "Connected …".

## Out of scope
No code changes. No schema changes. Contacts/merge/AI features untouched.

## Question
Do you want me to open the two `update_secret` forms now (one for CLIENT_ID, one for CLIENT_SECRET)?
