/**
 * 🔄 MIGRACIÓN DE DATOS: Users existentes al sistema CRM
 * 
 * Este script migra Users existentes al nuevo sistema CRM:
 * 1. Crea agente AI "Asistente" por defecto para cada User
 * 2. Opcionalmente puede crear número WhatsApp demo para testing
 * 3. Configura límites según plan existente del User
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuración de agente default por tipo de plan
const AGENT_CONFIG_BY_PLAN = {
  free: {
    maxAgents: 1,
    maxWhatsAppNumbers: 0, // Free no tiene WhatsApp
    agentName: "Asistente",
    agentRole: "assistant"
  },
  basic: {
    maxAgents: 1, 
    maxWhatsAppNumbers: 1,
    agentName: "Asistente",
    agentRole: "assistant"
  },
  pro: {
    maxAgents: 3,
    maxWhatsAppNumbers: 2,
    agentName: "Asistente Pro",
    agentRole: "sales"
  },
  enterprise: {
    maxAgents: -1, // Ilimitado
    maxWhatsAppNumbers: 5,
    agentName: "Asistente Enterprise",
    agentRole: "sales"
  }
};

// Prompts default por rol de agente
const DEFAULT_PROMPTS = {
  assistant: {
    personality: `Eres un asistente virtual amigable y profesional. 
    Tu objetivo es ayudar a los clientes con sus consultas de manera eficiente y cordial.
    Mantén un tono cálido pero profesional, y siempre busca resolver las necesidades del cliente.`,
    
    business: `Este negocio valora la atención personalizada y la resolución rápida de consultas.
    Los clientes buscan respuestas claras y apoyo en sus necesidades.
    Prioriza la satisfacción del cliente y la comunicación efectiva.`,
    
    objectives: `Objetivos principales:
    1. Responder consultas de clientes de manera precisa y oportuna
    2. Proporcionar información útil sobre productos/servicios
    3. Resolver problemas y direccionar a especialistas cuando sea necesario
    4. Mantener una comunicación profesional y amigable
    5. Capturar información relevante del cliente para seguimiento`
  },
  
  sales: {
    personality: `Eres un consultor de ventas profesional y orientado a resultados.
    Eres experto en identificar necesidades del cliente y presentar soluciones de valor.
    Mantienes un enfoque consultivo, construyendo confianza y relaciones a largo plazo.`,
    
    business: `Este negocio se enfoca en generar valor real para sus clientes.
    Las ventas se basan en entender profundamente las necesidades y ofrecer soluciones personalizadas.
    La calidad y el servicio son diferenciadores clave en el mercado.`,
    
    objectives: `Objetivos de venta:
    1. Calificar leads y entender necesidades específicas del cliente
    2. Presentar propuestas de valor alineadas con sus necesidades
    3. Construir confianza y establecer relaciones comerciales sólidas
    4. Cerrar ventas manteniendo satisfacción del cliente
    5. Generar referencias y ventas recurrentes
    6. Capturar información para seguimiento comercial`
  }
};

/**
 * Función principal de migración
 */
