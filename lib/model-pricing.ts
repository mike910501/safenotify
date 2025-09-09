/**
 * 💰 TABLA DE PRECIOS DE MODELOS OPENAI
 * Precios actualizados según documentación oficial OpenAI
 */

export interface ModelConfig {
  input: number;     // Precio por 1K tokens de input
  output: number;    // Precio por 1K tokens de output
  description: string;
  color: string;     // Color para gráficas
  icon: string;      // Nombre del ícono Lucide
  category: 'premium' | 'optimized' | 'economic' | 'legacy';
}

export const MODEL_PRICING: Record<string, ModelConfig> = {
  // ✅ GPT-5 Series - Nuevos modelos disponibles
  'gpt-5-nano': {
    input: 0.00005,    // $0.05 por 1M tokens
    output: 0.0004,    // $0.40 por 1M tokens
    description: 'Ultra barato. Perfecto para primer contacto y respuestas rápidas',
    color: '#10B981',  // Verde
    icon: 'Zap',
    category: 'economic'
  },
  'gpt-5-mini': {
    input: 0.00025,    // $0.25 por 1M tokens
    output: 0.002,     // $2.00 por 1M tokens
    description: 'Súper balance entre costo y calidad. Ideal para soporte y ventas',
    color: '#3B82F6',  // Azul
    icon: 'Brain',
    category: 'optimized'
  },
  'gpt-5': {
    input: 0.001,      // $1.00 por 1M tokens (estimado)
    output: 0.004,     // $4.00 por 1M tokens (estimado)
    description: 'Más potente que GPT-4, a menor costo. Para asesoría compleja',
    color: '#8B5CF6',  // Púrpura
    icon: 'Crown',
    category: 'premium'
  },
  // ✅ GPT-4 Series - Mantenidos para compatibilidad
  'gpt-4o-mini': {
    input: 0.00015,    // $0.15 por 1M tokens
    output: 0.0006,    // $0.60 por 1M tokens
    description: 'Modelo estable y probado. Plan B para diversificar',
    color: '#F59E0B',  // Amarillo
    icon: 'Shield',
    category: 'optimized'
  },
  'gpt-4o': {
    input: 0.0025,     // $2.50 por 1M tokens
    output: 0.010,     // $10 por 1M tokens
    description: 'GPT-4 multimodal mejorado',
    color: '#06B6D4',  // Cyan
    icon: 'Eye',
    category: 'premium'
  },
  'gpt-4': {
    input: 0.03,       // $30 por 1M tokens
    output: 0.06,      // $60 por 1M tokens
    description: 'Modelo legacy premium - Muy costoso',
    color: '#EF4444',  // Rojo
    icon: 'AlertTriangle',
    category: 'legacy'
  },
  'gpt-3.5-turbo': {
    input: 0.0005,     // $0.50 por 1M tokens
    output: 0.0015,    // $1.50 por 1M tokens
    description: 'Económico pero limitado - Solo emergencias',
    color: '#6B7280',  // Gris
    icon: 'Wrench',
    category: 'legacy'
  }
};

// Configuración por defecto para modelos desconocidos
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  input: 0.001,
  output: 0.002,
  description: 'Modelo nuevo - Precios estimados',
  color: '#6B7280',  // Gris
  icon: 'HelpCircle',
  category: 'premium'
};

/**
 * Calcula el costo de tokens para un modelo específico
 */
export function calculateModelCost(
  tokens: number, 
  type: 'input' | 'output', 
  modelName: string
): number {
  // Verificar que el modelo existe
  const modelConfig = MODEL_PRICING[modelName] || DEFAULT_MODEL_CONFIG;
  
  if (!MODEL_PRICING[modelName]) {
    console.warn(`Modelo desconocido: ${modelName}, usando precio default`);
  }
  
  const pricePerThousand = modelConfig[type];
  return (tokens / 1000) * pricePerThousand;
}

/**
 * Calcula el costo total (input + output) para un uso específico
 */
export function calculateTotalCost(
  inputTokens: number,
  outputTokens: number,
  modelName: string
): number {
  const inputCost = calculateModelCost(inputTokens, 'input', modelName);
  const outputCost = calculateModelCost(outputTokens, 'output', modelName);
  return inputCost + outputCost;
}

/**
 * Formatea números para display legible
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Formatea precios en USD
 */
export function formatCurrency(amount: number): string {
  if (amount < 0.01) {
    return `$${amount.toFixed(4)}`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * Obtiene la configuración de un modelo, con fallback
 */
export function getModelConfig(modelName: string): ModelConfig {
  return MODEL_PRICING[modelName] || DEFAULT_MODEL_CONFIG;
}

/**
 * Obtiene todos los modelos agrupados por categoría
 */
export function getModelsByCategory() {
  const categories: Record<string, Array<string & keyof typeof MODEL_PRICING>> = {
    premium: [],
    optimized: [],
    economic: [],
    legacy: []
  };

  Object.entries(MODEL_PRICING).forEach(([modelName, config]) => {
    categories[config.category].push(modelName as keyof typeof MODEL_PRICING);
  });

  return categories;
}

/**
 * Calcula ahorros potenciales al cambiar de modelo
 */
export function calculatePotentialSavings(
  currentModel: string,
  recommendedModel: string,
  monthlyTokens: number
): {
  currentCost: number;
  recommendedCost: number;
  savings: number;
  savingsPercentage: number;
} {
  // Asumiendo 70% input, 30% output como promedio
  const inputTokens = monthlyTokens * 0.7;
  const outputTokens = monthlyTokens * 0.3;

  const currentCost = calculateTotalCost(inputTokens, outputTokens, currentModel);
  const recommendedCost = calculateTotalCost(inputTokens, outputTokens, recommendedModel);
  
  const savings = currentCost - recommendedCost;
  const savingsPercentage = currentCost > 0 ? (savings / currentCost) * 100 : 0;

  return {
    currentCost,
    recommendedCost,
    savings,
    savingsPercentage
  };
}