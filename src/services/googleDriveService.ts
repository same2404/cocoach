import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

let cachedDriveToken: string | null = null;

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly'
];

/**
 * Initiates Google OAuth Sign-in with Google Drive Scopes.
 * Caches access token in memory.
 */
export async function googleSignInDrive(): Promise<{ token: string; user: any }> {
  const provider = new GoogleAuthProvider();
  DRIVE_SCOPES.forEach(scope => provider.addScope(scope));

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Kein Access Token von Google OAuth erhalten.');
    }

    cachedDriveToken = credential.accessToken;
    return { token: cachedDriveToken, user: result.user };
  } catch (error: any) {
    if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
      console.error('Google Drive Auth Fehler:', error);
    }
    throw error;
  }
}

export function getCachedDriveToken(): string | null {
  return cachedDriveToken;
}

export function setCachedDriveToken(token: string | null) {
  cachedDriveToken = token;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
  size?: string;
}

/**
 * Lists files in Google Drive
 */
export async function listDriveFiles(token: string, qQuery?: string): Promise<DriveFile[]> {
  const queryParam = qQuery ? `&q=${encodeURIComponent(qQuery)}` : `&q=${encodeURIComponent("trashed = false")}`;
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,webViewLink,iconLink,createdTime,size)&pageSize=50${queryParam}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Laden der Google Drive Dateien.');
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Uploads text or JSON or file blob to Google Drive
 */
export async function uploadFileToDrive(
  token: string,
  fileName: string,
  mimeType: string,
  content: string | Blob,
  folderId?: string
): Promise<DriveFile> {
  const metadata: any = {
    name: fileName,
    mimeType: mimeType
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  
  if (typeof content === 'string') {
    formData.append('file', new Blob([content], { type: mimeType }));
  } else {
    formData.append('file', content);
  }

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Hochladen auf Google Drive.');
  }

  return await response.json();
}

/**
 * Creates a folder in Google Drive
 */
export async function createDriveFolder(token: string, folderName: string): Promise<DriveFile> {
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Erstellen des Ordners.');
  }

  return await response.json();
}

/**
 * Deletes a file in Google Drive.
 * MANDATORY: Always require user confirmation before calling this function!
 */
export async function deleteDriveFile(token: string, fileId: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok && response.status !== 204) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Löschen der Datei auf Google Drive.');
  }
}
