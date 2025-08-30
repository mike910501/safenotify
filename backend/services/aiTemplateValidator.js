const OpenAI = require('openai');

class AITemplateValidator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Validar template contra políticas de WhatsApp
  async validateTemplate(templateData) {
    const { name, content, category, variables } = templateData;
    
    try {
      console.log(`🤖 Validando template con IA: ${name}`);
      
      const prompt = this.buildValidationPrompt(name, content, category, variables);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Más económico que GPT-4
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.3, // Respuestas más consistentes
        max_tokens: 1500
      });

      const response = completion.choices[0].message.content;
      console.log('🤖 Respuesta de IA recibida');
      
      return this.parseAIResponse(response);
      
    } catch (error) {
      console.error('Error en validación con IA:', error);
      return {
        success: false,
        error: 'Error interno de validación con IA',
        approved: false,
        suggestions: ['Error técnico - intenta nuevamente'],
        excelRequirements: []
      };
    }
  }

  getSystemPrompt() {
    return `Eres un experto en WhatsApp Business que ayuda a mejorar mensajes.

TU TRABAJO:
1. ✅ APROBAR la mayoría de templates profesionales
2. 💡 SUGERIR una versión mejorada del mensaje con emojis apropiados
3. 📊 IDENTIFICAR qué variables necesita el Excel

🚨 RECHAZA INMEDIATAMENTE SOLO SI:
- Contiene links a wa.me/ o números de WhatsApp externos
- Tiene URLs de competidores o negocios externos
- Menciona otros números telefónicos que no son variables
- Incluye información financiera (cuentas bancarias, crypto)
- Solicita datos sensibles (contraseñas, números de tarjetas)

✅ APRUEBA SIEMPRE SI:
- Es un mensaje profesional de confirmación/cita
- Usa variables correctamente {{variable}}
- Tiene propósito comercial legítimo
- No contiene contenido prohibido

RESPONDE EN FORMATO JSON:
{
  "approved": boolean (SER MUY GENEROSO - aprobar 95% de mensajes profesionales),
  "score": number (85-98 para mensajes profesionales, 70-84 con mejoras menores, 0-30 solo si viola políticas),
  "reasons": ["razón específica por qué es bueno/malo"],
  "suggestions": ["Versión mejorada del mensaje con emojis y variables corregidas"],
  "excelRequirements": ["TODAS las variables incluyendo nuevas sugeridas"],
  "suggestedVariables": ["variables nuevas que detectaste"],
  "riskLevel": "HIGH" si tiene links externos, "LOW" si está bien
}

EMOJIS POR CONTEXTO:
- Médico/Salud: 🧠🦷👁️🫀💊🏥👩‍⚕️👨‍⚕️
- Fechas/Tiempo: 📅⏰🕐📆
- Ubicación: 📍🏢🏠🗺️
- Servicios: ✂️💄💅🔧🛠️
- Productos: 👟👕📱💻🎁
- Contacto: 📞📧💬
- Emociones: 😊🎉✨👋❤️

OBJETIVO: Sugerir mensaje mejorado con emojis contextualmente apropiados.`;
  }

  buildValidationPrompt(name, content, category, variables) {
    const contextualVariables = this.analyzeVariables(variables, content);
    
    return `MENSAJE ORIGINAL: "${content}"
VARIABLES CON CONTEXTO: ${contextualVariables}
CATEGORÍA: ${category}

INSTRUCCIONES:
1. ¿Es apropiado para WhatsApp Business?
2. Sugiere UNA versión mejorada con emojis específicos para ${category}
3. Mantén EXACTAMENTE las variables {{variable}} sin cambiar
4. IMPORTANTE: Si encuentras texto fijo que debería ser variable, conviértelo a {{variable}}
5. Considera el contexto de cada variable para usar emojis relevantes

DETECTA TEXTO QUE DEBE SER VARIABLE:
- Especialidades médicas: "neuropsicología" → {{especialidad}}
- Servicios específicos: "manicure" → {{servicio}}  
- Productos específicos: "iPhone 15" → {{producto}}
- Nombres propios: "Dr. García" → {{doctor}}

EJEMPLO: "cita para neuropsicología" → "cita para {{especialidad}}"`;
  }

  // Analizar variables para dar contexto
  analyzeVariables(variables, content) {
    if (!variables || !variables.length) return 'ninguna';
    
    return variables.map(variable => {
      const context = this.getVariableContext(variable, content);
      return `{{${variable}}} (${context})`;
    }).join(', ');
  }

  // Detectar el contexto de una variable
  getVariableContext(variable, content) {
    const varLower = variable.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Contextos por nombre de variable
    const contextMap = {
      'nombre': 'nombre de persona',
      'fecha': 'fecha específica',
      'hora': 'hora específica', 
      'servicio': 'tipo de servicio médico/profesional',
      'especialidad': 'especialidad médica',
      'doctor': 'nombre del profesional',
      'negocio': 'nombre del negocio/empresa',
      'direccion': 'dirección física',
      'ubicacion': 'lugar/ubicación',
      'precio': 'valor/precio en dinero',
      'producto': 'producto específico',
      'empresa': 'nombre de empresa',
      'telefono': 'número de teléfono',
      'email': 'correo electrónico'
    };

    // Buscar contexto directo
    if (contextMap[varLower]) {
      return contextMap[varLower];
    }

    // Analizar contexto por contenido
    if (contentLower.includes('cita') || contentLower.includes('consulta')) {
      if (varLower.includes('servicio')) return 'servicio médico/consulta';
      if (varLower.includes('fecha')) return 'fecha de cita';
    }
    
    if (contentLower.includes('pedido') || contentLower.includes('compra')) {
      if (varLower.includes('producto')) return 'producto comprado';
      if (varLower.includes('fecha')) return 'fecha de entrega';
    }

    return 'información personalizada';
  }

  parseAIResponse(response) {
    try {
      // Limpiar la respuesta por si viene con markdown
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanResponse);
      
      return {
        success: true,
        approved: parsed.approved || false,
        score: parsed.score || 0,
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [parsed.reasons || 'Sin razones'],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [parsed.suggestions || 'Sin sugerencias'],
        excelRequirements: Array.isArray(parsed.excelRequirements) ? parsed.excelRequirements : [],
        suggestedVariables: Array.isArray(parsed.suggestedVariables) ? parsed.suggestedVariables : [],
        riskLevel: parsed.riskLevel || 'MEDIUM'
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw AI response:', response);
      
      // Fallback parsing manual
      return {
        success: true,
        approved: response.toLowerCase().includes('approved": true'),
        score: 50,
        reasons: ['Respuesta de IA no parseable correctamente'],
        suggestions: ['Revisa el template manualmente'],
        excelRequirements: variables || [],
        suggestedVariables: [],
        riskLevel: 'MEDIUM'
      };
    }
  }

  // Generar guía simple del Excel
  generateExcelGuide(variables, templateContent) {
    if (!variables.length) {
      return "Este template no usa variables, no necesitas Excel.";
    }

    const guide = `📊 **EXCEL REQUERIDO:**

**Columnas necesarias:**
${variables.map((v, i) => `• Columna ${String.fromCharCode(65 + i)}: ${v}`).join('\n')}

**Ejemplo:**
| ${variables.join(' | ')} |
|${variables.map(() => '---').join('|')}|
| ${variables.map(v => this.getSampleValue(v)).join(' | ')} |

💡 **Tip:** Primera fila = encabezados, siguientes filas = datos de tus contactos.`;

    return guide;
  }

  getSampleValue(variable) {
    const samples = {
      'nombre': 'Juan Pérez',
      'fecha': '2024-01-15',
      'hora': '14:30',
      'servicio': 'Consulta',
      'precio': '$50.000',
      'empresa': 'Mi Empresa',
      'telefono': '300123456',
      'email': 'juan@email.com',
      'producto': 'Zapatos'
    };
    
    return samples[variable.toLowerCase()] || `Ejemplo${variable}`;
  }

  // Validar si el servicio está configurado
  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  }
}

module.exports = new AITemplateValidator();