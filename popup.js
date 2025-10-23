// Popup logic for word cloud generation

// Standard English stop words to exclude (comprehensive list)
const STOP_WORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can\'t', 'cannot', 'could', 'couldn\'t',
  'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
  'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
  'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it',
  'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my',
  'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t',
  'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some',
  'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re',
  'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were',
  'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which',
  'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would',
  'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours',
  'yourself', 'yourselves'
]);

// Color palette
const COLORS = ['#BC9CB0', '#88958D', '#D3CDD7', '#DDF2EB'];

// UI Elements
const generateBtn = document.getElementById('generate-btn');
const retryBtn = document.getElementById('retry-btn');
const downloadBtn = document.getElementById('download-btn');
const backBtn = document.getElementById('back-btn');
const settingsBtn = document.getElementById('settings-btn');
const backToMainBtn = document.getElementById('back-to-main-btn');
const initialState = document.getElementById('initial-state');
const settingsState = document.getElementById('settings-state');
const loadingState = document.getElementById('loading-state');
const wordCloudContainer = document.getElementById('word-cloud-container');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const statsDiv = document.getElementById('stats');
const body = document.body;
const wordLimitSlider = document.getElementById('word-limit');
const wordLimitInput = document.getElementById('word-limit-input');

// AI Filter Elements
const aiFilterToggle = document.getElementById('ai-filter-toggle');
const apiKeyStatus = document.getElementById('api-key-status');
const editApiKeyBtn = document.getElementById('edit-api-key-btn');
const apiKeyContainer = document.getElementById('api-key-container');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeyError = document.getElementById('api-key-error');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const aiPromptContainer = document.getElementById('ai-prompt-container');
const aiPrompt = document.getElementById('ai-prompt');
const charCount = document.getElementById('char-count');

// Storage keys
const STORAGE_KEYS = {
  API_KEY: 'openai_api_key',
  AI_FILTER_ENABLED: 'ai_filter_enabled',
  WORD_LIMIT: 'word_limit'
};

// Event Listeners
generateBtn.addEventListener('click', generateWordCloud);
retryBtn.addEventListener('click', () => {
  showState('initial');
  generateWordCloud();
});
downloadBtn.addEventListener('click', downloadWordCloud);
backBtn.addEventListener('click', () => {
  showState('initial');
});

// Update slider value display and save to storage
// Slider updates number input
wordLimitSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  wordLimitInput.value = value;
  // Save to storage
  chrome.storage.local.set({ [STORAGE_KEYS.WORD_LIMIT]: parseInt(value) });
});

// Number input updates slider
wordLimitInput.addEventListener('input', (e) => {
  let value = parseInt(e.target.value);
  const max = parseInt(wordLimitSlider.max);
  const min = parseInt(wordLimitSlider.min);
  
  // Clamp value to valid range
  if (value > max) value = max;
  if (value < min) value = min;
  if (isNaN(value)) return; // Don't update on invalid input while typing
  
  wordLimitSlider.value = value;
  
  // Save to storage
  chrome.storage.local.set({ [STORAGE_KEYS.WORD_LIMIT]: value });
});

// Validate and fix number input on blur
wordLimitInput.addEventListener('blur', (e) => {
  let value = parseInt(e.target.value);
  const max = parseInt(wordLimitSlider.max);
  const min = parseInt(wordLimitSlider.min);
  
  // Ensure valid value on blur
  if (isNaN(value) || value < min) value = min;
  if (value > max) value = max;
  
  wordLimitInput.value = value;
  wordLimitSlider.value = value;
  chrome.storage.local.set({ [STORAGE_KEYS.WORD_LIMIT]: value });
});

// AI Filter event listeners
aiFilterToggle.addEventListener('change', handleAIFilterToggle);
saveApiKeyBtn.addEventListener('click', saveAndValidateApiKey);
editApiKeyBtn.addEventListener('click', showApiKeyInput);

// Settings listeners
settingsBtn.addEventListener('click', () => {
  showState('settings');
});
backToMainBtn.addEventListener('click', () => {
  showState('initial');
});

// Character counter for AI prompt
aiPrompt.addEventListener('input', updateCharCount);
aiPrompt.addEventListener('paste', handlePaste);
aiPrompt.addEventListener('blur', sanitizeTextarea);

function sanitizeTextarea() {
  // Remove control characters and clean up the text
  let text = aiPrompt.value;
  
  // Remove null bytes and other control characters (except newlines, tabs, returns)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize whitespace (collapse multiple spaces/newlines)
  text = text.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
  text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  
  // Trim each line
  text = text.split('\n').map(line => line.trim()).join('\n');
  
  // Remove leading/trailing whitespace
  text = text.trim();
  
  if (text !== aiPrompt.value) {
    aiPrompt.value = text;
    updateCharCount();
  }
}

function updateCharCount() {
  const length = aiPrompt.value.length;
  charCount.textContent = length;
  
  // Change color when approaching limit
  if (length >= 240) {
    charCount.style.color = '#BC9CB0';
  } else {
    charCount.style.color = '#88958D';
  }
}

function handlePaste(e) {
  e.preventDefault();
  let pastedText = e.clipboardData.getData('text');
  
  // Sanitize pasted text - remove control characters
  pastedText = pastedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  const currentText = aiPrompt.value;
  const maxLength = 250;
  const selectionStart = aiPrompt.selectionStart;
  const selectionEnd = aiPrompt.selectionEnd;
  
  // Calculate how much space is available
  const beforeSelection = currentText.substring(0, selectionStart);
  const afterSelection = currentText.substring(selectionEnd);
  const availableSpace = maxLength - (beforeSelection.length + afterSelection.length);
  
  // Truncate pasted text if necessary
  const textToInsert = pastedText.substring(0, availableSpace);
  
  // Insert the text
  aiPrompt.value = beforeSelection + textToInsert + afterSelection;
  
  // Set cursor position
  const newCursorPos = selectionStart + textToInsert.length;
  aiPrompt.setSelectionRange(newCursorPos, newCursorPos);
  
  // Update character count
  updateCharCount();
}

// Initialize UI state from storage
initializeAIFilterUI();
initializeSliderValue();
updateCharCount();

// Tooltip modal functionality
initializeTooltips();

function showState(state, width, height) {
  initialState.classList.add('hidden');
  settingsState.classList.add('hidden');
  loadingState.classList.add('hidden');
  wordCloudContainer.classList.add('hidden');
  errorState.classList.add('hidden');
  
  switch(state) {
    case 'initial':
      body.style.width = '300px';
      body.style.height = 'auto';
      body.style.padding = '';
      initialState.classList.remove('hidden');
      break;
    case 'settings':
      body.style.width = '300px';
      body.style.height = 'auto';
      body.style.padding = '';
      settingsState.classList.remove('hidden');
      break;
    case 'loading':
      body.style.width = '500px';
      body.style.height = '350px';
      body.style.padding = '';
      loadingState.classList.remove('hidden');
      break;
    case 'wordcloud':
      body.style.width = (width || 500) + 'px';
      body.style.height = (height || 350) + 'px';
      body.style.padding = '0px';
      wordCloudContainer.classList.remove('hidden');
      break;
    case 'error':
      body.style.width = '300px';
      body.style.height = 'auto';
      body.style.padding = '';
      errorState.classList.remove('hidden');
      break;
  }
}

// AI Filter Functions
async function initializeAIFilterUI() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.API_KEY, STORAGE_KEYS.AI_FILTER_ENABLED]);
    const hasApiKey = !!result[STORAGE_KEYS.API_KEY];
    const filterEnabled = result[STORAGE_KEYS.AI_FILTER_ENABLED] || false;
    
    // Restore toggle state
    aiFilterToggle.checked = filterEnabled;
    
    // Set slider and input max based on AI filter state
    if (filterEnabled) {
      wordLimitSlider.max = 200;
      wordLimitInput.max = 200;
    } else {
      wordLimitSlider.max = 2000;
      wordLimitInput.max = 2000;
    }
    
    // Show/hide AI prompt textarea based on filter state
    if (filterEnabled) {
      aiPromptContainer.classList.remove('hidden');
      
      if (hasApiKey) {
        // Show "API key saved" status
        apiKeyStatus.classList.remove('hidden');
        apiKeyContainer.classList.add('hidden');
      } else {
        // Show API key input
        apiKeyStatus.classList.add('hidden');
        apiKeyContainer.classList.remove('hidden');
      }
    } else {
      // Hide prompt and both key sections when filter is off
      aiPromptContainer.classList.add('hidden');
      apiKeyStatus.classList.add('hidden');
      apiKeyContainer.classList.add('hidden');
    }
  } catch (error) {
    console.error('Failed to initialize AI filter UI:', error);
  }
}

