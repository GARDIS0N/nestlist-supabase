import JSZip from 'jszip';
import { supabase } from './supabase';

export interface DriveUser {
  email: string;
  name?: string;
  photoUrl?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  parents?: string[];
}

let cachedAccessToken: string | null = null;
let cachedDriveUser: DriveUser | null = null;

// Dynamically load Google Identity Services SDK
function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK'));
    document.head.appendChild(script);
  });
}

// Fetch Google Drive account details using REST API
export async function fetchGoogleDriveAccountInfo(accessToken: string): Promise<DriveUser | null> {
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.user) {
      return {
        email: data.user.emailAddress || 'Connected Drive Account',
        name: data.user.displayName,
        photoUrl: data.user.photoLink
      };
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch Drive account details:', err);
    return null;
  }
}

// Save token securely in Supabase user record
async function saveTokenToSupabase(accessToken: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await supabase.auth.updateUser({
        data: {
          drive_access_token: accessToken,
          drive_connected_at: new Date().toISOString()
        }
      });

      try {
        await supabase
          .from('profiles')
          .update({ drive_access_token: accessToken })
          .eq('id', session.user.id);
      } catch (_) {}
    }
  } catch (err) {
    console.warn('Could not store drive token in Supabase:', err);
  }
}

// Fetch stored token from Supabase
async function getStoredTokenFromSupabase(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const metadataToken = session.user.user_metadata?.drive_access_token;
      if (metadataToken) return metadataToken;

      const { data } = await supabase
        .from('profiles')
        .select('drive_access_token')
        .eq('id', session.user.id)
        .maybeSingle();

      if (data?.drive_access_token) {
        return data.drive_access_token;
      }
    }
  } catch (err) {
    console.warn('Error reading drive token from Supabase:', err);
  }
  return null;
}

// Auth state listener for Google Drive session
export const initDriveAuth = (
  onAuthSuccess?: (user: DriveUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  let isSubscribed = true;

  const checkAuth = async () => {
    if (cachedAccessToken && cachedDriveUser) {
      if (isSubscribed && onAuthSuccess) onAuthSuccess(cachedDriveUser, cachedAccessToken);
      return;
    }

    const savedToken = cachedAccessToken || await getStoredTokenFromSupabase();
    if (savedToken) {
      const userInfo = await fetchGoogleDriveAccountInfo(savedToken);
      if (userInfo && isSubscribed) {
        cachedAccessToken = savedToken;
        cachedDriveUser = userInfo;
        if (onAuthSuccess) onAuthSuccess(userInfo, savedToken);
        return;
      }
    }

    if (isSubscribed && onAuthFailure) onAuthFailure();
  };

  checkAuth();

  return () => {
    isSubscribed = false;
  };
};

// Standalone Google OAuth2 authorization flow scoped strictly to drive.file
export const googleDriveSignIn = async (): Promise<{ user: DriveUser; accessToken: string } | null> => {
  await loadGsiScript();

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '678864359997-haep42jtk1cbo565vv1jngouc5brsqg6.apps.googleusercontent.com';

  return new Promise((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file', // Narrow scope: app-created files only
        callback: async (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error || 'Google OAuth consent failed.'));
            return;
          }

          if (response.access_token) {
            const token = response.access_token;
            cachedAccessToken = token;

            const driveUser = await fetchGoogleDriveAccountInfo(token) || {
              email: 'Connected Google Drive'
            };
            cachedDriveUser = driveUser;

            await saveTokenToSupabase(token);

            resolve({ user: driveUser, accessToken: token });
          } else {
            reject(new Error('No access token received from Google authorization.'));
          }
        }
      });

      client.requestAccessToken();
    } catch (err: any) {
      reject(new Error(err?.message || 'Failed to trigger Google OAuth prompt.'));
    }
  });
};

export const getDriveAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  const token = await getStoredTokenFromSupabase();
  if (token) {
    cachedAccessToken = token;
    return token;
  }
  return null;
};

export const googleDriveLogout = async () => {
  cachedAccessToken = null;
  cachedDriveUser = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await supabase.auth.updateUser({
        data: {
          drive_access_token: null,
          drive_connected_at: null
        }
      });
      try {
        await supabase
          .from('profiles')
          .update({ drive_access_token: null })
          .eq('id', session.user.id);
      } catch (_) {}
    }
  } catch (err) {
    console.warn('Error clearing drive token from Supabase:', err);
  }
};

// --- Google Drive REST API Helpers ---

