# 🚀 MCP Scripts

Scripts específicos para testing, configuración y verificación del **Model Context Protocol**.

## Scripts de Testing MCP

### 🧪 testMCPIntegration.js
- **Propósito**: Test completo de integración MCP
- **Uso**: `node testMCPIntegration.js`

### 📎 testMultimediaFunctions.js
- **Propósito**: Test específico de funciones multimedia MCP
- **Uso**: `node testMultimediaFunctions.js`

### 🔄 testFullMCPWorkflow.js
- **Propósito**: Test del workflow completo MCP end-to-end
- **Uso**: `node testFullMCPWorkflow.js`

## Scripts de Configuración

### ⚡ enableAgentMCP.js
- **Propósito**: Habilitar MCP para un agente específico
- **Uso**: `node enableAgentMCP.js <agentId>`

### 🎯 createAndEnableAgenteWithMCP.js
- **Propósito**: Crear nuevo agente con MCP habilitado
- **Uso**: `node createAndEnableAgenteWithMCP.js`

### 🔧 setupCompleteAgenteSystem.js
- **Propósito**: Setup completo de sistema de agente con MCP
- **Uso**: `node setupCompleteAgenteSystem.js`

### 🍽️ uploadMenuForAgente.js
- **Propósito**: Subir menú/catálogo para agente MCP
- **Uso**: `node uploadMenuForAgente.js`

## Scripts de Verificación

### ✅ verifyMCPSetup.js
- **Propósito**: Verificación general de setup MCP
- **Uso**: `node verifyMCPSetup.js`

### 🔍 verifyMCPBeforeCleanup.js
- **Propósito**: Verificación pre-limpieza del proyecto
- **Uso**: `node verifyMCPBeforeCleanup.js`

## Scripts Específicos Sofia

### 🤖 enableSofiaMCP.js
- **Propósito**: Habilitar MCP específicamente para agente Sofia
- **Uso**: `node enableSofiaMCP.js`

### ✅ verifySofiaMCPSetup.js
- **Propósito**: Verificación específica de Sofia con MCP
- **Uso**: `node verifySofiaMCPSetup.js`

## Uso Recomendado

1. **Setup inicial**: `setupCompleteAgenteSystem.js`
2. **Verificación**: `verifyMCPSetup.js`
3. **Testing**: `testFullMCPWorkflow.js`
4. **Habilitación**: `enableAgentMCP.js`

## Estado

✅ **PRODUCTION READY** - Todos los scripts validados y funcionales