async function initializeSliderValue() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.WORD_LIMIT]);
    const savedValue = result[STORAGE_KEYS.WORD_LIMIT];
    
    if (savedValue !== undefined) {
      wordLimitSlider.value = savedValue;
      wordLimitInput.value = savedValue;
    }
  } catch (error) {
    console.error('Failed to initialize slider value:', error);
  }
}

async function handleAIFilterToggle() {
  const isChecked = aiFilterToggle.checked;
  
  // Save toggle state
  await chrome.storage.local.set({ [STORAGE_KEYS.AI_FILTER_ENABLED]: isChecked });
  
  // Adjust slider max based on AI filter state
  if (isChecked) {
    // Limit to 200 words for optimal display and cost efficiency
    wordLimitSlider.max = 200;
    if (parseInt(wordLimitSlider.value) > 200) {
      wordLimitSlider.value = 200;
      wordLimitInput.value = 200;
      chrome.storage.local.set({ [STORAGE_KEYS.WORD_LIMIT]: 200 });
    }
    
    // Update number input max
    wordLimitInput.max = 200;
    
    // Trigger visual update
    wordLimitSlider.dispatchEvent(new Event('input'));
    
    // Show AI prompt textarea
    aiPromptContainer.classList.remove('hidden');
    
    // Check if API key exists
    const result = await chrome.storage.local.get([STORAGE_KEYS.API_KEY]);
    const hasApiKey = !!result[STORAGE_KEYS.API_KEY];
    
    if (hasApiKey) {
      // Show "API key saved" status
      apiKeyStatus.classList.remove('hidden');
      apiKeyContainer.classList.add('hidden');
    } else {
      // Show API key input
      apiKeyStatus.classList.add('hidden');
      apiKeyContainer.classList.remove('hidden');
    }
  } else {
    // Restore full range when AI filter is off
    wordLimitSlider.max = 2000;
    wordLimitInput.max = 2000;
    
    // Trigger visual update
    wordLimitSlider.dispatchEvent(new Event('input'));
    
    // Hide prompt textarea and both key sections
    aiPromptContainer.classList.add('hidden');
    apiKeyStatus.classList.add('hidden');
    apiKeyContainer.classList.add('hidden');
  }
}

function showApiKeyInput() {
  // Hide status, show input form
  apiKeyStatus.classList.add('hidden');
  apiKeyContainer.classList.remove('hidden');
  apiKeyInput.focus();
}

async function saveAndValidateApiKey() {
  const apiKey = apiKeyInput.value.trim();
  
  // Clear previous errors
  apiKeyError.classList.add('hidden');
  apiKeyInput.classList.remove('error');
  
  if (!apiKey) {
    showApiKeyError('Please enter an API key');
    return;
  }
  
  // Basic format validation
  if (!apiKey.startsWith('sk-')) {
    showApiKeyError('API key should start with "sk-"');
    return;
  }
  
  // Disable button and show loading state
  saveApiKeyBtn.disabled = true;
  saveApiKeyBtn.textContent = 'Validating...';
  
  try {
    // Test the API key with a minimal request
    const isValid = await validateApiKey(apiKey);
    
    if (isValid) {
      // Save API key
      await chrome.storage.local.set({ [STORAGE_KEYS.API_KEY]: apiKey });
      
      // Clear input, hide container, show status
      apiKeyInput.value = '';
      apiKeyContainer.classList.add('hidden');
      apiKeyStatus.classList.remove('hidden');
    } else {
      showApiKeyError('Invalid API key. Please check and try again.');
    }
  } catch (error) {
    showApiKeyError('Failed to validate API key: ' + error.message);
  } finally {
    saveApiKeyBtn.disabled = false;
    saveApiKeyBtn.textContent = 'Save & Validate';
  }
}

