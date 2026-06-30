import React, { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface ImageUploaderProps {
  onImagesUploaded: (urls: string[]) => void;
  existingImages?: string[];
  maxImages?: number;
  propertyId?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesUploaded,
  existingImages = [],
  maxImages = 6,
  propertyId,
}) => {
  const { profile } = useAuth();
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPathFromUrl = (url: string): string | null => {
    const bucketToken = "App-files/";
    const idx = url.indexOf(bucketToken);
    if (idx !== -1) {
      return decodeURIComponent(url.substring(idx + bucketToken.length));
    }
    return null;
  };

  const handleUpload = async (files: FileList) => {
    if (!profile) return;
    if (uploadedUrls.length + files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images total.`);
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    const newUrls: string[] = [...uploadedUrls];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Strict file type validation: restrict to jpg, png, webp
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!allowedTypes.includes(file.type)) {
          alert("Only JPG, PNG, and WEBP image types are allowed.");
          continue;
        }
        
        // Strict file size validation: max 5MB
        if (file.size > 5 * 1024 * 1024) {
          alert("Image file size must be less than 5MB.");
          continue;
        }

        // Create a unique file path structure: user_id/filename with timestamp and sanitized filename
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const filePath = `${profile.id}/${Date.now()}-${sanitizedFileName}`;

        // Validate on the frontend that we are not uploading to another user's folder
        if (!filePath.startsWith(profile.id + "/")) {
          throw new Error("Invalid file path: path must reside in your own user folder.");
        }

        setUploadProgress(prev => Math.min(prev + 15, 85));

        // Upload to Supabase Storage bucket 'App-files'
        const { error: uploadError } = await supabase.storage
          .from("App-files")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Retrieve public URL
        const { data } = supabase.storage
          .from("App-files")
          .getPublicUrl(filePath);

        if (data?.publicUrl) {
          // Append a cache-busting query parameter to prevent CDN and browser caching issues
          const busterUrl = `${data.publicUrl}?t=${Date.now()}`;
          newUrls.push(busterUrl);
        }
      }

      setUploadProgress(100);
      setUploadedUrls(newUrls);
      onImagesUploaded(newUrls);
    } catch (error: any) {
      console.error("Storage upload failed:", error);
      alert(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files);
    }
    // Reset file input value to allow selecting and uploading the same file again
    if (e.target) {
      e.target.value = "";
    }
  };

  const removeImage = async (indexToRemove: number) => {
    if (!profile) return;
    const urlToRemove = uploadedUrls[indexToRemove];
    const filePath = getPathFromUrl(urlToRemove);

    if (filePath) {
      // Validate that the file belongs to the user on the frontend
      if (!filePath.startsWith(profile.id + "/")) {
        console.warn("Unauthorized delete attempt: path does not belong to user.");
        alert("You are not authorized to delete this file.");
        return;
      }

      try {
        const { error: deleteError } = await supabase.storage
          .from("App-files")
          .remove([filePath]);

        if (deleteError) {
          console.error("Storage delete failed:", deleteError.message);
        } else {
          console.log("Successfully removed file from storage:", filePath);
        }
      } catch (err) {
        console.error("Failed to delete file from storage:", err);
      }
    }

    const updated = uploadedUrls.filter((_, idx) => idx !== indexToRemove);
    setUploadedUrls(updated);
    onImagesUploaded(updated);

    // If a propertyId is being edited/saved, update its database record
    if (propertyId) {
      try {
        const { error: dbError } = await supabase
          .from("properties")
          .update({ images: updated })
          .eq("id", propertyId);

        if (dbError) {
          console.error("Failed to update database record for property images:", dbError.message);
        } else {
          console.log("Database record updated with new image list.");
        }
      } catch (err) {
        console.error("Error updating database record for property images:", err);
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-stone-700">Property Photos</label>
        <span className="text-xs text-stone-400 font-medium">
          {uploadedUrls.length}/{maxImages} uploaded (Under 5MB each)
        </span>
      </div>

      {/* Drag & Drop Zone */}
      {uploadedUrls.length < maxImages && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-8 px-4 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-amber-600 bg-amber-50/50"
              : "border-stone-300 hover:border-amber-500 hover:bg-stone-50"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*"
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
              <p className="text-sm font-medium text-stone-600">Uploading photos...</p>
              <div className="w-48 bg-stone-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-600 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 bg-amber-50 rounded-full text-amber-600 mb-3">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-stone-800">
                Drag and drop your images here, or <span className="text-amber-600">browse</span>
              </p>
              <p className="text-xs text-stone-400 mt-1">
                PNG, JPG or JPEG up to 6 photos
              </p>
            </>
          )}
        </div>
      )}

      {/* Uploaded Thumbnail Grid */}
      {uploadedUrls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {uploadedUrls.map((url, index) => (
            <div
              key={index}
              className="group relative aspect-square rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shadow-sm"
            >
              <img
                src={url}
                alt={`Property thumbnail ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 rounded-full bg-stone-900/80 hover:bg-red-600 text-white shadow-md opacity-90 transition-all"
                title="Delete photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {index === 0 && (
                <div className="absolute bottom-0 inset-x-0 bg-stone-900/70 text-[9px] font-bold text-amber-400 py-0.5 text-center tracking-wider uppercase">
                  Cover Photo
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
