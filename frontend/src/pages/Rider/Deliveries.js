import React, { useState, useEffect } from 'react';
import { riderAPI } from '../../services/api';
import { Button, Card, Badge, LoadingSpinner, Modal } from '../../components/UI';
import { MapPin, Clock, Phone, Package, Navigation, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    fetchDeliveries();
    // Set up polling for real-time updates
    const interval = setInterval(fetchDeliveries, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await riderAPI.getDeliveries({
        status: 'active' // Only get active deliveries
      });
      
      setDeliveries(response.data.deliveries || []);
    } catch (error) {
      toast.error('Failed to fetch deliveries');
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (deliveryId, newStatus) => {
    setUpdatingStatus(deliveryId);
    try {
      // Get current location for status update
      const location = await getCurrentLocation();
      
      await riderAPI.updateDeliveryStatus(deliveryId, newStatus, location);
      toast.success(`Delivery status updated to ${newStatus.replace('_', ' ')}`);
      
      // Refresh deliveries
      fetchDeliveries();
      setShowStatusModal(false);
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to update status';
      toast.error(message);
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              type: 'Point',
              coordinates: [position.coords.longitude, position.coords.latitude]
            });
          },
          (error) => {
            console.error('Error getting location:', error);
            resolve(null); // Continue without location
          }
        );
      } else {
        resolve(null);
      }
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      accepted: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-yellow-100 text-yellow-800',
      in_transit: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      accepted: 'picked_up',
      picked_up: 'in_transit',
      in_transit: 'delivered'
    };
    return statusFlow[currentStatus];
  };

  const getStatusLabel = (status) => {
    const labels = {
      accepted: 'Accepted',
      picked_up: 'Picked Up',
      in_transit: 'In Transit',
      delivered: 'Delivered'
    };
    return labels[status] || status;
  };

  const getNextStatusLabel = (status) => {
    const nextStatus = getNextStatus(status);
    return nextStatus ? getStatusLabel(nextStatus) : null;
  };

  const openStatusModal = (delivery) => {
    setSelectedDelivery(delivery);
    setShowStatusModal(true);
  };

  const formatDistance = (distance) => {
    if (!distance) return 'N/A';
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  if (loading && deliveries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>
          <p className="text-gray-600">Manage your active delivery assignments</p>
        </div>
        <Button onClick={fetchDeliveries} disabled={loading}>
          <Navigation className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Deliveries List */}
      <div className="space-y-4">
        {deliveries.length === 0 ? (
          <Card className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No active deliveries</h3>
            <p className="text-gray-600 mb-4">
              You don't have any active deliveries at the moment. Check the offers page to find new opportunities.
            </p>
            <Button onClick={() => window.location.href = '/offers'}>
              Browse Offers
            </Button>
          </Card>
        ) : (
          deliveries.map((delivery) => (
            <Card key={delivery.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{delivery.title}</h3>
                    <Badge className={getStatusColor(delivery.status)}>
                      {getStatusLabel(delivery.status)}
                    </Badge>
                    <Badge className="bg-green-100 text-green-800">
                      ${delivery.payment.amount}
                    </Badge>
                  </div>

                  {delivery.description && (
                    <p className="text-gray-600 mb-3">{delivery.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Route Information */}
                    <div className="space-y-3">
                      <div className="flex items-start text-sm">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 text-green-600" />
                        <div>
                          <div className="font-medium text-gray-900">Pickup</div>
                          <div className="text-gray-600">{delivery.pickup.address}</div>
                          <div className="flex items-center text-gray-500 mt-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {delivery.pickup.contactName} - {delivery.pickup.contactPhone}
                          </div>
                          {delivery.pickup.instructions && (
                            <div className="text-xs text-gray-500 mt-1">
                              Instructions: {delivery.pickup.instructions}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start text-sm">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 text-red-600" />
                        <div>
                          <div className="font-medium text-gray-900">Delivery</div>
                          <div className="text-gray-600">{delivery.delivery.address}</div>
                          <div className="flex items-center text-gray-500 mt-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {delivery.delivery.contactName} - {delivery.delivery.contactPhone}
                          </div>
                          {delivery.delivery.instructions && (
                            <div className="text-xs text-gray-500 mt-1">
                              Instructions: {delivery.delivery.instructions}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delivery Details */}
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <div>
                          <div>Accepted: {format(new Date(delivery.acceptedAt), 'MMM dd, HH:mm')}</div>
                          {delivery.pickedUpAt && (
                            <div>Picked up: {format(new Date(delivery.pickedUpAt), 'MMM dd, HH:mm')}</div>
                          )}
                          {delivery.inTransitAt && (
                            <div>In transit: {format(new Date(delivery.inTransitAt), 'MMM dd, HH:mm')}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="h-4 w-4 mr-2" />
                        <div>
                          <div>Weight: {delivery.packageDetails?.weight || 'N/A'}kg</div>
                          <div>Distance: {formatDistance(delivery.estimatedDistance)}</div>
                          {delivery.packageDetails?.fragile && (
                            <div className="text-red-600 font-medium">⚠️ Fragile</div>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">
                        <div className="font-medium">Business: {delivery.business?.businessName}</div>
                        <div>Contact: {delivery.business?.businessPhone}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="ml-4 flex flex-col gap-2">
                  {getNextStatus(delivery.status) && (
                    <Button
                      onClick={() => openStatusModal(delivery)}
                      disabled={updatingStatus === delivery.id}
                      loading={updatingStatus === delivery.id}
                    >
                      {updatingStatus === delivery.id ? (
                        'Updating...'
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as {getNextStatusLabel(delivery.status)}
                        </>
                      )}
                    </Button>
                  )}

                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-2" />
                    Contact
                  </Button>

                  <Button variant="outline" size="sm">
                    <Navigation className="h-4 w-4 mr-2" />
                    Navigate
                  </Button>

                  {delivery.status !== 'delivered' && (
                    <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Report Issue
                    </Button>
                  )}
                </div>
              </div>

              {/* Package Special Instructions */}
              {delivery.packageDetails?.specialInstructions && (
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
                    <span className="font-medium text-gray-900">Special Instructions</span>
                  </div>
                  <p className="text-sm text-gray-600">{delivery.packageDetails.specialInstructions}</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Delivery Status"
      >
        {selectedDelivery && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>Are you sure you want to mark this delivery as:</p>
              <p className="font-medium text-lg text-gray-900 mt-2">
                {getNextStatusLabel(selectedDelivery.status)}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="font-medium text-gray-900 mb-1">{selectedDelivery.title}</h4>
              <p className="text-sm text-gray-600">
                {selectedDelivery.status === 'accepted' && 'Confirm that you have picked up the package from the pickup location.'}
                {selectedDelivery.status === 'picked_up' && 'Confirm that you are now in transit to the delivery location.'}
                {selectedDelivery.status === 'in_transit' && 'Confirm that you have successfully delivered the package.'}
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowStatusModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateDeliveryStatus(selectedDelivery.id, getNextStatus(selectedDelivery.status))}
                loading={updatingStatus === selectedDelivery.id}
              >
                Confirm Update
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Deliveries;