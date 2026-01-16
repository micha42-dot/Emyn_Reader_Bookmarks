export const INITIAL_FEEDS = [
  'https://www.theverge.com/rss/index.xml',
  'https://techcrunch.com/feed/',
  'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
  'https://wired.com/feed/rss'
];

export const INITIAL_FOLDERS = [
  {
    id: 'tech-news',
    name: 'Tech News',
    feedUrls: [
      'https://www.theverge.com/rss/index.xml',
      'https://techcrunch.com/feed/',
      'https://wired.com/feed/rss'
    ],
    isExpanded: true
  },
  {
    id: 'newspapers',
    name: 'Newspapers',
    feedUrls: [
      'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml'
    ],
    isExpanded: false
  }
];

// Using a proxy that returns raw XML/Text content instead of pre-parsed JSON
export const CORS_PROXY = 'https://api.allorigins.win/raw?url=';