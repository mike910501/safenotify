/**
 * GPT Metrics API Routes
 * Provides endpoints for monitoring GPT usage and costs
 */

const express = require('express');
const { getUsageStats } = require('../services/ai/gptUsageTracker');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/gpt-metrics/stats/:period
 * Get usage statistics for a time period
 */
router.get('/stats/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const validPeriods = ['today', 'week', 'month'];
    
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ 
        error: 'Invalid period. Use: today, week, or month' 
      });
    }
    
    const stats = await getUsageStats(period);
    
    if (!stats) {
      return res.status(500).json({ 
        error: 'Failed to get usage statistics' 
      });
    }
    
    res.json({
      success: true,
      period,
      stats
    });
    
  } catch (error) {
    console.error('❌ GPT metrics error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

/**
 * GET /api/gpt-metrics/usage/recent
 * Get recent GPT usage records
 */
router.get('/usage/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const recentUsage = await prisma.gPTUsage.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phone: true,
        model: true,
        tokensUsed: true,
        estimatedCost: true,
        intent: true,
        leadScore: true,
        success: true,
        conversionEvent: true,
        createdAt: true
      }
    });
    
    res.json({
      success: true,
      count: recentUsage.length,
      usage: recentUsage
    });
    
  } catch (error) {
    console.error('❌ Recent usage error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

/**
 * GET /api/gpt-metrics/dashboard
 * Get dashboard data with key metrics
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get stats for different periods
    const todayStats = await getUsageStats('today');
    const weekStats = await getUsageStats('week');
    const monthStats = await getUsageStats('month');
    
    // Get high-value interactions today
    const highValueToday = await prisma.gPTUsage.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        },
        OR: [
          { leadScore: { gte: 70 } },
          { conversionEvent: { not: null } },
          { estimatedCost: { gt: 0.01 } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    // Calculate savings vs using only GPT-4
    const gpt4Cost = 0.03; // GPT-4 cost per 1K tokens
    const totalTokens = monthStats?.totalTokens || 0;
    const actualCost = monthStats?.totalCost || 0;
    const wouldBeCost = (totalTokens / 1000) * gpt4Cost;
    const savings = wouldBeCost - actualCost;
    const savingsPercentage = wouldBeCost > 0 ? (savings / wouldBeCost) * 100 : 0;
    
    res.json({
      success: true,
      dashboard: {
        today: todayStats,
        week: weekStats,
        month: monthStats,
        highValueInteractions: highValueToday,
        costOptimization: {
          totalTokensThisMonth: totalTokens,
          actualCost: actualCost,
          wouldBeGPT4Cost: wouldBeCost,
          savings: savings,
          savingsPercentage: Math.round(savingsPercentage)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

/**
 * GET /api/gpt-metrics/models/performance
 * Get performance breakdown by model
 */
router.get('/models/performance', async (req, res) => {
  try {
    const period = req.query.period || 'month';
    let startDate;
    
    const now = new Date();
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    const modelPerformance = await prisma.gPTUsage.groupBy({
      by: ['model'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      _sum: { 
        tokensUsed: true,
        estimatedCost: true 
      },
      _avg: { 
        tokensUsed: true,
        leadScore: true 
      }
    });
    
    res.json({
      success: true,
      period,
      modelPerformance
    });
    
  } catch (error) {
    console.error('❌ Model performance error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;