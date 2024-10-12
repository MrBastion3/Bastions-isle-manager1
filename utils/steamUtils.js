const axios = require('axios');

module.exports = {
  isPlayerLoggedIn: async (steam64Id) => {
    try {
      const response = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steam64Id}`);
      const player = response.data.response.players[0];
      const isleGameId = '376210'; // The Isle's Steam App ID
      // Check if the player is logged into The Isle and potentially on a specific server
      return player.gameid === isleGameId && player.gameserverip ? true : false;
    } catch (error) {
      console.error('Error checking player login status:', error);
      return false;
    }
  }
};
