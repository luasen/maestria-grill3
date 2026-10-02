import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
  Link as LinkIcon,
  ShieldCheck,
  AlertCircle,
  HardDrive
} from 'lucide-react';
import {
  StorageBucket,
  uploadImageToStorage,
  deleteImageFromStorage,
  extractStoragePath
} from '../services/imageService';

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (imageUrl: string) => void;
  bucket: StorageBucket;
  required?: boolean;
  helperText?: string;
}

export default function ImageUploader({
  label,
  value,
  onChange,
  bucket,
  required = false,
  helperText,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  
  // Track images uploaded during the current form session so we can delete them if replaced before save
  const sessionUploadedUrls = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStorageUrl = Boolean(extractStoragePath(value, bucket));

  const handleFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadError(null);

      // Upload binary Blob directly to Supabase Storage bucket
      const uploadedPublicUrl = await uploadImageToStorage(file, bucket);

      // If user had already uploaded an image in this current session without saving, delete the previous one
      const previousSessionUpload = sessionUploadedUrls.current.pop();
      if (previousSessionUpload && previousSessionUpload !== uploadedPublicUrl) {
        deleteImageFromStorage(previousSessionUpload, bucket).catch((err) =>
          console.warn('[Storage Cleanup Warning]:', err)
        );
      }

      sessionUploadedUrls.current.push(uploadedPublicUrl);
      onChange(uploadedPublicUrl);
    } catch (err: any) {
      console.error('[Upload to Storage Error]:', err);
      setUploadError(err?.message || 'Falha ao salvar imagem. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = async () => {
    // If the image was just uploaded in this session, delete it from storage immediately
    if (sessionUploadedUrls.current.includes(value)) {
      await deleteImageFromStorage(value, bucket);
      sessionUploadedUrls.current = sessionUploadedUrls.current.filter((u) => u !== value);
    }
    onChange('');
    setUploadError(null);
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInputValue.trim()) {
      onChange(urlInputValue.trim());
      setShowUrlInput(false);
      setUrlInputValue('');
      setUploadError(null);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full text-left">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-orange-600" />
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[10px] text-gray-400 hover:text-orange-600 font-semibold flex items-center gap-1 transition"
        >
          <LinkIcon className="h-3 w-3" />
          {showUrlInput ? 'Usar Upload de Arquivo' : 'Ou colar link URL'}
        </button>
      </div>

      {helperText && <p className="text-[10px] text-gray-400">{helperText}</p>}

      {/* Alternative URL Input Mode */}
      {showUrlInput && (
        <div className="p-2.5 rounded-xl border border-orange-200 bg-orange-50/50 flex items-center gap-2 mb-1">
          <input
            type="url"
            placeholder="https://exemplo.com/foto.jpg"
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-orange-500"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition"
          >
            Aplicar
          </button>
        </div>
      )}

      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* When an image is selected */}
      {value ? (
        <div className="relative rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-xs p-3 flex items-center gap-3 shadow-xs group">
          <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
            <img
              src={value}
              alt="Pré-visualização"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold mb-1">
              <Check className="h-3.5 w-3.5" />
              <span>Imagem pronta e otimizada</span>
            </div>
            
            <p className="text-[10px] text-gray-500 truncate font-mono" title={value}>
              {value}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-[11px] font-bold transition flex items-center gap-1"
              >
                <UploadCloud className="h-3 w-3" />
                Substituir Foto
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 text-[11px] font-bold transition flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Remover
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
            isDragOver
              ? 'border-orange-500 bg-orange-50/70'
              : 'border-gray-300 hover:border-orange-500 hover:bg-orange-50/30 bg-white/40'
          }`}
        >
          {isUploading ? (
            <div className="py-2 flex flex-col items-center gap-2 text-orange-600">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-xs font-bold text-gray-700">Otimizando e enviando imagem...</span>
              <span className="text-[10px] text-gray-400">Processamento em alta resolução</span>
            </div>
          ) : (
            <>
              <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-800 block">
                  Escolher foto (Galeria, Câmera ou Computador)
                </span>
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  JPG, PNG ou WebP (Será convertido e otimizado em WebP)
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60 mt-1">
                <HardDrive className="h-3 w-3" />
                Bucket: <span className="font-mono">{bucket}</span>
              </div>
            </>
          )}
        </div>
      )}

      {uploadError && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 mt-1">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Erro no Upload:</span>
            <span>{uploadError}</span>
          </div>
        </div>
      )}
    </div>
  );
}
