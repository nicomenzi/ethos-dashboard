import React, { useState, useEffect } from 'react';

const EthosDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Function to get color based on score
  const getScoreColor = (score) => {
    if (score >= 2000 && score <= 2800) return 'bg-green-800 text-white';
    if (score >= 1600 && score <= 1999) return 'bg-blue-800 text-white';
    if (score >= 1200 && score <= 1599) return 'bg-gray-400 text-black';
    if (score >= 800 && score <= 1199) return 'bg-yellow-800 text-white';
    return 'bg-red-800 text-white';
  };

  // Load user IDs from config file
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Fetch the config.json file from the public directory
        const response = await fetch('/config.json');
        if (!response.ok) {
          throw new Error('Failed to load configuration');
        }
        
        const config = await response.json();
        
        // Check if config has userIds
        if (!config.userIds || !Array.isArray(config.userIds)) {
          throw new Error('Invalid configuration: userIds not found or not an array');
        }
        
        // Format the user IDs and fetch user data
        const formattedIds = config.userIds.map(id => {
          if (typeof id === 'string' && id.startsWith('profileId:')) {
            return id;
          }
          return `profileId:${id}`;
        });
        
        fetchUsers(formattedIds);
        setConfigLoaded(true);
      } catch (err) {
        setError(`Configuration error: ${err.message}`);
        setLoading(false);
      }
    };
    
    loadConfig();
  }, []);

  // Fetch users from Ethos API
  const fetchUsers = async (userkeys) => {
    setLoading(true);
    try {
      const response = await fetch('https://api.ethos.network/api/v1/activities/actors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userkeys }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      if (data.ok && data.data) {
        setUsers(data.data);
      } else {
        throw new Error('Invalid response data');
      }
    } catch (err) {
      setError(`API error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">GEMS on Ethos</h1>
        
        {/* Color legend */}
        <div className="mb-6 grid grid-cols-5 gap-2 text-xs md:text-sm">
          <div className="bg-red-800 text-white p-2 rounded text-center">0-799</div>
          <div className="bg-yellow-800 text-white p-2 rounded text-center">800-1199</div>
          <div className="bg-gray-400 text-black p-2 rounded text-center">1200-1599</div>
          <div className="bg-blue-800 text-white p-2 rounded text-center">1699-1999</div>
          <div className="bg-green-800 text-white p-2 rounded text-center">2000-2800</div>
        </div>
        
        {/* Loading and error states */}
        {loading && <p className="text-center p-4 bg-white rounded shadow">Loading user data...</p>}
        {error && <p className="text-center text-red-500 p-4 bg-white rounded shadow">{error}</p>}
        
        {/* Ranked user list */}
        <div className="flex flex-col space-y-3">
          {users
            // Sort users by score in descending order
            .sort((a, b) => b.score - a.score)
            .map((user, index) => (
            <div 
              key={user.userkey} 
              className={`rounded-lg shadow-md overflow-hidden ${getScoreColor(user.score)} flex items-center`}
            >
              {/* Rank number */}
              <div className="bg-black bg-opacity-20 p-3 h-full flex items-center justify-center">
                <span className="font-bold text-xl w-8 text-center">{index + 1}</span>
              </div>
              
              <div className="p-3 flex-grow flex items-center">
                {/* Avatar */}
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name || 'User'} 
                    className="w-10 h-10 rounded-full mr-3"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 mr-3 flex items-center justify-center text-gray-800">
                    <span>?</span>
                  </div>
                )}
                
                {/* User info */}
                <div className="mr-4 flex-grow">
                  <h3 className="font-bold">{user.name || 'Anonymous User'}</h3>
                  <p className="text-sm opacity-80">
                    {user.username ? `@${user.username}` : 'No username'}
                  </p>
                </div>
                
                {/* Score */}
                <div className="text-right">
                  <span className="font-bold text-xl">{user.score}</span>
                  <div className="text-xs opacity-80">Multiplier: {user.scoreXpMultiplier}x</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        

      </div>
    </div>
  );
};

export default EthosDashboard;