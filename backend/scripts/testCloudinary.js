const { v2: cloudinary } = require('cloudinary');
const dotenv = require('dotenv');
dotenv.config();

// Configurar Cloudinary explícitamente
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function testCloudinary() {
  console.log('🔍 Testing Cloudinary Configuration...\n');
  
  try {
    // Test 1: Verificar configuración
    const config = cloudinary.config();
    console.log('✅ Cloudinary configurado:');
    console.log('   Cloud Name:', config.cloud_name);
    console.log('   API Key:', config.api_key ? '***' + config.api_key.slice(-4) : 'NO KEY');
    
    // Test 2: Subir imagen de prueba (crear imagen base64 simple)
    console.log('\n📤 Subiendo imagen de prueba...');
    
    // Crear imagen base64 pequeña para test
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const result = await cloudinary.uploader.upload(testImageBase64, {
      folder: 'safenotify/test',
      public_id: 'test_' + Date.now(),
      resource_type: 'auto'
    });
    
    console.log('✅ Imagen subida exitosamente:');
    console.log('   URL:', result.secure_url);
    console.log('   Public ID:', result.public_id);
    console.log('   Size:', result.bytes, 'bytes');
    
    // Test 3: Listar archivos (opcional)
    const resources = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'safenotify',
      max_results: 5
    });
    
    console.log('\n📁 Archivos en Cloudinary:');
    resources.resources.forEach(file => {
      console.log(`   - ${file.public_id} (${file.format})`);
    });
    
    console.log('\n✅ CLOUDINARY FUNCIONA CORRECTAMENTE!');
    
  } catch (error) {
    console.error('❌ Error con Cloudinary:', error.message);
    console.error('Detalles:', error);
  }
}

testCloudinary();