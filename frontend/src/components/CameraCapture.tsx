import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Delete as DeleteIcon,
  ZoomIn as ZoomIcon
} from '@mui/icons-material';

interface CameraCaptureProps {
  value?: string; // base64 image
  onChange: (base64: string | undefined) => void;
  label?: string;
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Resize to max 1024px wide
        const maxW = 1024;
        const maxH = 768;
        let w = img.width;
        let h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        // 75% JPEG quality → ~100-200KB
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const CameraCapture: React.FC<CameraCaptureProps> = ({ value, onChange, label }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = () => {
    onChange(undefined);
  };

  return (
    <Box>
      {label && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {label}
        </Typography>
      )}

      {!value ? (
        <Box
          onClick={() => inputRef.current?.click()}
          sx={{
            border: '2px dashed #ccc',
            borderRadius: 2,
            p: 2,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' }
          }}
        >
          {loading ? (
            <CircularProgress size={32} />
          ) : (
            <>
              <CameraIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Prendre une photo de la scène
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Appuyez pour ouvrir l'appareil photo
              </Typography>
            </>
          )}
        </Box>
      ) : (
        <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid #ddd' }}>
          <img
            src={value}
            alt="Photo incident"
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
          />
          <Box sx={{
            position: 'absolute', top: 4, right: 4,
            display: 'flex', gap: 0.5
          }}>
            <IconButton
              size="small"
              onClick={() => setPreview(true)}
              sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
            >
              <ZoomIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={{ bgcolor: 'rgba(220,0,0,0.7)', color: 'white', '&:hover': { bgcolor: 'rgba(220,0,0,0.9)' } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
          <Button
            size="small"
            startIcon={<CameraIcon />}
            onClick={() => inputRef.current?.click()}
            sx={{ position: 'absolute', bottom: 4, left: 4,
              bgcolor: 'rgba(0,0,0,0.5)', color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
              fontSize: '0.7rem', py: 0.3
            }}
          >
            Changer
          </Button>
        </Box>
      )}

      {/* Preview fullscreen */}
      {preview && value && (
        <Box
          onClick={() => setPreview(false)}
          sx={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'rgba(0,0,0,0.9)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img src={value} alt="Photo" style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain' }} />
        </Box>
      )}

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        style={{ display: 'none' }}
      />
    </Box>
  );
};

export default CameraCapture;
