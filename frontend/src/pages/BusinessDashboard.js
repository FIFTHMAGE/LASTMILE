import React from 'react';
import { Container, Typography, Button, Stack } from '@mui/material';
import { Link } from 'react-router-dom';

export default function BusinessDashboard() {
  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Business Dashboard</Typography>
      <Stack spacing={2}>
        <Button component={Link} to="/offers" variant="contained">View Offers</Button>
        <Button component={Link} to="/order-review" variant="outlined">Order Review</Button>
        <Button component={Link} to="/analytics" variant="outlined">Analytics (Coming Soon)</Button>
      </Stack>
      <Typography sx={{ mt: 4 }}>Welcome, Business User! Here you can manage your offers and view analytics.</Typography>
    </Container>
  );
} 