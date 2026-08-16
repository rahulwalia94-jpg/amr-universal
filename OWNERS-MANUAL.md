# The Desk, From Your Phone — Owner's Manual

Everything is done by messaging **your own WhatsApp business number** from
your personal WhatsApp. Only your number can manage the desk. Nothing goes
live until you press **Publish** on the preview the bot sends back.

## The commands

| You type | What happens |
| --- | --- |
| `SELL` + lines | Drafts a lot for **Lots Available** |
| `WANT` + lines | Drafts an entry for **Material Wanted** |
| `LIST` | Shows everything on the board with lot numbers |
| `SOLD AMR-P-0003` | Marks it **Placed** (ribbon for 48 h, then it leaves quietly) |
| `FOUND AMR-W-0002` | Same, for a wanted entry |
| `REMOVE AMR-M-0001` | Takes a lot off the board immediately |
| `EDIT AMR-P-0004 Price: USD 410/MT CIF` | Changes one field on a live lot |
| `BACKUP` | Sends you the database file (also runs itself every Sunday) |
| `HELP` | The cheat sheet |

The lines after SELL/WANT are `Label: value`. Labels are forgiving — `Qty`,
`Q`, `Tonnage` all work; `From`, `Origin`, `Location` all work. A line with
no label becomes the title. **Photos:** attach one to the SELL message
itself (put the command in the caption), or send it right after — it joins
the draft.

**Public vs private:** the website shows only lot number, title, origin,
quantity and "Price on application." Your **Spec, Price and Notes stay
private** until a buyer requests full details — at which point their name
and contact land in your WhatsApp within seconds.

---

## Worked example 1 — a paper lot

> **You:**
> ```
> SELL
> Testliner 2, prime reels
> Origin: UK
> Qty: 210 MT
> Spec: 125-150 gsm, widths 1400-2100mm
> Price: USD 405/MT CIF Mundra
> Notes: prompt shipment, monthly volume available
> ```
> *(photo of the reels attached to the same message)*
>
> **Desk bot:** Here is the lot exactly as the site will carry it:
> **Testliner 2, prime reels** · Board: Lots Available · PAPER & BOARD ·
> Origin: UK · Quantity: 210 MT · Spec (private until requested): 125-150 gsm… ·
> Price shown publicly: Price on application · Photo: attached ✓
> Nothing goes live until you press Publish.
> `[Publish] [Edit] [Cancel]`
>
> **You:** *(tap Publish)*
>
> **Desk bot:** Published. AMR-P-0005 is live on the board now:
> https://…/live-desk#AMR-P-0005

## Worked example 2 — a steel lot, then a price change

> **You:**
> ```
> SELL Shredded steel
> Origin: UK, loading Felixstowe
> Qty: 500 MT monthly
> Price: on request, basis CFR
> ```
>
> **Desk bot:** *(preview as above — it noticed "steel" and filed it under
> METALS automatically)* `[Publish] [Edit] [Cancel]`
>
> **You:** *(tap Publish)* → AMR-M-0003 is live.
>
> *Next week the market moves:*
>
> **You:** `EDIT AMR-M-0003 Qty: 350 MT monthly`
>
> **Desk bot:** AMR-M-0003 updated (quantity). *(shows the refreshed lot)*

## Worked example 3 — a wanted entry, then closing it

> **You:**
> ```
> WANT
> Folding boxboard, redundant stock
> Origin: UK or EU
> Qty: any volume
> Notes: collection at our cost, settlement on agreed weights
> ```
>
> **Desk bot:** *(preview)* `[Publish] [Edit] [Cancel]`
>
> **You:** *(tap Publish)* → AMR-W-0003 is live under Material Wanted.
>
> *A fortnight later a printer's clearance covers it:*
>
> **You:** `FOUND AMR-W-0003`
>
> **Desk bot:** AMR-W-0003 marked PLACED. It carries the ribbon for 48
> hours, then leaves the board quietly.

---

## What comes TO you, automatically

- **Every website enquiry** and **every "request full details"** — name,
  company, contact, lot number — arrives in your WhatsApp within seconds.
  Reply to the buyer directly; speed is the edge.
- **Stale lots** — anything untouched for three weeks: the bot asks
  `[Renew] [Archive]` per lot. One tap either way; the board never looks
  abandoned.
- **Sunday backup** — the database file, every week, without asking.

## Small habits

- `LIST` on Monday morning; renew or kill what deserves it.
- Mark things `SOLD` promptly — a Placed ribbon is quiet, good advertising.
- If the bot misreads you, tap **Edit** on the preview and resend the odd
  line (e.g. `Price: EUR 380/MT DAP`), or **Cancel** and start over.
