const cron = require('node-cron');
const { sendDailyReport } = require('../services/dailyReportService');

/**
 * Daily Report Cron Job
 * Runs every day at 5:00 PM Colombia time (UTC-5)
 * Sends email report to admin with all client conversations from the day
 */

console.log('🕐 Daily Report Cron Job initialized...');

// Schedule the job for 5:00 PM every day (Colombia timezone)
// Cron expression: '0 17 * * *' = At 17:00 (5 PM) every day
const dailyReportJob = cron.schedule('0 17 * * *', async () => {
  console.log('📧 Daily report job triggered at:', new Date().toLocaleString('es-CO'));
  
  try {
    const result = await sendDailyReport();
    console.log('✅ Daily report job completed successfully:', result);
  } catch (error) {
    console.error('❌ Daily report job failed:', error);
  }
}, {
  scheduled: true,
  timezone: "America/Bogota" // Colombia timezone
});

// Optional: Add a test job that runs every minute (for testing purposes)
// Uncomment this for testing, then comment it out in production
/*
const testReportJob = cron.schedule('* * * * *', async () => {
  console.log('🧪 TEST: Daily report job triggered at:', new Date().toLocaleString('es-CO'));
  
  try {
    const result = await sendDailyReport();
    console.log('✅ TEST: Daily report job completed successfully:', result);
  } catch (error) {
    console.error('❌ TEST: Daily report job failed:', error);
  }
}, {
  scheduled: false, // Set to true to enable testing
  timezone: "America/Bogota"
});
*/

// Manual trigger function for testing
async function triggerDailyReportNow() {
  console.log('🔥 Manual trigger: Sending daily report now...');
  
  try {
    const result = await sendDailyReport();
    console.log('✅ Manual daily report completed successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Manual daily report failed:', error);
    throw error;
  }
}

console.log('✅ Daily report cron job scheduled for 5:00 PM Colombia time every day');
// console.log('📋 Next execution will be at:', dailyReportJob.getStatus());

module.exports = {
  dailyReportJob,
  triggerDailyReportNow
};