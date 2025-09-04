
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.template.findFirst({
  where: { name: 'asignacion de labores' }
}).then(template => {
  console.log('📋 PLANTILLA: asignacion de labores');
  console.log('Content:', template.content);
  console.log('Variables array:', template.variables);
  
  // Extraer variables del contenido
  const regex = /\{\{([^}]+)\}\}/g;
  const vars = [];
  let match;
  while ((match = regex.exec(template.content)) \!== null) {
    vars.push(match[1]);
  }
  
  console.log('Variables en contenido:', vars);
  console.log('Variables únicas:', [...new Set(vars)]);
  
  // Contar repeticiones
  const count = {};
  vars.forEach(v => count[v] = (count[v] || 0) + 1);
  console.log('Repeticiones:', count);
  
  prisma.\();
});

