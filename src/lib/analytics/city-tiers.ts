/**
 * City-tier classification (Module 25 Part 5/6 audit finding): NEITHER
 * `Order.shippingAddress` (a free-text JSON snapshot — see
 * src/lib/checkout/snapshot.ts's `AddressSnapshot.city`) NOR the `Address`
 * model has any tier/classification field. There is also no authoritative,
 * universally-agreed "Tier 1/2/3 Indian cities" government source — the
 * commonly-cited real-estate/HR/startup "Tier 1/2/3" convention is an
 * informal industry convention, not an official standard. The lists below
 * are THIS PROJECT'S OWN business-data assumption, built from that common
 * convention, not an authoritative or exhaustive source. They are
 * deliberately centralized here (never embedded in a UI component) so
 * they're easy to review/correct later without touching any query or
 * component code.
 *
 * Tier 3 in particular is explicitly NOT exhaustive — India has hundreds of
 * towns commonly considered "Tier 3", and hardcoding all of them here would
 * be exactly the kind of unfounded precision this module was told to avoid.
 * A handful of commonly-cited examples are listed for coverage, but any
 * city not found in ANY of the three lists below falls into "Unclassified"
 * — it is NEVER silently assumed to be Tier 3 just because it isn't Tier 1
 * or Tier 2 (Module 25 Part 6's explicit instruction).
 */

export type CityTier = "TIER_1" | "TIER_2" | "TIER_3" | "UNCLASSIFIED";

export const CITY_TIER_LABELS: Record<CityTier, string> = {
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
  UNCLASSIFIED: "Unclassified",
};

/** A few common alternate spellings/renamed cities, folded to one canonical key before lookup — otherwise "Bengaluru" and "Bangalore" would silently split into two rows. Not an exhaustive alias list. */
const CITY_ALIASES: Record<string, string> = {
  bengaluru: "bangalore",
  gurugram: "gurgaon",
  kochi: "cochin",
  mysuru: "mysore",
  "new delhi": "delhi",
  vizag: "visakhapatnam",
  bombay: "mumbai",
  calcutta: "kolkata",
  madras: "chennai",
  poona: "pune",
  baroda: "vadodara",
  trivandrum: "thiruvananthapuram",
};

// The 8 cities most consistently cited as Tier 1 across virtually every
// version of this informal convention.
const TIER_1_CITIES = ["mumbai", "delhi", "bangalore", "hyderabad", "chennai", "kolkata", "pune", "ahmedabad"];

// A commonly-cited (not official) Tier 2 list — major state capitals and
// large commercial cities.
const TIER_2_CITIES = [
  "jaipur", "lucknow", "kanpur", "nagpur", "indore", "bhopal", "patna", "vadodara",
  "coimbatore", "cochin", "chandigarh", "surat", "visakhapatnam", "nashik",
  "faridabad", "ghaziabad", "rajkot", "meerut", "varanasi", "amritsar",
  "jodhpur", "madurai", "raipur", "kota", "guwahati", "thiruvananthapuram",
  "mysore", "ranchi", "jabalpur", "gwalior", "dehradun", "noida", "gurgaon",
  "bhubaneswar", "salem", "warangal", "guntur", "amravati", "allahabad", "prayagraj",
];

// Illustrative examples only — NOT exhaustive. See file header.
const TIER_3_CITIES = [
  "shimla", "manali", "udaipur", "mangalore", "belgaum", "jalandhar", "dhanbad",
  "aurangabad", "solapur", "hubli", "tirupati", "rourkela", "siliguri",
  "durgapur", "bikaner", "ajmer", "jamshedpur", "bhavnagar", "kolhapur",
  "akola", "nellore", "ujjain", "jhansi", "bilaspur", "muzaffarpur",
];

function normalizeCityKey(rawCity: string): string {
  const trimmed = rawCity.trim().toLowerCase().replace(/\s+/g, " ");
  return CITY_ALIASES[trimmed] ?? trimmed;
}

const TIER_1_SET = new Set(TIER_1_CITIES);
const TIER_2_SET = new Set(TIER_2_CITIES);
const TIER_3_SET = new Set(TIER_3_CITIES);

export function classifyCity(rawCity: string | null | undefined): CityTier {
  if (!rawCity || !rawCity.trim()) return "UNCLASSIFIED";
  const key = normalizeCityKey(rawCity);
  if (TIER_1_SET.has(key)) return "TIER_1";
  if (TIER_2_SET.has(key)) return "TIER_2";
  if (TIER_3_SET.has(key)) return "TIER_3";
  return "UNCLASSIFIED";
}

/** Grouping key for the city-level breakdown table — same normalization as classification, so "Mumbai" and "mumbai " group into one row. */
export function cityGroupKey(rawCity: string | null | undefined): string {
  if (!rawCity || !rawCity.trim()) return "(no city)";
  return normalizeCityKey(rawCity);
}

/** Display label for a grouped city — Title Case of the normalized key, not the raw (possibly inconsistently-cased) input. */
export function cityDisplayLabel(groupKey: string): string {
  if (groupKey === "(no city)") return "(No city recorded)";
  return groupKey.replace(/\b\w/g, (c) => c.toUpperCase());
}
