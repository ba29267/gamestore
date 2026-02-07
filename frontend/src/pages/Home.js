import React, { useState, useEffect, useRef } from 'react';
import gameService from '../services/gameService';
import { useAuth } from '../context/AuthContext';
import GameCard from '../components/GameCard';
import Cart from '../components/Cart';

const ITEMS_PER_PAGE = 20;

export const Home = () => {
  const [allGames, setAllGames] = useState([]);
  const [displayedGames, setDisplayedGames] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('cart') || '[]'));
  const observerTarget = useRef(null);
  const { user, token, guestLogin, isAuthenticated } = useAuth();

  // Initial load of games with pagination
  useEffect(() => {
    fetchGames(1);
    // Auto-login as guest if not authenticated
    if (!isAuthenticated && !localStorage.getItem('token')) {
      guestLogin().catch(() => {
        // Silent fail for guest login
      });
    }
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !searching && searchTerm === '') {
          setPage(prevPage => prevPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loading, searching, searchTerm]);

  // Load more games when page changes
  useEffect(() => {
    if (page > 1 && searchTerm === '') {
      fetchGames(page);
    }
  }, [page]);

  const fetchGames = async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      }
      
      const offset = (pageNum - 1) * ITEMS_PER_PAGE;
      const response = await gameService.getAllGames(offset, ITEMS_PER_PAGE);
      
      // Handle different response structures
      let gamesList = [];
      if (Array.isArray(response.data)) {
        gamesList = response.data;
      } else if (response.data.games && Array.isArray(response.data.games)) {
        gamesList = response.data.games;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        gamesList = response.data.data;
      } else {
        console.warn('Unexpected response structure:', response.data);
        gamesList = [];
      }
      
      if (pageNum === 1) {
        setAllGames(gamesList);
        setDisplayedGames(gamesList);
      } else {
        setAllGames(prev => [...prev, ...gamesList]);
        setDisplayedGames(prev => [...prev, ...gamesList]);
      }
      
      setHasMore(gamesList.length === ITEMS_PER_PAGE);
      setError('');
    } catch (err) {
      setError('Failed to load games');
      console.error(err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setPage(1);

    if (term === '') {
      setSearchResults([]);
      setDisplayedGames(allGames);
      setSearching(false);
    } else {
      try {
        setSearching(true);
        const response = await gameService.searchGames(term);
        
        // Handle different response structures
        let gamesList = [];
        if (Array.isArray(response.data)) {
          gamesList = response.data;
        } else if (response.data.games && Array.isArray(response.data.games)) {
          gamesList = response.data.games;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          gamesList = response.data.data;
        } else {
          console.warn('Unexpected search response structure:', response.data);
          gamesList = [];
        }
        
        setSearchResults(gamesList);
        setDisplayedGames(gamesList);
        setError('');
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search games');
        setDisplayedGames([]);
      } finally {
        setSearching(false);
      }
    }
  };

  const addToCart = (game) => {
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

  return (
    <div className="container">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
        <div>
          <h2>Games Store</h2>
          <div className="form-group">
            <input
              type="text"
              placeholder="Search games..."
              value={searchTerm}
              onChange={handleSearch}
              style={{
                padding: '10px',
                marginBottom: '20px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                width: '100%'
              }}
            />
          </div>

          {error && <div className="error">{error}</div>}

          {loading && page === 1 ? (
            <div className="loading">Loading games...</div>
          ) : displayedGames.length === 0 ? (
            <div className="empty-state">{searchTerm ? 'No games found matching your search' : 'No games found'}</div>
          ) : (
            <>
              <div className="game-grid">
                {displayedGames.map(game => (
                  <GameCard
                    key={game.id}
                    game={game}
                  />
                ))}
              </div>
              
              {searchTerm === '' && (
                <>
                  <div ref={observerTarget} style={{ padding: '20px', textAlign: 'center' }}>
                    {loading ? (
                      <div className="loading">Loading more games...</div>
                    ) : hasMore ? (
                      <div className="empty-state">Scroll to load more games</div>
                    ) : (
                      <div className="empty-state">No more games to load</div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div>
          <Cart
            items={cart}
            onRemoveItem={removeFromCart}
            authToken={token}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
