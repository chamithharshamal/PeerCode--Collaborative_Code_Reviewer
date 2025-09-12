/**
 * Debug Test for AI Features
 * This script helps debug the specific issues with suggestions and debates
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to make API calls with detailed logging
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`🔍 Making request to: ${url}`);
  console.log(`📤 Request options:`, JSON.stringify(options, null, 2));
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    const data = await response.json();
    
    console.log(`📥 Response status: ${response.status}`);
    console.log(`📥 Response data:`, JSON.stringify(data, null, 2));
    
    return {
      status: response.status,
      data,
      ok: response.ok
    };
  } catch (error) {
    console.log(`❌ Request error:`, error.message);
    return {
      status: 0,
      data: { error: error.message },
      ok: false
    };
  }
}

async function debugSuggestionCreation() {
  console.log('\n🔍 DEBUGGING SUGGESTION CREATION');
  console.log('=' .repeat(50));
  
  // First, get a token
  console.log('\n1. Getting authentication token...');
  const loginResult = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword123'
    })
  });
  
  if (!loginResult.ok) {
    console.log('❌ Login failed, trying registration...');
    const registerResult = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });
    
    if (!registerResult.ok) {
      console.log('❌ Both login and registration failed');
      return;
    }
    
    var token = registerResult.data.accessToken;
  } else {
    var token = loginResult.data.accessToken;
  }
  
  console.log('✅ Got token:', token ? 'Yes' : 'No');
  
  // Now try to create a suggestion
  console.log('\n2. Creating suggestion...');
  const suggestionData = {
    codeSnippetId: 'test-code-1',
    sessionId: 'test-session-1',
    type: 'improvement',
    category: 'performance',
    severity: 'medium',
    title: 'Use reduce instead of for loop',
    description: 'The for loop can be replaced with Array.reduce for better functional programming approach',
    codeExample: `function calculateTotal(items) {
  return items.reduce((total, item) => total + item.price, 0);
}`,
    explanation: 'Using reduce is more functional and readable',
    confidence: 0.8,
    lineNumber: 2,
    columnRange: { start: 0, end: 50 },
    tags: ['performance', 'functional-programming'],
    status: 'pending',
    aiModel: 'codebert'
  };
  
  const suggestionResult = await apiCall('/suggestions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(suggestionData)
  });
  
  if (suggestionResult.ok) {
    console.log('✅ Suggestion created successfully!');
  } else {
    console.log('❌ Suggestion creation failed');
  }
}

async function debugDebateCreation() {
  console.log('\n🔍 DEBUGGING DEBATE CREATION');
  console.log('=' .repeat(50));
  
  // First, get a token
  console.log('\n1. Getting authentication token...');
  const loginResult = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword123'
    })
  });
  
  if (!loginResult.ok) {
    console.log('❌ Login failed, trying registration...');
    const registerResult = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'testpassword123'
      })
    });
    
    if (!registerResult.ok) {
      console.log('❌ Both login and registration failed');
      return;
    }
    
    var token = registerResult.data.accessToken;
  } else {
    var token = loginResult.data.accessToken;
  }
  
  console.log('✅ Got token:', token ? 'Yes' : 'No');
  
  // Now try to create a debate session
  console.log('\n2. Creating debate session...');
  const debateData = {
    codeSnippetId: 'test-code-1',
    sessionId: 'test-session-1',
    topic: 'Should we use reduce instead of for loop?',
    codeContext: `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`,
    userIntent: 'Optimize performance and readability',
    previousSuggestions: [],
    participants: ['test-user-id']
  };
  
  const debateResult = await apiCall('/debates', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(debateData)
  });
  
  if (debateResult.ok) {
    console.log('✅ Debate session created successfully!');
  } else {
    console.log('❌ Debate session creation failed');
  }
}

// Run the debug tests
async function runDebugTests() {
  console.log('🚀 Starting Debug Tests for AI Features\n');
  
  await debugSuggestionCreation();
  await debugDebateCreation();
  
  console.log('\n🎯 Debug tests completed!');
}

runDebugTests().catch(console.error);
