// Product catalog dataset for Lumina Store
const PRODUCTS = [
  {
    id: 1,
    name: "Aura Studio Wireless ANC Headphones",
    tagline: "Lossless spatial audio with 40-hour battery life",
    category: "tech",
    categoryLabel: "Audio & Tech",
    price: 279,
    originalPrice: 349,
    rating: 4.9,
    reviewsCount: 342,
    badge: "Bestseller",
    badgeType: "accent",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80"
    ],
    colors: [
      { name: "Space Gray", hex: "#334155" },
      { name: "Matte Black", hex: "#0F172A" },
      { name: "Desert Sand", hex: "#D4A373" }
    ],
    description: "Crafted with aerospace-grade anodized aluminum and memory foam acoustic earcups. Features custom-tuned 40mm drivers and next-generation hybrid active noise cancellation for complete sonic immersion.",
    features: [
      "Hybrid Active Noise Cancellation with Transparency Mode",
      "Up to 40 hours battery on a single USB-C charge",
      "Multi-point Bluetooth 5.3 connection",
      "Custom EQ presets via Lumina Companion app"
    ],
    inStock: true,
    stockCount: 18,
    isFeatured: true
  },
  {
    id: 2,
    name: "Apex 75% Mechanical Wireless Keyboard",
    tagline: "Gasket-mounted hot-swap switches in CNC aluminum",
    category: "tech",
    categoryLabel: "Audio & Tech",
    price: 159,
    originalPrice: 189,
    rating: 4.8,
    reviewsCount: 215,
    badge: "Sale -16%",
    badgeType: "sale",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&auto=format&fit=crop&q=80"
    ],
    colors: [
      { name: "Charcoal Slate", hex: "#1E293B" },
      { name: "Arctic Chalk", hex: "#E2E8F0" },
      { name: "Sage Mist", hex: "#84A98C" }
    ],
    description: "Designed for tactile purists. The Apex features lubricated linear switches, sound-dampening silicone poron foam, and PBT dye-sublimated keycaps that resist shine over years of typing.",
    features: [
      "Hot-swappable 5-pin mechanical switch sockets",
      "Tri-mode connectivity: 2.4GHz dongle, Bluetooth 5.1 & Type-C",
      "Programmable multi-function rotary knob",
      "Custom south-facing RGB backlighting"
    ],
    inStock: true,
    stockCount: 9,
    isFeatured: true
  },
  {
    id: 3,
    name: "Ceramic Artisan Pour-Over Dripper Set",
    tagline: "Handcrafted matte ceramic brewer with olivewood stand",
    category: "home",
    categoryLabel: "Home & Living",
    price: 68,
    originalPrice: null,
    rating: 4.9,
    reviewsCount: 88,
    badge: "Handcrafted",
    badgeType: "neutral",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80"
    ],
    colors: [
      { name: "Raw Terracotta", hex: "#C86D51" },
      { name: "Basalt Black", hex: "#292F36" },
      { name: "Oatmeal Speckle", hex: "#D6CCC2" }
    ],
    description: "Engineered with spiral internal ribbing to regulate extraction rate and temperature stability. Hand-glazed by master ceramic artisans in Kyoto, finished with a sustainably sourced olivewood base.",
    features: [
      "High-fired durable stoneware clay",
      "Fits standard 02 cone filters",
      "Heat-retentive design for optimal coffee extraction",
      "Includes heat-resistant borosilicate glass carafe (600ml)"
    ],
    inStock: true,
    stockCount: 24,
    isFeatured: false
  },
  {
    id: 4,
    name: "Minimalist Chrono Sapphire Watch",
    tagline: "Japanese meca-quartz movement with Milanese mesh",
    category: "accessories",
    categoryLabel: "Accessories",
    price: 235,
    originalPrice: 295,
    rating: 4.9,
    reviewsCount: 154,
    badge: "Popular",
    badgeType: "accent",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80"
    ],
    colors: [
      { name: "Midnight Noir", hex: "#0F172A" },
      { name: "Brushed Steel", hex: "#94A3B8" },
      { name: "Rose Champagne", hex: "#D4AF37" }
    ],
    description: "An understated statement of precision. Encased in 316L surgical stainless steel with an anti-reflective scratch-proof sapphire crystal dial that withstands everyday wear effortlessly.",
    features: [
      "Japanese Seiko meca-quartz hybrid caliber",
      "5 ATM / 50 meters water resistance",
      "Quick-release interchangeable strap mechanism",
      "Super-LumiNova luminescence on dial hands"
    ],
    inStock: true,
    stockCount: 12,
    isFeatured: true
  },
  {
    id: 5,
    name: "Heavyweight Merino Wool Overshirt",
    tagline: "Thermally adaptive 380gsm New Zealand wool",
    category: "apparel",
    categoryLabel: "Apparel",
    price: 145,
    originalPrice: 175,
    rating: 4.7,
    reviewsCount: 92,
    badge: "Eco-Blend",
    badgeType: "eco",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&auto=format&fit=crop&q=80"
    ],
    colors: [
      { name: "Forest Moss", hex: "#3B5249" },
      { name: "Dark Heather", hex: "#4B5563" },
      { name: "Warm Camel", hex: "#C59B6C" }
    ],
    sizes: ["S", "M", "L", "XL"],
    description: "The ideal layer for transitional weather. Made from ethically sheared 100% merino wool that naturally repels odor, regulates body heat, and feels luxuriously soft against skin.",
    features: [
      "Natural water & odor resistant fibers",
      "Reinforced corozo nut buttons",
      "Two oversized chest patch utility pockets",
      "Pre-shrunk and tailored relaxed fit"
    ],
    inStock: true,
    stockCount: 15,
    isFeatured: true
  },
  {
    id: 6,
    name: "Aether Minimalist Smart Desk Lamp",
    tagline: "Circadian rhythm lighting with wireless fast-charging",
    category: "workspace",
    categoryLabel: "Workspace",
    price: 119,
    originalPrice: 149,
    rating: 4.8,
    reviewsCount: 178,
    badge: "Sale -20%",
    badgeType: "sale",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&auto=format&fit=crop&q=80"
    ],
    colors: [
      { name: "Anodized Black", hex: "#111827" },
      { name: "Moon White", hex: "#F3F4F6" },
      { name: "Champagne Silver", hex: "#CBD5E1" }
    ],
    description: "Designed to elevate focus and preserve eye health. Emits flicker-free CRI 95+ light that automatically synchronizes with the sun's natural color temperature throughout your workday.",
    features: [
      "95+ High Color Rendering Index (CRI)",
      "Integrated 15W Qi wireless fast charging base",
      "Smooth stepless touch dimming & color temperature dial",
      "Ultra-low standby power consumption"
    ],
    inStock: true,
    stockCount: 22,
    isFeatured: false
  },
  {
    id: 7,
    name: "Full-Grain Italian Leather Bi-Fold Wallet",
    tagline: "Hand-stitched vegetable tanned Tuscan calfskin",
    category: "accessories",
    categoryLabel: "Accessories",
    price: 75,
    originalPrice: null,
    rating: 4.9,
    reviewsCount: 310,
    badge: "Top Rated",
    badgeType: "accent",
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=800&auto=format&fit=crop&q=80"
    ],
    colors: [
      { name: "Vintage Cognac", hex: "#8B4513" },
      { name: "Espresso Brown", hex: "#3D2B1F" },
      { name: "Stealth Black", hex: "#1C1917" }
    ],
    description: "Minimalist exterior with ample utility. Cut from premium certified Tuscan vegetable-tanned leather that develops a rich, personalized patina with every year of use.",
    features: [
      "Holds 8-12 cards plus full-length cash compartment",
      "Embedded RFID protection shield",
      "Beveled and burnished edges sealed with natural beeswax",
      "Ultra-slim 9mm profile when folded"
    ],
    inStock: true,
    stockCount: 31,
    isFeatured: false
  },
  {
    id: 8,
    name: "Solid Walnut Ergonomic Monitor Stand",
    tagline: "Elevate your display with integrated cable management",
    category: "workspace",
    categoryLabel: "Workspace",
    price: 129,
    originalPrice: 155,
    rating: 4.8,
    reviewsCount: 164,
    badge: "Limited Stock",
    badgeType: "warn",
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80"
    ],
    colors: [
      { name: "American Walnut", hex: "#5C4033" },
      { name: "Nordic Ash", hex: "#D2B48C" }
    ],
    description: "Carved from a single board of sustainable Appalachian walnut wood. Raises your monitor by 4.2 inches to align directly with eye level, reducing cervical spine strain during long work sessions.",
    features: [
      "Weight capacity up to 60 lbs (accommodates dual displays)",
      "Cork-padded feet to protect desk surfaces",
      "Stores standard 104-key keyboards underneath",
      "Natural organic matte oil and wax finish"
    ],
    inStock: true,
    stockCount: 6,
    isFeatured: true
  },
  {
    id: 9,
    name: "Lumina Soundflow Acoustic Speaker",
    tagline: "360-degree room-filling acoustic fabric speaker",
    category: "tech",
    categoryLabel: "Audio & Tech",
    price: 185,
    originalPrice: 220,
    rating: 4.9,
    reviewsCount: 142,
    badge: "New",
    badgeType: "new",
    image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80"
    ],
    colors: [
      { name: "Slate Heather", hex: "#475569" },
      { name: "Nordic Cream", hex: "#EDE8F5" },
      { name: "Forest Olive", hex: "#40534C" }
    ],
    description: "Wrapped in Kvadrat recycled woolen acoustics textile. Employs dual passive radiators and a downward-firing woofer to deliver warm, chest-thumping bass and crystal clarity at any volume.",
    features: [
      "True 360-degree omnidirectional sound projection",
      "IPX6 water-resistant rating for indoor and patio use",
      "Stereo pairing: connect two units wirelessly",
      "24-hour continuous playback with battery saver mode"
    ],
    inStock: true,
    stockCount: 16,
    isFeatured: true
  },
  {
    id: 10,
    name: "Heavy Duty Waxed Canvas Everyday Tote",
    tagline: "Weatherproof 16oz cotton with bridle leather handles",
    category: "accessories",
    categoryLabel: "Accessories",
    price: 89,
    originalPrice: null,
    rating: 4.7,
    reviewsCount: 119,
    badge: "Essential",
    badgeType: "neutral",
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1574634534894-89d7576c8259?w=800&auto=format&fit=crop&q=80"
    ],
    colors: [
      { name: "Field Tan", hex: "#B89758" },
      { name: "Deep Navy", hex: "#1A2A3A" },
      { name: "Charcoal Olive", hex: "#434B3E" }
    ],
    description: "Built to endure decades of daily commutes, weekend markets, and travel. Treated with bees-and-paraffin wax for rugged water repellency and vintage crease character.",
    features: [
      "Dedicated padded sleeve for laptops up to 16 inches",
      "Solid copper hand-hammered rivets",
      "Two interior slip pockets + key clip leash",
      "Reinforced double-layered bottom panel"
    ],
    inStock: true,
    stockCount: 19,
    isFeatured: false
  },
  {
    id: 11,
    name: "Thermodynamic Double-Wall Insulated Flask",
    tagline: "Keeps beverages 24h ice cold or 12h steaming hot",
    category: "home",
    categoryLabel: "Home & Living",
    price: 44,
    originalPrice: 52,
    rating: 4.9,
    reviewsCount: 204,
    badge: "Sale",
    badgeType: "sale",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1570570626315-95c1b65e99be?w=800&auto=format&fit=crop&q=80"
    ],
    colors: [
      { name: "Matte Sage", hex: "#7E9F8E" },
      { name: "Desert Dune", hex: "#E3DAC9" },
      { name: "Onyx Black", hex: "#18181B" }
    ],
    description: "Pro-grade 18/8 food-safe stainless steel vacuum insulation eliminates condensation and prevents flavor retention. Designed with a wide ergonomic spout and leak-proof bamboo cap.",
    features: [
      "750ml / 25oz capacity fits automotive cupholders",
      "Zero BPA, phthalates, or chemical liners",
      "Durable powder-coated tactile grip",
      "Lifetime leakproof vacuum seal guarantee"
    ],
    inStock: true,
    stockCount: 40,
    isFeatured: false
  },
  {
    id: 12,
    name: "Pure Cashmere Ribbed Fisherman Beanie",
    tagline: "Grade-A Mongolian cashmere with snug foldover cuff",
    category: "apparel",
    categoryLabel: "Apparel",
    price: 65,
    originalPrice: 85,
    rating: 4.8,
    reviewsCount: 77,
    badge: "Warmth",
    badgeType: "accent",
    image: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&auto=format&fit=crop&q=80"
    ],
    colors: [
      { name: "Oatmeal Melange", hex: "#E6DFD5" },
      { name: "Smoky Charcoal", hex: "#374151" },
      { name: "Midnight Navy", hex: "#1E3A8A" }
    ],
    sizes: ["One Size"],
    description: "Unrivaled featherlight warmth without itchiness. Knitted with 2-ply 100% fine Mongolian cashmere yarn using a traditional 7-gauge fisherman rib stitch.",
    features: [
      "100% sustainably sourced circular cashmere",
      "Adjustable cuff depth for slouchy or fitted wear",
      "Natural breathability prevents overheating",
      "Comes in recycled cotton gift pouch"
    ],
    inStock: true,
    stockCount: 14,
    isFeatured: false
  }
];

