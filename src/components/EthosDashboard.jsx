import React, { useState, useEffect } from 'react';

const EthosDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewsData, setReviewsData] = useState({});
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Toggle theme function
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Score filter ranges with updated labels
  const scoreRanges = [
    { min: 0, max: 799, label: 'Untrusted', color: 'bg-red-800' },
    { min: 800, max: 1199, label: 'Questionable', color: 'bg-yellow-800' },
    { min: 1200, max: 1599, label: 'Neutral', color: 'bg-gray-400' },
    { min: 1600, max: 1999, label: 'Reputable', color: 'bg-blue-800' },
    { min: 2000, max: 2800, label: 'Exemplary', color: 'bg-green-800' }
  ];

  // Function to get color based on score
  const getScoreColor = (score) => {
    if (score >= 2000 && score <= 2800) return 'bg-green-800 text-white';
    if (score >= 1600 && score <= 1999) return 'bg-blue-800 text-white';
    if (score >= 1200 && score <= 1599) return 'bg-gray-400 text-black';
    if (score >= 800 && score <= 1199) return 'bg-yellow-800 text-white';
    return 'bg-red-800 text-white';
  };

  // Toggle filter function
  const toggleFilter = (index) => {
    if (activeFilter === index) {
      setActiveFilter(null); // Deactivate filter if already active
    } else {
      setActiveFilter(index); // Activate new filter
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
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
        const usersWithAddresses = data.data.map(user => {
          // Check if user has primary address and add it, otherwise use empty string
          return {
            ...user,
            primaryAddress: user.primaryAddress || ''
          };
        });
        setUsers(usersWithAddresses);
        
        // After users are loaded, fetch review data
        fetchReviewsData(usersWithAddresses);
      } else {
        throw new Error('Invalid response data');
      }
    } catch (err) {
      setError(`API error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reviews data for all users
  const fetchReviewsData = async (usersData) => {
    setLoadingReviews(true);
    try {
      // Prepare arrays for bulk requests
      const profileIds = usersData
        .filter(user => user.profileId)
        .map(user => `profileId:${user.profileId}`);
      
      // Skip if no valid profile IDs
      if (profileIds.length === 0) {
        console.warn('No valid profile IDs found for review lookup');
        setLoadingReviews(false);
        return;
      }

      // Use profile IDs for both author and subject
      // Fetch reviews authored by users (using profile IDs instead of addresses)
      const authoredResponse = await fetch('https://api.ethos.network/api/v1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          author: usersData.filter(user => user.profileId).map(user => user.profileId),
          pagination: { limit: 1000, offset: 0 }
        }),
      });
      
      if (!authoredResponse.ok) {
        console.error('Author reviews response error:', await authoredResponse.text());
        throw new Error(`Author reviews API error: ${authoredResponse.status}`);
      }
      
      // Fetch reviews about users
      const receivedResponse = await fetch('https://api.ethos.network/api/v1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: profileIds,
          pagination: { limit: 1000, offset: 0 }
        }),
      });
      
      if (!receivedResponse.ok) {
        console.error('Subject reviews response error:', await receivedResponse.text());
        throw new Error(`Subject reviews API error: ${receivedResponse.status}`);
      }
      
      const authoredData = await authoredResponse.json();
      const receivedData = await receivedResponse.json();
      
      // Add logging to help debug API responses
      console.log('Authored reviews response:', authoredData);
      console.log('Received reviews response:', receivedData);
      
      // Process review data
      processReviewsData(usersData, authoredData, receivedData);
    } catch (err) {
      console.error('Reviews fetch error:', err);
      setError(`Reviews API error: ${err.message}`);
      // Continue without review data - don't let this block the app
      setReviewsData({});
    } finally {
      setLoadingReviews(false);
    }
  };

  // Process reviews data and calculate mutual reviews
  const processReviewsData = (usersData, authoredData, receivedData) => {
    const reviewsDataMap = {};
    
    // Create lookup maps
    const profileIdToUser = {};
    const profileIdToUserkey = {};
    
    usersData.forEach(user => {
      if (user.profileId) {
        profileIdToUser[user.profileId] = user;
        profileIdToUserkey[user.profileId] = user.userkey;
      }
    });
    
    // Initialize review stats for each user
    usersData.forEach(user => {
      reviewsDataMap[user.userkey] = {
        authored: 0,
        received: 0,
        reviewedUsers: new Set(),
        reviewedByUsers: new Set()
      };
    });
    
    // Process authored reviews
    if (authoredData.ok && authoredData.data && authoredData.data.values) {
      authoredData.data.values.forEach(review => {
        const authorId = review.authorId || review.author;
        // Find the user who authored this review
        const authorUserkey = profileIdToUserkey[authorId];
        
        if (authorUserkey) {
          // Increment authored count
          reviewsDataMap[authorUserkey].authored += 1;
          
          // Check if subject is another user in our list
          const subjectId = review.subjectId || review.subject;
          if (subjectId && subjectId.startsWith && subjectId.startsWith('profileId:')) {
            const cleanId = subjectId.replace('profileId:', '');
            const subjectUserkey = profileIdToUserkey[cleanId];
            
            if (subjectUserkey) {
              reviewsDataMap[authorUserkey].reviewedUsers.add(subjectUserkey);
            }
          }
        }
      });
    }
    
    // Process received reviews
    if (receivedData.ok && receivedData.data && receivedData.data.values) {
      receivedData.data.values.forEach(review => {
        const subjectId = review.subjectId || review.subject;
        let cleanSubjectId = subjectId;
        
        if (subjectId && subjectId.startsWith && subjectId.startsWith('profileId:')) {
          cleanSubjectId = subjectId.replace('profileId:', '');
        }
        
        const subjectUserkey = profileIdToUserkey[cleanSubjectId];
        
        if (subjectUserkey) {
          // Increment received count
          reviewsDataMap[subjectUserkey].received += 1;
          
          // Check if author is another user in our list
          const authorId = review.authorId || review.author;
          const authorUserkey = profileIdToUserkey[authorId];
          
          if (authorUserkey) {
            reviewsDataMap[subjectUserkey].reviewedByUsers.add(authorUserkey);
          }
        }
      });
    }
    
    // Convert Sets to counts
    Object.keys(reviewsDataMap).forEach(userkey => {
      reviewsDataMap[userkey].reviewedUsersCount = reviewsDataMap[userkey].reviewedUsers.size;
      reviewsDataMap[userkey].reviewedByUsersCount = reviewsDataMap[userkey].reviewedByUsers.size;
    });
    
    setReviewsData(reviewsDataMap);
  };

  // Filter users based on score range and search query
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
      if (searchQuery.trim() === '') return true;
      
      const query = searchQuery.toLowerCase();
      const name = (user.name || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      
      return name.includes(query) || username.includes(query);
    })
    // Sort users by score in descending order
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
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search users by name or username..."
            value={searchQuery}
            onChange={handleSearchChange}
            className={`w-full p-2 rounded-md ${
              darkMode 
                ? 'bg-[#2D2D29] text-[#C0BFB5] border-[#8D8D85] placeholder-[#8B8B89]' 
                : 'bg-[#CBCBC2] text-[#1F2126] border-[#7E7F7C] placeholder-[#5B5D5D]'
            } border`}
          />
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
        {(activeFilter !== null || searchQuery) && (
          <div className={`mb-4 flex justify-between items-center ${darkMode ? 'text-[#8D8D85]' : 'text-[#5B5D5D]'}`}>
            <div>
              {activeFilter !== null && (
                <span>Filtered by: {scoreRanges[activeFilter].label} ({scoreRanges[activeFilter].min}-{scoreRanges[activeFilter].max})</span>
              )}
              {searchQuery && activeFilter !== null && ' | '}
              {searchQuery && (
                <span>Search: "{searchQuery}"</span>
              )}
            </div>
            <button 
              onClick={() => {
                setActiveFilter(null);
                setSearchQuery('');
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
        {loadingReviews && <p className={`text-center p-4 rounded shadow ${darkMode ? 'bg-[#2D2D29] text-[#C0BFB5]' : 'bg-[#CBCBC2] text-[#1F2126]'}`}>Loading review data...</p>}
        {error && <p className={`text-center text-red-500 p-4 rounded shadow ${darkMode ? 'bg-[#2D2D29]' : 'bg-[#CBCBC2]'}`}>{error}</p>}
        
        {/* Results count */}
        {!loading && !error && (
          <p className={`mb-4 ${darkMode ? 'text-[#8D8D85]' : 'text-[#5B5D5D]'}`}>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
          </p>
        )}
        
        {/* Ranked user list - now uses filteredUsers */}
        <div className="flex flex-col space-y-3">
          {filteredUsers.map((user, index) => (
            <div 
              key={user.userkey} 
              className={`rounded-lg shadow-md overflow-hidden ${getScoreColor(user.score)} flex flex-col`}
            >
              <div className="flex items-center">
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
              
              {/* Review Stats Section */}
              {reviewsData[user.userkey] && (
                <div className={`px-4 pb-3 text-sm grid grid-cols-2 gap-x-4 gap-y-1 ${
                  user.score >= 1200 && user.score <= 1599 ? 'text-black/90' : 'text-white/90'
                }`}>
                  <div className="flex justify-between">
                    <span>Authored Reviews:</span>
                    <span className="font-semibold">{reviewsData[user.userkey].authored}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Received Reviews:</span>
                    <span className="font-semibold">{reviewsData[user.userkey].received}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reviewed in this list:</span>
                    <span className="font-semibold">{reviewsData[user.userkey].reviewedUsersCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reviewed by in this list:</span>
                    <span className="font-semibold">{reviewsData[user.userkey].reviewedByUsersCount}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          
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