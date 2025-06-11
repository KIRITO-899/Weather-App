/* ===================================================================
   WEATHER APP - JavaScript Functionality
   
   Features:
   - City weather search with OpenWeatherMap API
   - Voice search using Web Speech API  
   - Geolocation for current position weather
   - Temperature unit conversion (Celsius/Fahrenheit)
   - Dark/Light theme toggle with animations
   - Recent searches with localStorage persistence
   - Responsive error handling and user feedback
   =================================================================== */

// ===== API CONFIGURATION =====
const apiKey = 'c0ada96a7f7bde1821f8ae1d2697f971';  // OpenWeatherMap API key
const apiUrl = 'https://api.openweathermap.org/data/2.5/weather';  // Weather API endpoint

// ===== DOM ELEMENT REFERENCES =====
const searchInput = document.querySelector('#searchInput');           // City search input field
const searchButton = document.querySelector('#searchButton');         // Search submit button
const speechButton = document.querySelector('#speechButton');         // Voice search button
const locationButton = document.querySelector('#locationButton');     // Geolocation button
const weatherInfo = document.querySelector('#weatherInfo');           // Weather display container
const themeToggle = document.getElementById('themeToggle');           // Theme toggle button
const recentSearchesContainer = document.getElementById('recentSearches'); // Recent searches container

// ===== TEMPERATURE UNIT MANAGEMENT =====
// Get saved temperature unit from localStorage, default to metric (Celsius)
let currentUnit = localStorage.getItem('unit') || 'metric';
const toggleUnitButton = document.getElementById('toggleUnitButton');

// Set initial button text based on current unit
toggleUnitButton.textContent = currentUnit === 'metric' ? 'Switch to °F' : 'Switch to °C';

// ===== RECENT SEARCHES MANAGEMENT =====
// Load recent cities from localStorage, default to empty array if none exist
let recentCities = JSON.parse(localStorage.getItem('recentCities')) || [];

// Initialize recent searches display on page load
renderRecentSearches();

// Initialize digital clock
let currentTimezone = null; // Store current timezone for clock updates
updateClock();
setInterval(() => updateClock(currentTimezone), 1000); // Update every second with current timezone

/* ===================================================================
   WEATHER DATA DISPLAY FUNCTION
   
   Takes API response data and updates all UI elements with weather info.
   Uses template literal updates to existing HTML elements instead of 
   innerHTML for better performance and security.
   =================================================================== */
function displayWeather(data) {
  // Destructure API response data for easier access
  const { name, sys, main, weather, wind, timezone } = data;
  
  // Determine unit symbols based on current temperature unit setting
  const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
  const speedUnit = currentUnit === 'metric' ? 'm/s' : 'mph';

  // ===== UPDATE WEATHER INFORMATION ELEMENTS =====
  
  // Main weather condition (e.g., "Clear", "Cloudy", "Rain")
  document.getElementById('weatherCondition').textContent = weather[0].main;
  
  // Humidity percentage display and animated progress bar
  document.getElementById('humidityText').textContent = `Humidity ${main.humidity}%`;
  document.getElementById('humidityFill').style.width = `${main.humidity}%`;
  
  // Feels-like temperature with proper unit
  document.getElementById('feelsLikeTemp').textContent = `Feels ${Math.round(main.feels_like)}${tempUnit}`;
  
  // City/location name from API response
  document.getElementById('locationName').textContent = name;
  
  // Main temperature display (large rotating card)
  document.getElementById('tempValue').textContent = Math.round(main.temp);
  document.getElementById('tempUnit').textContent = tempUnit;
  
  // Weather icon update with fallback alt text
  const weatherIcon = document.getElementById('weatherIcon');
  const iconCode = weather[0].icon;
  
  // Use GIF for clear sky and light cloud conditions, PNG for others
  const gifConditions = ['01d', '01n', '02d', '02n', '03d', '03n'];
  let iconSrc;
  
  if (gifConditions.includes(iconCode)) {
    iconSrc = 'images/output-onlinegiftools (1).gif';
  } else {
    iconSrc = `images/${iconCode}.png`;
  }
  
  weatherIcon.src = iconSrc;
  weatherIcon.alt = weather[0].description;
  
  // Add error handling for missing icons
  weatherIcon.onerror = () => {
    weatherIcon.src = 'images/01d.png'; // Fallback to default icon
  };
  
  // ===== UI STATE MANAGEMENT =====
  
  // Hide any previously displayed error messages
  const errorElement = document.getElementById('errorMessage');
  if (errorElement) {
    errorElement.style.display = 'none';
  }
  
  // Show weather information container with smooth fade-in animation
  weatherInfo.classList.remove('weather-hidden');
  
  // Show temperature unit toggle button with slide-up animation
  toggleUnitButton.classList.add('show');
  
  // Store timezone and update clock to show location's time
  currentTimezone = timezone;
  updateClock(timezone);
  
  // Update location label
  document.getElementById('clockLocation').textContent = `${name} Time`;
}

