const { v2: cloudinary } = require('cloudinary');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function uploadMenuForAgente() {
  console.log('📤 Subiendo menú para AGENTE...\n');
  
  try {
    // Buscar el agente "AGENTE"
    const agent = await prisma.userAIAgent.findFirst({
      where: { name: { equals: 'AGENTE', mode: 'insensitive' } },
      include: { user: true }
    });
    
    if (!agent) {
      console.log('❌ Agente "AGENTE" no encontrado');
      return;
    }
    
    console.log('✅ Agente encontrado:', agent.name);
    console.log('   Usuario:', agent.user.email);
    console.log('   ID:', agent.id);
    
    // Crear un menú de prueba más realista
    console.log('\\n📋 Creando menú de prueba...');
    
    // Usar imagen base64 válida simple
    const menuImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    try {
      // Subir imagen a Cloudinary
      const uploadResult = await cloudinary.uploader.upload(menuImageBase64, {
        folder: `safenotify/users/${agent.userId}/menus`,
        public_id: 'menu_principal_agente',
        resource_type: 'auto',
        context: {
          alt: 'Menú principal del negocio AGENTE',
          caption: 'Menú del día - Productos y servicios disponibles',
          business_name: 'SafeNotify AGENTE',
          created_by: 'agente_system'
        },
        tags: ['menu', 'agente', 'principal', 'safenotify']
      });
      
      console.log('\\n✅ Archivo subido a Cloudinary exitosamente:');
      console.log('   📍 URL:', uploadResult.secure_url);
      console.log('   📊 Tamaño:', uploadResult.bytes, 'bytes');
      console.log('   🆔 Public ID:', uploadResult.public_id);
      console.log('   📁 Folder:', uploadResult.folder);
      
      // Guardar en base de datos como MediaFile
      const mediaFile = await prisma.mediaFile.create({
        data: {
          userId: agent.userId,
          agentId: agent.id,
          originalUrl: 'generated_menu_base64',
          cloudinaryUrl: uploadResult.secure_url,
          fileName: 'menu_principal_agente',
          fileType: 'image',
          mimeType: uploadResult.format || 'png',
          fileSize: uploadResult.bytes,
          purpose: 'menu',
          description: 'Menú principal del negocio - Incluye productos y servicios disponibles para clientes',
          tags: ['menu', 'principal', 'agente', 'productos', 'servicios'],
          aiAnalysis: {
            type: 'business_menu',
            category: 'restaurant_services',
            content_type: 'visual_menu',
            usage: 'customer_inquiries',
            auto_send_keywords: ['menu', 'menú', 'productos', 'servicios', 'precios', 'catalogo', 'catálogo', 'lista'],
            created_for: 'agente_mcp_system'
          }
        }
      });
      
      console.log('\\n✅ Archivo guardado en base de datos:');
      console.log('   🆔 Media File ID:', mediaFile.id);
      console.log('   🎯 Purpose:', mediaFile.purpose);
      console.log('   🏷️ Tags:', mediaFile.tags.join(', '));
      console.log('   👤 Agent ID:', mediaFile.agentId);
      console.log('   📝 Description:', mediaFile.description);
      
      // Crear algunos archivos adicionales para demostración
      console.log('\\n📁 Creando archivos adicionales...');
      
      // Catálogo de servicios
      const catalogResult = await cloudinary.uploader.upload(menuImageBase64, {
        folder: `safenotify/users/${agent.userId}/catalogs`,
        public_id: 'catalogo_servicios_agente',
        resource_type: 'auto',
        context: {
          alt: 'Catálogo de servicios disponibles',
          caption: 'Servicios y productos especiales'
        },
        tags: ['catalog', 'servicios', 'agente']
      });
      
      const catalogFile = await prisma.mediaFile.create({
        data: {
          userId: agent.userId,
          agentId: agent.id,
          originalUrl: 'generated_catalog_base64',
          cloudinaryUrl: catalogResult.secure_url,
          fileName: 'catalogo_servicios_agente',
          fileType: 'image',
          mimeType: catalogResult.format || 'png',
          fileSize: catalogResult.bytes,
          purpose: 'catalogue',
          description: 'Catálogo completo de servicios y productos disponibles',
          tags: ['catalogo', 'servicios', 'productos', 'agente'],
          aiAnalysis: {
            type: 'service_catalog',
            category: 'business_services',
            auto_send_keywords: ['catalogo', 'catálogo', 'servicios', 'productos', 'lista completa']
          }
        }
      });
      
      // Lista de precios
      const pricesResult = await cloudinary.uploader.upload(menuImageBase64, {
        folder: `safenotify/users/${agent.userId}/prices`,
        public_id: 'lista_precios_agente',
        resource_type: 'auto',
        tags: ['prices', 'precios', 'agente']
      });
      
      const pricesFile = await prisma.mediaFile.create({
        data: {
          userId: agent.userId,
          agentId: agent.id,
          originalUrl: 'generated_prices_base64',
          cloudinaryUrl: pricesResult.secure_url,
          fileName: 'lista_precios_agente',
          fileType: 'image',
          mimeType: pricesResult.format || 'png',
          fileSize: pricesResult.bytes,
          purpose: 'price_list',
          description: 'Lista actualizada de precios de productos y servicios',
          tags: ['precios', 'prices', 'lista', 'agente'],
          aiAnalysis: {
            type: 'price_list',
            category: 'business_pricing',
            auto_send_keywords: ['precios', 'precio', 'costo', 'cuanto cuesta', 'cotizar', 'cotización']
          }
        }
      });
      
      console.log('✅ Archivos adicionales creados:');
      console.log('   📋 Catálogo:', catalogFile.id);
      console.log('   💰 Lista de precios:', pricesFile.id);
      
      // Resumen final
      const totalFiles = await prisma.mediaFile.count({
        where: { agentId: agent.id }
      });
      
      console.log('\\n🎉 ARCHIVOS MULTIMEDIA LISTOS PARA AGENTE!');
      console.log('\\n📊 RESUMEN:');
      console.log('   ✅ Total de archivos subidos:', totalFiles);
      console.log('   ✅ Archivos en Cloudinary: ✓');
      console.log('   ✅ Archivos en base de datos: ✓');
      console.log('   ✅ Configuración AI análisis: ✓');
      console.log('   ✅ Keywords automáticas: ✓');
      
      console.log('\\n🤖 EL AGENTE AHORA PUEDE:');
      console.log('   📤 Enviar menú automáticamente cuando alguien pregunte');
      console.log('   📋 Mostrar catálogo de servicios');
      console.log('   💰 Compartir lista de precios');
      console.log('   🎯 Detectar automáticamente qué archivo enviar');
      
      console.log('\\n💬 MENSAJES DE PRUEBA:');
      console.log('   • "Hola, ¿tienen menú?"');
      console.log('   • "Muéstrame el catálogo"');
      console.log('   • "¿Cuáles son sus precios?"');
      console.log('   • "¿Qué productos tienen?"');
      console.log('   • "¿Qué servicios ofrecen?"');
      
      return {
        success: true,
        filesCreated: totalFiles,
        menuFile: mediaFile,
        catalogFile: catalogFile,
        pricesFile: pricesFile
      };
      
    } catch (cloudinaryError) {
      console.error('❌ Error subiendo a Cloudinary:', cloudinaryError);
      throw cloudinaryError;
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

uploadMenuForAgente().catch(console.error);