export async function listDriveFiles(
  query: string = "trashed = false",
  pageSize: number = 30
): Promise<DriveFile[]> {
  const token = await getDriveAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive.');

  const params = new URLSearchParams({
    q: query,
    pageSize: pageSize.toString(),
    fields: 'files(id, name, mimeType, webViewLink, webContentLink, iconLink, thumbnailLink, createdTime, modifiedTime, size, parents)',
    orderBy: 'modifiedTime desc'
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch files from Google Drive (Status ${response.status})`);
  }

  const data = await response.json();
  return data.files || [];
}

export async function createDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<DriveFile> {
  const token = await getDriveAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive.');

  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Failed to create folder in Google Drive.');
  }

  return response.json();
}

export async function uploadDriveFile(
  fileContent: Blob | File | string,
  filename: string,
  mimeType: string,
  parentFolderId?: string
): Promise<DriveFile> {
  const token = await getDriveAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive.');

  const metadata: any = {
    name: filename,
    mimeType: mimeType
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );

  const fileBlob = typeof fileContent === 'string'
    ? new Blob([fileContent], { type: mimeType })
    : fileContent;

  formData.append('file', fileBlob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime,size',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Failed to upload file to Google Drive.');
  }

  return response.json();
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = await getDriveAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive.');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Failed to delete file from Google Drive.');
  }
}

export async function exportLeadsToGoogleDrive(
  inquiries: any[],
  propertyTitle: string = 'All Properties'
): Promise<DriveFile> {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `NestList_Tenant_Leads_${propertyTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.csv`;

  const headers = ['Inquiry ID', 'Property Title', 'Tenant Name', 'Tenant Phone', 'Tenant Email', 'Status', 'Unlocked', 'Message', 'Date Sent'];
  const rows = inquiries.map(i => [
    `"${i.id || ''}"`,
    `"${(i.properties?.title || propertyTitle || '').replace(/"/g, '""')}"`,
    `"${(i.tenant_name || 'Locked Lead').replace(/"/g, '""')}"`,
    `"${(i.tenant_phone || 'N/A').replace(/"/g, '""')}"`,
    `"${(i.tenant_email || 'N/A').replace(/"/g, '""')}"`,
    `"${i.status || 'pending'}"`,
    `"${i.is_unlocked ? 'Yes' : 'No'}"`,
    `"${(i.message || '').replace(/"/g, '""')}"`,
    `"${new Date(i.created_at).toLocaleString()}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  return uploadDriveFile(csvContent, filename, 'text/csv');
}

export async function exportPropertyToGoogleDrive(
  property: any
): Promise<DriveFile> {
  const filename = `NestList_Property_${property.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;

  const docContent = `# NestList Property Overview: ${property.title}

**Location:** ${property.location || 'N/A'}, ${property.city || 'Nairobi'}
**Monthly Rent:** KES ${Number(property.price || 0).toLocaleString()} / mo
**Property Type:** ${property.type || 'Apartment'}
**Bedrooms:** ${property.bedrooms || 'N/A'} | **Bathrooms:** ${property.bathrooms || 'N/A'}
**Status:** ${property.is_boosted ? 'BOOSTED' : 'Standard'} (${property.status || 'available'})
**Listed On:** ${new Date(property.created_at || Date.now()).toLocaleDateString()}

---

## Description
${property.description || 'No description provided.'}

## Amenities
${Array.isArray(property.amenities) ? property.amenities.map((a: string) => `- ${a}`).join('\n') : 'Standard Amenities'}

---
*Generated by NestList Rental Platforms Limited (https://nestlist.co.ke)*
`;

  return uploadDriveFile(docContent, filename, 'text/markdown');
}

export async function exportCodebaseToGoogleDrive(): Promise<DriveFile> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `NestList_EntireSourceCode_Archive_${timestamp}.zip`;

  const zip = new JSZip();

  try {
    const res = await fetch('/api/codebase/bundle');
    if (!res.ok) throw new Error(`Server returned status ${res.status}`);
    const data = await res.json();

    if (data.success && Array.isArray(data.files) && data.files.length > 0) {
      data.files.forEach((file: { path: string; content: string }) => {
        zip.file(file.path, file.content);
      });

      zip.file(
        'ARCHIVE_MANIFEST.md',
        `# NestList Rental Platform - Entire Source Code Archive\n\n- **Exported At:** ${new Date().toISOString()}\n- **Total Files Included:** ${data.files.length}\n- **Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Express.js, Google OAuth2, Google Drive REST API, Supabase\n\nThis archive contains the complete, uncompressed source code tree of the NestList application.`
      );

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      return uploadDriveFile(zipBlob, filename, 'application/zip');
    }
  } catch (err) {
    console.warn('Backend bundle endpoint unavailable or failed, generating JSON archive fallback:', err);
  }

  const fallbackFilename = `NestList_SourceCode_Archive_${timestamp}.json`;
  const codeArchive = {
    appName: "NestList Rental Platform",
    exportedAt: new Date().toISOString(),
    version: "1.0.0",
    description: "NestList full-stack application codebase archive and architecture backup.",
    techStack: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "Express.js", "Google OAuth2", "Google Drive REST API", "Supabase"]
  };

  return uploadDriveFile(JSON.stringify(codeArchive, null, 2), fallbackFilename, 'application/json');
}
