import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import reviewsService from '../services/reviewsService';
import ordersService from '../services/ordersService';

export const Admin = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('reviews');
  const [allReviews, setAllReviews] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrder, setUpdatingOrder] = useState(null);

  useEffect(() => {
    // Wait for auth to load before checking role
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || user?.role?.toUpperCase() !== 'ADMIN') {
      navigate('/');
      return;
    }

    if (activeTab === 'reviews') {
      fetchAllReviews();
    } else if (activeTab === 'orders') {
      fetchAllOrders();
    }
  }, [isAuthenticated, user, authLoading, navigate, activeTab]);

  const fetchAllReviews = async () => {
    try {
      setLoading(true);
      const response = await reviewsService.getAllReviews(token);
      
      let reviewsList = [];
      if (Array.isArray(response.data)) {
        reviewsList = response.data;
      } else if (response.data.reviews && Array.isArray(response.data.reviews)) {
        reviewsList = response.data.reviews;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        reviewsList = response.data.data;
      } else {
        console.warn('Unexpected reviews response:', response.data);
        reviewsList = [];
      }
      
      setAllReviews(reviewsList);
      setError('');
    } catch (err) {
      setError('Failed to load reviews');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      const response = await ordersService.getAllOrders(token);
      
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
      
      setAllOrders(ordersList);
      setError('');
    } catch (err) {
      setError('Failed to load orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await reviewsService.deleteReview(token, reviewId);
      fetchAllReviews();
    } catch (err) {
      alert('Failed to delete review');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrder(orderId);
      await ordersService.updateOrderStatus(token, orderId, newStatus);
      fetchAllOrders();
      setUpdatingOrder(null);
    } catch (err) {
      alert('Failed to update order status');
      setUpdatingOrder(null);
      console.error(err);
    }
  };

  if (authLoading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role?.toUpperCase() !== 'ADMIN') {
    return (
      <div className="container">
        <div className="card">
          <p>Access denied. Admin only.</p>
          <a href="/">
            <button>Return Home</button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <button 
        onClick={() => navigate('/')}
        style={{ marginBottom: '20px', padding: '8px 16px' }}
      >
        ← Back
      </button>

      <h2>Admin Dashboard</h2>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid #ddd'
      }}>
        <button
          onClick={() => setActiveTab('reviews')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'reviews' ? '#007bff' : '#f0f0f0',
            color: activeTab === 'reviews' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0'
          }}
        >
          Reviews Management
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'orders' ? '#007bff' : '#f0f0f0',
            color: activeTab === 'orders' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0'
          }}
        >
          Orders Management
        </button>
        <button
          onClick={() => setActiveTab('endpoints')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'endpoints' ? '#007bff' : '#f0f0f0',
            color: activeTab === 'endpoints' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0'
          }}
        >
          API Documentation
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="admin-section">
          <h3>All Reviews</h3>
          
          {loading ? (
            <div className="loading">Loading reviews...</div>
          ) : allReviews.length === 0 ? (
            <div className="empty-state">No reviews found</div>
          ) : (
            <div>
              <p style={{ color: '#666', marginBottom: '15px' }}>
                Total Reviews: <strong>{allReviews.length}</strong>
              </p>
              <div className="reviews">
                {allReviews.map(review => (
                  <div key={review.id} className="review-item" style={{
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '10px'
                  }}>
                    <div className="review-header" style={{ marginBottom: '10px' }}>
                      <h3 style={{ margin: '0 0 5px 0' }}>{review.game_title || 'Game'}</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="review-rating">
                          {'⭐'.repeat(review.rating)} ({review.rating}/5)
                        </span>
                        <small style={{ color: '#999' }}>
                          By {review.user_email || 'Anonymous'} (ID: {review.user_id})
                        </small>
                      </div>
                    </div>
                    <p className="review-text" style={{ margin: '10px 0' }}>{review.comment}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <small style={{ color: '#999' }}>
                        {new Date(review.created_at).toLocaleDateString()} • Review ID: {review.id}
                      </small>
                      <button
                        onClick={() => deleteReview(review.id)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          padding: '5px 10px',
                          fontSize: '12px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="admin-section">
          <h3>All Orders</h3>
          
          {loading ? (
            <div className="loading">Loading orders...</div>
          ) : allOrders.length === 0 ? (
            <div className="empty-state">No orders found</div>
          ) : (
            <div>
              <p style={{ color: '#666', marginBottom: '15px' }}>
                Total Orders: <strong>{allOrders.length}</strong>
              </p>
              <div className="orders">
                {allOrders.map(order => (
                  <div key={order.id} className="order-item" style={{
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    backgroundColor: '#f9f9f9'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0' }}>Order #{order.id}</h3>
                        <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>
                          <strong>User:</strong> {order.user_email || 'Unknown'} (ID: {order.user_id})
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <select
                          value={order.status || 'pending'}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          disabled={updatingOrder === order.id}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            cursor: updatingOrder === order.id ? 'not-allowed' : 'pointer',
                            backgroundColor: 'white'
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <span style={{
                          padding: '5px 10px',
                          borderRadius: '4px',
                          backgroundColor: order.status === 'completed' ? '#28a745' : order.status === 'cancelled' ? '#dc3545' : '#ffc107',
                          color: order.status === 'completed' ? 'white' : order.status === 'cancelled' ? 'white' : 'black',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
                        </span>
                      </div>
                    </div>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Total Amount:</strong> ${Number(order.total_amount || 0).toFixed(2)}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                      <strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    {order.items && order.items.length > 0 && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd' }}>
                        <strong>Items:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                          {order.items.map((item, idx) => (
                            <li key={idx} style={{ fontSize: '12px' }}>
                              {item.game_title || item.game_id} - Qty: {item.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* API Documentation Tab */}
      {activeTab === 'endpoints' && (
        <div className="admin-section">
          <h3>Admin-Only API Endpoints</h3>
          
          <div className="card" style={{ marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0 }}>Authentication</h4>
            <p>All admin endpoints require:</p>
            <ul style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8' }}>
              <li><strong>Header:</strong> Authorization: Bearer &lt;token&gt;</li>
              <li><strong>Role:</strong> ADMIN (role field must be "ADMIN")</li>
              <li><strong>Content-Type:</strong> application/json (for POST/PUT requests)</li>
            </ul>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0 }}>Reviews Management</h4>
            
            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '4px' }}>
                <strong>GET</strong> /api/v1/reviews
              </p>
              <p><strong>Description:</strong> Get all reviews in the system (admin only)</p>
              <p><strong>Returns:</strong> Array of all reviews with user and game details</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '4px' }}>
                <strong>GET</strong> /api/v1/games/:gameId/reviews
              </p>
              <p><strong>Description:</strong> Get all reviews for a specific game</p>
              <p><strong>Parameters:</strong> gameId (path parameter, integer)</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '4px' }}>
                <strong>DELETE</strong> /api/v1/reviews/:reviewId
              </p>
              <p><strong>Description:</strong> Delete a review (admin can delete any review)</p>
              <p><strong>Parameters:</strong> reviewId (path parameter, integer)</p>
              <p><strong>Returns:</strong> {'{'}success: true{'}'}</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '4px' }}>
                <strong>POST</strong> /api/v1/games/:gameId/reviews
              </p>
              <p><strong>Description:</strong> Create a review</p>
              <p><strong>Body:</strong></p>
              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto'
              }}>
{`{
  "rating": 1-5,
  "comment": "string"
}`}
              </pre>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0 }}>Orders Management</h4>
            
            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '4px' }}>
                <strong>GET</strong> /api/v1/orders
              </p>
              <p><strong>Description:</strong> Get all orders (admin sees all, users see only their own)</p>
              <p><strong>Query Parameters:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '12px' }}>
                  <li>offset: pagination offset (default 0)</li>
                  <li>limit: number of results (default 20)</li>
                </ul>
              </p>
              <p><strong>Returns:</strong> Array of orders with items and user details</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '4px' }}>
                <strong>POST</strong> /api/v1/orders
              </p>
              <p><strong>Description:</strong> Create a new order</p>
              <p><strong>Body:</strong></p>
              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto'
              }}>
{`{
  "items": [
    {
      "game_id": number,
      "quantity": number
    }
  ]
}`}
              </pre>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '4px' }}>
                <strong>GET</strong> /api/v1/orders/:orderId
              </p>
              <p><strong>Description:</strong> Get a specific order details</p>
              <p><strong>Parameters:</strong> orderId (path parameter, integer)</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '4px' }}>
                <strong>PUT</strong> /api/v1/orders/:orderId
              </p>
              <p><strong>Description:</strong> Update order status (admin only)</p>
              <p><strong>Parameters:</strong> orderId (path parameter, integer)</p>
              <p><strong>Body:</strong></p>
              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto'
              }}>
{`{
  "status": "pending" | "completed" | "cancelled"
}`}
              </pre>
              <p><strong>Returns:</strong> Updated order object</p>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginTop: 0 }}>Response Schema</h4>
            
            <p><strong>Review Object:</strong></p>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '11px',
              overflow: 'auto',
              marginBottom: '15px'
            }}>
{`{
  "id": number,
  "game_id": number,
  "user_id": number,
  "game_title": string,
  "user_email": string,
  "rating": number (1-5),
  "comment": string,
  "created_at": ISO 8601 timestamp,
  "updated_at": ISO 8601 timestamp
}`}
            </pre>

            <p><strong>Order Object:</strong></p>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '11px',
              overflow: 'auto'
            }}>
{`{
  "id": number,
  "user_id": number,
  "user_email": string,
  "status": string ("pending" | "completed"),
  "total_amount": decimal,
  "items": [
    {
      "id": number,
      "game_id": number,
      "game_title": string,
      "quantity": number,
      "price": decimal
    }
  ],
  "created_at": ISO 8601 timestamp,
  "updated_at": ISO 8601 timestamp
}`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
