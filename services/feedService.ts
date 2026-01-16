
import { Feed, Article } from '../types';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const feedCache = new Map<string, { timestamp: number; data: { feed: Feed; articles: Article[] } }>();

// Helper to normalize URLs consistently across the app
export const normalizeUrl = (url: string): string => {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = 'https://' + normalized;
    }
    // Remove trailing slash for consistency
    return normalized.replace(/\/$/, '');
};

// Helper to extract image from HTML content (description or content:encoded)
const extractImage = (html: string): string | undefined => {
  if (!html) return undefined;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.src : undefined;
};

// Helper to safely get text content from an XML element
const getElementText = (parent: Element, tag: string): string => {
  const element = parent.querySelector(tag);
  return element?.textContent?.trim() || '';
};

// Helper to get text from a specific namespace (e.g., content:encoded, dc:creator)
const getNamespacedElementText = (parent: Element, tagName: string): string => {
  // Try standard selector first
  let el = parent.getElementsByTagName(tagName)[0];
  if (!el && tagName.includes(':')) {
     // Fallback for browsers/parsers that handle namespaces differently
     const parts = tagName.split(':');
     el = parent.getElementsByTagNameNS('*', parts[1])[0];
  }
  return el?.textContent?.trim() || '';
};

// Polyfill for Promise.any behavior
const promiseAny = <T>(promises: Promise<T>[]): Promise<T> => {
  return new Promise((resolve, reject) => {
    let errors: any[] = [];
    let rejectedCount = 0;
    
    if (promises.length === 0) {
      reject(new Error("No promises passed"));
      return;
    }

    promises.forEach((p, index) => {
      Promise.resolve(p)
        .then(val => resolve(val))
        .catch(err => {
          errors[index] = err;
          rejectedCount++;
          if (rejectedCount === promises.length) {
            reject(new Error("All promises rejected"));
          }
        });
    });
  });
};

// --- STRATEGY 1: Server-Side Parsing (Fast Lane) ---
const fetchViaJsonApi = async (url: string): Promise<{ feed: Feed; articles: Article[] }> => {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('RSS2JSON failed');
    const data = await response.json();
    if (data.status !== 'ok') throw new Error('RSS2JSON status error');

    // Use normalized URL for consistency
    const cleanUrl = normalizeUrl(url);

    const feed: Feed = {
        url: cleanUrl,
        title: data.feed.title,
        link: data.feed.link,
        author: data.feed.author || '',
        description: data.feed.description,
        image: data.feed.image || ''
    };

    const articles: Article[] = data.items.map((item: any) => {
        // RSS2JSON often puts the full content in 'content' or 'description'
        const contentVal = item.content || item.description || '';
        const thumb = item.thumbnail || item.enclosure?.link || extractImage(contentVal) || '';
        
        return {
            guid: item.guid || item.link,
            title: item.title,
            pubDate: item.pubDate,
            link: item.link,
            author: item.author || feed.author,
            thumbnail: thumb,
            description: item.description || '',
            content: contentVal,
            feedTitle: feed.title,
            feedUrl: cleanUrl
        };
    });

    return { feed, articles };
};