async function validateApiKey(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    return response.ok;
  } catch (error) {
    throw new Error('Network error. Please check your connection.');
  }
}

function showApiKeyError(message) {
  apiKeyError.textContent = message;
  apiKeyError.classList.remove('hidden');
  apiKeyInput.classList.add('error');
}

async function filterWordsWithAI(words, prompt) {
  const result = await chrome.storage.local.get([STORAGE_KEYS.API_KEY]);
  const apiKey = result[STORAGE_KEYS.API_KEY];
  
  if (!apiKey) {
    throw new Error('API key not found');
  }
  
  // Send all unique words to AI (limit 1000 for token constraints)
  // This allows AI to see the full context before user applies slider filter
  const wordList = words.slice(0, 1000).join(', ');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a text filtering assistant. Given a list of words and filtering criteria, return ONLY the words that match the criteria as a comma-separated list. Do not include explanations or additional text.'
        },
        {
          role: 'user',
          content: `Filter these words based on: "${prompt}"\n\nWords: ${wordList}\n\nReturn only the matching words as a comma-separated list.`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000  // Allow up to 1000 words in response (~2000 tokens)
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }
  
  const data = await response.json();
  const filteredText = data.choices[0].message.content.trim();
  
  // Parse the comma-separated response
  const filteredWords = filteredText
    .toLowerCase()
    .split(/[,\s]+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length >= 4);
  
  return filteredWords;
}

// Tooltip Modal Functions
function initializeTooltips() {
  const tooltipIcons = document.querySelectorAll('.info-icon[data-tooltip]');
  const tooltipCloseButtons = document.querySelectorAll('.tooltip-close');
  
  // Open tooltip on info icon click
  tooltipIcons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const tooltipId = icon.getAttribute('data-tooltip');
      const tooltip = document.getElementById(tooltipId);
      
      // Close any other open tooltips
      document.querySelectorAll('.tooltip.show').forEach(t => {
        if (t.id !== tooltipId) {
          t.classList.remove('show');
        }
      });
      
      // Toggle this tooltip
      tooltip.classList.toggle('show');
    });
  });
  
  // Close tooltip on X button click
  tooltipCloseButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const tooltip = button.closest('.tooltip');
      tooltip.classList.remove('show');
    });
  });
  
  // Close tooltip on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.tooltip.show').forEach(tooltip => {
        tooltip.classList.remove('show');
      });
    }
  });
  
  // Close tooltip when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tooltip') && !e.target.closest('.info-icon')) {
      document.querySelectorAll('.tooltip.show').forEach(tooltip => {
        tooltip.classList.remove('show');
      });
    }
  });
}

async function generateWordCloud() {
  showState('loading');
  
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we can access this page
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
      showError('Cannot access browser internal pages. Please try on a regular webpage.');
      return;
    }
    
    // Send message to content script to extract text
    // Use Promise-based approach (Manifest V3 compatible)
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractText' });
      
      if (!response) {
        showError('No response from content script. Please refresh the page.');
        return;
      }
      
      if (!response.success) {
        showError(response?.error || 'Failed to extract text from page');
        return;
      }
      
      const text = response.text;
      
      if (!text || text.trim().length === 0) {
        showError('No text found on this page');
        return;
      }
      
      // Process text and generate word cloud
      processAndRender(text);
    } catch (messageError) {
      showError('Could not access this page. Try refreshing the page and trying again.');
      return;
    }
  } catch (error) {
    showError('An error occurred: ' + error.message);
  }
}

