import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import reviewsService from '../services/reviewsService';

export const Reviews = () => {
  const [myReviews, setMyReviews] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'all'
  const { user, token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchReviews();
    }
  }, [token, isAuthenticated]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      // Fetch all reviews to filter
      const response = await reviewsService.getAllReviews(token);
      
      let allReviewsList = [];
      if (Array.isArray(response.data)) {
        allReviewsList = response.data;
      } else if (response.data.reviews && Array.isArray(response.data.reviews)) {
        allReviewsList = response.data.reviews;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        allReviewsList = response.data.data;
      } else {
        console.warn('Unexpected reviews response:', response.data);
        allReviewsList = [];
      }
      
      // Filter to get only current user's reviews
      const userReviewsList = allReviewsList.filter(review => review.user_id === user?.id);
      
      setMyReviews(userReviewsList);
      setAllReviews(allReviewsList);
      setError('');
    } catch (err) {
      setError('Failed to load reviews');
      console.error(err);
      setMyReviews([]);
      setAllReviews([]);
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
      fetchReviews();
    } catch (err) {
      setError('Failed to delete review');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="card">
          <p>Please login to view your reviews.</p>
          <a href="/login">
            <button>Login</button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Reviews</h2>

      <div style={{ marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('my')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: activeTab === 'my' ? '#007bff' : '#ddd',
            color: activeTab === 'my' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          My Reviews ({myReviews.length})
        </button>
        {allReviews.length > 0 && (
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'all' ? '#007bff' : '#ddd',
              color: activeTab === 'all' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            All Reviews ({allReviews.length})
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading reviews...</div>
      ) : activeTab === 'my' ? (
        myReviews.length === 0 ? (
          <div className="empty-state">
            <p>You have no reviews yet</p>
            <p style={{ fontSize: '12px', color: '#999' }}>
              Go to home page and click "Write Review" on any game to get started!
            </p>
          </div>
        ) : (
          <div className="reviews">
            {myReviews.map(review => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <h3>{review.game_title || 'Game'}</h3>
                  <div>
                    <span className="review-rating">
                      {'⭐'.repeat(review.rating)}
                    </span>
                  </div>
                </div>
                <p className="review-text">{review.comment}</p>
                <small style={{ color: '#999' }}>
                  {new Date(review.created_at).toLocaleDateString()}
                </small>
                {review.user_id === user?.id && (
                  <button
                    onClick={() => deleteReview(review.id)}
                    style={{
                      backgroundColor: '#dc3545',
                      padding: '5px 10px',
                      fontSize: '12px',
                      marginTop: '10px'
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        allReviews.length === 0 ? (
          <div className="empty-state">No reviews found</div>
        ) : (
          <div className="reviews">
            {allReviews.map(review => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <h3>{review.game_title || 'Game'}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="review-rating">
                      {'⭐'.repeat(review.rating)}
                    </span>
                    <small style={{ color: '#999' }}>
                      By {review.user_email || 'Anonymous'} {review.user_id === user?.id ? '(You)' : ''}
                    </small>
                  </div>
                </div>
                <p className="review-text">{review.comment}</p>
                <small style={{ color: '#999' }}>
                  {new Date(review.created_at).toLocaleDateString()}
                </small>
                {review.user_id === user?.id && (
                  <button
                    onClick={() => deleteReview(review.id)}
                    style={{
                      backgroundColor: '#dc3545',
                      padding: '5px 10px',
                      fontSize: '12px',
                      marginTop: '10px'
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default Reviews;
