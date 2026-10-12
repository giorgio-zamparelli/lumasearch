# LumaSearch

Find public upcoming Luma events by city at **[lumasearch.vercel.app](https://lumasearch.vercel.app)**.

Choose a city and country, set a 5–50 km radius, and filter loaded events by
topic, title, host, venue, date or free RSVP. Cards open the original Luma listing
for registration. The selected city is saved in the URL for sharing.

The header offers **System**, **Light** and **Dark** themes. System follows OS
changes automatically; a manual choice is remembered on your browser and
applied before the first paint.

## Run locally

Use Node.js 24 and npm:

```sh
npm ci
npm test
npm run dev
```

Open `http://127.0.0.1:47831`. The development server includes both API handlers
and updates when source files change. To check a production build instead:

```sh
npm run build
npm run preview
```

This repository is self-contained: React, Vite, local UI controls and
self-hosted Figtree from Fontsource. It needs no database, secret, API key,
private package registry or paid Apify scraper.

## Automatic deployments

The [deployment workflow](.github/workflows/deploy.yml) runs on pushes to
`main`. **Pushing a commit to `main` automatically tests, builds and deploys
production at [lumasearch.vercel.app](https://lumasearch.vercel.app)**.
Merging a pull request into `main` does the same. A local commit reaches the
deployment service when you push it to GitHub:

```sh
git add .
git commit -m "Describe the change"
git push origin main
```

GitHub Actions installs dependencies, runs `npm test`, and uses the Vercel CLI
to pull production settings, build and deploy to the existing `lumasearch`
project. The workflow verifies that the live site's `/build-info.json` contains
the pushed commit. It can also be run manually from GitHub's Actions tab for
`main`.

The repository is configured with a `VERCEL_TOKEN` Actions secret and
`VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` repository variables. Credentials stay in
GitHub Secrets. Vercel serves `dist/` and hosts the Node handlers in `api/`;
deployment settings and response headers live in `vercel.json`. Build output,
local Vercel links and environment files are excluded from Git.

Vercel's [Hobby plan](https://vercel.com/docs/plans/hobby) is free within its
included limits for personal, non-commercial projects. Open-Meteo's free
geocoding service also requires non-commercial use.

## API protection

Vercel's edge firewall limits `/api/*` to 60 requests per minute per IP,
shared by city lookups and event searches. The policy is recorded in
[`security/firewall.json`](security/firewall.json). It was applied to the
existing project through Vercel's Firewall API on 11 October 2026. Editing this
file does not apply the policy automatically; firewall changes must also be
applied through Vercel's dashboard or API.

Deployments currently still use the GitHub Actions secret described above.
Migration to Vercel's native GitHub integration and removal of that credential
are pending the Vercel account's GitHub login connection. Keep the working
deployment credential until the replacement has been verified.

## Data and coverage

City coordinates come from [Open-Meteo / GeoNames](https://open-meteo.com/en/docs/geocoding-api).
Events are requested on demand from Luma's public geographic discovery feed.
This feed is undocumented and can change, be incomplete or become rate limited;
the site is an independent tool, not an official Luma integration or exhaustive
event index. Online, past and unlisted events are removed. Private addresses
and attendee lists are never returned to the browser.

The initial search retrieves up to four pages, or 200 provider entries. **Load
more events** continues pagination. Topic filters use titles and organizers;
the keyword filter also searches public venues, not full event descriptions.
Free RSVP reflects Luma's registration type; an organizer may separately
request a contribution or conference admission.

Successful event responses are cached for 10 minutes and city lookups for one
day, at the CDN and in bounded instance memory. The CDN can serve older data
while revalidating for up to an additional hour. A new request triggers refresh
after expiration; there is no scheduled crawl or automatic polling of an open
page. Failed requests are not cached or shown as zero events.

## Checks

`npm test` runs the discovery, privacy, API error handling, pagination, caching
and filtering contracts. Check both themes, city selection and the mobile
layout when changing the client. Figtree is distributed under the
[SIL Open Font License](https://fontsource.org/fonts/figtree).
