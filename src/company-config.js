// ---------------------------------------------------------------------------
// AMR Universal — company configuration.
//
// This is the single file that drives the Companies Act footer, the contact
// page, and the Compliance & Accreditations section. When incorporation
// completes, drop the real details in here and redeploy. Nothing else needs
// to change.
// ---------------------------------------------------------------------------

module.exports = {
  name: 'AMR Universal Ltd',
  displayName: 'AMR Universal LTD',
  founder: 'Nishant Makhija',

  // Companies Act 2006 statutory particulars — replace after incorporation.
  companyNumber: '[TO BE ADDED]',
  registeredOffice: '[TO BE ADDED]',
  registeredIn: 'England & Wales',

  // Contact details. The WhatsApp number is digits only, international
  // format, no plus sign — it feeds the wa.me click-to-chat links.
  contact: {
    email: 'desk@amruniversal.example', // replace with real mailbox once domain exists
    phone: '+44 (0)20 0000 0000',       // placeholder — replace
    whatsapp: '447751700211',           // desk WhatsApp, digits only
    addressLines: [
      'Registered office to be confirmed',
      'London, United Kingdom',
    ],
  },

  // Geographies shown in the masthead strip.
  geographies: 'LONDON · ROTTERDAM · NEW YORK',

  // -------------------------------------------------------------------------
  // Compliance & Accreditations.
  //
  // Each entry renders as a quiet card on The House page. While `held` is
  // false the card reads "accreditation in progress — details on request".
  // When a licence or certificate is actually granted, set `held: true` and
  // fill in `detail` (certificate / licence number). Nothing is claimed that
  // is not held.
  // -------------------------------------------------------------------------
  accreditations: [
    {
      key: 'fsc',
      title: 'FSC® Chain of Custody',
      body: 'Certification for the trading of FSC-certified paper and board.',
      held: false,
      detail: '', // e.g. 'Certificate FSC-C000000'
    },
    {
      key: 'pefc',
      title: 'PEFC Chain of Custody',
      body: 'Certification for the trading of PEFC-certified material.',
      held: false,
      detail: '',
    },
    {
      key: 'smda',
      title: 'Scrap Metal Dealers Act 2013',
      body: 'Local-authority scrap metal dealer licence for the metals desk.',
      held: false,
      detail: '', // e.g. 'Licence 00000, issued by [Council]'
    },
    {
      key: 'ea',
      title: 'Environment Agency Waste Carrier',
      body: 'Registration as a carrier, broker and dealer of waste.',
      held: false,
      detail: '', // e.g. 'Registration CBDU000000'
    },
  ],
};
