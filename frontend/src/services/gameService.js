import axios from 'axios';

const GAME_SERVICE_URL = process.env.REACT_APP_GAME_SERVICE_URL || 'http://localhost:3002';

const gameApi = axios.create({
  baseURL: `${GAME_SERVICE_URL}`,
  timeout: 10000,
});

export const gameService = {
  getAllGames: (offset = 0, limit = 20) => {
    return gameApi.get(`/api/v1/games?offset=${offset}&limit=${limit}`);
  },

  getGameById: (id) => {
    return gameApi.get(`/api/v1/games/${id}`);
  },

  searchGames: (query) => {
    return gameApi.get(`/api/v1/games/search?q=${query}`);
  },

  getGamesByGenre: (genre) => {
    // Note: Backend doesn't have genre filter, use search instead
    return gameApi.get(`/api/v1/games/search?q=${genre}`);
  },

  getGamesByDeveloper: (developer) => {
    // Note: Backend doesn't have developer filter, use search instead
    return gameApi.get(`/api/v1/games/search?q=${developer}`);
  }
};

export default gameService;
