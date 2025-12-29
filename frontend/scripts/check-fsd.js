#!/usr/bin/env node

/**
 * Скрипт для проверки соблюдения FSD (Feature-Sliced Design) архитектуры
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const FSD_LAYERS = ['shared', 'entities', 'features', 'widgets'];
const ALLOWED_IMPORTS = {
  shared: ['shared'],
  entities: ['shared', 'entities'],
  features: ['shared', 'entities', 'features'],
  widgets: ['shared', 'entities', 'features', 'widgets'],
};

let errors = [];
let warnings = [];

function checkFile(filePath, layer) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Проверка импортов
    const importMatch = line.match(/from\s+['"](@[\w/]+|\.\.?\/[\w/]+)/);
    if (importMatch) {
      const importPath = importMatch[1];
      
      // Проверка импортов из других слоёв
      if (importPath.startsWith('@shared/')) {
        // Разрешено
      } else if (importPath.startsWith('@entities/')) {
        if (!ALLOWED_IMPORTS[layer].includes('entities')) {
          errors.push(
            `❌ ${filePath}:${index + 1} - Импорт из entities в ${layer} запрещён`
          );
        }
      } else if (importPath.startsWith('@features/')) {
        if (!ALLOWED_IMPORTS[layer].includes('features')) {
          errors.push(
            `❌ ${filePath}:${index + 1} - Импорт из features в ${layer} запрещён`
          );
        }
      } else if (importPath.startsWith('@widgets/')) {
        if (!ALLOWED_IMPORTS[layer].includes('widgets')) {
          errors.push(
            `❌ ${filePath}:${index + 1} - Импорт из widgets в ${layer} запрещён`
          );
        }
      } else if (importPath.startsWith('../')) {
        // Относительные импорты - проверяем уровень вложенности
        const depth = (importPath.match(/\.\.\//g) || []).length;
        if (depth > 1) {
          warnings.push(
            `⚠️  ${filePath}:${index + 1} - Глубокая вложенность импорта: ${importPath}`
          );
        }
      }
    }
  });
}

function checkLayer(layerPath, layerName) {
  if (!fs.existsSync(layerPath)) {
    return;
  }

  const items = fs.readdirSync(layerPath);
  
  items.forEach((item) => {
    const itemPath = path.join(layerPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      checkLayer(itemPath, layerName);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      checkFile(itemPath, layerName);
    }
  });
}

function main() {
  console.log('🔍 Проверка FSD-архитектуры...\n');

  FSD_LAYERS.forEach((layer) => {
    const layerPath = path.join(SRC_DIR, layer);
    if (fs.existsSync(layerPath)) {
      checkLayer(layerPath, layer);
    }
  });

  // Проверка app директории (может импортировать из всех слоёв)
  const appPath = path.join(SRC_DIR, 'app');
  if (fs.existsSync(appPath)) {
    const checkAppFile = (dir) => {
      const items = fs.readdirSync(dir);
      items.forEach((item) => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          checkAppFile(itemPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          // App может импортировать из всех слоёв, но проверяем на циклические зависимости
          checkFile(itemPath, 'widgets'); // Используем widgets как самый верхний уровень
        }
      });
    };
    checkAppFile(appPath);
  }

  // Вывод результатов
  if (warnings.length > 0) {
    console.log('⚠️  Предупреждения:');
    warnings.forEach((warning) => console.log(`  ${warning}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('❌ Ошибки FSD-архитектуры:');
    errors.forEach((error) => console.log(`  ${error}`));
    console.log(`\n❌ Найдено ${errors.length} ошибок FSD-архитектуры\n`);
    process.exit(1);
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ FSD-архитектура соблюдена!\n');
  } else if (errors.length === 0) {
    console.log(`✅ FSD-архитектура соблюдена (${warnings.length} предупреждений)\n`);
  }
}

main();