/* ===================================================================
   ERROR HANDLING FUNCTION
   
   Displays user-friendly error messages and manages UI state during errors.
   Creates dynamic error element if it doesn't exist for better UX.
   =================================================================== */
function showError(message) {
  // Hide weather information display during error state
  weatherInfo.classList.add('weather-hidden');
  
  // Create or update error message element dynamically
  let errorElement = document.getElementById('errorMessage');
  if (!errorElement) {
    // Create new error element if it doesn't exist
    errorElement = document.createElement('p');
    errorElement.id = 'errorMessage';
    errorElement.style.cssText = 'color: red; text-align: center; margin-top: 2rem; font-size: 1.1rem;';
    // Insert error element after weatherInfo container
    weatherInfo.parentNode.insertBefore(errorElement, weatherInfo.nextSibling);
  }
  
  // Update error message text and ensure it's visible
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  
  // Hide temperature unit toggle button during error state
  toggleUnitButton.classList.remove('show');
  
  // Reset clock to local time when there's an error
  currentTimezone = null;
  updateClock();
  
  // Reset location label
  document.getElementById('clockLocation').textContent = 'Local Time';
}

/* ===================================================================
   WEATHER API FETCH FUNCTION
   
   Handles both city name searches and coordinate-based location queries.
   Uses modern fetch API with proper error handling and response validation.
   Supports both text city queries and geolocation coordinate objects.
   =================================================================== */
function getWeather(query) {
  // Build base API URL with API key and current temperature unit
  const base = `${apiUrl}?appid=${apiKey}&units=${currentUnit}`;
  
  // Determine query type and build appropriate URL
  const url = typeof query === 'string'
    ? `${base}&q=${query}`                              // City name search
    : `${base}&lat=${query.lat}&lon=${query.lon}`;      // Coordinate search

  // Fetch weather data with modern async/await pattern using .then()
  fetch(url)
    .then(response => {
      // Check if API response is successful (status 200-299)
      if (!response.ok) throw new Error("Location not found!");
      return response.json();  // Parse JSON response
    })
    .then(data => {
      // Successfully received weather data
      displayWeather(data);
      // Save city to recent searches only for text queries (not coordinates)
      if (typeof query === 'string') saveToRecent(query);
    })
    .catch(error => {
      // Handle any errors (network, API, parsing, etc.)
      showError(error.message);
    });
}

/* ===================================================================
   RECENT SEARCHES MANAGEMENT
   
   Saves searched cities to localStorage and manages the recent searches UI.
   Maintains a maximum of 5 recent cities with no duplicates.
   =================================================================== */
function saveToRecent(city) {
  // Clean and validate city name
  city = city.trim();
  
  // Don't save empty strings or duplicates
  if (!city || recentCities.includes(city)) return;
  
  // Add to beginning of array (most recent first)
  recentCities.unshift(city);
  
  // Keep only the 5 most recent cities
  recentCities = recentCities.slice(0, 5);
  
  // Persist to localStorage for next session
  localStorage.setItem('recentCities', JSON.stringify(recentCities));
  
  // Update the UI display
  renderRecentSearches();
}

/* ===================================================================
   RECENT SEARCHES UI RENDERER
   
   Dynamically creates clickable buttons for recent city searches.
   Provides quick access to previously searched locations.
   =================================================================== */
function renderRecentSearches() {
  // Clear existing recent search buttons
  recentSearchesContainer.innerHTML = '';
  
  // Create a button for each recent city
  recentCities.forEach(city => {
    const btn = document.createElement('button');
    btn.textContent = city;
    
    // Add click handler for re-searching the city
    btn.addEventListener('click', () => {
      // Update search input to show selected city
      searchInput.value = city;
      // Fetch weather data for the city
      getWeather(city);
    });
    
    // Add button to the container
    recentSearchesContainer.appendChild(btn);
  });
}

