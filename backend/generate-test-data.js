require('dotenv').config();
const axios = require('axios');

async function generateTestData() {
  console.log('🔄 Generating test data for GPT-5 models...');
  
  const messages = [
    'Hola Sofia, necesito información sobre SafeNotify',
    'Cuales son los precios de SafeNotify?',  
    'Me interesa la funcionalidad de WhatsApp masivo',
    'Qué incluye el plan profesional?',
    'Necesito agendar una demo',
    'Cuántos mensajes puedo enviar al mes?',
    'SafeNotify es compatible con otros CRMs?',
    'Tienen soporte técnico?',
    'Me gustaria más información sobre el ROI',
    'Cuál es la diferencia entre los planes?'
  ];
  
  for (let i = 0; i < messages.length; i++) {
    try {
      console.log(`📤 Enviando mensaje ${i + 1}/${messages.length}: ${messages[i].substring(0, 30)}...`);
      
      const response = await axios.post('http://localhost:3005/api/webhooks/sofia-sales', 
        new URLSearchParams({
          From: `whatsapp:+57310000${i.toString().padStart(4, '0')}`, // Números únicos
          To: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          Body: messages[i],
          ProfileName: `Test User ${i + 1}`
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      if (response.status === 200) {
        console.log(`✅ Mensaje ${i + 1} procesado`);
      } else {
        console.log(`⚠️ Mensaje ${i + 1} status: ${response.status}`);
      }
      
      // Esperar un poco entre mensajes
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error en mensaje ${i + 1}:`, error.message);
    }
  }
  
  console.log('✅ Test data generation completed!');
  
  // Wait a bit then check the database
  console.log('🔍 Waiting 5 seconds then checking database...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check updated stats
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    const modelStats = await prisma.gPTUsage.groupBy({
      by: ['model'],
      _count: { model: true },
      _sum: { tokensUsed: true, estimatedCost: true }
    });
    
    console.log('\n📈 Updated model usage statistics:');
    modelStats.forEach(stat => {
      console.log(`- ${stat.model || 'unknown'}: ${stat._count.model} uses, ${stat._sum.tokensUsed || 0} tokens, $${(stat._sum.estimatedCost || 0).toFixed(4)}`);
    });
  } catch (error) {
    console.error('❌ Database check error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateTestData();