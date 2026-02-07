import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ordersService from '../services/ordersService';

export const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [token, isAuthenticated, user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await ordersService.getAllOrders(token);
      
      // Handle different response structures
      let ordersList = [];
      if (Array.isArray(response.data)) {
        ordersList = response.data;
      } else if (response.data.orders && Array.isArray(response.data.orders)) {
        ordersList = response.data.orders;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        ordersList = response.data.data;
      } else {
        console.warn('Unexpected orders response:', response.data);
        ordersList = [];
      }
      
      // If not admin, filter to only user's orders
      if (user?.role?.toUpperCase() !== 'ADMIN') {
        ordersList = ordersList.filter(order => order.user_id === user?.id);
      }
      
      setOrders(ordersList);
      setError('');
    } catch (err) {
      setError('Failed to load orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      await ordersService.cancelOrder(token, orderId);
      fetchOrders();
    } catch (err) {
      setError('Failed to cancel order');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="card">
          <p>Please login to view your orders.</p>
          <a href="/login">
            <button>Login</button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>{user?.role?.toUpperCase() === 'ADMIN' ? 'All Orders' : 'My Orders'}</h2>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">{user?.role?.toUpperCase() === 'ADMIN' ? 'No orders found' : 'You have no orders yet'}</div>
      ) : (
        <div>
          {orders.map(order => (
            <div key={order.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3>Order #{order.id}</h3>
                <span className={`order-status ${order.status?.toLowerCase()}`}>
                  {order.status}
                </span>
              </div>
              {user?.role?.toUpperCase() === 'ADMIN' && (
                <p><strong>User:</strong> {order.user_email || 'Unknown'}</p>
              )}
              <p><strong>Order Date:</strong> {new Date(order.created_at || order.createdAt).toLocaleDateString()}</p>
              <p><strong>Total:</strong> ${Number(order.total_price || order.totalPrice || 0).toFixed(2)}</p>
              <p><strong>Games:</strong> {Number(order.game_count || order.gameCount || 0)}</p>

              {order.status !== 'completed' && (
                <button
                  onClick={() => cancelOrder(order.id)}
                  style={{ backgroundColor: '#dc3545', marginTop: '10px' }}
                >
                  Cancel Order
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
