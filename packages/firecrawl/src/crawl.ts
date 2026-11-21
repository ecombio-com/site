import Firecrawl from '@mendable/firecrawl-js';

const url = process.argv[2];
if (!url) throw new Error('Usage: pnpm --filter @site/firecrawl run crawl <url>');

const app = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
const doc = await app.scrape(url, { formats: ['markdown'] });
console.log(doc.markdown);