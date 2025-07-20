import React, { useEffect, useState } from 'react';
import { Container, Typography, Grid, Card, CardContent, Button, CircularProgress, Alert } from '@mui/material';
import axios from '../api/axios';

const mockOffers = [
  { id: 1, title: 'Deliver Package A', amount: 2500, status: 'open' },
  { id: 2, title: 'Deliver Package B', amount: 1800, status: 'accepted' },
  { id: 3, title: 'Deliver Package C', amount: 3200, status: 'completed' },
];

export default function OfferList() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await axios.get('/offers');
        setOffers(res.data.offers || []);
      } catch (err) {
        setError('Failed to fetch offers from API. Showing mock data.');
        setOffers(mockOffers);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  if (loading) return <Container sx={{ mt: 4 }}><CircularProgress /></Container>;

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Offer List</Typography>
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        {offers.map(offer => (
          <Grid item xs={12} sm={6} md={4} key={offer.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{offer.title}</Typography>
                <Typography>Amount: ₦{offer.amount}</Typography>
                <Typography>Status: {offer.status}</Typography>
                <Button variant="contained" sx={{ mt: 1 }} disabled={offer.status !== 'open'}>
                  {offer.status === 'open' ? 'Accept Offer' : 'View Details'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
} 