/* ===================================================================
   DIGITAL CLOCK FUNCTION
   
   Updates the digital clock with current time and date.
   Can show local time or location-specific time based on timezone offset.
   Formats time in 12-hour format with AM/PM indicator.
   =================================================================== */
function updateClock(timezoneOffset = null) {
  let now;
  
  if (timezoneOffset !== null) {
    // Calculate time for the searched location
    // timezoneOffset is in seconds, convert to milliseconds
    const utc = new Date().getTime() + (new Date().getTimezoneOffset() * 60000);
    now = new Date(utc + (timezoneOffset * 1000));
  } else {
    // Use local time
    now = new Date();
  }
  
  // Format time in 12-hour format with leading zeros
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  // Convert to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const formattedHours = hours.toString().padStart(2, '0');
  
  // Format date
  const options = { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  const formattedDate = now.toLocaleDateString('en-US', options);
  
  // Update clock elements
  document.getElementById('clockTime').textContent = `${formattedHours}:${minutes}:${seconds} ${ampm}`;
  document.getElementById('clockDate').textContent = formattedDate;
}

/* ===================================================================
   EVENT LISTENERS - USER INTERACTION HANDLERS
   =================================================================== */

// ===== SEARCH BUTTON CLICK HANDLER =====
searchButton.addEventListener('click', () => {
  const city = searchInput.value.trim();
  
  if (city) {
    // Valid city name entered, fetch weather data
    getWeather(city);
  } else {
    // Empty input, show user-friendly error
    showError("Please enter a city name.");
  }
});

// ===== VOICE SEARCH FUNCTIONALITY =====
// Uses Web Speech API for hands-free city input
speechButton.addEventListener('click', () => {
  // Check if browser supports speech recognition
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    // Initialize speech recognition with browser-specific constructor
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configure speech recognition settings
    recognition.lang = 'en-US';           // Set language to English (US)
    recognition.interimResults = false;   // Only return final results
    recognition.maxAlternatives = 1;      // Return only best match
    
    // Add visual feedback for listening state
    speechButton.classList.add('listening');
    
    // ===== SPEECH RECOGNITION EVENT HANDLERS =====
    
    recognition.onstart = () => {
      // Update placeholder to show listening state
      searchInput.placeholder = 'Listening...';
    };
    
    recognition.onresult = (event) => {
      // Extract speech transcript from results
      let transcript = event.results[0][0].transcript;
      
      // Clean transcript: remove trailing punctuation
      transcript = transcript.replace(/[.,!?]+$/, '').trim();
      
      // Update input field and search for weather
      searchInput.value = transcript;
      getWeather(transcript);
    };
    
    recognition.onerror = (event) => {
      // Handle speech recognition errors
      showError('Speech recognition error: ' + event.error);
      speechButton.classList.remove('listening');
      searchInput.placeholder = 'Enter city ';
    };
    
    recognition.onend = () => {
      // Clean up UI when recognition ends
      speechButton.classList.remove('listening');
      searchInput.placeholder = 'Enter city ';
    };
    
    // Start speech recognition
    recognition.start();
  } else {
    // Browser doesn't support speech recognition
    showError('Speech recognition not supported in this browser.');
  }
});

// ===== GEOLOCATION BUTTON HANDLER =====
// Uses browser's geolocation API to get current position weather
locationButton.addEventListener('click', () => {
  if (navigator.geolocation) {
    // Browser supports geolocation
    navigator.geolocation.getCurrentPosition(
      // Success callback
      pos => {
        // Get weather using latitude and longitude coordinates
        getWeather({ 
          lat: pos.coords.latitude, 
          lon: pos.coords.longitude 
        });
      },
      // Error callback
      () => {
        showError("Geolocation not allowed.");
      }
    );
  } else {
    // Browser doesn't support geolocation
    showError("Geolocation not supported.");
  }
});

