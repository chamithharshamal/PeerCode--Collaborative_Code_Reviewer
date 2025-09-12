/**
 * Integration Test for AI Suggestions and Debate Features
 * This script tests the complete flow from frontend to backend
 */

const API_BASE_URL = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:3000';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'testpassword123'
};

const testCodeSnippet = {
  id: 'test-code-1',
  content: `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`,
  language: 'javascript',
  lineCount: 7
};

const testSession = {
  id: 'test-session-1',
  name: 'Integration Test Session',
  description: 'Testing AI features'
};

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  const data = await response.json();
  
  return {
    status: response.status,
    data,
    ok: response.ok
  };
}

// Test functions
async function testUserRegistration() {
  console.log('🧪 Testing user registration...');
  
  try {
    const result = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser)
    });
    
    if (result.ok) {
      console.log('✅ User registration successful');
      return result.data.accessToken;
    } else {
      console.log('❌ User registration failed:', result.data);
      return null;
    }
  } catch (error) {
    console.log('❌ User registration error:', error.message);
    return null;
  }
}

async function testUserLogin() {
  console.log('🧪 Testing user login...');
  
  try {
    const result = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    if (result.ok) {
      console.log('✅ User login successful');
      return result.data.accessToken;
    } else {
      console.log('❌ User login failed:', result.data);
      return null;
    }
  } catch (error) {
    console.log('❌ User login error:', error.message);
    return null;
  }
}

