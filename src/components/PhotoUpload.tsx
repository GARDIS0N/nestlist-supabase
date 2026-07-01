import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { uploadListingPhoto, deleteListingPhoto } from "../lib/storage";
import { Loader2, X, AlertCircle, RefreshCw } from "lucide-react";

interface PhotoUploadProps {
  propertyId: string;
  photos: string[];
  onChange: (urls: string[]) => void;
  maxPhotos?: number;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  error: boolean;
  file: File;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  propertyId,
  photos = [],
  onChange,
  maxPhotos = 8,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (selectedFiles: FileList) => {
    const spaceLeft = maxPhotos - photos.length - uploadingFiles.filter(f => !f.error).length;
    if (spaceLeft <= 0) {
      alert(`You can only upload up to ${maxPhotos} photos.`);
      return;
    }

    const filesToUpload = Array.from(selectedFiles).slice(0, spaceLeft);

    const newUploads = filesToUpload.map(file => ({
      id: Math.random().toString(36).substring(2),
      name: file.name,
      progress: 0,
      error: false,
      file,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    for (const upload of newUploads) {
      startUpload(upload);
    }
  };

  const startUpload = async (upload: UploadingFile) => {
    try {
      const url = await uploadListingPhoto(
        upload.file,
        propertyId,
        (progress) => {
          setUploadingFiles(prev =>
            prev.map(f => (f.id === upload.id ? { ...f, progress } : f))
          );
        }
      );

      // Successfully uploaded! Add to existing photos list
      onChange([...photos, url]);

      // Remove from uploading list
      setUploadingFiles(prev => prev.filter(f => f.id !== upload.id));
    } catch (err: any) {
      console.error("Failed to upload file:", upload.name, err);
      setUploadingFiles(prev =>
        prev.map(f => (f.id === upload.id ? { ...f, error: true, progress: 0 } : f))
      );
    }
  };

  const handleRetry = (id: string) => {
    const upload = uploadingFiles.find(f => f.id === id);
    if (!upload) return;

    setUploadingFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, error: false, progress: 0 } : f))
    );

    startUpload({ ...upload, error: false, progress: 0 });
  };

  const handleCancelUploading = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleRemovePhoto = async (index: number) => {
    const urlToRemove = photos[index];
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);

    // Delete from Supabase Storage (non-blocking)
    try {
      await deleteListingPhoto(urlToRemove);
    } catch (err) {
      console.error("Error deleting image from storage:", err);
    }
  };

  const onDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const totalActiveUploads = photos.length + uploadingFiles.filter(f => !f.error).length;

  return (
    <div className="space-y-6" id="photo-upload-container">
      {/* Upload zone */}
      {totalActiveUploads < maxPhotos && (
        <div
          onDragEnter={onDrag}
          onDragOver={onDrag}
          onDragLeave={onDrag}
          onDrop={onDrop}
          onClick={triggerFileSelect}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-green-500 bg-green-50"
              : "border-gray-300 hover:border-green-500 hover:bg-green-50"
          }`}
          id="photo-upload-zone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            multiple
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="hidden"
            id="photo-file-input"
          />
          <div className="text-4xl mb-3">📸</div>
          <p className="font-medium text-gray-800">Drop photos here or tap to select</p>
          <p className="text-sm text-gray-500 mt-1">JPG, PNG or WebP · Max 5MB each</p>
          <button
            type="button"
            className="mt-4 px-4 py-2 border border-green-600 text-green-700 text-sm font-semibold rounded-lg hover:bg-green-50 transition active:scale-[0.98]"
            id="choose-photos-btn"
          >
            Choose Photos
          </button>
        </div>
      )}

      {/* Upload List (errors/pending uploads) */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100" id="uploading-status-container">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Uploading Status</h4>
          <div className="space-y-2">
            {uploadingFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border ${
                  file.error ? "bg-red-50/50 border-red-200" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
                  {file.error ? (
                    <p className="text-[10px] font-semibold text-red-600 flex items-center mt-0.5">
                      <AlertCircle className="h-3 w-3 mr-1" /> Upload failed
                    </p>
                  ) : (
                    <div className="mt-1.5 flex items-center">
                      <div className="flex-1 bg-gray-150 h-1.5 rounded-full overflow-hidden mr-2">
                        <div
                          className="bg-green-600 h-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500">{file.progress}%</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  {file.error ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRetry(file.id)}
                        className="p-1.5 text-red-700 hover:bg-red-100 rounded-lg transition"
                        title="Retry upload"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelUploading(file.id)}
                        className="p-1.5 text-gray-400 hover:bg-gray-150 rounded-lg transition"
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <Loader2 className="h-4 w-4 text-green-700 animate-spin mr-1.5" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Grid (after upload) */}
      {photos.length > 0 && (
        <div className="space-y-2" id="photo-grid-container">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Uploaded Photos ({photos.length}/{maxPhotos})
            </span>
            <span className="text-[10px] text-gray-400 italic">Drag-and-drop handles the order. First image is always COVER.</span>
          </div>

          <div className="grid grid-cols-3 gap-2" id="uploaded-photos-grid">
            {photos.map((url, index) => {
              const isCover = index === 0;
              return (
                <div
                  key={url}
                  className={`relative rounded-lg overflow-hidden aspect-square border ${
                    isCover ? "col-span-2 row-span-2 border-green-500 shadow-md" : "border-gray-200"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Property photo ${index + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />

                  {/* Cover Badge */}
                  {isCover && (
                    <span className="absolute bottom-2 left-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                      COVER
                    </span>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 right-1 bg-white hover:bg-red-50 text-gray-800 hover:text-red-600 p-1 rounded-full shadow-md transition active:scale-95"
                    title="Remove Photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
