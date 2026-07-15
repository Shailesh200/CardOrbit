import type { IngestMerchantRemove, IngestMerchantUpsert } from '@cardwise/validation';

/** Minimum popularity score to keep in consumer catalog (M-028 ingest trim). */
export const POPULAR_MERCHANT_MIN_SCORE = 40;

export type PopularMerchantDef = {
  name: string;
  slug: string;
  primaryCategoryCode: string;
  website?: string;
  sourceUrl?: string;
  brandName?: string;
  parentBrand?: string;
  popularityScore: number;
  tags?: string[];
  aliases?: string[];
};

/** Flagship + high-traffic Indian merchants for recommendations. */
export const POPULAR_MERCHANTS: PopularMerchantDef[] = [
  {
    name: 'Amazon',
    slug: 'amazon',
    primaryCategoryCode: 'SHOP',
    website: 'https://www.amazon.in',
    sourceUrl: 'https://www.amazon.in',
    brandName: 'Amazon',
    parentBrand: 'Amazon.com Inc.',
    popularityScore: 100,
    tags: ['ecommerce', 'marketplace'],
    aliases: ['Amazon India', 'amazon in'],
  },
  {
    name: 'Flipkart',
    slug: 'flipkart',
    primaryCategoryCode: 'SHOP',
    website: 'https://www.flipkart.com',
    sourceUrl: 'https://www.flipkart.com',
    popularityScore: 98,
    tags: ['ecommerce'],
  },
  {
    name: 'Swiggy',
    slug: 'swiggy',
    primaryCategoryCode: 'DINING',
    website: 'https://www.swiggy.com',
    sourceUrl: 'https://www.swiggy.com',
    popularityScore: 95,
    tags: ['food-delivery'],
  },
  {
    name: 'Zomato',
    slug: 'zomato',
    primaryCategoryCode: 'DINING',
    website: 'https://www.zomato.com',
    sourceUrl: 'https://www.zomato.com',
    popularityScore: 94,
    tags: ['food-delivery'],
  },
  {
    name: 'IRCTC',
    slug: 'irctc',
    primaryCategoryCode: 'TRAVEL',
    website: 'https://www.irctc.co.in',
    sourceUrl: 'https://www.irctc.co.in',
    popularityScore: 92,
    tags: ['rail'],
  },
  {
    name: 'MakeMyTrip',
    slug: 'makemytrip',
    primaryCategoryCode: 'TRAVEL',
    website: 'https://www.makemytrip.com',
    sourceUrl: 'https://www.makemytrip.com',
    popularityScore: 90,
    tags: ['travel'],
  },
  {
    name: 'BigBasket',
    slug: 'bigbasket',
    primaryCategoryCode: 'GROCERY',
    website: 'https://www.bigbasket.com',
    sourceUrl: 'https://www.bigbasket.com',
    popularityScore: 88,
    tags: ['grocery'],
  },
  {
    name: 'Blinkit',
    slug: 'blinkit',
    primaryCategoryCode: 'GROCERY',
    website: 'https://blinkit.com',
    sourceUrl: 'https://blinkit.com',
    popularityScore: 87,
    tags: ['grocery', 'quick-commerce'],
  },
  {
    name: 'Myntra',
    slug: 'myntra',
    primaryCategoryCode: 'SHOP',
    website: 'https://www.myntra.com',
    sourceUrl: 'https://www.myntra.com',
    popularityScore: 86,
    tags: ['fashion'],
  },
  {
    name: 'Nykaa',
    slug: 'nykaa',
    primaryCategoryCode: 'SHOP',
    website: 'https://www.nykaa.com',
    sourceUrl: 'https://www.nykaa.com',
    popularityScore: 84,
    tags: ['beauty'],
  },
  {
    name: 'Reliance Jio',
    slug: 'reliance-jio',
    primaryCategoryCode: 'UTILITIES',
    website: 'https://www.jio.com',
    sourceUrl: 'https://www.jio.com',
    popularityScore: 83,
    tags: ['telecom'],
  },
  {
    name: 'Airtel',
    slug: 'airtel',
    primaryCategoryCode: 'UTILITIES',
    website: 'https://www.airtel.in',
    sourceUrl: 'https://www.airtel.in',
    popularityScore: 82,
    tags: ['telecom'],
  },
  {
    name: 'BookMyShow',
    slug: 'bookmyshow',
    primaryCategoryCode: 'ENTERTAINMENT',
    website: 'https://in.bookmyshow.com',
    sourceUrl: 'https://in.bookmyshow.com',
    popularityScore: 80,
    tags: ['entertainment'],
  },
  {
    name: 'Indian Oil',
    slug: 'indian-oil',
    primaryCategoryCode: 'FUEL',
    website: 'https://www.iocl.com',
    sourceUrl: 'https://www.iocl.com',
    popularityScore: 78,
    tags: ['fuel'],
  },
  {
    name: 'BPCL',
    slug: 'bpcl',
    primaryCategoryCode: 'FUEL',
    website: 'https://www.bharatpetroleum.in',
    sourceUrl: 'https://www.bharatpetroleum.in',
    popularityScore: 77,
    tags: ['fuel'],
  },
  {
    name: 'HPCL',
    slug: 'hpcl',
    primaryCategoryCode: 'FUEL',
    website: 'https://www.hindustanpetroleum.com',
    sourceUrl: 'https://www.hindustanpetroleum.com',
    popularityScore: 76,
    tags: ['fuel'],
  },
  {
    name: 'Shell',
    slug: 'shell',
    primaryCategoryCode: 'FUEL',
    website: 'https://www.shell.in',
    sourceUrl: 'https://www.shell.in',
    popularityScore: 75,
    tags: ['fuel'],
  },
  {
    name: 'DMart',
    slug: 'dmart',
    primaryCategoryCode: 'GROCERY',
    website: 'https://www.dmart.in',
    sourceUrl: 'https://www.dmart.in',
    popularityScore: 74,
    tags: ['grocery', 'retail'],
  },
  {
    name: 'Reliance Smart',
    slug: 'reliance-smart',
    primaryCategoryCode: 'GROCERY',
    website: 'https://www.relianceretail.com',
    sourceUrl: 'https://www.relianceretail.com',
    popularityScore: 73,
    tags: ['grocery'],
  },
  {
    name: 'Uber',
    slug: 'uber',
    primaryCategoryCode: 'TRAVEL',
    website: 'https://www.uber.com/in',
    sourceUrl: 'https://www.uber.com/in',
    popularityScore: 72,
    tags: ['mobility'],
  },
  {
    name: 'Ola',
    slug: 'ola',
    primaryCategoryCode: 'TRAVEL',
    website: 'https://www.olacabs.com',
    sourceUrl: 'https://www.olacabs.com',
    popularityScore: 71,
    tags: ['mobility'],
  },
  {
    name: 'IndiGo',
    slug: 'indigo',
    primaryCategoryCode: 'TRAVEL',
    website: 'https://www.goindigo.in',
    sourceUrl: 'https://www.goindigo.in',
    popularityScore: 70,
    tags: ['airlines'],
  },
  {
    name: 'Air India',
    slug: 'air-india',
    primaryCategoryCode: 'TRAVEL',
    website: 'https://www.airindia.com',
    sourceUrl: 'https://www.airindia.com',
    popularityScore: 69,
    tags: ['airlines'],
  },
  {
    name: 'Tata CLiQ',
    slug: 'tata-cliq',
    primaryCategoryCode: 'SHOP',
    website: 'https://www.tatacliq.com',
    sourceUrl: 'https://www.tatacliq.com',
    popularityScore: 68,
    tags: ['ecommerce'],
  },
  {
    name: 'Croma',
    slug: 'croma',
    primaryCategoryCode: 'SHOP',
    website: 'https://www.croma.com',
    sourceUrl: 'https://www.croma.com',
    popularityScore: 67,
    tags: ['electronics'],
  },
  {
    name: 'Apple Store India',
    slug: 'apple-store-india',
    primaryCategoryCode: 'SHOP',
    website: 'https://www.apple.com/in',
    sourceUrl: 'https://www.apple.com/in',
    popularityScore: 66,
    tags: ['electronics'],
  },
  {
    name: 'Netflix',
    slug: 'netflix',
    primaryCategoryCode: 'ENTERTAINMENT',
    website: 'https://www.netflix.com/in',
    sourceUrl: 'https://www.netflix.com/in',
    popularityScore: 65,
    tags: ['streaming'],
  },
  {
    name: 'Spotify',
    slug: 'spotify',
    primaryCategoryCode: 'ENTERTAINMENT',
    website: 'https://www.spotify.com/in',
    sourceUrl: 'https://www.spotify.com/in',
    popularityScore: 64,
    tags: ['streaming'],
  },
  {
    name: 'Apollo Pharmacy',
    slug: 'apollo-pharmacy',
    primaryCategoryCode: 'HEALTH',
    website: 'https://www.apollopharmacy.in',
    sourceUrl: 'https://www.apollopharmacy.in',
    popularityScore: 63,
    tags: ['pharmacy'],
  },
  {
    name: 'Practo',
    slug: 'practo',
    primaryCategoryCode: 'HEALTH',
    website: 'https://www.practo.com',
    sourceUrl: 'https://www.practo.com',
    popularityScore: 62,
    tags: ['healthcare'],
  },
];

export function toMerchantUpsertPayload(def: PopularMerchantDef): IngestMerchantUpsert {
  return {
    name: def.name,
    slug: def.slug,
    primaryCategoryCode: def.primaryCategoryCode,
    website: def.website ?? null,
    sourceUrl: def.sourceUrl ?? def.website ?? null,
    brandName: def.brandName ?? def.name,
    parentBrand: def.parentBrand ?? null,
    popularityScore: def.popularityScore,
    tags: def.tags ?? [],
    aliases: def.aliases ?? [`${def.name} India`],
    active: true,
  };
}

export function merchantRemovePayload(slug: string, reason?: string): IngestMerchantRemove {
  return { slug, reason: reason ?? 'Below popularity threshold for consumer catalog' };
}

export function popularMerchantSlugs(): Set<string> {
  return new Set(POPULAR_MERCHANTS.map((row) => row.slug));
}