async function migrateUsersToCSRM() {
  try {
    console.log('🚀 Iniciando migración de Users existentes al sistema CRM...');
    
    // 1. Obtener todos los Users existentes
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        planType: true,
        role: true,
        createdAt: true
      },
      where: {
        // Solo Users activos (no admins del sistema SafeNotify)
        role: 'user'
      }
    });
    
    console.log(`📊 Encontrados ${users.length} usuarios para migrar`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      try {
        console.log(`\n👤 Migrando usuario: ${user.email} (Plan: ${user.planType})`);
        
        // 2. Actualizar campos CRM en User
        const planConfig = AGENT_CONFIG_BY_PLAN[user.planType] || AGENT_CONFIG_BY_PLAN['basic'];
        
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            crmEnabled: true,
            crmPlan: user.planType,
            maxAgents: planConfig.maxAgents,
            maxWhatsAppNumbers: planConfig.maxWhatsAppNumbers
          }
        });
        
        console.log(`  ✅ Usuario actualizado con CRM habilitado`);
        console.log(`  📊 Límites: ${planConfig.maxAgents} agentes, ${planConfig.maxWhatsAppNumbers} números WhatsApp`);
        
        // 3. Crear agente AI default
        const agentPrompts = DEFAULT_PROMPTS[planConfig.agentRole];
        
        const defaultAgent = await prisma.userAIAgent.create({
          data: {
            userId: user.id,
            name: planConfig.agentName,
            description: `Agente ${planConfig.agentRole} por defecto para ${user.name || user.email}`,
            role: planConfig.agentRole,
            isActive: true,
            isDefault: true,
            
            // Prompts personalizados
            personalityPrompt: agentPrompts.personality,
            businessPrompt: agentPrompts.business, 
            objectivesPrompt: agentPrompts.objectives,
            
            // Configuración IA
            model: user.planType === 'enterprise' ? 'gpt-4' : 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokensPerMessage: user.planType === 'free' ? 300 : 500,
            
            // Reglas de negocio básicas
            businessRules: {
              canScheduleAppointments: planConfig.agentRole === 'sales',
              canAccessPricing: true,
              canEscalateToHuman: true,
              workingHours: {
                start: "09:00",
                end: "18:00",
                timezone: "America/Bogota"
              }
            },
            
            triggerKeywords: planConfig.agentRole === 'sales' 
              ? ['precio', 'comprar', 'cotización', 'venta']
              : ['ayuda', 'soporte', 'consulta', 'información']
          }
        });
        
        console.log(`  🤖 Agente creado: ${defaultAgent.name} (${defaultAgent.role})`);
        
        // 4. Crear prompt inicial para el agente
        const initialPrompt = await prisma.userAgentPrompt.create({
          data: {
            agentId: defaultAgent.id,
            systemPrompt: `${agentPrompts.personality}\n\n${agentPrompts.business}\n\n${agentPrompts.objectives}`,
            contextSummary: 'Prompt inicial generado durante migración',
            businessContext: {
              userPlan: user.planType,
              agentRole: planConfig.agentRole,
              createdDuringMigration: true
            },
            version: 1,
            triggerReason: 'initial',
            isActive: true
          }
        });
        
        console.log(`  📝 Prompt inicial creado: versión ${initialPrompt.version}`);
        
        // 5. Si el plan permite WhatsApp, crear entrada demo (opcional)
        if (planConfig.maxWhatsAppNumbers > 0) {
          // NOTA: No crear número real, solo preparar estructura
          console.log(`  📱 Plan permite ${planConfig.maxWhatsAppNumbers} números WhatsApp`);
          console.log(`  💡 User puede configurar sus números WhatsApp en el dashboard`);
        }
        
        migratedCount++;
        console.log(`  ✅ Usuario migrado exitosamente (${migratedCount}/${users.length})`);
        
      } catch (userError) {
        console.error(`  ❌ Error migrando usuario ${user.email}:`, userError.message);
        skippedCount++;
      }
    }
    
    // 6. Crear métricas iniciales para todos los Users
    console.log(`\n📊 Creando métricas iniciales...`);
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const migratedUsers = await prisma.user.findMany({
      where: { crmEnabled: true },
      select: { id: true }
    });
    
    for (const user of migratedUsers) {
      try {
        await prisma.cRMMetrics.create({
          data: {
            userId: user.id,
            period: 'monthly',
            periodStart: startOfMonth,
            periodEnd: endOfMonth,
            // Todas las métricas en 0 (inicio limpio)
            totalConversations: 0,
            totalLeads: 0,
            totalMessages: 0,
            totalRevenue: 0
          }
        });
      } catch (metricsError) {
        console.log(`    ⚠️ No se pudieron crear métricas para usuario ${user.id}`);
      }
    }
    
    console.log(`\n🎉 MIGRACIÓN COMPLETADA`);
    console.log(`✅ Usuarios migrados exitosamente: ${migratedCount}`);
    console.log(`❌ Usuarios omitidos (errores): ${skippedCount}`);
    console.log(`📊 Total procesados: ${migratedCount + skippedCount}`);
    
    // 7. Mostrar resumen por plan
    const summary = await prisma.user.groupBy({
      by: ['crmPlan'],
      where: { crmEnabled: true },
      _count: { crmPlan: true }
    });
    
    console.log(`\n📋 RESUMEN POR PLAN:`);
    summary.forEach(planSummary => {
      console.log(`  ${planSummary.crmPlan}: ${planSummary._count.crmPlan} usuarios`);
    });
    
    console.log(`\n🎯 PRÓXIMOS PASOS:`);
    console.log(`1. Los usuarios pueden configurar sus números WhatsApp en el dashboard`);
    console.log(`2. Pueden personalizar sus agentes IA según su negocio`);
    console.log(`3. El sistema está listo para empezar a recibir conversaciones`);
    
  } catch (error) {
    console.error('💥 Error en la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Función para rollback de la migración (emergencia)
 */
async function rollbackUserMigration() {
  try {
    console.log('🔄 Iniciando rollback de migración CRM...');
    
    // Eliminar todos los datos CRM creados
    await prisma.cRMMetrics.deleteMany({});
    await prisma.userAgentPrompt.deleteMany({});
    await prisma.userAIAgent.deleteMany({});
    
    // Revertir campos CRM en Users
    await prisma.user.updateMany({
      data: {
        crmEnabled: false,
        crmPlan: 'basic',
        maxAgents: 1,
        maxWhatsAppNumbers: 1
      }
    });
    
    console.log('✅ Rollback completado');
    
  } catch (error) {
    console.error('❌ Error en rollback:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'rollback') {
    rollbackUserMigration()
      .then(() => console.log('🔄 Rollback ejecutado'))
      .catch(err => {
        console.error('💥 Error en rollback:', err);
        process.exit(1);
      });
  } else {
    migrateUsersToCSRM()
      .then(() => console.log('🎉 Migración completada'))
      .catch(err => {
        console.error('💥 Error en migración:', err);
        process.exit(1);
      });
  }
}

module.exports = {
  migrateUsersToCSRM,
  rollbackUserMigration,
  AGENT_CONFIG_BY_PLAN,
  DEFAULT_PROMPTS
};