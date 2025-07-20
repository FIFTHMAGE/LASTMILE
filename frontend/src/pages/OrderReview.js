import React from 'react';
import { Container, Typography, List, ListItem, ListItemText, Chip, Divider } from '@mui/material';

const mockOrders = [
  { id: 1, title: 'Package A', reviewed: true },
  { id: 2, title: 'Package B', reviewed: false },
  { id: 3, title: 'Package C', reviewed: true },
];

export default function OrderReview() {
  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Order Review</Typography>
      <List>
        {mockOrders.map(order => (
          <React.Fragment key={order.id}>
            <ListItem>
              <ListItemText primary={order.title} />
              <Chip label={order.reviewed ? 'Reviewed' : 'Pending'} color={order.reviewed ? 'success' : 'warning'} />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </Container>
  );
} 