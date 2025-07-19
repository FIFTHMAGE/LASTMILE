import React from 'react';
import { Button, Container, Typography } from '@mui/material';

export default function Dashboard() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Typography variant="h4" gutterBottom>Welcome to the Dashboard!</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        You are logged in. This is a protected page.
      </Typography>
      <Button variant="contained" color="primary" onClick={handleLogout}>
        Logout
      </Button>
    </Container>
  );
} 