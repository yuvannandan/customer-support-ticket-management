const fs = require('fs'); 
const path = require('path'); 

function walk(dir) { 
  let results = []; 
  const list = fs.readdirSync(dir); 
  list.forEach(file => { 
    file = path.join(dir, file); 
    const stat = fs.statSync(file); 
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file)); 
    } else { 
      if (file.endsWith('.tsx')) results.push(file); 
    } 
  }); 
  return results; 
}; 

const files = walk('./src/app'); 
files.forEach(file => { 
  const content = fs.readFileSync(file, 'utf8'); 
  const updated = content.replace(/className="flex min-h-screen bg-gray-100"/g, 'className="flex flex-col md:flex-row min-h-screen bg-gray-100"'); 
  if (content !== updated) { 
    fs.writeFileSync(file, updated); 
    console.log('Updated ' + file); 
  } 
});
