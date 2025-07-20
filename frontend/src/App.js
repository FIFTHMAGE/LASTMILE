import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { CssBaseline, AppBar, Toolbar, Button, Box } from '@mui/material';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import OfferList from './pages/OfferList';
import BusinessDashboard from './pages/BusinessDashboard';
import RiderDashboard from './pages/RiderDashboard';
import RiderEarnings from './pages/RiderEarnings';
import OrderReview from './pages/OrderReview';
import RiderRatings from './pages/RiderRatings';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

function Home() {
  return <div style={{ textAlign: 'center', marginTop: 40 }}><h1>Welcome to Last Mile Delivery</h1></div>;
}

function NavBar() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Button color="inherit" component={Link} to="/">Home</Button>
        <Button color="inherit" component={Link} to="/login">Login</Button>
        <Button color="inherit" component={Link} to="/register">Register</Button>
        <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
        <Button color="inherit" component={Link} to="/offers">Offers</Button>
        <Button color="inherit" component={Link} to="/business-dashboard">Business Dashboard</Button>
        <Button color="inherit" component={Link} to="/rider-dashboard">Rider Dashboard</Button>
        <Button color="inherit" component={Link} to="/rider-earnings">Rider Earnings</Button>
        <Button color="inherit" component={Link} to="/order-review">Order Review</Button>
        <Button color="inherit" component={Link} to="/rider-ratings">Rider Ratings</Button>
      </Toolbar>
    </AppBar>
  );
}

function App() {
  return (
    <AuthProvider>
      <CssBaseline />
      <Router>
        <NavBar />
        <Box sx={{ mt: 2 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/offers" element={<PrivateRoute><OfferList /></PrivateRoute>} />
            <Route path="/business-dashboard" element={<PrivateRoute><BusinessDashboard /></PrivateRoute>} />
            <Route path="/rider-dashboard" element={<PrivateRoute><RiderDashboard /></PrivateRoute>} />
            <Route path="/rider-earnings" element={<PrivateRoute><RiderEarnings /></PrivateRoute>} />
            <Route path="/order-review" element={<PrivateRoute><OrderReview /></PrivateRoute>} />
            <Route path="/rider-ratings" element={<PrivateRoute><RiderRatings /></PrivateRoute>} />
          </Routes>
        </Box>
      </Router>
    </AuthProvider>
  );
}

export default App;
