import React from 'react';
import { Container, Typography, List, ListItem, ListItemText, Rating, Divider } from '@mui/material';

const mockRatings = [
  { id: 1, rating: 5, comment: 'Great delivery!' },
  { id: 2, rating: 4, comment: 'On time and professional.' },
  { id: 3, rating: 3, comment: 'Good, but could improve communication.' },
];

export default function RiderRatings() {
  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>My Ratings</Typography>
      <List>
        {mockRatings.map(r => (
          <React.Fragment key={r.id}>
            <ListItem>
              <ListItemText primary={<Rating value={r.rating} readOnly />} secondary={r.comment} />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </Container>
  );
} 