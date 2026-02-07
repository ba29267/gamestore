import React from 'react';
import { useNavigate } from 'react-router-dom';

const GameCard = ({ game }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/game/${game.id}`);
  };

  return (
    <div 
      className="game-card"
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      {game.image_url && (
        <img
          src={game.image_url}
          alt={game.title}
          style={{
            width: '100%',
            height: '200px',
            objectFit: 'cover',
            borderRadius: '4px',
            marginBottom: '10px'
          }}
        />
      )}
      <h3>{game.title}</h3>
      <p style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
        Released: {game.release_date ? new Date(game.release_date).toLocaleDateString() : 'N/A'}
      </p>
      <div className="game-price">
        ${Number(game.price || 0).toFixed(2)}
      </div>
    </div>
  );
};

export default GameCard;
