import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gameService from '../services/gameService';
import reviewsService from '../services/reviewsService';
import ordersService from '../services/ordersService';
import Cart from '../components/Cart';

export const GameDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const isGuest = user?.role?.toUpperCase() === 'GUEST';

  const [game, setGame] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('cart') || '[]'));
  const [isInCart, setIsInCart] = useState(false);

  // Review form states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userReview, setUserReview] = useState(null);

  useEffect(() => {
    fetchGameAndReviews();
  }, [id]);

  useEffect(() => {
    setIsInCart(cart.some(item => item.id === parseInt(id)));
  }, [cart, id]);

  const fetchGameAndReviews = async () => {
    try {
      setLoading(true);

      // Fetch game details
      const gameResponse = await gameService.getGameById(id);
      let gameData = null;
      if (gameResponse.data.data) {
        gameData = gameResponse.data.data;
      } else if (gameResponse.data.game) {
        gameData = gameResponse.data.game;
      } else {
        gameData = gameResponse.data;
      }
      setGame(gameData);

      // Fetch reviews for this game
      const reviewsResponse = await reviewsService.getGameReviews(id);
      let reviewsList = [];
      if (Array.isArray(reviewsResponse.data)) {
        reviewsList = reviewsResponse.data;
      } else if (reviewsResponse.data.reviews && Array.isArray(reviewsResponse.data.reviews)) {
        reviewsList = reviewsResponse.data.reviews;
      } else if (reviewsResponse.data.data && Array.isArray(reviewsResponse.data.data)) {
        reviewsList = reviewsResponse.data.data;
      }
      setReviews(reviewsList);

      // Check if user has already written a review
      if (isAuthenticated && !isGuest) {
        const userReviewData = reviewsList.find(r => r.user_id === user?.id);
        if (userReviewData) {
          setUserReview(userReviewData);
        }
      }

      setError('');
    } catch (err) {
      setError('Failed to load game details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!game) return;
    const newCart = [...cart];
    const existingItem = newCart.find(item => item.id === game.id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      newCart.push({ ...game, quantity: 1 });
    }

    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeFromCart = (gameId) => {
    const newCart = cart.filter(item => item.id !== gameId);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      alert('Please enter a comment');
      return;
    }

    try {
      setSubmittingReview(true);

      if (editingReviewId) {
        // Update existing review
        await reviewsService.updateReview(token, editingReviewId, rating, comment);
      } else {
        // Create new review
        await reviewsService.createReview(token, id, rating, comment);
      }

      // Refresh reviews
      await fetchGameAndReviews();
      setShowReviewForm(false);
      setEditingReviewId(null);
      setRating(5);
      setComment('');
    } catch (err) {
      alert('Failed to submit review: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEditReview = () => {
    if (userReview) {
      setEditingReviewId(userReview.id);
      setRating(userReview.rating);
      setComment(userReview.comment);
      setShowReviewForm(true);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await reviewsService.deleteReview(token, reviewId);
      await fetchGameAndReviews();
      setShowReviewForm(false);
      setEditingReviewId(null);
    } catch (err) {
      alert('Failed to delete review');
    }
  };

  const handleMarkAsHelpful = async (reviewId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      await reviewsService.markAsHelpful(token, reviewId);
      // Refresh reviews to get updated helpful count
      await fetchGameAndReviews();
    } catch (err) {
      console.error('Failed to mark review as helpful:', err);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading game details...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="container">
        <div className="error">{error || 'Game not found'}</div>
        <button onClick={() => navigate('/')}>← Back to Games</button>
      </div>
    );
  }

  return (
    <div className="container">
      <button 
        onClick={() => navigate('/')}
        style={{ marginBottom: '20px', padding: '8px 16px' }}
      >
        ← Back to Games
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
        <div>
          {/* Game Details */}
          <div className="card" style={{ marginBottom: '30px' }}>
            {game.image_url && (
              <img
                src={game.image_url}
                alt={game.title}
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}
              />
            )}

            <h1>{game.title}</h1>

            <div style={{ marginBottom: '20px' }}>
              <p><strong>Developer:</strong> {game.developer || 'Unknown'}</p>
              <p><strong>Genre:</strong> {game.genre || 'N/A'}</p>
              <p><strong>Release Date:</strong> {game.release_date ? new Date(game.release_date).toLocaleDateString() : 'N/A'}</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745', marginTop: '15px' }}>
                ${Number(game.price || 0).toFixed(2)}
              </p>
            </div>

            {game.description && (
              <div style={{ marginBottom: '20px' }}>
                <strong>Description:</strong>
                <p style={{ lineHeight: '1.6', color: '#555' }}>{game.description}</p>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              style={{
                backgroundColor: isInCart ? '#28a745' : '#007bff',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {isInCart ? '✓ In Cart' : 'Add to Cart'}
            </button>
          </div>

          {/* Reviews Section */}
          <div className="card">
            <h2>Reviews ({reviews.length})</h2>

            {/* Write/Edit Review Form */}
            {isAuthenticated && !isGuest && (
              <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                {!showReviewForm ? (
                  <button
                    onClick={() => {
                      if (userReview) {
                        handleEditReview();
                      } else {
                        setShowReviewForm(true);
                      }
                    }}
                    style={{
                      backgroundColor: userReview ? '#ffc107' : '#28a745',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      color: userReview ? 'black' : 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {userReview ? '✏️ Edit Your Review' : '⭐ Write a Review'}
                  </button>
                ) : (
                  <div>
                    <h3>{editingReviewId ? 'Edit Your Review' : 'Write a Review'}</h3>

                    <div style={{ marginBottom: '15px' }}>
                      <label><strong>Rating:</strong></label>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            style={{
                              fontSize: '24px',
                              backgroundColor: star <= rating ? '#ffc107' : '#ddd',
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              padding: '5px 10px'
                            }}
                          >
                            ⭐
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label><strong>Comment:</strong></label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your thoughts about this game..."
                        style={{
                          width: '100%',
                          height: '120px',
                          padding: '10px',
                          marginTop: '8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          fontFamily: 'Arial, sans-serif'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={handleSubmitReview}
                        disabled={submittingReview}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '10px 20px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {submittingReview ? 'Submitting...' : (editingReviewId ? 'Update Review' : 'Post Review')}
                      </button>
                      {editingReviewId && (
                        <button
                          onClick={() => handleDeleteReview(editingReviewId)}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Delete Review
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowReviewForm(false);
                          setEditingReviewId(null);
                          setRating(5);
                          setComment('');
                        }}
                        style={{
                          backgroundColor: '#6c757d',
                          color: 'white',
                          padding: '10px 20px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <div className="empty-state">No reviews yet. Be the first to review!</div>
            ) : (
              <div>
                {reviews.map(review => (
                  <div
                    key={review.id}
                    style={{
                      padding: '15px',
                      borderBottom: '1px solid #ddd',
                      marginBottom: '15px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                      <div>
                        <span className="review-rating" style={{ fontSize: '18px' }}>
                          {'⭐'.repeat(review.rating)}
                        </span>
                        <p style={{ margin: '5px 0', fontSize: '14px' }}>
                          <strong>{review.user_email}</strong>
                        </p>
                      </div>
                      <small style={{ color: '#999' }}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </small>
                    </div>

                    <p style={{ margin: '10px 0', color: '#555', lineHeight: '1.5' }}>
                      {review.comment}
                    </p>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        onClick={() => handleMarkAsHelpful(review.id)}
                        style={{
                          backgroundColor: '#e9ecef',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        👍 Helpful ({review.helpful_count || 0})
                      </button>
                      {isAuthenticated && review.user_id === user?.id && (
                        <>
                          <button
                            onClick={handleEditReview}
                            style={{
                              backgroundColor: '#ffc107',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            style={{
                              backgroundColor: '#dc3545',
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Sidebar */}
        <Cart 
          items={cart} 
          onRemoveItem={removeFromCart} 
          authToken={token} 
        />
      </div>
    </div>
  );
};

export default GameDetails;
