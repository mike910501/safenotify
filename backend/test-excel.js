// Test de la guía del Excel
require('dotenv').config();
const aiValidator = require('./services/aiTemplateValidator');

const variables = ['nombre', 'fecha', 'producto'];
const content = 'Hola {{nombre}}, tu pedido de {{producto}} estará listo el {{fecha}}.';

const guide = aiValidator.generateExcelGuide(variables, content);
console.log('📊 GUÍA DEL EXCEL:');
console.log(guide);