const fs = require('fs');
const path = require('path');

const themesFile = path.join(__dirname, 'lib', 'visual-editor', 'themes.txt');
const content = fs.readFileSync(themesFile, 'utf-8');

const lines = content.split('\n');
const themes = {};

let currentTheme = null;
let currentMode = null;
let currentVars = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line && !line.startsWith('--') && !line.startsWith('}')) {
    if (!line.includes(':') && !line.includes('{') && !line.includes('}')) {
      // Theme name
      if (currentTheme && currentMode) {
        if (!themes[currentTheme]) themes[currentTheme] = {};
        themes[currentTheme][currentMode] = currentVars;
        currentVars = {};
      }
      currentTheme = line.toLowerCase();
      currentMode = null;
    } else if (line.startsWith(':root') || line.startsWith('.dark')) {
      if (currentMode) {
        if (!themes[currentTheme]) themes[currentTheme] = {};
        themes[currentTheme][currentMode] = currentVars;
        currentVars = {};
      }
      currentMode = line.startsWith(':root') ? 'light' : 'dark';
    }
  } else if (line.startsWith('--')) {
    const [key, value] = line.split(': ');
    if (key && value) {
      currentVars[key] = value.replace(';', '');
    }
  }
}

// Last one
if (currentTheme && currentMode) {
  if (!themes[currentTheme]) themes[currentTheme] = {};
  themes[currentTheme][currentMode] = currentVars;
}

fs.writeFileSync('parsed-themes.json', JSON.stringify(themes, null, 2));
console.log('Parsed themes written to parsed-themes.json');