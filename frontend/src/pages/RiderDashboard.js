import React from 'react';
import { Container, Typography, Button, Stack } from '@mui/material';
import { Link } from 'react-router-dom';

export default function RiderDashboard() {
  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Rider Dashboard</Typography>
      <Stack spacing={2}>
        <Button component={Link} to="/offers" variant="contained">View Offers</Button>
        <Button component={Link} to="/rider-earnings" variant="outlined">Earnings</Button>
        <Button component={Link} to="/rider-ratings" variant="outlined">My Ratings</Button>
      </Stack>
      <Typography sx={{ mt: 4 }}>Welcome, Rider! Here you can view and accept offers, see your earnings, and check your ratings.</Typography>
    </Container>
  );
} 