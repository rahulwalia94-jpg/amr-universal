# Launch Checklist — AMR Universal LTD

Work down the list; each line says where the change lands.

## Incorporation & identity

- [ ] **Verify the company name** is free at Companies House
      (find-and-update.company-information.service.gov.uk) and incorporate
      AMR Universal Ltd.
- [ ] **Reserve the matching domain** (e.g. amruniversal.co.uk / .com) at the
      same time — before announcing anything.
- [ ] **Drop in company number & registered office** →
      `src/company-config.js` (`companyNumber`, `registeredOffice`,
      `contact.addressLines`) → push → the Companies Act footer, legal pages
      and PDF update everywhere at once.
- [ ] **Real phone / WhatsApp / email** → same file (`contact` block).

## Deploy (today)

- [ ] Push to GitHub, deploy via Render Blueprint (README section 2).
- [ ] Set `BASE_URL` to the `*.onrender.com` URL.
- [ ] UptimeRobot ping on `/health` every 5 minutes.
- [ ] Note the auto-generated `ADMIN_TOKEN` from the Environment tab.

## WhatsApp desk

- [ ] Meta app + WhatsApp product + System User token (README section 4).
- [ ] Webhook verified, `messages` subscribed.
- [ ] Send `HELP` from Nishant's phone; post a test lot; delete it with
      `REMOVE`.
- [ ] Start Meta **business verification** early (limits, display name).

## Before live trading

- [ ] **Switch to the Starter instance ($7/mo)** — the free tier sleeps,
      which delays enquiry pushes, and cannot hold a persistent disk.
- [ ] **Uncomment the disk block** and `DATA_DIR` in `render.yaml`, push.
      Until this is done, WhatsApp-posted lots do not survive restarts.
- [ ] **Solicitor review of the Terms of Trade** (`src/views/terms.ejs`) —
      franchise, claims windows, jurisdiction — before the terms are relied
      on in anger. The page is labelled "indicative" until then.
- [ ] Custom domain: Render Custom Domains → change `BASE_URL` → update the
      Meta webhook URL (README section 5).
- [ ] Professional mailboxes on the domain with SPF/DKIM/DMARC; update
      `company-config.js`; retire any gmail usage for trade.

## Licences & accreditations (activate as granted, never before)

- [ ] Scrap Metal Dealers Act 2013 licence (local authority) →
      `src/company-config.js` → `smda` → `held: true` + licence number.
- [ ] Environment Agency waste-carrier registration → `ea` entry.
- [ ] FSC® / PEFC chain-of-custody, when certified → `fsc` / `pefc` entries.

## Rhythm

- [ ] One Ledger note a month (`content/ledger/`) — the SEO engine.
- [ ] Weekly: export `/admin/subscribers.csv` + `/admin/leads.csv`.
- [ ] Keep an eye on the Sunday WhatsApp backup arriving.
