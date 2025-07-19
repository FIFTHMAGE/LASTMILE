import React, { useState } from 'react';
import { TextField, Button, Container, Typography, Alert, Box, MenuItem } from '@mui/material';
import axios from '../api/axios';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'business' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    try {
      await axios.post('/auth/register', form);
      setSuccess(true);
      setTimeout(() => { window.location.href = '/login'; }, 1500);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Typography variant="h4" gutterBottom>Register</Typography>
      <Box component="form" onSubmit={handleRegister}>
        <TextField
          name="name"
          label="Name"
          value={form.name}
          onChange={handleChange}
          required
          fullWidth
          margin="normal"
        />
        <TextField
          name="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          fullWidth
          margin="normal"
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
          fullWidth
          margin="normal"
        />
        <TextField
          name="role"
          label="Role"
          select
          value={form.role}
          onChange={handleChange}
          fullWidth
          margin="normal"
        >
          <MenuItem value="business">Business</MenuItem>
          <MenuItem value="rider">Rider</MenuItem>
        </TextField>
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Register
        </Button>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>Registration successful! Redirecting to login...</Alert>}
      </Box>
      <Box sx={{ mt: 2 }}>
        Already have an account? <a href="/login">Login</a>
      </Box>
    </Container>
  );
} 