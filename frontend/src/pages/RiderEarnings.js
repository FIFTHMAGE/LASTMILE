import React from 'react';
import { Container, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';

const mockEarnings = [
  { id: 1, date: '2024-07-01', amount: 2500 },
  { id: 2, date: '2024-07-02', amount: 1800 },
  { id: 3, date: '2024-07-03', amount: 3200 },
];

export default function RiderEarnings() {
  const total = mockEarnings.reduce((sum, e) => sum + e.amount, 0);
  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Rider Earnings</Typography>
      <List>
        {mockEarnings.map(e => (
          <React.Fragment key={e.id}>
            <ListItem>
              <ListItemText primary={`₦${e.amount}`} secondary={e.date} />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
      <Typography variant="h6" sx={{ mt: 2 }}>Total: ₦{total}</Typography>
    </Container>
  );
} 