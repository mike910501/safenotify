/**
 * Model Selector Service
 * Optimizes OpenAI model selection based on context and intent
 * Reduces costs by 80-95% while maintaining quality
 */

/**
 * Model pricing reference (per 1K tokens)
 * gpt-4: $0.03 input, $0.06 output - Most expensive
 * gpt-4o: $0.005 input, $0.015 output - Best for important leads
 * gpt-3.5-turbo: $0.0005 input, $0.0015 output - Good balance
 * gpt-4o-mini: $0.00015 input, $0.0006 output - Most economical
 */

const MODELS = {
  PREMIUM: 'gpt-4o',        // For high-value interactions
  STANDARD: 'gpt-3.5-turbo', // For normal conversations
  ECONOMY: 'gpt-4o-mini'     // For simple queries and analysis
};

/**
 * Select optimal model based on lead context and intent
 * @param {Object} leadContext - Lead information (score, state, etc)
 * @param {String} currentIntent - Current conversation intent
 * @returns {String} - Optimal model to use
 */
function selectOptimalModel(leadContext, currentIntent) {
  // High-value lead or demo request = Premium model
  if (leadContext?.qualificationScore >= 70 || 
      currentIntent === 'demo_request' || 
      currentIntent === 'closing' ||
      leadContext?.status === 'qualified') {
    console.log('🎯 Using PREMIUM model for high-value interaction');
    return MODELS.PREMIUM;
  }

  // Sentiment analysis or simple queries = Economy model
  if (currentIntent === 'sentiment_analysis' || 
      currentIntent === 'greeting' || 
      currentIntent === 'basic_info' ||
      !leadContext?.qualificationScore ||
      leadContext?.qualificationScore < 30) {
    console.log('💰 Using ECONOMY model for simple interaction');
    return MODELS.ECONOMY;
  }

  // Default: Standard model for normal conversations
  console.log('⚖️ Using STANDARD model for normal interaction');
  return MODELS.STANDARD;
}

/**
 * Get model configuration with optimized parameters
 * @param {String} model - Model name
 * @param {String} purpose - Purpose of the request
 * @returns {Object} - Model configuration
 */
function getModelConfig(model, purpose = 'conversation') {
  const configs = {
    conversation: {
      max_tokens: 250,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    },
    analysis: {
      max_tokens: 100,
      temperature: 0.1,
      presence_penalty: 0,
      frequency_penalty: 0
    },
    creative: {
      max_tokens: 300,
      temperature: 0.9,
      presence_penalty: 0.3,
      frequency_penalty: 0.3
    }
  };

  return {
    model,
    ...configs[purpose] || configs.conversation
  };
}

/**
 * Track model usage for cost optimization (LEGACY)
 * @param {String} model - Model used
 * @param {Number} tokens - Tokens consumed
 * @deprecated Use trackGPTUsage from gptUsageTracker instead
 */
function trackModelUsage(model, tokens) {
  const costs = {
    'gpt-4o': 0.005,
    'gpt-3.5-turbo': 0.0005,
    'gpt-4o-mini': 0.00015,
    'gpt-4': 0.03
  };

  const estimatedCost = (tokens / 1000) * (costs[model] || 0.001);
  console.log(`📊 Model: ${model}, Tokens: ${tokens}, Est. Cost: $${estimatedCost.toFixed(4)}`);
  
  return {
    model,
    tokens,
    estimatedCost
  };
}

/**
 * Enhanced tracking with database persistence and notifications
 * @param {Object} usageData - Comprehensive usage data
 * @returns {Object} - Usage tracking result
 */
async function trackGPTUsageEnhanced(usageData) {
  try {
    const { trackGPTUsage } = require('./gptUsageTracker');
    return await trackGPTUsage(usageData);
  } catch (error) {
    console.error('❌ Enhanced tracking failed, falling back to basic:', error);
    return trackModelUsage(usageData.model, usageData.tokensUsed);
  }
}

module.exports = {
  MODELS,
  selectOptimalModel,
  getModelConfig,
  trackModelUsage,
  trackGPTUsageEnhanced
};