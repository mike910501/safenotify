const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function testSendImage() {
  console.log('🧪 PRUEBA DE ENVÍO DE IMAGEN\n');
  
  try {
    // 1. Buscar Sofia
    const user = await prisma.user.findFirst({
      where: { email: 'mikehuertas91@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario mikehuertas91@gmail.com no encontrado');
      return;
    }
    
    const sofia = await prisma.userAIAgent.findFirst({
      where: {
        userId: user.id,
        name: { contains: 'Sofia', mode: 'insensitive' }
      }
    });
    
    if (!sofia) {
      console.log('❌ Sofia no encontrada');
      return;
    }
    
    console.log('✅ Sofia encontrada:', sofia.name);
    console.log('   MCP Enabled:', sofia.mcpEnabled);
    console.log('   Functions:', sofia.enabledFunctions);
    
    // 2. Buscar archivo de prueba existente
    let testFile = await prisma.mediaFile.findFirst({
      where: {
        agentId: sofia.id,
        purpose: 'menu'
      }
    });
    
    if (!testFile) {
      console.log('\\n📤 Creando archivo de prueba...');
      
      // Imagen de prueba (placeholder)
      const testImageUrl = 'https://via.placeholder.com/800x600.png?text=MENU+DE+PRUEBA+SAFENOTIFY';
      
      testFile = await prisma.mediaFile.create({
        data: {
          userId: user.id,
          agentId: sofia.id,
          originalUrl: testImageUrl,
          cloudinaryUrl: testImageUrl, // Por ahora usar la misma URL
          fileName: 'test_menu',
          fileType: 'image',
          mimeType: 'png',
          fileSize: 1024,
          purpose: 'menu',
          description: 'Menú de prueba para testing',
          tags: ['test', 'menu', 'prueba']
        }
      });
      
      console.log('✅ Archivo de prueba creado');
    } else {
      console.log('\\n✅ Usando archivo existente:', testFile.fileName);
      console.log('   URL:', testFile.cloudinaryUrl || testFile.originalUrl);
    }
    
    // 3. Configurar número de prueba
    const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '+573133592457'; // Tu número
    console.log('\\n📱 Enviando imagen de prueba a:', testPhoneNumber);
    
    try {
      const message = await twilioClient.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${testPhoneNumber}`,
        body: '🍽️ ¡Hola! Aquí está nuestro menú del día. Sofia te puede ayudar con cualquier pregunta sobre nuestros productos.',
        mediaUrl: [testFile.cloudinaryUrl || testFile.originalUrl]
      });
      
      console.log('\\n🎉 ¡IMAGEN ENVIADA EXITOSAMENTE!');
      console.log('   Message SID:', message.sid);
      console.log('   From:', message.from);
      console.log('   To:', message.to);
      console.log('   Status:', message.status);
      console.log('   Body:', message.body);
      console.log('   Media:', message.numMedia, 'archivo(s)');
      
      console.log('\\n📲 REVISA TU WHATSAPP');
      console.log('   Deberías recibir un mensaje con la imagen del menú');
      console.log('   Si no llega, verifica:');
      console.log('     • Tu número está registrado en WhatsApp');
      console.log('     • El formato del número es correcto');
      console.log('     • Twilio tiene permisos para enviar a ese número');
      
    } catch (twilioError) {
      console.error('\\n❌ Error enviando con Twilio:');
      console.error('   Message:', twilioError.message);
      console.error('   Code:', twilioError.code);
      console.error('   Status:', twilioError.status);
      
      if (twilioError.code === 21408) {
        console.log('\\n💡 SOLUCIÓN:');
        console.log('   Este número no está verificado para WhatsApp sandbox');
        console.log('   Ve a la Twilio Console y agrega tu número al sandbox');
      }
    }
    
    // 4. Mostrar información adicional para debug
    console.log('\\n🔍 INFORMACIÓN DE DEBUG:');
    console.log('   Twilio Account SID:', process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) + '...');
    console.log('   WhatsApp Number:', process.env.TWILIO_WHATSAPP_NUMBER);
    console.log('   Test Number:', testPhoneNumber);
    console.log('   Image URL:', testFile.cloudinaryUrl || testFile.originalUrl);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Configurar número de prueba (CAMBIA ESTO A TU NÚMERO)
if (!process.env.TEST_PHONE_NUMBER) {
  process.env.TEST_PHONE_NUMBER = '+573133592457'; // CAMBIA ESTO
}

console.log('🚀 INICIANDO PRUEBA DE ENVÍO DE IMAGEN...');
console.log('📞 Número de prueba configurado:', process.env.TEST_PHONE_NUMBER);
console.log('');

testSendImage().catch(console.error);