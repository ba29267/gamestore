import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gameService from '../services/gameService';
import reviewsService from '../services/reviewsService';

export const ReviewGame = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const [game, setGame] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role?.toUpperCase() === 'GUEST') {
      navigate('/');
      return;
    }

    fetchGame();
  }, [gameId, isAuthenticated, user]);

  const fetchGame = async () => {
    try {
      setLoading(true);
      const response = await gameService.getGameById(gameId);
      
      let gameData = null;
      if (response.data.game) {
        gameData = response.data.game;
      } else if (response.data.data) {
        gameData = response.data.data;
      } else {
        gameData = response.data;
      }
      
      setGame(gameData);
      setError('');
    } catch (err) {
      setError('Failed to load game');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      setError('Please enter a review comment');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      await reviewsService.createReview(token, gameId, rating, comment);
      
      navigate('/reviews');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || user?.role?.toUpperCase() === 'GUEST') {
    return (
      <div className="container">
        <div className="card">
          <p>Please login to write a review.</p>
          <a href="/login">
            <button>Login</button>
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="container">
        <div className="error">Game not found</div>
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
      
      <div className="card" style={{ maxWidth: '600px' }}>
        <h2>Write Review for {game.title}</h2>
        
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Rating:</label>
            <select 
              value={rating} 
              onChange={(e) => setRating(Number(e.target.value))}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%' }}
            >
              <option value={1}>1 Star - Poor</option>
              <option value={2}>2 Stars - Fair</option>
              <option value={3}>3 Stars - Good</option>
              <option value={4}>4 Stars - Very Good</option>
              <option value={5}>5 Stars - Excellent</option>
            </select>
          </div>

          <div className="form-group">
            <label>Your Review:</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this game..."
              rows="6"
              style={{
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontFamily: 'Arial, sans-serif',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{ flex: 1, backgroundColor: '#28a745' }}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{ flex: 1, backgroundColor: '#6c757d' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewGame;
