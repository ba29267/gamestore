import axios from 'axios';

const REVIEWS_SERVICE_URL = process.env.REACT_APP_REVIEWS_SERVICE_URL || 'http://localhost:3004';

const reviewsApi = axios.create({
  baseURL: `${REVIEWS_SERVICE_URL}`,
  timeout: 10000,
});

export const reviewsService = {
  getGameReviews: (gameId) => {
    return reviewsApi.get(`/api/v1/games/${gameId}/reviews`);
  },

  createReview: (token, gameId, rating, comment) => {
    return reviewsApi.post(`/api/v1/games/${gameId}/reviews`, { rating, comment }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  updateReview: (token, reviewId, rating, comment) => {
    return reviewsApi.put(`/api/v1/reviews/${reviewId}`, { rating, comment }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  deleteReview: (token, reviewId) => {
    return reviewsApi.delete(`/api/v1/reviews/${reviewId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getUserReviews: (token) => {
    return reviewsApi.get('/api/v1/reviews', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getAllReviews: (token) => {
    return reviewsApi.get('/api/v1/reviews', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  markAsHelpful: (token, reviewId) => {
    return reviewsApi.post(`/api/v1/reviews/${reviewId}/helpful`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};

export default reviewsService;