const TESTIMONIALS = [
  {
    id: 1,
    author: "Elena Rostova",
    role: "Architectural Designer, NYC",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    rating: 5,
    date: "2 days ago",
    text: "The build quality of the Aura Headphones and Walnut Riser blew my expectations away. It's rare to find an online store where the physical product looks even more stunning in person than on screen.",
    product: "Aura Studio Headphones"
  },
  {
    id: 2,
    author: "Marcus Vance",
    role: "Software Engineer, San Francisco",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    rating: 5,
    date: "1 week ago",
    text: "The Apex keyboard is an absolute dream to type on. Fast shipping, plastic-free packaging, and incredible customer support. Lumina has become my go-to store for workspace essentials.",
    product: "Apex 75% Keyboard"
  },
  {
    id: 3,
    author: "Sophia Chen",
    role: "Creative Director, London",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
    rating: 5,
    date: "3 weeks ago",
    text: "Decent colors, impeccable materials, and timeless aesthetic. The ceramic pour-over set transformed my morning routine completely. You can feel the intention behind every curated item.",
    product: "Artisan Pour-Over Set"
  }
];

const PROMO_CODES = {
  "LUMINA20": { discountPercent: 20, description: "20% Flash Storewide Discount" },
  "WELCOME10": { discountFixed: 10, description: "$10 Welcome Credit on orders $50+" },
  "FREESHIP": { freeShipping: true, description: "Instant Free Express Shipping" }
};
