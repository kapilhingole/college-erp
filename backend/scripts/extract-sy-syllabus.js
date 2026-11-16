const fs = require('fs');
const { PDFParse } = require('../node_modules/pdf-parse');

const files = [
  { name: 'AIDS', path: 'C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/.user_uploaded/media_1794808658661_04404571.pdf' },
  { name: 'COMP', path: 'C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/.user_uploaded/media_1794808661235_221e8702.pdf' },
  { name: 'ECE', path: 'C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/.user_uploaded/media_1794808664847_d90c4658.pdf' },
  { name: 'ENTC', path: 'C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/.user_uploaded/media_1794808669018_82633242.pdf' }
];

async function extract() {
  for (const f of files) {
    const dataBuffer = fs.readFileSync(f.path);
    const parser = new PDFParse(new Uint8Array(dataBuffer));
    const result = await parser.getText();
    const text = typeof result === 'string' ? result : (result.text || '');
    console.log(`\n=================== ${f.name} (length: ${text.length}) ===================`);
    
    // Save raw text to scratch for inspection
    fs.writeFileSync(`C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/${f.name}_sy.txt`, text);
    
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const relevant = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/Course Code\s*:/i) || line.match(/Course Title\s*:/i) || line.match(/^Unit\s+[I|V|X|\d]+/i)) {
        relevant.push(line);
      }
    }
    console.log(`Found ${relevant.length} header/unit lines.`);
    console.log(relevant.slice(0, 30).join('\n'));
  }
}

extract().catch(console.error);
