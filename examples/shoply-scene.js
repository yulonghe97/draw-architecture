  const W = 1480, H = 1968;

  // One hue per plane. The three vendor-wrapping columns sit side by side in
  // the platform band, so search/payments/notifications take cyan, rose and
  // green — maximally separated hues. Shape carries ownership: dashed = an
  // abstraction Shoply owns, solid = swappable vendor/infra or an app surface.
  const PLANES = {
    people:   { c: '#94A3B8', label: 'People' },
    product:  { c: '#7DD3FC', label: 'Product surfaces' },
    domain:   { c: '#A78BFA', label: 'Core domain services' },
    search:   { c: '#22D3EE', label: 'Search plane' },
    payments: { c: '#FB7185', label: 'Payments plane' },
    notify:   { c: '#4ADE80', label: 'Notifications plane' },
    infra:    { c: '#F6821F', label: 'Infrastructure' }
  };

  // --- bands (the horizontal zones) -----------------------------------------
  // Five bands tell the story top-to-bottom: people → surfaces → domain →
  // platform abstractions over vendors → the infra everything runs on.
  // The platform band holds three planes at once, so it stays neutral and its
  // columns are coloured individually.
  const BANDS = [
    { id: 'band-people', plane: 'people', x: 160, y: 200, w: 1260, h: 150, alpha: 0.55,
      hdr: { x: 184, y: 230, t: 'PEOPLE — SHOPPERS · MERCHANTS · SUPPORT' } },

    { id: 'band-product', plane: 'product', x: 160, y: 440, w: 1260, h: 184, alpha: 0.45, dash: true,
      hdr:  { x: 184,  y: 470, t: 'PRODUCT SURFACES — NEXT.JS' },
      tagr: { x: 1396, y: 470, t: 'OURS — WHAT USERS TOUCH', alpha: 0.6 } },

    { id: 'band-domain', plane: 'domain', x: 160, y: 710, w: 1260, h: 206, alpha: 0.6, dash: true,
      hdr:  { x: 184,  y: 740, t: 'CORE DOMAIN SERVICES' },
      tagr: { x: 1396, y: 740, t: 'OURS — THE BUSINESS LOGIC', alpha: 0.6 } },

    { id: 'band-platform', plane: null, x: 160, y: 1000, w: 1260, h: 320, stroke: '#3A4250', alpha: 1,
      hdr:  { x: 184,  y: 1030, t: 'PLATFORM SERVICES', fill: C.slate },
      tagr: { x: 1396, y: 1030, t: 'OWNED ABSTRACTIONS OVER SWAPPABLE VENDORS', fill: C.slate, alpha: 0.7 } },

    { id: 'band-infra', plane: 'infra', x: 160, y: 1410, w: 1260, h: 404, alpha: 0.4,
      hdr:  { x: 184,  y: 1440, t: 'INFRASTRUCTURE' },
      tagr: { x: 1396, y: 1440, t: 'SWAPPABLE — EVERYTHING RUNS HERE', alpha: 0.6 } }
  ];

  // --- boxes ----------------------------------------------------------------
  // `about` powers the readout panel when a box is focused.
  const BOXES = [
    // ---- people
    { id: 'shoppers', plane: 'people', band: 'band-people', x: 200, y: 252, w: 340, h: 80, r: 10,
      name: 'Shoppers', about: 'Customers browsing and buying on the web storefront and mobile apps.',
      texts: [ ['bl', 224, 280, 'Shoppers'], ['bs', 224, 302, 'web storefront · mobile apps'], ['bs', 224, 318, 'browse · search · buy'] ] },

    { id: 'merchants', plane: 'people', band: 'band-people', x: 590, y: 252, w: 440, h: 80, r: 10,
      name: 'Merchants', about: 'Store owners — they manage catalog and orders, and act on the sales dashboard.',
      texts: [ ['bl', 614, 280, 'Merchants'], ['bs', 614, 302, 'run their stores from the dashboard'], ['bs', 614, 318, 'catalog · orders · promotions'] ] },

    { id: 'support', plane: 'people', band: 'band-people', x: 1080, y: 252, w: 300, h: 80, r: 10,
      name: 'Support agents', about: 'Shoply staff resolving customer issues through the admin console.',
      texts: [ ['bl', 1104, 280, 'Support agents'], ['bs', 1104, 302, 'refunds · disputes'], ['bs', 1104, 318, 'customer lookups'] ] },

    // ---- product surfaces (Next.js)
    { id: 'storefront', plane: 'product', band: 'band-product', x: 200, y: 500, w: 340, h: 88, r: 10,
      name: 'Storefront', about: 'The shopper-facing Next.js app — listing, product pages, cart and checkout.',
      texts: [ ['bl', 224, 528, 'Storefront'], ['bs', 224, 550, 'PLP · PDP · cart · checkout'], ['bs', 224, 566, 'talks to catalog · pricing · orders'] ] },

    { id: 'dashboard', plane: 'product', band: 'band-product', x: 590, y: 500, w: 440, h: 88, r: 10,
      name: 'Merchant Dashboard', about: 'Where merchants run their store — and where the analytics feedback loop lands.',
      texts: [ ['bl', 614, 528, 'Merchant Dashboard'], ['bs', 614, 550, 'catalog mgmt · orders · promotions'], ['bs', 614, 566, 'sales dashboard — fed by analytics'] ] },

    { id: 'admin', plane: 'product', band: 'band-product', x: 1080, y: 500, w: 300, h: 88, r: 10,
      name: 'Admin Console', about: 'Internal support tooling — refunds, overrides, and customer lookups.',
      texts: [ ['bl', 1104, 528, 'Admin Console'], ['bs', 1104, 550, 'support tooling'], ['bs', 1104, 566, 'refunds · order overrides'] ] },

    // ---- core domain services
    { id: 'catalog', plane: 'domain', band: 'band-domain', x: 200, y: 770, w: 340, h: 110, r: 10,
      dash: true,
      name: 'Catalog', about: 'Owns products, variants and inventory pointers — the source every surface reads.',
      texts: [ ['bl', 224, 798, 'Catalog'],
               ['bs', 224, 820, 'products · variants · categories'],
               ['bs', 224, 836, 'inventory pointers per SKU'],
               ['bn', 224, 858, 'Postgres-backed · search index fed by events'] ] },

    { id: 'orchestrator', plane: 'domain', band: 'band-domain', x: 590, y: 770, w: 440, h: 110, r: 10,
      dash: true,
      name: 'Order Orchestrator', about: 'Runs checkout as a saga — cart, payment, fulfilment — with compensations on failure.',
      texts: [ ['bl', 614, 798, 'Order Orchestrator'],
               ['bs', 614, 820, 'saga-based checkout: cart → payment → fulfilment'],
               ['bs', 614, 836, 'compensating steps on failure · idempotent retries'],
               ['bn', 614, 858, 'every state change published to Kafka'] ] },

    { id: 'pricing', plane: 'domain', band: 'band-domain', x: 1080, y: 770, w: 300, h: 110, r: 10,
      dash: true,
      name: 'Pricing Engine', about: 'Computes the price of anything — promotions, tax and currency in one place.',
      texts: [ ['bl', 1104, 798, 'Pricing Engine'],
               ['bs', 1104, 820, 'promotions · discounts'],
               ['bs', 1104, 836, 'tax · currency conversion'],
               ['bn', 1104, 858, 'quoted on every cart view'] ] },

    // ---- platform services · search
    { id: 'algolia', plane: 'search', band: 'band-platform', x: 200, y: 1080, w: 340, h: 68, r: 10,
      name: 'Algolia', about: 'Swappable vendor — hosted search and discovery.',
      texts: [ ['bl', 224, 1108, 'Algolia'], ['bs', 224, 1130, 'hosted search & discovery'] ] },

    { id: 'searchsvc', plane: 'search', band: 'band-platform', x: 200, y: 1180, w: 340, h: 104, r: 10,
      dash: true,
      name: 'SearchService', about: 'Ours. Indexes the catalog into Algolia and serves every product query.',
      texts: [ ['bl', 224, 1206, 'SearchService'],
               ['bs', 224, 1228, 'index the catalog · serve queries'],
               ['bs', 224, 1244, 'facets · typo-tolerance · ranking'],
               ['bn', 224, 1266, 'eventually consistent — fed by Kafka'] ] },

    // ---- platform services · payments
    { id: 'stripe-adyen', plane: 'payments', band: 'band-platform', x: 640, y: 1080, w: 340, h: 68, r: 10,
      name: 'Stripe · Adyen', about: 'Swappable vendors — card processing and payouts.',
      texts: [ ['bl', 664, 1108, 'Stripe · Adyen'], ['bs', 664, 1130, 'card processing · payouts'] ] },

    { id: 'paygw', plane: 'payments', band: 'band-platform', x: 640, y: 1180, w: 340, h: 104, r: 10,
      dash: true,
      name: 'PaymentGateway', about: 'Ours. One payment interface over Stripe and Adyen — card data never touches our services.',
      texts: [ ['bl', 664, 1206, 'PaymentGateway'],
               ['bs', 664, 1228, 'authorize · capture · refund'],
               ['bs', 664, 1244, 'vendor webhooks → saga steps'],
               ['bn', 664, 1266, 'card data never touches our services'] ] },

    // ---- platform services · notifications
    { id: 'sendgrid-twilio', plane: 'notify', band: 'band-platform', x: 1060, y: 1080, w: 320, h: 68, r: 10,
      name: 'SendGrid · Twilio', about: 'Swappable vendors — email and SMS delivery.',
      texts: [ ['bl', 1084, 1108, 'SendGrid · Twilio'], ['bs', 1084, 1130, 'email & SMS delivery'] ] },

    { id: 'notifier', plane: 'notify', band: 'band-platform', x: 1060, y: 1180, w: 320, h: 104, r: 10,
      dash: true,
      name: 'Notifier', about: 'Ours. Templated email and SMS, driven by order events — checkout never waits on it.',
      texts: [ ['bl', 1084, 1206, 'Notifier'],
               ['bs', 1084, 1228, 'templated email · SMS'],
               ['bs', 1084, 1244, 'receipts · shipping updates'],
               ['bn', 1084, 1266, 'driven by events, not direct calls'] ] },

    // ---- infrastructure
    { id: 'redis', plane: 'infra', band: 'band-infra', x: 200, y: 1470, w: 340, h: 88, r: 10,
      name: 'Redis', about: 'Carts and sessions — the hot state the orchestrator reads at checkout.',
      texts: [ ['bl', 224, 1498, 'Redis'], ['bs', 224, 1520, 'carts · sessions'], ['bs', 224, 1536, 'read by storefront & checkout'] ] },

    { id: 'postgres', plane: 'infra', band: 'band-infra', x: 640, y: 1470, w: 340, h: 88, r: 10,
      name: 'Postgres', about: 'The system of record for orders and the catalog.',
      texts: [ ['bl', 664, 1498, 'Postgres'], ['bs', 664, 1520, 'orders · catalog'], ['bs', 664, 1536, 'system of record'] ] },

    { id: 'k8s', plane: 'infra', band: 'band-infra', x: 1060, y: 1470, w: 320, h: 88, r: 10,
      name: 'Kubernetes', about: 'Every Shoply service runs here — deploys, scaling, self-healing.',
      texts: [ ['bl', 1084, 1498, 'Kubernetes'], ['bs', 1084, 1520, 'every service runs here'], ['bs', 1084, 1536, 'deploys · scaling'] ] },

    { id: 'kafka', plane: 'infra', band: 'band-infra', x: 200, y: 1584, w: 1180, h: 84, r: 10,
      name: 'Kafka — event bus', about: 'The event backbone: every order state change and catalog update fans out to independent consumers.',
      texts: [ ['bl', 224, 1612, 'Kafka — event bus'],
               ['bs', 224, 1634, 'every order state change & catalog update lands here — fan-out: search indexing · notifications · analytics'],
               ['bn', 224, 1654, 'consumers are independent — checkout never waits on email or reindexing'] ] },

    { id: 'analytics', plane: 'infra', band: 'band-infra', x: 200, y: 1694, w: 1180, h: 84, r: 10,
      dash: true,
      name: 'Analytics Pipeline', about: 'Ours. Turns the order event stream into the sales metrics merchants act on — the feedback loop.',
      texts: [ ['bl', 224, 1722, 'Analytics Pipeline'],
               ['bs', 224, 1744, 'consumes every order event → sales · conversion · inventory metrics'],
               ['bn', 224, 1764, 'feeds the sales dashboard merchants see — the feedback loop'] ] }
  ];

  // --- edges ----------------------------------------------------------------
  // pts: polyline in world space, arrowhead at the last point.
  const EDGES = [
    // people → surfaces (aligned columns, straight drops)
    { from: 'shoppers', to: 'storefront', pts: [[370,332],[370,494]],
      label: { s: 'al', x: 384, y: 420, t: 'browse · cart · checkout' } },

    { from: 'merchants', to: 'dashboard', pts: [[810,332],[810,494]],
      label: { s: 'al', x: 824, y: 420, t: 'manage store · read sales' } },

    { from: 'support', to: 'admin', pts: [[1230,332],[1230,494]],
      label: { s: 'al', x: 1244, y: 420, t: 'assist · refund' } },

    // surfaces → domain
    { from: 'storefront', to: 'catalog', pts: [[370,588],[370,764]],
      label: { s: 'al', x: 384, y: 688, t: 'products · stock' } },

    { from: 'storefront', to: 'orchestrator', pts: [[520,588],[520,660],[640,660],[640,764]],
      label: { s: 'al', x: 536, y: 652, t: 'checkout' } },

    { from: 'dashboard', to: 'orchestrator', pts: [[810,588],[810,764]],
      label: { s: 'al', x: 824, y: 688, t: 'orders · fulfilment' } },

    { from: 'admin', to: 'orchestrator', pts: [[1150,588],[1150,680],[950,680],[950,764]],
      label: { s: 'al', x: 966, y: 672, t: 'refunds · overrides' } },

    // domain internals
    { from: 'orchestrator', to: 'pricing', pts: [[1032,825],[1074,825]],
      label: { s: 'al', x: 1053, y: 813, t: 'quote', anchor: 'center' } },

    // orchestrator → payments column (stops at the platform band border)
    { from: 'orchestrator', to: 'paygw', pts: [[810,880],[810,994]],
      label: { s: 'al', x: 824, y: 952, t: 'authorize · capture' } },

    // owned abstraction → vendor, inside each column
    { from: 'searchsvc', to: 'algolia',        pts: [[370,1176],[370,1152]] },
    { from: 'paygw', to: 'stripe-adyen',        pts: [[810,1176],[810,1152]],
      label: { s: 'al', x: 824, y: 1170, t: 'tokens only' } },
    { from: 'notifier', to: 'sendgrid-twilio',  pts: [[1220,1176],[1220,1152]] },

    // domain → infra (through the column gaps)
    { from: 'orchestrator', to: 'kafka', pts: [[630,880],[630,1580]],
      label: { s: 'al', x: 644, y: 1364, t: 'every order state change' } },

    { from: 'orchestrator', to: 'postgres', pts: [[1000,880],[1000,1370],[900,1370],[900,1464]],
      label: { s: 'al', x: 1014, y: 952, t: 'orders — system of record' } },

    // kafka fan-out, up into the platform columns and down into analytics
    { from: 'kafka', to: 'searchsvc', pts: [[565,1580],[565,1232],[546,1232]],
      label: { s: 'al', x: 551, y: 1424, t: 'reindex', rot: -90, anchor: 'center' } },

    { from: 'kafka', to: 'notifier', pts: [[1035,1580],[1035,1232],[1054,1232]],
      label: { s: 'al', x: 1021, y: 1424, t: 'order events', rot: -90, anchor: 'center' } },

    { from: 'kafka', to: 'analytics', pts: [[790,1668],[790,1688]] },

    // long cross-cutting flows in the gutters
    { from: 'storefront', to: 'searchsvc', pts: [[198,528],[116,528],[116,1232],[194,1232]],
      label: { s: 'al', x: 100, y: 880, t: 'product search — queries', rot: -90, anchor: 'center' } },

    { from: 'analytics', to: 'dashboard', pts: [[198,1736],[84,1736],[84,560],[154,560]],
      label: { s: 'al', x: 68, y: 1148, t: 'sales metrics → merchant dashboard — the feedback loop', rot: -90, anchor: 'center' } },

    { from: 'notifier', to: 'band-people', pts: [[1382,1232],[1436,1232],[1436,292],[1424,292]],
      label: { s: 'al', x: 1452, y: 762, t: 'email · SMS — receipts · shipping updates', rot: -90, anchor: 'center' } }
  ];

  // --- free-floating text & legend swatches ---------------------------------
  const TEXTS = [
    { s: 'title', x: 160, y: 86,  t: 'Shoply — platform architecture' },
    { s: 'sub',   x: 160, y: 118, t: 'An e-commerce platform: browse → price → checkout → fulfil — every order event fans out on Kafka' },
    { s: 'tag',   x: 160, y: 146, runs: [
        { t: 'Storefront',        fill: C.sky },
        { t: ' → checkout via ',  fill: '#4A5462' },
        { t: 'Order Orchestrator', fill: '#A78BFA' },
        { t: ' → pays through ',  fill: '#4A5462' },
        { t: 'PaymentGateway',    fill: C.rose },
        { t: ' · events fan out on ', fill: '#4A5462' },
        { t: 'Kafka',             fill: C.orange } ] },

    { s: 'legend', x: 1082, y: 86,  t: 'dashed — an abstraction we own' },
    { s: 'legend', x: 1082, y: 110, t: 'solid — swappable vendors & app surfaces' },
    { s: 'legend', x: 1143, y: 134, t: 'colour — the plane it belongs to' },

    // column labels inside the neutral platform band
    { s: 'plane', x: 370,  y: 1064, t: 'SEARCH',        anchor: 'center', fill: planeColor('search') },
    { s: 'plane', x: 810,  y: 1064, t: 'PAYMENTS',      anchor: 'center', fill: planeColor('payments') },
    { s: 'plane', x: 1220, y: 1064, t: 'NOTIFICATIONS', anchor: 'center', fill: planeColor('notify') },

    { s: 'bn', x: 160, y: 1894, t: 'invariant: card data never touches our services — PaymentGateway exchanges tokens with Stripe & Adyen' },
    { s: 'bn', x: 160, y: 1914, t: 'every vendor sits behind an owned abstraction — PaymentGateway · SearchService · Notifier — swap Stripe for Adyen without touching checkout' },
    { s: 'bn', x: 160, y: 1934, t: 'the feedback loop: order events → Kafka → analytics pipeline → the sales dashboard merchants act on' }
  ];

  const SWATCHES = [
    { x: 1046, y: 75,  w: 26, h: 13, stroke: '#8B93A1',   alpha: 0.8, dash: true },
    { x: 1046, y: 99,  w: 26, h: 13, stroke: C.boxStroke, alpha: 1, fill: C.boxFill }
  ];

  // Plane colour key — one chip per plane, in pipeline order.
  const CHIPS = ['people', 'product', 'domain', 'search', 'payments', 'notify', 'infra']
    .map((id, i) => ({ x: 1046 + i * 13, y: 123, w: 9, h: 13, fill: planeColor(id) }));
