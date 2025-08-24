// Template validation with OpenAI GPT-4
const validateTemplateWithAI = async (req, res) => {
  try {
    const { content, category } = req.body;
    
    if (!content || !category) {
      return res.status(400).json({
        success: false,
        error: 'Content and category are required'
      });
    }

    // Extract variables from template - handle both {{variable}} and plain text variables
    const variablePattern = /\{\{(\w+)\}\}/g;
    const variables = [];
    let match;
    
    // First check for {{variable}} format
    while ((match = variablePattern.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    // If no variables found, try to detect them from context
    // Look for patterns like "nombre, empresa" or "Hola nombre" 
    if (variables.length === 0) {
      // Common variable names to look for
      const commonVars = ['nombre', 'empresa', 'fecha', 'hora', 'telefono', 'direccion', 
                         'servicio', 'doctor', 'sede', 'ubicacion', 'escuela', 'nombre_clase',
                         'profesor', 'cliente', 'producto', 'descuento', 'codigo'];
      
      commonVars.forEach(varName => {
        // Check if the variable name appears in the content as a word
        const regex = new RegExp(`\\b${varName}\\b`, 'i');
        if (regex.test(content)) {
          variables.push(varName);
        }
      });
    }

    // OpenAI API configuration
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    let improvedContent = content;
    let aiScore = 70;
    const suggestions = [];
    
    try {
      // Call OpenAI for intelligent improvement
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: `Eres un experto en marketing por SMS y WhatsApp. Tu tarea es mejorar plantillas de mensajes para negocios en español.

REGLAS OBLIGATORIAS:
1. DEBES usar TODAS Y CADA UNA de las variables que te doy, SIN EXCEPCIÓN
2. Las variables SIEMPRE deben estar en formato {{variable}}
3. NO escribas el contenido de las variables, usa el marcador {{variable}}
4. Si el usuario escribió "nombre, empresa, fecha" conviértelas a {{nombre}}, {{empresa}}, {{fecha}}
5. NO omitas ninguna variable. Si te doy 6 variables, TODAS las 6 deben aparecer en el mensaje
6. Agrega emojis apropiados al inicio y en puntos clave
7. NO pidas confirmación ni respuesta (es comunicación de una sola vía)
8. Para recordatorios: NO incluyas "confirma" o "responde", solo informa
9. Mantén el mensaje bajo 250 caracteres idealmente
10. Si existe variable de empresa/escuela, úsala como firma
11. El mensaje debe ser informativo y cortés pero sin solicitar acción del receptor

ESTRUCTURA SUGERIDA:
[Emoji] Saludo con {{nombre}}
Mensaje principal usando TODAS las variables
[Emoji] Información adicional o recordatorio (NO solicitar respuesta)
Firma con variable de empresa/escuela

RESPONDE SOLO con el mensaje mejorado, sin explicaciones.`
            },
            {
              role: 'user',
              content: `Categoría: ${category}

Mensaje original: ${content}
Variables OBLIGATORIAS que DEBES usar TODAS: ${variables.length > 0 ? variables.map(v => `{{${v}}}`).join(', ') : 'ninguna'}

IMPORTANTE: Tu respuesta DEBE contener TODAS estas variables: ${variables.map(v => `{{${v}}}`).join(', ')}

Mejora este mensaje usando OBLIGATORIAMENTE TODAS las variables listadas arriba.`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (openAIResponse.ok) {
        const aiData = await openAIResponse.json();
        if (aiData.choices && aiData.choices[0] && aiData.choices[0].message) {
          improvedContent = aiData.choices[0].message.content.trim();
          aiScore = 95; // High score for AI-improved content
        }
      } else {
        const errorData = await openAIResponse.json();
        console.error('OpenAI API Error Response:', errorData);
        throw new Error('OpenAI API request failed');
      }
      
    } catch (aiError) {
      console.error('OpenAI API Error:', aiError);
      suggestions.push('⚠️ No se pudo conectar con la IA. Usando mejoras básicas.');
      
      // Basic fallback improvements
      if (!content.includes('{{')) {
        improvedContent = `Hola {{nombre}}! ${content}`;
      }
      
      if (!content.includes('📞') && !content.includes('✅')) {
        if (category === 'recordatorio') {
          improvedContent = '🔔 ' + improvedContent + '\n\n📍 Te esperamos.';
        } else if (category === 'promocion') {
          improvedContent = '🎉 ' + improvedContent + '\n\n⏰ Oferta por tiempo limitado.';
        } else if (category === 'confirmacion') {
          improvedContent = '✅ ' + improvedContent;
        }
      }
      
      aiScore = 75;
    }

    // Extract variables from improved content
    const improvedVariables = [];
    const improvedVariablePattern = /\{\{(\w+)\}\}/g;
    let improvedMatch;
    
    while ((improvedMatch = improvedVariablePattern.exec(improvedContent)) !== null) {
      if (!improvedVariables.includes(improvedMatch[1])) {
        improvedVariables.push(improvedMatch[1]);
      }
    }

    // Generate Excel format based on variables
    const excelColumns = [
      { column: 'telefono', description: 'Número con código de país', example: '+573001234567' }
    ];
    
    improvedVariables.forEach(variable => {
      if (variable === 'nombre') {
        excelColumns.push({ column: 'nombre', description: 'Nombre completo', example: 'María García' });
      } else if (variable === 'fecha') {
        excelColumns.push({ column: 'fecha', description: 'Fecha DD/MM/YYYY', example: '25/01/2024' });
      } else if (variable === 'hora') {
        excelColumns.push({ column: 'hora', description: 'Hora HH:MM', example: '14:30' });
      } else if (variable === 'empresa' || variable === 'nombre_empresa') {
        excelColumns.push({ column: variable, description: 'Nombre de la empresa', example: 'SafeNotify' });
      } else if (variable === 'servicio') {
        excelColumns.push({ column: 'servicio', description: 'Tipo de servicio', example: 'Consulta médica' });
      } else if (variable === 'sede' || variable === 'ubicacion') {
        excelColumns.push({ column: variable, description: 'Ubicación o sede', example: 'Sede Centro' });
      } else {
        excelColumns.push({ column: variable, description: 'Valor personalizado', example: 'Texto de ejemplo' });
      }
    });

    // Analysis of improved content
    const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(improvedContent);
    const characterCount = improvedContent.length;
    const messageSegments = Math.ceil(characterCount / 160);
    
    // Generate smart suggestions
    if (!hasEmojis && aiScore < 90) {
      suggestions.push('😊 Considera agregar emojis para mejorar la lectura');
    }
    
    if (!improvedVariables.includes('nombre')) {
      suggestions.push('👤 Agrega {{nombre}} para personalizar el saludo');
    }
    
    if (characterCount > 320) {
      suggestions.push(`📏 Mensaje muy largo (${characterCount} caracteres). Considera reducirlo para evitar costos adicionales`);
    }
    
    if (characterCount > 160 && characterCount <= 320) {
      suggestions.push(`💰 Mensaje de ${characterCount} caracteres. Costo doble por exceder 160 caracteres`);
    }

    // Final response
    const response = {
      success: true,
      validation: {
        isValid: aiScore >= 70,
        score: aiScore,
        variables: improvedVariables,
        characterCount,
        messageSegments,
        suggestions,
        estimatedCost: messageSegments === 1 
          ? `$0.01 por mensaje` 
          : `$${(0.01 * messageSegments).toFixed(2)} por mensaje (costo ${messageSegments}x por longitud)`,
        improvedTemplate: improvedContent !== content ? improvedContent : null,
        excelFormat: {
          description: '📊 Formato sugerido para tu archivo Excel/CSV:',
          columns: excelColumns,
          example: '💡 La primera fila debe contener los nombres exactos de las columnas'
        },
        tips: [
          '💬 Mantén los mensajes bajo 160 caracteres para un solo SMS',
          '🎯 Usa las variables detectadas para personalización',
          '⏰ Programa envíos en horario comercial (9am-7pm)',
          '📍 Sé claro y conciso en la información que compartes'
        ]
      }
    };

    res.json(response);
    
  } catch (error) {
    console.error('Error in template validation:', error);
    res.status(500).json({
      success: false,
      error: 'Error validating template'
    });
  }
};

module.exports = validateTemplateWithAI;