// ===== TEMPERATURE UNIT TOGGLE HANDLER =====
// Switches between Celsius and Fahrenheit with automatic data refresh
toggleUnitButton.addEventListener('click', () => {
  // Toggle between metric (Celsius) and imperial (Fahrenheit)
  currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
  
  // Save preference to localStorage for persistence
  localStorage.setItem('unit', currentUnit);
  
  // Update button text to show next available unit
  toggleUnitButton.textContent = currentUnit === 'metric' ? 'Switch to °F' : 'Switch to °C';

  // Re-fetch weather data with new units if weather is currently displayed
  const locationName = document.getElementById('locationName');
  if (locationName && !weatherInfo.classList.contains('weather-hidden')) {
    const cityName = locationName.textContent.trim();
    getWeather(cityName);  // Refresh weather data with new units
  }
});

/* ===================================================================
   THEME MANAGEMENT - DARK/LIGHT MODE TOGGLE
   
   Features advanced animated theme switching with:
   - Expanding circle animation from button position
   - Random button repositioning after each toggle
   - Smooth color transitions and localStorage persistence
   =================================================================== */

// ===== THEME INITIALIZATION =====
// Apply saved theme preference on page load
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

// ===== THEME TOGGLE BUTTON POSITIONING =====
// Track current button position for random repositioning
let currentEdgeIndex = 1; // Start at top-right corner

// ===== ANIMATED THEME TOGGLE HANDLER =====
themeToggle.addEventListener('click', (e) => {
  // ===== CAPTURE BUTTON POSITION FOR ANIMATION =====
  // Get button's center coordinates before it moves
  const rect = themeToggle.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  
  // ===== DETERMINE ANIMATION COLOR =====
  // Choose burst color based on current theme (opposite of target theme)
  const isCurrentlyDark = document.body.classList.contains('dark');
  const burstClass = isCurrentlyDark ? 'light-burst' : 'dark-burst';
  
  // ===== POSITION EXPANDING CIRCLE ANIMATION =====
  // Center the expanding animation at the button's current position
  themeToggle.style.left = x - 16 + 'px';
  themeToggle.style.top = y - 16 + 'px';
  
  // ===== START EXPANDING BALLOON ANIMATION =====
  document.body.classList.add('transitioning');  // Prevent scrolling during animation
  themeToggle.classList.add('expanding', burstClass);
  
  // ===== THEME SWITCH TIMING =====
  // Switch theme partway through balloon animation for smooth transition
  setTimeout(() => {
    document.body.classList.toggle('dark');
    // Save new theme preference to localStorage
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  }, 90);  // 90ms delay for visual continuity
  
  // ===== CLEANUP AND BUTTON REPOSITIONING =====
  setTimeout(() => {
    // Remove animation classes
    themeToggle.classList.remove('expanding', 'light-burst', 'dark-burst');
    document.body.classList.remove('transitioning');
    
    // ===== RANDOM BUTTON POSITION SYSTEM =====
    // Define all possible button positions around screen edges
    const edges = [
      { left: '20px', right: 'auto', top: '20px', bottom: 'auto' },     // 0: top-left
      { left: 'auto', right: '20px', top: '20px', bottom: 'auto' },     // 1: top-right  
      { left: '20px', right: 'auto', top: 'auto', bottom: '20px' },     // 2: bottom-left
      { left: 'auto', right: '20px', top: 'auto', bottom: '20px' },     // 3: bottom-right
      { left: '20px', right: 'auto', top: '50%', bottom: 'auto' },      // 4: middle-left
      { left: 'auto', right: '20px', top: '50%', bottom: 'auto' },      // 5: middle-right
      { left: '50%', right: 'auto', top: '20px', bottom: 'auto' },      // 6: top-center
      { left: '50%', right: 'auto', top: 'auto', bottom: '20px' }       // 7: bottom-center
    ];
    
    // ===== SELECT RANDOM NEW POSITION =====
    // Filter out current position and pick random new one
    const availableEdges = edges.filter((_, i) => i !== currentEdgeIndex);
    const newPosition = availableEdges[Math.floor(Math.random() * availableEdges.length)];
    currentEdgeIndex = edges.indexOf(newPosition);
    
    // ===== APPLY NEW POSITION WITH SMOOTH TRANSITION =====
    Object.assign(themeToggle.style, {
      position: 'fixed',
      left: newPosition.left,
      right: newPosition.right,
      top: newPosition.top,
      bottom: newPosition.bottom,
      transition: 'all 0.5s ease-out'  // Smooth movement to new position
    });
  }, 300);  // 300ms total animation duration
});
