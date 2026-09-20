# Roadmap

## Core system (built)
- [x] Schema, RLS, roles, audit triggers (migration 0000)
- [x] Auth page, workers/transfers grids, profile modals, transfer flow

## New request (2026-09-20): remove self-signup & Google, create admin account
- [x] Disable signup + Google provider in backend auth settings
- [x] Create admin account (email + password), assign admin role
- [x] Simplify auth page: sign-in only (no signup tab, no Google button)
- [x] Deliver credentials to the user
- [x] Verify sign-in works end-to-end

## CRM expansion (2026-09-20)
- [x] Recruitment requests module (table + /requests grid + form + filters)
- [x] Arrivals fields on workers grid/form (profession, visa, arrival time, flight group, arrival status, location)
- [x] Transfer operations fields (transfer type, stage, worker condition, worker location, salary dues amount)
- [x] Customer/sponsor modal shows recruitment requests; worker modal shows arrival + transfer details
- [x] Verified end-to-end in the browser

## Pending
- [x] Hide "Made with Lovable" badge via CSS in src/styles.css
- [ ] Old unconfirmed account ramadan@gmail.com still exists — user may want it removed or confirmed


