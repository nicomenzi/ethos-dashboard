import React, { useState, useEffect, useCallback } from 'react';

const EthosDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Toggle theme function
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Score filter ranges with updated labels and text colors
  const scoreRanges = [
    { min: 0, max: 799, label: 'Untrusted', color: 'bg-red-800', textColor: 'text-white' },
    { min: 800, max: 1199, label: 'Questionable', color: 'bg-yellow-800', textColor: 'text-white' },
    { min: 1200, max: 1599, label: 'Neutral', color: 'bg-gray-400', textColor: 'text-black' },
    { min: 1600, max: 1799, label: 'Reputable I', color: 'bg-blue-800', textColor: 'text-white' },
    { min: 1800, max: 1999, label: 'Reputable II', color: 'bg-blue-800', textColor: 'text-white' },
    { min: 2000, max: 2199, label: 'Exemplary I', color: 'bg-green-800', textColor: 'text-white' },
    { min: 2200, max: 2399, label: 'Exemplary II', color: 'bg-green-800', textColor: 'text-white' },
    { min: 2400, max: 2599, label: 'Revered I', color: 'bg-purple-800', textColor: 'text-white' },
    { min: 2600, max: 2800, label: 'Revered II', color: 'bg-purple-800', textColor: 'text-white' }
  ];

  // Function to find score range - replaces getScoreColor
  const getScoreRange = (score) => {
    return scoreRanges.find(range => score >= range.min && score <= range.max) || 
           { color: 'bg-red-800', textColor: 'text-white' }; // Default if no range matches
  };

  // Toggle filter function
  const toggleFilter = (index) => {
    if (activeFilter === index) {
      setActiveFilter(null); // Deactivate filter if already active
    } else {
      setActiveFilter(index); // Activate new filter
    }
  };

  // Handle search input change with debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  // Debounce search query to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
        // Deduplicate users by profileId before setting state
        const uniqueUsers = [];
        const seenProfileIds = new Set();
        
        data.data.forEach(user => {
          if (user.profileId && !seenProfileIds.has(user.profileId)) {
            seenProfileIds.add(user.profileId);
            uniqueUsers.push(user);
          } else if (!user.profileId) {
            // Include users without profileId but use userkey for deduplication
            if (!seenProfileIds.has(user.userkey)) {
              seenProfileIds.add(user.userkey);
              uniqueUsers.push(user);
            }
          }
        });
        
        setUsers(uniqueUsers);
      } else {
        throw new Error('Invalid response data');
      }
    } catch (err) {
      setError(`API error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on score range and search query - with additional deduplication
  const filteredUsers = users
    .filter(user => {
      // Apply score filter if active
      if (activeFilter !== null) {
        const range = scoreRanges[activeFilter];
        return user.score >= range.min && user.score <= range.max;
      }
      return true;
    })
    .filter(user => {
      // Apply search filter if there's a query
      if (!debouncedSearchQuery || debouncedSearchQuery.trim() === '') return true;
      
      const query = debouncedSearchQuery.toLowerCase().trim();
      
      // Only search by username field
      const username = (user.username || '').toLowerCase();
      
      // Check if username contains the query
      return username.includes(query);
    })
    // Sort users by score in descending order - this maintains the order even after filtering
    .sort((a, b) => b.score - a.score);

  return (
    <div className={`min-h-screen p-4 transition-colors duration-200 ${darkMode ? 'bg-[#232320]' : 'bg-[#C1C0B6]'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-[#C0BFB5]' : 'text-[#1F2126]'}`}>
            Gems on Ethos
          </h1>
          <button 
            onClick={toggleTheme} 
            className={`px-3 py-1 rounded-md ${darkMode ? 'bg-[#2D2D29] text-[#C0BFB5]' : 'bg-[#CBCBC2] text-[#1F2126]'}`}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Search bar */}
        <div className="mb-4 relative">
          <input
            type="text"
            placeholder="Search users by username..."
            value={searchQuery}
            onChange={handleSearchChange}
            className={`w-full p-2 rounded-md ${
              darkMode 
                ? 'bg-[#2D2D29] text-[#C0BFB5] border-[#8D8D85] placeholder-[#8B8B89]' 
                : 'bg-[#CBCBC2] text-[#1F2126] border-[#7E7F7C] placeholder-[#5B5D5D]'
            } border`}
          />
          {searchQuery && (
            <button 
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${
                darkMode ? 'text-[#8D8D85]' : 'text-[#5B5D5D]'
              }`}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Color legend with updated labels */}
        <div className="mb-6 grid grid-cols-5 gap-2 text-xs md:text-sm">
          {scoreRanges.map((range, index) => (
            <button
              key={index}
              onClick={() => toggleFilter(index)}
              className={`${range.color} ${range.color === 'bg-gray-400' ? 'text-black' : 'text-white'} p-2 rounded text-center transition-all duration-200 ${
                activeFilter === index ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-500' : ''
              }`}
            >
              {range.label}
              {activeFilter === index && ' ✓'}
            </button>
          ))}
        </div>
        
        {/* Filter indicator with updated labels */}
        {(activeFilter !== null || debouncedSearchQuery) && (
          <div className={`mb-4 flex justify-between items-center ${darkMode ? 'text-[#8D8D85]' : 'text-[#5B5D5D]'}`}>
            <div>
              {activeFilter !== null && (
                <span>Filtered by: {scoreRanges[activeFilter].label} ({scoreRanges[activeFilter].min}-{scoreRanges[activeFilter].max})</span>
              )}
              {debouncedSearchQuery && activeFilter !== null && ' | '}
              {debouncedSearchQuery && (
                <span>Search: "{debouncedSearchQuery}"</span>
              )}
            </div>
            <button 
              onClick={() => {
                setActiveFilter(null);
                setSearchQuery('');
                setDebouncedSearchQuery('');
              }}
              className={`text-sm px-2 py-1 rounded ${
                darkMode ? 'bg-[#2D2D29] text-[#C0BFB5]' : 'bg-[#CBCBC2] text-[#1F2126]'
              }`}
            >
              Clear Filters
            </button>
          </div>
        )}
        
        {/* Loading and error states */}
        {loading && <p className={`text-center p-4 rounded shadow ${darkMode ? 'bg-[#2D2D29] text-[#C0BFB5]' : 'bg-[#CBCBC2] text-[#1F2126]'}`}>Loading user data...</p>}
        {error && <p className={`text-center text-red-500 p-4 rounded shadow ${darkMode ? 'bg-[#2D2D29]' : 'bg-[#CBCBC2]'}`}>{error}</p>}
        
        {/* Results count */}
        {!loading && !error && (
          <p className={`mb-4 ${darkMode ? 'text-[#8D8D85]' : 'text-[#5B5D5D]'}`}>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
          </p>
        )}
        
        {/* Ranked user list - now uses filteredUsers */}
        <div className="flex flex-col space-y-3">
          {filteredUsers.map((user, index) => {
            const userScoreRange = getScoreRange(user.score);
            return (
              <div 
                key={`${user.profileId || user.userkey}-${index}`} 
                className={`rounded-lg shadow-md overflow-hidden ${userScoreRange.color} ${userScoreRange.textColor} flex items-center`}
              >
                {/* Rank number */}
                <div className="p-3 h-full flex items-center justify-center">
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
                    <div className={`w-10 h-10 rounded-full mr-3 flex items-center justify-center ${darkMode ? 'bg-[#2D2D29] text-[#8D8D85]' : 'bg-[#CBCBC2] text-[#5B5D5D]'}`}>
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
            );
          })}
          
          {!loading && filteredUsers.length === 0 && (
            <p className={`text-center p-4 rounded shadow ${darkMode ? 'bg-[#2D2D29] text-[#C0BFB5]' : 'bg-[#CBCBC2] text-[#1F2126]'}`}>
              No users found matching your criteria.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EthosDashboard;