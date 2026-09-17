import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Plus,
  Search,
  Upload,
  RefreshCw,
  AlertTriangle,
  FolderPlus,
  CheckCircle2,
  HardDrive,
  FileSpreadsheet,
  FileCode,
  Download,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import {
  initDriveAuth,
  googleDriveSignIn,
  googleDriveLogout,
  listDriveFiles,
  uploadDriveFile,
  createDriveFolder,
  deleteDriveFile,
  getDriveAccessToken,
  DriveFile,
  DriveUser,
  exportLeadsToGoogleDrive,
  exportCodebaseToGoogleDrive
} from '../lib/drive';

interface GoogleDriveManagerProps {
  compact?: boolean;
  inquiries?: any[];
  propertyTitle?: string;
  onExportSuccess?: (file: DriveFile) => void;
}

export const GoogleDriveManager: React.FC<GoogleDriveManagerProps> = ({
  compact = false,
  inquiries = [],
  propertyTitle = 'All Properties',
  onExportSuccess
}) => {
  const [driveUser, setDriveUser] = useState<DriveUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileFilter, setFileFilter] = useState<'all' | 'documents' | 'folders' | 'images'>('all');

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Folder creation modal state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Delete Confirmation Modal state (MANDATORY per Workspace Integration skill)
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export Leads & Code state
  const [isExportingLeads, setIsExportingLeads] = useState(false);
  const [isExportingCode, setIsExportingCode] = useState(false);

  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (currentUser, accessToken) => {
        setDriveUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        fetchFiles();
      },
      () => {
        setDriveUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const result = await googleDriveSignIn();
      if (result) {
        setDriveUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        await fetchFiles();
      }
    } catch (err: any) {
      console.error('Drive authorization failed:', err);
      setError(err?.message || 'Failed to connect to Google Drive. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await googleDriveLogout();
    setDriveUser(null);
    setToken(null);
    setNeedsAuth(true);
    setFiles([]);
  };

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      let q = "trashed = false";
      if (fileFilter === 'folders') {
        q += " and mimeType = 'application/vnd.google-apps.folder'";
      } else if (fileFilter === 'documents') {
        q += " and mimeType != 'application/vnd.google-apps.folder' and (mimeType contains 'text' or mimeType contains 'document' or mimeType contains 'pdf' or mimeType contains 'sheet' or mimeType contains 'csv')";
      } else if (fileFilter === 'images') {
        q += " and mimeType contains 'image/'";
      }

      if (searchQuery.trim()) {
        q += ` and name contains '${searchQuery.trim().replace(/'/g, "\\'")}'`;
      }

      const driveFiles = await listDriveFiles(q, 40);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error('Fetch Drive files error:', err);
      setError(err?.message || 'Failed to load Google Drive files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!needsAuth) {
      fetchFiles();
    }
  }, [fileFilter]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);
    setUploadSuccessMsg(null);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await uploadDriveFile(file, file.name, file.type || 'application/octet-stream');
      }
      setUploadSuccessMsg(`Successfully uploaded ${selectedFiles.length} file(s) to Google Drive!`);
      await fetchFiles();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload file to Google Drive.');
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    setError(null);
    try {
      await createDriveFolder(newFolderName.trim());
      setNewFolderName('');
      setShowFolderModal(false);
      setUploadSuccessMsg(`Created folder "${newFolderName.trim()}" in Google Drive.`);
      await fetchFiles();
    } catch (err: any) {
      setError(err?.message || 'Failed to create folder.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Confirm and Execute File Deletion (MANDATORY per skill guidelines)
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteDriveFile(fileToDelete.id);
      setUploadSuccessMsg(`Deleted "${fileToDelete.name}" from Google Drive.`);
      setFileToDelete(null);
      await fetchFiles();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete file from Google Drive.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportLeads = async () => {
    if (!inquiries || inquiries.length === 0) {
      setError('No lead inquiries available to export.');
      return;
    }

    setIsExportingLeads(true);
    setError(null);
    try {
      const driveFile = await exportLeadsToGoogleDrive(inquiries, propertyTitle);
      setUploadSuccessMsg(`Exported ${inquiries.length} leads to Google Drive as "${driveFile.name}"!`);
      if (onExportSuccess) onExportSuccess(driveFile);
      await fetchFiles();
    } catch (err: any) {
      setError(err?.message || 'Failed to export leads to Google Drive.');
    } finally {
      setIsExportingLeads(false);
    }
  };

  const handleExportCode = async () => {
    setIsExportingCode(true);
    setError(null);
    try {
      const driveFile = await exportCodebaseToGoogleDrive();
      setUploadSuccessMsg(`Stored application codebase archive in Google Drive as "${driveFile.name}"!`);
      await fetchFiles();
    } catch (err: any) {
      setError(err?.message || 'Failed to store code in Google Drive.');
    } finally {
      setIsExportingCode(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('folder')) return <Folder className="w-5 h-5 text-amber-500 fill-amber-100" />;
    if (mimeType.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (mimeType.includes('csv') || mimeType.includes('sheet') || mimeType.includes('excel'))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document'))
      return <FileText className="w-5 h-5 text-red-500" />;
    return <FileCode className="w-5 h-5 text-stone-500" />;
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return 'N/A';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return 'N/A';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Sign-In Screen when OAuth / Drive access is required
  if (needsAuth) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <HardDrive className="w-7 h-7 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-1">Google Drive Integration</h3>
        <p className="text-sm text-stone-600 max-w-md mx-auto mb-6">
          Connect your Google Drive account to backup property documents, export tenant lead records, and store codebase archives. Scoped strictly to app-created files (<code className="text-xs bg-stone-100 px-1 py-0.5 rounded text-emerald-700">drive.file</code>).
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Standalone Google OAuth Consent Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="group relative inline-flex items-center justify-center px-5 py-3 border border-stone-300 rounded-xl text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <div className="mr-3 w-5 h-5 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </div>
            <span>{isSigningIn ? 'Connecting to Google...' : 'Connect Google Drive'}</span>
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center text-xs text-stone-500 gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Standalone OAuth 2.0 consent scoped only to files created by NestList</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="p-4 bg-stone-50/80 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-xs">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-stone-900">Google Drive Document Hub</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                Connected
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Account: <span className="font-medium text-stone-700">{driveUser?.email || 'Connected Drive Account'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCode}
            disabled={isExportingCode}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-stone-100 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            title="Store application code archive in Google Drive"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isExportingCode ? 'Storing Code...' : 'Store Code in Drive'}</span>
          </button>

          {inquiries && inquiries.length > 0 && (
            <button
              onClick={handleExportLeads}
              disabled={isExportingLeads}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingLeads ? 'Exporting...' : 'Export Leads'}</span>
            </button>
          )}

          <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>

          <button
            onClick={() => setShowFolderModal(true)}
            className="p-1.5 text-stone-600 hover:bg-stone-200/60 rounded-xl transition cursor-pointer"
            title="Create New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>

          <button
            onClick={fetchFiles}
            disabled={loading}
            className="p-1.5 text-stone-600 hover:bg-stone-200/60 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Refresh Google Drive"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleSignOut}
            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
            title="Disconnect Google Drive"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Uploading progress notification */}
      {isUploading && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-xs text-emerald-800 flex items-center space-x-2 animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          <span>Uploading file directly to your Google Drive account...</span>
        </div>
      )}

      {/* Success notification banner */}
      {uploadSuccessMsg && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>
          <button
            onClick={() => setUploadSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error notification banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-950 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 border-b border-stone-200 bg-white flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search files in Google Drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl text-xs">
          {(['all', 'documents', 'images', 'folders'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFileFilter(filter)}
              className={`px-2.5 py-1 rounded-lg capitalize font-medium transition cursor-pointer ${
                fileFilter === filter
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* File List / Grid */}
      <div className="p-4 min-h-[220px]">
        {loading ? (
          <div className="py-12 text-center text-stone-400 text-xs flex flex-col items-center">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
            <span>Syncing Google Drive files...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center text-stone-500 text-xs max-w-sm mx-auto">
            <HardDrive className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="font-semibold text-stone-700 mb-1">No matching files found</p>
            <p className="text-stone-400 mb-4">
              Your Google Drive files will appear here. Upload a file or export tenant lead reports to get started.
            </p>
            {inquiries && inquiries.length > 0 && (
              <button
                onClick={handleExportLeads}
                disabled={isExportingLeads}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Tenant Leads CSV</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-stone-100 border border-stone-100 rounded-xl overflow-hidden">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-3 bg-white hover:bg-stone-50/80 flex items-center justify-between gap-3 transition group"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="shrink-0">{getFileIcon(file.mimeType)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-900 truncate group-hover:text-emerald-700 transition">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-[10px] text-stone-400 mt-0.5">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleDateString()
                          : 'Recently'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      title="Open in Google Drive"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  {/* Trigger Delete Confirmation Modal */}
                  <button
                    onClick={() => setFileToDelete(file)}
                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Delete File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200">
            <h4 className="text-base font-bold text-stone-900 mb-1">New Google Drive Folder</h4>
            <p className="text-xs text-stone-500 mb-4">
              Enter a name for the new folder to create in your Google Drive.
            </p>
            <form onSubmit={handleCreateFolder}>
              <input
                type="text"
                placeholder="Folder Name (e.g., NestList Property Deeds)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 mb-4"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY Explicit User Confirmation Modal for Destructive Delete Action */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h4 className="text-base font-bold text-stone-900 mb-1">Delete File from Google Drive?</h4>
            <p className="text-xs text-stone-600 mb-4">
              Are you sure you want to permanently delete <strong className="text-stone-900">"{fileToDelete.name}"</strong> from your Google Drive? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