async function processAndRender(text) {
  // Split text into words and clean
  let words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length >= 3) // Min length 3
    .filter(word => !STOP_WORDS.has(word)) // Remove stop words
    .filter(word => !/\d/.test(word)); // Remove words containing numbers
  
  const totalWords = words.length;
  
  if (totalWords === 0) {
    showError('Not enough valid words found on this page');
    return;
  }
  
  // Check if AI filtering is enabled
  const result = await chrome.storage.local.get([STORAGE_KEYS.AI_FILTER_ENABLED]);
  const aiFilterEnabled = result[STORAGE_KEYS.AI_FILTER_ENABLED] && aiFilterToggle.checked;
  
  // Sanitize and get prompt
  let prompt = aiPrompt.value.trim();
  // Remove any potentially dangerous characters for API safety
  prompt = prompt.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  
  // Validate prompt length (max 250 characters)
  const MAX_PROMPT_LENGTH = 250;
  if (prompt.length > MAX_PROMPT_LENGTH) {
    showError(`AI filter prompt is too long (${prompt.length}/${MAX_PROMPT_LENGTH} characters). Please shorten it.`);
    return;
  }
  
  if (aiFilterEnabled && prompt) {
    try {
      // Update loading message
      const loadingText = document.querySelector('#loading-state p');
      if (loadingText) loadingText.textContent = 'AI is filtering words...';
      
      // Get unique words for AI filtering
      const uniqueWords = [...new Set(words)];
      const filteredWords = await filterWordsWithAI(uniqueWords, prompt);
      
      if (filteredWords.length === 0) {
        showError('AI filtering returned no matching words. Try a different prompt.');
        return;
      }
      
      // Filter to only include AI-approved words
      const filteredSet = new Set(filteredWords);
      words = words.filter(word => filteredSet.has(word));
      
      if (loadingText) loadingText.textContent = 'Generating word cloud...';
    } catch (error) {
      showError('AI filtering failed: ' + error.message);
      return;
    }
  }
  
  // Count word frequencies
  const wordCounts = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  // Convert to array and sort by frequency
  const maxWords = parseInt(wordLimitSlider.value) || 300;
  const wordArray = Object.entries(wordCounts)
    .map(([text, size]) => ({ text, size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, maxWords); // Limit based on slider value - dynamically scaled to fit
  
  // Render the word cloud
  renderWordCloud(wordArray, totalWords);
}

function renderWordCloud(words, totalWords) {
  // Clear previous word cloud
  d3.select('#word-cloud').selectAll('*').remove();
  
  // Calculate dynamic size based on word count (1-2000)
  // Min: 500x350, Max: 800x550 (limited by browser popup constraints)
  const wordCount = words.length;
  const minWidth = 500, maxWidth = 800;
  const minHeight = 350, maxHeight = 550;
  const scale = Math.min(wordCount / 2000, 1); // Cap at 1 for 2000+ words
  
  let containerWidth = Math.round(minWidth + (maxWidth - minWidth) * scale);
  let containerHeight = Math.round(minHeight + (maxHeight - minHeight) * scale);
  
  // Browser popup maximum viewport constraints (Chrome/Edge/Firefox)
  const maxPopupWidth = 800;
  const maxPopupHeight = 600;
  
  // First, enforce browser popup limits
  containerWidth = Math.min(containerWidth, maxPopupWidth);
  containerHeight = Math.min(containerHeight, maxPopupHeight);
  
  // Then adjust for smaller screens - leave 40px margin
  const availableWidth = window.screen.availWidth - 40;
  const availableHeight = window.screen.availHeight - 100; // Extra space for browser chrome
  
  if (containerWidth > availableWidth || containerHeight > availableHeight) {
    const widthRatio = availableWidth / containerWidth;
    const heightRatio = availableHeight / containerHeight;
    const scaleDown = Math.min(widthRatio, heightRatio, 1);
    
    containerWidth = Math.round(containerWidth * scaleDown);
    containerHeight = Math.round(containerHeight * scaleDown);
  }
  
  const targetWidth = containerWidth - 20; // Account for padding
  const targetHeight = containerHeight - 40; // Account for padding and stats
  
  // Use a HUGE virtual canvas so d3 thinks all words will fit
  // Scale virtual canvas proportionally to target size
  const virtualMultiplier = 5;
  const virtualWidth = targetWidth * virtualMultiplier;
  const virtualHeight = targetHeight * virtualMultiplier;
  
  // Find min and max frequencies for scaling
  const maxFreq = d3.max(words, d => d.size);
  const minFreq = d3.min(words, d => d.size);
  
  // Create font size scale with good range for the virtual canvas
  const fontSize = d3.scaleLog()
    .domain([minFreq, maxFreq])
    .range([10, 60]);
  
  // Create word cloud layout on virtual canvas
  const layout = d3.layout.cloud()
    .size([virtualWidth, virtualHeight])
    .words(words)
    .padding(3)
    .rotate(() => 0)
    .font('Montserrat')
    .fontSize(d => fontSize(d.size))
    .spiral('rectangular')
    .timeInterval(10)
    .random(() => 0.5)
    .on('end', (placedWords) => draw(placedWords, targetWidth, targetHeight));
  
  layout.start();
  
  function draw(words, targetWidth, targetHeight) {
    // Filter out words that didn't get placed by d3-cloud
    const placedWords = words.filter(d => d.x !== undefined && d.y !== undefined);
    
    if (placedWords.length === 0) {
      showError('Unable to generate word cloud. Try a different page.');
      return;
    }
    
    // Calculate bounding box of all placed words on virtual canvas
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    placedWords.forEach(d => {
      // Approximate word dimensions
      const wordWidth = d.size * d.text.length * 0.6;
      const wordHeight = d.size;
      
      minX = Math.min(minX, d.x - wordWidth / 2);
      maxX = Math.max(maxX, d.x + wordWidth / 2);
      minY = Math.min(minY, d.y - wordHeight / 2);
      maxY = Math.max(maxY, d.y + wordHeight / 2);
    });
    
    const cloudWidth = maxX - minX;
    const cloudHeight = maxY - minY;
    const cloudCenterX = (minX + maxX) / 2;
    const cloudCenterY = (minY + maxY) / 2;
    
    // Calculate scale to fit virtual canvas cloud into target dimensions
    const padding = 20;
    const scaleX = (targetWidth - padding * 2) / cloudWidth;
    const scaleY = (targetHeight - padding * 2) / cloudHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
    
    const svg = d3.select('#word-cloud')
      .attr('width', targetWidth)
      .attr('height', targetHeight);
    
    // Translate to center, offset by cloud center, then scale
    const g = svg.append('g')
      .attr('transform', `translate(${targetWidth/2},${targetHeight/2}) scale(${scale}) translate(${-cloudCenterX},${-cloudCenterY})`);
    
    g.selectAll('text')
      .data(placedWords)
      .enter().append('text')
      .style('font-family', 'Montserrat')
      .style('font-size', d => `${d.size}px`)
      .style('fill', () => COLORS[Math.floor(Math.random() * COLORS.length)])
      .attr('text-anchor', 'middle')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .text(d => d.text)
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    
    // Update stats
    statsDiv.textContent = `Showing ${placedWords.length} unique words | ${totalWords} total words analyzed`;
    
    // Show the word cloud with dynamic size
    showState('wordcloud', containerWidth, containerHeight);
  }
}

function downloadWordCloud() {
  const svg = document.getElementById('word-cloud');
  const svgData = new XMLSerializer().serializeToString(svg);
  
  // Create a canvas to render the SVG
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size to match SVG
  const svgWidth = svg.getAttribute('width');
  const svgHeight = svg.getAttribute('height');
  canvas.width = svgWidth * 2; // 2x for better quality
  canvas.height = svgHeight * 2;
  
  // Create an image from the SVG data
  const img = new Image();
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  img.onload = function() {
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the SVG image scaled up for quality
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to PNG and download
    canvas.toBlob(function(blob) {
      const link = document.createElement('a');
      link.download = `wordcloud-${Date.now()}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      URL.revokeObjectURL(link.href);
    });
  };
  
  img.src = url;
}

function showError(message) {
  errorMessage.textContent = message;
  showState('error');
}