// --- STRATEGY 2: Client-Side XML Parsing (Fallback) ---
const fetchViaXmlProxies = async (url: string): Promise<{ feed: Feed; articles: Article[] }> => {
    const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    const fetchWithTimeout = async (proxyUrl: string, timeout = 6000): Promise<string> => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(id);
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const text = await response.text();
            if (!text || text.trim().length === 0) throw new Error('Empty response');
            return text;
        } catch (e) {
            clearTimeout(id);
            throw e;
        }
    };

    let text: string;
    try {
        text = await promiseAny(proxies.map(p => fetchWithTimeout(p)));
    } catch (aggregateError) {
        throw new Error("All proxies failed");
    }

    const parser = new DOMParser();
    let xml = parser.parseFromString(text, "text/xml");
    
    const errorNode = xml.querySelector('parsererror');
    const isHtml = text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().toLowerCase().startsWith('<html');

    if (errorNode || isHtml) {
        // Simple heuristic for HTML redirect, very basic
        throw new Error("Received HTML instead of XML");
    }

    // Use normalized URL
    const cleanUrl = normalizeUrl(url);

    let feed: Feed;
    let articles: Article[] = [];
    const isAtom = xml.documentElement.tagName.toLowerCase() === 'feed';

    if (isAtom) {
      const title = getElementText(xml.documentElement, 'title');
      const subtitle = getElementText(xml.documentElement, 'subtitle');
      const authorName = getElementText(xml.documentElement, 'name');
      const links = Array.from(xml.querySelectorAll('feed > link'));
      const htmlLink = links.find(l => l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel'))?.getAttribute('href') || '';
      const icon = getElementText(xml.documentElement, 'icon') || getElementText(xml.documentElement, 'logo');

      feed = { url: cleanUrl, title, description: subtitle, link: htmlLink, author: authorName, image: icon };

      const entries = Array.from(xml.querySelectorAll('entry'));
      articles = entries.map(entry => {
        const entryTitle = getElementText(entry, 'title');
        const entryId = getElementText(entry, 'id');
        const entryPublished = getElementText(entry, 'published') || getElementText(entry, 'updated');
        const entrySummary = getElementText(entry, 'summary');
        const entryContent = getElementText(entry, 'content');
        const entryLinks = Array.from(entry.querySelectorAll('link'));
        const entryLink = entryLinks.find(l => l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel'))?.getAttribute('href') || '';
        const entryAuthor = getElementText(entry, 'name');

        let thumbnail = "";
        const mediaContent = entry.getElementsByTagNameNS('*', 'content');
        if (mediaContent.length > 0) {
             for(let i=0; i<mediaContent.length; i++) {
                 const type = mediaContent[i].getAttribute('type') || '';
                 const medium = mediaContent[i].getAttribute('medium') || '';
                 if(type.startsWith('image') || medium === 'image') {
                     thumbnail = mediaContent[i].getAttribute('url') || '';
                     break;
                 }
             }
        }

        if (!thumbnail) {
            thumbnail = extractImage(entryContent) || extractImage(entrySummary) || "";
        }

        return {
          guid: entryId || entryLink,
          title: entryTitle,
          pubDate: entryPublished,
          link: entryLink,
          author: entryAuthor || feed.author,
          thumbnail,
          description: entrySummary || entryContent,
          content: entryContent || entrySummary,
          feedTitle: feed.title,
          feedUrl: cleanUrl
        };
      });

    } else {
      const channel = xml.querySelector('channel');
      if (!channel) throw new Error('Invalid RSS feed structure');
      const title = getElementText(channel, 'title');
      const description = getElementText(channel, 'description');
      const link = getElementText(channel, 'link');
      const imageElem = channel.querySelector('image');
      const image = imageElem ? getElementText(imageElem, 'url') : '';
      
      feed = { url: cleanUrl, title, description, link, author: '', image };

      const items = Array.from(channel.querySelectorAll('item'));
      articles = items.map(item => {
        const itemTitle = getElementText(item, 'title');
        const itemLink = getElementText(item, 'link');
        const itemGuid = getElementText(item, 'guid') || itemLink;
        const itemPubDate = getElementText(item, 'pubDate');
        const itemDescription = getElementText(item, 'description');
        const itemContent = getNamespacedElementText(item, 'content:encoded') || itemDescription;
        const itemAuthor = getNamespacedElementText(item, 'dc:creator');
        
        let thumbnail = "";
        const mediaContents = item.getElementsByTagNameNS('*', 'content');
        if (mediaContents.length === 0) {
             const mediaThumb = item.getElementsByTagNameNS('*', 'thumbnail')[0];
             if (mediaThumb) thumbnail = mediaThumb.getAttribute('url') || "";
        } else {
             for(let i=0; i<mediaContents.length; i++) {
                 const type = mediaContents[i].getAttribute('type') || '';
                 const medium = mediaContents[i].getAttribute('medium') || '';
                 if(type.startsWith('image') || medium === 'image') {
                     thumbnail = mediaContents[i].getAttribute('url') || '';
                     break;
                 }
             }
        }
        
        if (!thumbnail) {
            const enclosure = item.querySelector('enclosure');
            if (enclosure && enclosure.getAttribute('type')?.startsWith('image')) {
                thumbnail = enclosure.getAttribute('url') || "";
            }
        }

        if (!thumbnail) {
            thumbnail = extractImage(itemContent) || extractImage(itemDescription) || "";
        }

        return {
          guid: itemGuid,
          title: itemTitle,
          pubDate: itemPubDate,
          link: itemLink,
          author: itemAuthor,
          thumbnail,
          description: itemDescription,
          content: itemContent,
          feedTitle: feed.title,
          feedUrl: cleanUrl
        };
      });
    }

    return { feed, articles };
};


export const fetchFeed = async (inputUrl: string, forceRefresh = false): Promise<{ feed: Feed; articles: Article[] }> => {
  const url = normalizeUrl(inputUrl);

  // 1. Check Cache
  if (!forceRefresh && feedCache.has(url)) {
      const cached = feedCache.get(url)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
          return cached.data;
      } else {
          feedCache.delete(url);
      }
  }

  // 2. Race Strategies: Server-Side JSON (Fast) vs Client-Side XML (Reliable Fallback)
  // We use our custom promiseAny polyfill
  try {
      const result = await promiseAny([
          fetchViaJsonApi(url),
          fetchViaXmlProxies(url)
      ]);
      
      // Save to Cache
      feedCache.set(url, { timestamp: Date.now(), data: result });
      return result;

  } catch (error: any) {
      console.error(`Failed to fetch ${url}`, error);
      throw new Error(`Could not fetch RSS feed: ${url}`);
  }
};
