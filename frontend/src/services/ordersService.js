import axios from 'axios';

const ORDERS_SERVICE_URL = process.env.REACT_APP_ORDERS_SERVICE_URL || 'http://localhost:3003';

const ordersApi = axios.create({
  baseURL: `${ORDERS_SERVICE_URL}`,
  timeout: 10000,
});

export const ordersService = {
  createOrder: (token, items) => {
    return ordersApi.post('/api/v1/orders', { items }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getUserOrders: (token) => {
    return ordersApi.get('/api/v1/orders', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getAllOrders: (token) => {
    return ordersApi.get('/api/v1/orders', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getOrderById: (token, orderId) => {
    return ordersApi.get(`/api/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  cancelOrder: (token, orderId) => {
    return ordersApi.delete(`/api/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  updateOrderStatus: (token, orderId, status) => {
    return ordersApi.put(`/api/v1/orders/${orderId}`, { status }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};

export default ordersService;