async function testCreateSuggestion(token) {
  console.log('🧪 Testing suggestion creation...');
  
  const suggestionData = {
    codeSnippetId: testCodeSnippet.id,
    sessionId: testSession.id,
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
  
  try {
    const result = await apiCall('/suggestions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(suggestionData)
    });
    
    if (result.ok) {
      console.log('✅ Suggestion creation successful');
      return result.data.data;
    } else {
      console.log('❌ Suggestion creation failed:', result.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Suggestion creation error:', error.message);
    return null;
  }
}

async function testGetSuggestions(token) {
  console.log('🧪 Testing suggestion retrieval...');
  
  try {
    const result = await apiCall('/suggestions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (result.ok) {
      console.log('✅ Suggestions retrieval successful');
      console.log(`📊 Found ${result.data.data.length} suggestions`);
      return result.data.data;
    } else {
      console.log('❌ Suggestions retrieval failed:', result.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Suggestions retrieval error:', error.message);
    return null;
  }
}

async function testSuggestionInteraction(token, suggestionId) {
  console.log('🧪 Testing suggestion interaction...');
  
  const interactionData = {
    action: 'accepted',
    rating: 5,
    comment: 'Great suggestion!'
  };
  
  try {
    const result = await apiCall(`/suggestions/${suggestionId}/interaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(interactionData)
    });
    
    if (result.ok) {
      console.log('✅ Suggestion interaction successful');
      return result.data.data;
    } else {
      console.log('❌ Suggestion interaction failed:', result.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Suggestion interaction error:', error.message);
    return null;
  }
}

async function testCreateDebateSession(token) {
  console.log('🧪 Testing debate session creation...');
  
  const debateData = {
    codeSnippetId: testCodeSnippet.id,
    sessionId: testSession.id,
    topic: 'Should we use reduce instead of for loop?',
    context: {
      codeContext: testCodeSnippet.content,
      userIntent: 'Optimize performance and readability',
      previousSuggestions: []
    }
  };
  
  try {
    const result = await apiCall('/debates', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(debateData)
    });
    
    if (result.ok) {
      console.log('✅ Debate session creation successful');
      return result.data.data;
    } else {
      console.log('❌ Debate session creation failed:', result.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Debate session creation error:', error.message);
    return null;
  }
}

async function testGenerateInitialArguments(token, debateId) {
  console.log('🧪 Testing initial argument generation...');
  
  try {
    const result = await apiCall(`/debates/${debateId}/arguments/initial`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        topic: 'Should we use reduce instead of for loop?',
        codeContext: testCodeSnippet.content
      })
    });
    
    if (result.ok) {
      console.log('✅ Initial arguments generation successful');
      console.log(`📊 Generated ${result.data.arguments.length} arguments`);
      return result.data.arguments;
    } else {
      console.log('❌ Initial arguments generation failed:', result.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Initial arguments generation error:', error.message);
    return null;
  }
}

async function testAddUserArgument(token, debateId) {
  console.log('🧪 Testing user argument addition...');
  
  const argumentData = {
    content: 'The for loop is more explicit and easier to debug',
    type: 'con',
    confidence: 0.7,
    evidence: ['Debugging is easier with explicit loops', 'Performance is similar'],
    source: 'user'
  };
  
  try {
    const result = await apiCall(`/debates/${debateId}/arguments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(argumentData)
    });
    
    if (result.ok) {
      console.log('✅ User argument addition successful');
      return result.data.data;
    } else {
      console.log('❌ User argument addition failed:', result.data);
      return null;
    }
  } catch (error) {
    console.log('❌ User argument addition error:', error.message);
    return null;
  }
}

async function testGetDebateAnalytics(token, debateId) {
  console.log('🧪 Testing debate analytics...');
  
  try {
    const result = await apiCall(`/debates/${debateId}/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (result.ok) {
      console.log('✅ Debate analytics retrieval successful');
      console.log('📊 Analytics:', result.data.data);
      return result.data.data;
    } else {
      console.log('❌ Debate analytics retrieval failed:', result.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Debate analytics retrieval error:', error.message);
    return null;
  }
}

// Main test runner
async function runIntegrationTests() {
  console.log('🚀 Starting Integration Tests for AI Features\n');
  console.log('=' .repeat(50));
  
  let token = null;
  let suggestionId = null;
  let debateId = null;
  
  // Test 1: Authentication
  console.log('\n📝 TEST 1: Authentication');
  console.log('-'.repeat(30));
  
  // Try login first (user might already exist)
  token = await testUserLogin();
  
  // If login fails, try registration
  if (!token) {
    token = await testUserRegistration();
  }
  
  if (!token) {
    console.log('❌ Authentication failed. Cannot continue tests.');
    return;
  }
  
  // Test 2: AI Suggestions
  console.log('\n📝 TEST 2: AI Suggestions');
  console.log('-'.repeat(30));
  
  // Create a suggestion
  const suggestion = await testCreateSuggestion(token);
  if (suggestion) {
    suggestionId = suggestion.id;
    
    // Get all suggestions
    await testGetSuggestions(token);
    
    // Test interaction
    await testSuggestionInteraction(token, suggestionId);
  }
  
  // Test 3: AI Debate
  console.log('\n📝 TEST 3: AI Debate');
  console.log('-'.repeat(30));
  
  // Create debate session
  const debateSession = await testCreateDebateSession(token);
  if (debateSession) {
    debateId = debateSession.id;
    
    // Generate initial arguments
    await testGenerateInitialArguments(token, debateId);
    
    // Add user argument
    await testAddUserArgument(token, debateId);
    
    // Get analytics
    await testGetDebateAnalytics(token, debateId);
  }
  
  // Test Summary
  console.log('\n' + '='.repeat(50));
  console.log('🎯 INTEGRATION TEST SUMMARY');
  console.log('='.repeat(50));
  
  if (token && suggestionId && debateId) {
    console.log('✅ All tests completed successfully!');
    console.log('🎉 AI Suggestions and Debate features are working properly.');
  } else {
    console.log('❌ Some tests failed. Check the logs above for details.');
  }
  
  console.log('\n📋 Test Results:');
  console.log(`- Authentication: ${token ? '✅' : '❌'}`);
  console.log(`- Suggestion Creation: ${suggestionId ? '✅' : '❌'}`);
  console.log(`- Debate Session: ${debateId ? '✅' : '❌'}`);
}

// Run the tests
runIntegrationTests().catch(console.error);
