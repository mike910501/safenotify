const twilio = require('twilio');
require('dotenv').config();

// Configuración de Twilio con credenciales de subcuenta
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function listTemplates() {
  try {
    console.log('🔍 Listando plantillas de contenido en Twilio...');
    console.log('   Account SID:', accountSid);
    console.log('');
    
    // Intentar listar contenido de diferentes formas
    console.log('📋 Buscando plantillas de contenido...\n');
    
    // Intento 1: Listar content
    try {
      const contents = await client.content.v1.contents.list({limit: 20});
      
      if (contents.length > 0) {
        console.log(`✅ Encontradas ${contents.length} plantillas:\n`);
        contents.forEach(content => {
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`📝 Nombre: ${content.friendlyName || 'Sin nombre'}`);
          console.log(`🔑 SID: ${content.sid}`);
          console.log(`📅 Creado: ${content.dateCreated}`);
          console.log(`🌐 Idioma: ${content.language || 'N/A'}`);
          console.log(`📊 Estado: ${content.status || 'N/A'}`);
        });
      } else {
        console.log('⚠️ No se encontraron plantillas de contenido');
      }
    } catch (error) {
      console.log('❌ Error listando content:', error.message);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Intento 2: Verificar el Content SID específico
    const testSid = 'HX164c5aa2918cc699bedbe253ba2bf805';
    console.log(`🔍 Verificando Content SID específico: ${testSid}`);
    
    try {
      const content = await client.content.v1.contents(testSid).fetch();
      console.log('✅ Content SID válido:');
      console.log('   Nombre:', content.friendlyName);
      console.log('   Estado:', content.status);
    } catch (error) {
      console.log('❌ Content SID no encontrado:', error.message);
      
      // Corregir posible error en el SID (minúsculas/mayúsculas)
      const correctedSid = testSid.toLowerCase();
      console.log(`\n🔧 Intentando con SID en minúsculas: ${correctedSid}`);
      try {
        const content2 = await client.content.v1.contents(correctedSid).fetch();
        console.log('✅ Content SID válido con minúsculas:');
        console.log('   Nombre:', content2.friendlyName);
        console.log('   Estado:', content2.status);
      } catch (error2) {
        console.log('❌ Tampoco funciona con minúsculas');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error general:');
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    
    if (error.code === 20003) {
      console.error('\n⚠️ Error de autenticación. Verifica las credenciales.');
    }
  }
}

// Ejecutar
listTemplates();