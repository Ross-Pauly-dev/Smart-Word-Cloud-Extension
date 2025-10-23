// Content script to extract visible text from the webpage

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractText") {
    
    // Extract text synchronously and send response
    try {
      const text = extractVisibleText();
      const response = { success: true, text: text };
      
      // Send response immediately (synchronous)
      sendResponse(response);
      
      return true; // Keep channel open just in case
    } catch (error) {
      const errorResponse = { success: false, error: error.message };
      sendResponse(errorResponse);
      return true;
    }
  }
  
  return false; // Don't keep channel open for other messages
});

function extractVisibleText() {
  // Get all text nodes that are visible
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip if parent is script, style, or other non-visible elements
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        const tagName = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'iframe', 'object'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Check if element is visible
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || 
            style.visibility === 'hidden' || 
            style.opacity === '0') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Check if text node has actual content
        if (node.textContent.trim().length === 0) {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let text = '';
  let node;
  
  while (node = walker.nextNode()) {
    text += node.textContent + ' ';
  }
  
  return text.trim();
}
