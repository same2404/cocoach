// Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.


const API_SECRET = import.meta.env.VITE_API_SECRET || '';

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-API-Key': API_SECRET,
      'Content-Type': 'application/json',
    },
  });
}

export async function apiFetchFormData(url: string, formData: FormData): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'X-API-Key': API_SECRET,
    },
    body: formData,
  });
}
