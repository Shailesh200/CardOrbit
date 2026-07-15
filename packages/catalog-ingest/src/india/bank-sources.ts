/** Official bank credit-card listing pages (India). */
export type BankSource = {
  slug: string;
  name: string;
  catalogUrl: string;
};

export const INDIA_BANK_SOURCES: BankSource[] = [
  {
    slug: 'hdfc',
    name: 'HDFC Bank',
    catalogUrl: 'https://www.hdfc.bank.in/credit-cards',
  },
  {
    slug: 'icici',
    name: 'ICICI Bank',
    catalogUrl: 'https://www.icicibank.com/personal-banking/cards/credit-card',
  },
  {
    slug: 'sbi',
    name: 'State Bank of India',
    catalogUrl: 'https://www.sbicard.com/en/personal/credit-cards.page',
  },
  {
    slug: 'axis',
    name: 'Axis Bank',
    catalogUrl: 'https://www.axisbank.com/retail/cards/credit-card',
  },
  {
    slug: 'kotak',
    name: 'Kotak Mahindra Bank',
    catalogUrl: 'https://www.kotak.com/en/personal-banking/cards/credit-cards.html',
  },
  {
    slug: 'yes-bank',
    name: 'Yes Bank',
    catalogUrl: 'https://www.yesbank.in/personal-banking/yes-individual/cards/credit-cards',
  },
  {
    slug: 'indusind',
    name: 'IndusInd Bank',
    catalogUrl: 'https://www.indusind.com/in/en/personal/cards/credit-card.html',
  },
  {
    slug: 'idfc-first',
    name: 'IDFC FIRST Bank',
    catalogUrl: 'https://www.idfcfirst.bank.in/credit-card',
  },
  {
    slug: 'bob',
    name: 'Bank of Baroda',
    catalogUrl: 'https://www.bobcard.co.in/credit-card-types',
  },
  {
    slug: 'pnb',
    name: 'Punjab National Bank',
    catalogUrl: 'https://www.pnbindia.in/Credit-Cards.html',
  },
  {
    slug: 'standard-chartered',
    name: 'Standard Chartered',
    catalogUrl: 'https://www.sc.com/in/credit-cards/',
  },
  {
    slug: 'citi',
    name: 'Citibank',
    catalogUrl: 'https://www.online.citibank.co.in/products-services/credit-cards',
  },
  {
    slug: 'rbl',
    name: 'RBL Bank',
    catalogUrl: 'https://www.rblbank.com/personal-banking/cards/credit-cards',
  },
  {
    slug: 'au',
    name: 'AU Small Finance Bank',
    catalogUrl: 'https://www.aubank.in/personal-banking/credit-cards',
  },
  {
    slug: 'hsbc',
    name: 'HSBC',
    catalogUrl: 'https://www.hsbc.co.in/credit-cards/',
  },
];

export function bankCatalogUrl(slug: string): string {
  const bank = INDIA_BANK_SOURCES.find((row) => row.slug === slug);
  if (!bank) throw new Error(`Unknown bank slug: ${slug}`);
  return bank.catalogUrl;
}
