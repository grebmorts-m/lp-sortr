# LP Sortr 💿

Rank the albums you've listened to, and keep a shortlist of what to hear next.

- **Album data and covers** come from two sources, both searched at once, with duplicates merged:
  - the [iTunes Search API](https://performance-partners.apple.com/search-api) (fast, with Apple Music covers)
  - [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API) and the [Cover Art Archive](https://coverartarchive.org/), for albums that Apple doesn't have

  Neither needs an API key.
- **Frontend:** Vite, React, TypeScript and Tailwind CSS v4. It's a static site hosted on GitHub Pages.
- **Accounts and data:** [Supabase](https://supabase.com) free tier. Username/password login, with Row Level Security so each user can only see their own rows.
- **Guest mode:** "Just try it out" saves everything in `localStorage`. If you then create an account, those lists are moved into it.

## Setup

### 1. Supabase
1. Create a project at supabase.com.
2. **Authentication → Sign In / Providers → Email**: keep Email enabled and turn **off** "Confirm email".
   Usernames are mapped to made-up emails (`<username>@users.lp-sortr.app`), so confirmation mails would never arrive.
3. **SQL Editor**: paste [`supabase/schema.sql`](supabase/schema.sql) and click Run.
   If you ran an older version of the schema, run [`supabase/migrate-002-multi-source.sql`](supabase/migrate-002-multi-source.sql) instead.
4. **Project Settings → API**: copy the *Project URL* and the *anon public* key.

### 2. GitHub
1. **Settings → Pages → Source**: select **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   The anon key is meant to be public; RLS is what protects the data.
3. Push to `main`. The site deploys to `https://<user>.github.io/lp-sortr/`.

The `keepalive` workflow pings Supabase daily, so the free project never pauses for inactivity.

### Local development
```sh
npm install
cp .env.example .env.local   # fill in the values, or leave them empty for guest-only mode
npm run dev
```

## Notes
- Password reset by email isn't possible because the emails are fake. You can reset a user's password in the Supabase dashboard under Authentication → Users.
- Rate limits: iTunes allows about 20 requests per minute and MusicBrainz about 1 per second, so search is debounced. If one source fails, results still come from the other.
- If you rename the repo, update `base` in `vite.config.ts`.
