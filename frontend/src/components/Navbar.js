import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isGuest = user?.role?.toUpperCase() === 'GUEST';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <h1>
        <a href="/" style={{ cursor: 'pointer', color: 'white' }}>
          🎮 GameStore
        </a>
      </h1>
      <ul className="nav-links">
        <li><a href="/">Home</a></li>
        {isAuthenticated && !isGuest && (
          <>
            <li><a href="/orders">Orders</a></li>
            {user?.role?.toUpperCase() === 'ADMIN' && (
              <>
                <li><a href="/reviews">Reviews</a></li>
                <li>
                  <button 
                    onClick={() => navigate('/admin')}
                    style={{ backgroundColor: '#dc3545', padding: '8px 16px' }}
                  >
                    📊 Admin Dashboard
                  </button>
                </li>
              </>
            )}
            <li>
              <span style={{ color: '#ffd700' }}>
                Welcome, <strong>{user?.username || user?.email || 'User'}</strong>
              </span>
            </li>
            <li>
              <button className="btn-logout" onClick={handleLogout}>
                Logout
              </button>
            </li>
          </>
        )}
        {isGuest && (
          <>
            <li>
              <span style={{ color: '#ffd700' }}>
                <strong>Guest User</strong>
              </span>
            </li>
            <li><a href="/login"><button>Login</button></a></li>
            <li><a href="/register"><button style={{ backgroundColor: '#28a745' }}>Register</button></a></li>
          </>
        )}
        {!isAuthenticated && (
          <>
            <li><a href="/login"><button>Login</button></a></li>
            <li><a href="/register"><button style={{ backgroundColor: '#28a745' }}>Register</button></a></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
