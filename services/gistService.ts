import { SyncData } from '../types';

const GIST_FILENAME = 'emyn_reader_data.json';
const GIST_DESCRIPTION = 'Emyn Reader Sync Data (Do not edit manually)';

export const createGist = async (token: string, data: SyncData): Promise<string> => {
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data, null, 2)
        }
      }
    })
  });

  if (!response.ok) throw new Error('Failed to create Gist');
  const json = await response.json();
  return json.id;
};

export const updateGist = async (token: string, gistId: string, data: SyncData): Promise<void> => {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data, null, 2)
        }
      }
    })
  });

  if (!response.ok) throw new Error('Failed to update Gist');
};

export const loadGist = async (token: string, gistId: string): Promise<SyncData> => {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      'Authorization': `token ${token}`,
    }
  });

  if (!response.ok) throw new Error('Failed to load Gist');
  const json = await response.json();
  
  const file = json.files[GIST_FILENAME];
  if (!file || !file.content) throw new Error('Invalid Gist format');

  return JSON.parse(file.content);
};