const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkTemplateStatus() {
  try {
    console.log('Consultando estado de la plantilla...');
    console.log('Content SID: HXbc1e5efe4e4da98d9fcb19a1c76be1b1');
    console.log('');
    
    const content = await client.content.v1.contents('HXbc1e5efe4e4da98d9fcb19a1c76be1b1').fetch();
    
    console.log('INFORMACIÓN DE LA PLANTILLA:');
    console.log('SID:', content.sid);
    console.log('Nombre Amigable:', content.friendlyName);
    console.log('Idioma:', content.language);
    console.log('Fecha Creación:', content.dateCreated);
    console.log('Fecha Actualización:', content.dateUpdated);
    console.log('');
    
    console.log('VARIABLES DE LA PLANTILLA:');
    if (content.variables && Object.keys(content.variables).length > 0) {
      Object.entries(content.variables).forEach(([key, value]) => {
        console.log('   ' + key + ':', JSON.stringify(value));
      });
    } else {
      console.log('   No hay variables definidas');
    }
    console.log('');
    
    console.log('TIPOS DE CONTENIDO:');
    if (content.types) {
      Object.entries(content.types).forEach(([platform, typeInfo]) => {
        console.log('   ' + platform.toUpperCase() + ':');
        if (typeInfo.body) {
          console.log('      Body: ' + typeInfo.body);
        }
        if (typeInfo.header) {
          console.log('      Header: ' + typeInfo.header);
        }
        if (typeInfo.footer) {
          console.log('      Footer: ' + typeInfo.footer);
        }
      });
    }
    console.log('');
    
  } catch (error) {
    console.error('Error consultando la plantilla:');
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    console.error('   Detalles:', error.details || 'No hay detalles adicionales');
    
    if (error.code === 20404) {
      console.log('');
      console.log('POSIBLES CAUSAS:');
      console.log('   - El Content SID no existe');
      console.log('   - El Content SID pertenece a otra cuenta');
      console.log('   - El Content SID fue eliminado');
      console.log('   - Error en las credenciales de Twilio');
    }
  }
}

checkTemplateStatus();
