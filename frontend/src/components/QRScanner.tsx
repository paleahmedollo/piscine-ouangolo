import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import jsQR from 'jsqr';

interface QRScannerProps {
  open: boolean;
  operator?: { id: string; label: string; color: string };
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ open, operator, onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState('');

  const stopCamera = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setError('');
    setLoading(true);
    setScanned('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setLoading(false);
        scanLoop();
      }
    } catch (e: any) {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      setLoading(false);
    }
  };

  const scanLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });
    if (code && code.data) {
      stopCamera();
      setScanned(code.data);
    } else {
      animRef.current = requestAnimationFrame(scanLoop);
    }
  };

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setScanned('');
      setError('');
    }
    return () => stopCamera();
  }, [open]);

  const handleConfirm = () => {
    onScan(scanned);
    setScanned('');
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { m: 1, borderRadius: 3 } }}
    >
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: operator?.color || '#1a237e', color: 'white', py: 1.5
      }}>
        <Typography fontWeight="bold">
          📱 Scanner QR Code {operator?.label}
        </Typography>
        <IconButton onClick={handleClose} sx={{ color: 'white' }} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: '#000', position: 'relative', minHeight: 320 }}>
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: 320, bgcolor: '#111', gap: 2 }}>
            <CircularProgress sx={{ color: 'white' }} />
            <Typography color="white" variant="body2">Activation de la caméra...</Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2, minHeight: 200, display: 'flex', alignItems: 'center' }}>
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
              <br />
              <Button size="small" onClick={startCamera} sx={{ mt: 1 }}>
                Réessayer
              </Button>
            </Alert>
          </Box>
        )}

        {!scanned && !error && (
          <>
            <video
              ref={videoRef}
              style={{ width: '100%', display: loading ? 'none' : 'block' }}
              playsInline
              muted
            />
            {/* Viewfinder overlay */}
            {!loading && (
              <Box sx={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 220, height: 220,
                border: `3px solid ${operator?.color || '#fff'}`,
                borderRadius: 2,
                '&::before, &::after': {
                  content: '""', position: 'absolute',
                  width: 40, height: 40,
                  borderColor: operator?.color || '#fff',
                  borderStyle: 'solid',
                }
              }} />
            )}
            {!loading && (
              <Typography sx={{
                position: 'absolute', bottom: 16, left: 0, right: 0,
                textAlign: 'center', color: 'white', fontSize: '0.85rem',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)'
              }}>
                Pointez la caméra vers le QR code du client
              </Typography>
            )}
          </>
        )}

        {/* QR détecté */}
        {scanned && (
          <Box sx={{ p: 3, minHeight: 200, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', bgcolor: '#fff', gap: 2 }}>
            <Typography variant="h4">✅</Typography>
            <Typography fontWeight="bold" color="success.main">QR Code détecté !</Typography>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2, width: '100%', wordBreak: 'break-all' }}>
              <Typography variant="caption" color="text.secondary">Référence :</Typography>
              <Typography variant="body2" fontFamily="monospace">{scanned}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => { setScanned(''); startCamera(); }}>
                Rescanner
              </Button>
              <Button variant="contained" onClick={handleConfirm}
                sx={{ bgcolor: operator?.color, '&:hover': { bgcolor: operator?.color } }}>
                Confirmer
              </Button>
            </Box>
          </Box>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  );
};

export default QRScanner;
