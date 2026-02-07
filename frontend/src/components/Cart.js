import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ordersService from '../services/ordersService';

const Cart = ({ items = [], onRemoveItem, authToken }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const total = (items || []).reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);

  const handleCheckout = async () => {
    if (!authToken) {
      navigate('/login');
      return;
    }

    if (items.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      setLoading(true);
      const orderItems = items.map(item => ({
        game_id: item.id,
        quantity: item.quantity
      }));
      const response = await ordersService.createOrder(authToken, orderItems);
      
      alert('Order placed successfully!');
      localStorage.setItem('cart', JSON.stringify([]));
      window.location.href = '/orders';
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shopping-cart">
      <h3>🛒 Shopping Cart</h3>
      
      {!items || items.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999' }}>Cart is empty</p>
      ) : (
        <>
          {items.map(item => (
            <div key={item.id} className="cart-item">
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{item.title}</p>
                <p style={{ fontSize: '12px', color: '#666' }}>
                  ${Number(item.price || 0).toFixed(2)} x {Number(item.quantity || 1)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>
                  ${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                </span>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  style={{
                    backgroundColor: '#dc3545',
                    padding: '5px 10px',
                    fontSize: '12px'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          
          <div className="cart-summary">
            <h3>${total.toFixed(2)}</h3>
            <button
              onClick={handleCheckout}
              disabled={loading || !items || items.length === 0}
              style={{
                width: '100%',
                backgroundColor: '#28a745',
                marginTop: '10px'
              }}
            >
              {loading ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
