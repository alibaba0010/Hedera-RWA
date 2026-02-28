import React, { FC, useState } from "react";
import { Label } from "../ui/label";
import { Upload, X } from "lucide-react";

// File Upload Component
interface FileUploaderProps {
  accept?: string;
  allowedExtensions?: string[];
  multiple?: boolean;
  onFilesChange?: (files: File[]) => void;
  inputId: string;
  label?: string;
  required?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  accept,
  allowedExtensions,
  multiple = false,
  onFilesChange,
  inputId,
  label,
  required = false,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>("");

  const validateFiles = (fileArray: File[]) => {
    if (!allowedExtensions || allowedExtensions.length === 0)
      return { valid: true, files: fileArray };
    const validFiles = fileArray.filter((file) =>
      allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
    if (validFiles.length !== fileArray.length) {
      return {
        valid: false,
        files: validFiles,
        error: `Only files of type: ${allowedExtensions.join(
          ", "
        )} are allowed.`,
      };
    }
    return { valid: true, files: validFiles };
  };

  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    let fileArray = Array.from(selectedFiles);
    if (!multiple) fileArray = fileArray.slice(0, 1);
    const validation = validateFiles(fileArray);
    if (!validation.valid) {
      setError(validation.error || "Invalid file type.");
    } else {
      setError("");
    }
    setFiles(validation.files);
    onFilesChange?.(validation.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleRemove = (idx: number) => {
    const newFiles = files.filter((_, i) => i !== idx);
    setFiles(newFiles);
    onFilesChange?.(newFiles);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium">
          {label} {required && "*"}
        </Label>
      )}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
          id={inputId}
        />
        <label htmlFor={inputId} className="block cursor-pointer">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Click or drag files here to upload
          </p>
        </label>
      </div>

      {/* File Preview */}
      {files.length > 0 && (
        <div className="mt-4">
          {accept?.includes("image") ? (
            <div className="flex flex-wrap gap-4 justify-center">
              {files.map((file, idx) => {
                const url = URL.createObjectURL(file);
                return (
                  <div key={idx} className="relative">
                    <div className="w-32 h-32 border rounded overflow-hidden flex items-center justify-center">
                      <img
                        src={url || "/placeholder.svg"}
                        alt={file.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      onClick={() => handleRemove(idx)}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className="space-y-2">
              {files.map((file, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <div>
                    <span className="font-medium">{file.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({(file.size / 1024).toFixed(2)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleRemove(idx)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
    </div>
  );
};

export default FileUploader;
