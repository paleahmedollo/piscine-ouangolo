import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import GestixLogo from '../components/GestixLogo';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #0F1F5C 0%, #1565C0 60%, #1E3A8A 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          top: '-200px',
          right: '-150px',
          pointerEvents: 'none'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          bottom: '-100px',
          left: '-100px',
          pointerEvents: 'none'
        }
      }}
    >
      <Card
        elevation={24}
        sx={{
          maxWidth: 420,
          width: '100%',
          mx: 2,
          borderRadius: 3,
          overflow: 'visible'
        }}
      >
        <CardContent sx={{ p: 4 }}>

          {/* ── Logo + Titre ── */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ display: 'inline-block', mb: 1.5, filter: 'drop-shadow(0 6px 16px rgba(21,101,192,0.45))' }}>
              <GestixLogo size={84} variant="color" />
            </Box>

            <Typography
              variant="h3"
              fontWeight={900}
              letterSpacing={4}
              sx={{
                background: 'linear-gradient(135deg, #1E3A8A, #1565C0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5
              }}
            >
              GESTIX
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>
              PLATEFORME DE GESTION
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── Erreur ── */}
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* ── Formulaire ── */}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Identifiant"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              autoFocus
              disabled={loading}
              size="medium"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              fullWidth
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              size="medium"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 3,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 700,
                letterSpacing: 1,
                background: 'linear-gradient(135deg, #1E3A8A, #1565C0)',
                boxShadow: '0 4px 15px rgba(21,101,192,0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #283593, #1976D2)',
                  boxShadow: '0 6px 20px rgba(21,101,192,0.5)'
                }
              }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'SE CONNECTER'}
            </Button>
          </form>

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ display: 'block', textAlign: 'center', mt: 3 }}
          >
            Contactez votre administrateur pour récupérer vos accès
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
