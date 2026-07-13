## Plan: Create user account

Create a new authenticated user via the Supabase Auth Admin API:

- **Email:** tendai@alicelanecapital.com
- **Password:** EmergingEnterprise2026!
- **Email confirmed:** yes (so they can sign in immediately without a confirmation email)

### How

Run a one-off SQL insert through the admin path to provision the user with the given credentials and mark the email as confirmed. No schema changes, no code changes, no new files.

### After creation

Tendai can sign in at `/auth` with those credentials, then click "Connect Google" on `/admin/accounts` from their own session to link their calendar.

### Note

The password will be stored as-is on their account. Recommend they change it after first sign-in.