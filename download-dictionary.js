const https = require('https');
const fs = require('fs');
const path = require('path');

// Descargar el diccionario desde el servidor remoto
const SERVER_URL = 'https://itd.barcelo.edu.ar';

function downloadDictionary() {
  console.log('📥 Descargando diccionario desde el servidor remoto...\n');
  
  // Primero obtener la lista de diccionarios
  https.get(`${SERVER_URL}/api/dictionaries`, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        const dict = response.dictionaries.find(d => d.fileName === 'Diccionario_de_sentimientos_11_02_2026');
        
        if (!dict) {
          console.error('❌ Diccionario no encontrado en el servidor');
          return;
        }
        
        console.log(`✅ Diccionario encontrado: ${dict.name} (${dict.wordCount} palabras)\n`);
        
        // Activar el diccionario para obtener su contenido completo
        const postData = JSON.stringify({ fileName: dict.fileName });
        
        const options = {
          hostname: 'itd.barcelo.edu.ar',
          port: 443,
          path: '/api/dictionaries/activate',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
          }
        };
        
        const req = https.request(options, (res) => {
          let activateData = '';
          
          res.on('data', (chunk) => {
            activateData += chunk;
          });
          
          res.on('end', () => {
            try {
              const activateResponse = JSON.parse(activateData);
              
              if (activateResponse.activeDictionary && activateResponse.activeDictionary.labels) {
                // Crear el archivo JSON completo
                const dictionaryContent = {
                  name: dict.name,
                  created: dict.created,
                  wordCount: dict.wordCount,
                  dictionary: activateResponse.activeDictionary.labels
                };
                
                // Guardar en la carpeta local
                const filePath = path.join(__dirname, 'dictionaries', `${dict.fileName}.json`);
                fs.writeFileSync(filePath, JSON.stringify(dictionaryContent, null, 2), 'utf8');
                
                console.log(`💾 Diccionario guardado en: ${filePath}\n`);
                console.log(`📊 Total de palabras/frases: ${Object.keys(dictionaryContent.dictionary).length}\n`);
                
                // Mostrar algunas palabras de ejemplo
                const entries = Object.entries(dictionaryContent.dictionary).slice(0, 10);
                console.log('📝 Primeras 10 palabras del diccionario:\n');
                entries.forEach(([word, score]) => {
                  const sign = score > 0 ? '+' : '';
                  console.log(`   "${word}": ${sign}${score}`);
                });
                
                console.log('\n✅ ¡Diccionario descargado exitosamente!');
              } else {
                console.error('❌ No se pudo obtener el contenido del diccionario');
              }
            } catch (err) {
              console.error('❌ Error procesando respuesta de activación:', err.message);
            }
          });
        });
        
        req.on('error', (err) => {
          console.error('❌ Error en la petición:', err.message);
        });
        
        req.write(postData);
        req.end();
        
      } catch (err) {
        console.error('❌ Error procesando respuesta:', err.message);
      }
    });
  }).on('error', (err) => {
    console.error('❌ Error en la petición:', err.message);
  });
}

downloadDictionary();
