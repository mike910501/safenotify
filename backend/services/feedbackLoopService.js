/**
 * 🚀 PHASE 5.1: Feedback Loop Service
 * Collect and analyze feedback from AI-human collaboration to improve system
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Submit feedback for takeover event
 */
async function submitTakeoverFeedback(conversationId, userId, feedbackData) {
  console.log(`💭 Submitting takeover feedback for conversation: ${conversationId}`);
  
  try {
    const feedback = await prisma.cRMFeedback.create({
      data: {
        userId: userId,
        conversationId: conversationId,
        feedbackType: 'TAKEOVER',
        
        // Ratings (1-5 scale)
        aiHelpfulness: feedbackData.aiHelpfulness,
        suggestionQuality: feedbackData.suggestionQuality,
        handoffSmoothness: feedbackData.handoffSmoothness,
        overallSatisfaction: feedbackData.overallSatisfaction,
        
        // Boolean feedback
        wouldUseSuggestionsAgain: feedbackData.wouldUseSuggestionsAgain,
        takeoverWasNecessary: feedbackData.takeoverWasNecessary,
        aiCouldHaveHandledAlone: feedbackData.aiCouldHaveHandledAlone,
        
        // Text feedback
        comments: feedbackData.comments,
        improvementSuggestions: feedbackData.improvementSuggestions,
        
        // Context
        metadata: {
          takeoverReason: feedbackData.takeoverReason,
          takeoverDuration: feedbackData.takeoverDuration,
          messagesExchanged: feedbackData.messagesExchanged,
          customerSatisfaction: feedbackData.customerSatisfaction
        }
      }
    });

    console.log('✅ Takeover feedback submitted:', feedback.id);

    // Update conversation with feedback reference
    await prisma.cRMConversation.update({
      where: { id: conversationId },
      data: {
        metadata: {
          ...await getCurrentConversationMetadata(conversationId),
          feedbackSubmitted: true,
          feedbackId: feedback.id
        }
      }
    });

    return {
      success: true,
      feedback: feedback,
      message: 'Feedback submitted successfully'
    };

  } catch (error) {
    console.error('❌ Error submitting takeover feedback:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Submit AI suggestion feedback
 */
async function submitSuggestionFeedback(conversationId, suggestionId, userId, feedbackData) {
  console.log(`💡 Submitting suggestion feedback for conversation: ${conversationId}`);
  
  try {
    const feedback = await prisma.cRMFeedback.create({
      data: {
        userId: userId,
        conversationId: conversationId,
        feedbackType: 'AI_SUGGESTION',
        
        // Suggestion-specific ratings
        suggestionQuality: feedbackData.suggestionQuality,
        relevance: feedbackData.relevance,
        actionability: feedbackData.actionability,
        overallSatisfaction: feedbackData.overallSatisfaction,
        
        // Usage feedback
        suggestionUsed: feedbackData.suggestionUsed,
        wouldUseSuggestionsAgain: true, // Default for suggestion feedback
        
        comments: feedbackData.comments,
        
        metadata: {
          suggestionId: suggestionId,
          suggestionType: feedbackData.suggestionType,
          suggestionContent: feedbackData.suggestionContent,
          wasModified: feedbackData.wasModified,
          customerResponse: feedbackData.customerResponse
        }
      }
    });

    console.log('✅ Suggestion feedback submitted:', feedback.id);

    return {
      success: true,
      feedback: feedback,
      message: 'Suggestion feedback submitted successfully'
    };

  } catch (error) {
    console.error('❌ Error submitting suggestion feedback:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Analyze feedback patterns to improve AI system
 */
async function analyzeFeedbackPatterns(userId, timeRange = '30d') {
  console.log(`📊 Analyzing feedback patterns for user: ${userId}`);
  
  try {
    let dateFilter = {};
    const now = new Date();
    
    switch (timeRange) {
      case '7d':
        dateFilter.gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter.gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFilter.gte = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter.gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const feedback = await prisma.cRMFeedback.findMany({
      where: {
        userId: userId,
        createdAt: dateFilter
      },
      orderBy: { createdAt: 'desc' }
    });

    if (feedback.length === 0) {
      return {
        success: true,
        data: {
          totalFeedback: 0,
          averageRatings: {},
          patterns: {},
          recommendations: []
        }
      };
    }

    // Calculate average ratings
    const averageRatings = calculateAverageRatings(feedback);
    
    // Identify patterns
    const patterns = identifyFeedbackPatterns(feedback);
    
    // Generate recommendations
    const recommendations = generateImprovementRecommendations(averageRatings, patterns, feedback);
    
    // Sentiment analysis of comments
    const sentimentAnalysis = analyzeFeedbackSentiment(feedback);

    console.log('✅ Feedback patterns analyzed');

    return {
      success: true,
      data: {
        totalFeedback: feedback.length,
        timeRange: timeRange,
        averageRatings,
        patterns,
        recommendations,
        sentimentAnalysis,
        recentFeedback: feedback.slice(0, 5).map(f => ({
          id: f.id,
          type: f.feedbackType,
          satisfaction: f.overallSatisfaction,
          comments: f.comments,
          createdAt: f.createdAt
        }))
      }
    };

  } catch (error) {
    console.error('❌ Error analyzing feedback patterns:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get feedback summary for conversation
 */
async function getConversationFeedbackSummary(conversationId) {
  try {
    const feedback = await prisma.cRMFeedback.findMany({
      where: { conversationId: conversationId },
      include: {
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const summary = {
      totalFeedback: feedback.length,
      averageSatisfaction: 0,
      feedbackTypes: {},
      hasNegativeFeedback: false,
      recentComments: []
    };

    if (feedback.length > 0) {
      // Calculate averages
      let satisfactionSum = 0;
      let satisfactionCount = 0;

      feedback.forEach(f => {
        if (f.overallSatisfaction) {
          satisfactionSum += f.overallSatisfaction;
          satisfactionCount++;
        }

        // Count feedback types
        summary.feedbackTypes[f.feedbackType] = (summary.feedbackTypes[f.feedbackType] || 0) + 1;

        // Check for negative feedback (rating < 3)
        if (f.overallSatisfaction && f.overallSatisfaction < 3) {
          summary.hasNegativeFeedback = true;
        }

        // Collect recent comments
        if (f.comments) {
          summary.recentComments.push({
            type: f.feedbackType,
            comment: f.comments,
            rating: f.overallSatisfaction,
            user: f.user.name,
            date: f.createdAt
          });
        }
      });

      summary.averageSatisfaction = satisfactionCount > 0 ? 
        Math.round((satisfactionSum / satisfactionCount) * 10) / 10 : 0;
    }

    return {
      success: true,
      summary: summary,
      detailedFeedback: feedback
    };

  } catch (error) {
    console.error('❌ Error getting conversation feedback summary:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper functions

function calculateAverageRatings(feedback) {
  const ratings = {
    aiHelpfulness: [],
    suggestionQuality: [],
    handoffSmoothness: [],
    overallSatisfaction: [],
    relevance: [],
    actionability: []
  };

  feedback.forEach(f => {
    if (f.aiHelpfulness) ratings.aiHelpfulness.push(f.aiHelpfulness);
    if (f.suggestionQuality) ratings.suggestionQuality.push(f.suggestionQuality);
    if (f.handoffSmoothness) ratings.handoffSmoothness.push(f.handoffSmoothness);
    if (f.overallSatisfaction) ratings.overallSatisfaction.push(f.overallSatisfaction);
    if (f.relevance) ratings.relevance.push(f.relevance);
    if (f.actionability) ratings.actionability.push(f.actionability);
  });

  const averages = {};
  Object.entries(ratings).forEach(([key, values]) => {
    if (values.length > 0) {
      averages[key] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    }
  });

  return averages;
}

function identifyFeedbackPatterns(feedback) {
  const patterns = {
    suggestionUsageRate: 0,
    necessaryTakeoverRate: 0,
    aiCapabilityGap: 0,
    commonIssues: {},
    improvementThemes: {}
  };

  let suggestionFeedback = feedback.filter(f => f.feedbackType === 'AI_SUGGESTION');
  let takeoverFeedback = feedback.filter(f => f.feedbackType === 'TAKEOVER');

  // Suggestion usage rate
  if (suggestionFeedback.length > 0) {
    const used = suggestionFeedback.filter(f => f.suggestionUsed).length;
    patterns.suggestionUsageRate = Math.round((used / suggestionFeedback.length) * 100);
  }

  // Necessary takeover rate
  if (takeoverFeedback.length > 0) {
    const necessary = takeoverFeedback.filter(f => f.takeoverWasNecessary).length;
    patterns.necessaryTakeoverRate = Math.round((necessary / takeoverFeedback.length) * 100);
  }

  // AI capability gap (cases where AI could have handled alone)
  if (takeoverFeedback.length > 0) {
    const couldHandleAlone = takeoverFeedback.filter(f => f.aiCouldHaveHandledAlone).length;
    patterns.aiCapabilityGap = Math.round((couldHandleAlone / takeoverFeedback.length) * 100);
  }

  // Analyze comments for common themes
  feedback.forEach(f => {
    if (f.comments) {
      const comment = f.comments.toLowerCase();
      
      // Common issues
      if (comment.includes('slow') || comment.includes('delay')) {
        patterns.commonIssues['response_time'] = (patterns.commonIssues['response_time'] || 0) + 1;
      }
      if (comment.includes('irrelevant') || comment.includes('not helpful')) {
        patterns.commonIssues['relevance'] = (patterns.commonIssues['relevance'] || 0) + 1;
      }
      if (comment.includes('confus') || comment.includes('unclear')) {
        patterns.commonIssues['clarity'] = (patterns.commonIssues['clarity'] || 0) + 1;
      }
    }

    if (f.improvementSuggestions) {
      const suggestions = f.improvementSuggestions.toLowerCase();
      
      if (suggestions.includes('faster') || suggestions.includes('speed')) {
        patterns.improvementThemes['performance'] = (patterns.improvementThemes['performance'] || 0) + 1;
      }
      if (suggestions.includes('better') || suggestions.includes('improve')) {
        patterns.improvementThemes['quality'] = (patterns.improvementThemes['quality'] || 0) + 1;
      }
      if (suggestions.includes('more') || suggestions.includes('additional')) {
        patterns.improvementThemes['features'] = (patterns.improvementThemes['features'] || 0) + 1;
      }
    }
  });

  return patterns;
}

function generateImprovementRecommendations(averageRatings, patterns, feedback) {
  const recommendations = [];

  // Rating-based recommendations
  if (averageRatings.suggestionQuality && averageRatings.suggestionQuality < 3.5) {
    recommendations.push({
      type: 'suggestion_quality',
      priority: 'HIGH',
      title: 'Improve AI suggestion quality',
      description: 'AI suggestions are receiving below-average ratings. Consider refining the suggestion algorithm.',
      actionItems: [
        'Review suggestion generation prompts',
        'Analyze unsuccessful suggestions',
        'Implement contextual awareness improvements'
      ]
    });
  }

  if (averageRatings.handoffSmoothness && averageRatings.handoffSmoothness < 3.5) {
    recommendations.push({
      type: 'handoff_process',
      priority: 'MEDIUM',
      title: 'Improve takeover handoff process',
      description: 'Users report issues with the human takeover transition process.',
      actionItems: [
        'Streamline takeover UI workflow',
        'Provide better context transfer',
        'Add transition status indicators'
      ]
    });
  }

  // Pattern-based recommendations
  if (patterns.aiCapabilityGap > 30) {
    recommendations.push({
      type: 'ai_training',
      priority: 'HIGH',
      title: 'Reduce unnecessary human takeovers',
      description: `${patterns.aiCapabilityGap}% of takeovers could have been handled by AI alone.`,
      actionItems: [
        'Enhance AI training with takeover scenarios',
        'Improve AI confidence scoring',
        'Add escalation criteria refinement'
      ]
    });
  }

  if (patterns.suggestionUsageRate < 50) {
    recommendations.push({
      type: 'suggestion_adoption',
      priority: 'MEDIUM',
      title: 'Increase AI suggestion adoption',
      description: `Only ${patterns.suggestionUsageRate}% of suggestions are being used by human agents.`,
      actionItems: [
        'Improve suggestion relevance',
        'Add suggestion preview/edit functionality',
        'Provide suggestion effectiveness feedback'
      ]
    });
  }

  // Issue-based recommendations
  const topIssue = Object.entries(patterns.commonIssues)
    .sort(([,a], [,b]) => b - a)[0];

  if (topIssue) {
    const [issue, count] = topIssue;
    recommendations.push({
      type: 'common_issue',
      priority: 'MEDIUM',
      title: `Address common ${issue} issues`,
      description: `${count} feedback entries mention ${issue} problems.`,
      actionItems: [`Focus development efforts on resolving ${issue} complaints`]
    });
  }

  return recommendations.slice(0, 5); // Top 5 recommendations
}

function analyzeFeedbackSentiment(feedback) {
  const comments = feedback
    .filter(f => f.comments)
    .map(f => f.comments);

  if (comments.length === 0) {
    return { positive: 0, neutral: 0, negative: 0 };
  }

  // Simple sentiment analysis (mock implementation)
  let positive = 0, negative = 0, neutral = 0;

  comments.forEach(comment => {
    const text = comment.toLowerCase();
    const positiveWords = ['good', 'great', 'helpful', 'excellent', 'love', 'amazing', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'useless', 'frustrating'];

    const hasPositive = positiveWords.some(word => text.includes(word));
    const hasNegative = negativeWords.some(word => text.includes(word));

    if (hasPositive && !hasNegative) positive++;
    else if (hasNegative && !hasPositive) negative++;
    else neutral++;
  });

  return {
    positive: Math.round((positive / comments.length) * 100),
    neutral: Math.round((neutral / comments.length) * 100),
    negative: Math.round((negative / comments.length) * 100)
  };
}

async function getCurrentConversationMetadata(conversationId) {
  try {
    const conversation = await prisma.cRMConversation.findUnique({
      where: { id: conversationId },
      select: { metadata: true }
    });
    
    return conversation?.metadata || {};
  } catch (error) {
    console.error('Error getting conversation metadata:', error);
    return {};
  }
}

module.exports = {
  submitTakeoverFeedback,
  submitSuggestionFeedback,
  analyzeFeedbackPatterns,
  getConversationFeedbackSummary
};