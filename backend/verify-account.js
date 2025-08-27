const twilio = require('twilio');
require('dotenv').config();

async function verifyAccount() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  console.log('🔍 VERIFICACIÓN DE CUENTA Y PLANTILLAS\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 CREDENCIALES ACTUALES:');
  console.log('   Account SID:', accountSid);
  console.log('   Auth Token:', authToken.substring(0, 5) + '...' + authToken.substring(authToken.length - 5));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const client = twilio(accountSid, authToken);
    
    // Verificar la cuenta
    console.log('1️⃣ VERIFICANDO CUENTA...');
    const account = await client.api.accounts(accountSid).fetch();
    console.log('   ✅ Cuenta válida');
    console.log('   Nombre:', account.friendlyName);
    console.log('   Estado:', account.status);
    console.log('   Tipo:', account.type);
    console.log('');
    
    // Listar plantillas de contenido
    console.log('2️⃣ PLANTILLAS DE CONTENIDO EN ESTA CUENTA:');
    try {
      const contents = await client.content.v1.contents.list({limit: 20});
      
      if (contents.length > 0) {
        console.log(`   ✅ Encontradas ${contents.length} plantillas:\n`);
        contents.forEach((content, idx) => {
          console.log(`   ${idx + 1}. ${content.friendlyName || 'Sin nombre'}`);
          console.log(`      SID: ${content.sid}`);
          console.log(`      Idioma: ${content.language}`);
          console.log(`      Creado: ${content.dateCreated}`);
          console.log('');
        });
      } else {
        console.log('   ⚠️ NO HAY PLANTILLAS en esta cuenta');
      }
    } catch (error) {
      console.log('   ❌ Error listando plantillas:', error.message);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Buscar el Content SID específico
    const targetSid = 'HX164c5aa2918cc699bedbe253ba2bf805';
    console.log('3️⃣ BUSCANDO CONTENT SID ESPECÍFICO:');
    console.log('   SID buscado:', targetSid);
    
    try {
      const content = await client.content.v1.contents(targetSid).fetch();
      console.log('   ✅ PLANTILLA ENCONTRADA');
      console.log('   Nombre:', content.friendlyName);
    } catch (error) {
      console.log('   ❌ PLANTILLA NO ENCONTRADA en esta cuenta');
      console.log('   Error:', error.message);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 DIAGNÓSTICO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('Si el Content SID no se encuentra, hay 3 posibilidades:\n');
    console.log('1. La plantilla fue creada en OTRA CUENTA de Twilio');
    console.log('   → Solución: Usa las credenciales de la cuenta correcta\n');
    console.log('2. La plantilla fue ELIMINADA de Twilio');
    console.log('   → Solución: Crea una nueva plantilla en Twilio\n');
    console.log('3. El Content SID está MAL ESCRITO');
    console.log('   → Solución: Verifica el SID correcto en tu dashboard de Twilio\n');
    
  } catch (error) {
    console.error('❌ ERROR CRÍTICO:', error.message);
    console.error('   Las credenciales pueden ser incorrectas');
  }
}

verifyAccount();