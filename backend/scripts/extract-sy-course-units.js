const fs = require('fs');

const coursesToExtract = [
  // AIDS
  { file: 'AIDS', code: '25ADPC302', name: 'Data Structure and Algorithms (AIDS)' },
  { file: 'AIDS', code: '25ADPC303', name: 'Object Oriented Programming with C++ (AIDS)' },
  { file: 'AIDS', code: '25ADPC304', name: 'Computer Graphics (AIDS)' },
  { file: 'AIDS', code: '25ADMD301', name: 'Statistics for AI (AIDS)' },
  { file: 'AIDS', code: '25ADMC301', name: 'Digital Marketing and Social Media (AIDS)' },
  { file: 'AIDS', code: '25ADVS303', name: 'Advanced Python Programming (AIDS)' },

  // COMP
  { file: 'COMP', code: '25COPC302', name: 'Data Structures (COMP)' },
  { file: 'COMP', code: '25COPC303', name: 'Processor Architecture and System Design (COMP)' },
  { file: 'COMP', code: '25COPC304', name: 'Java Programming (COMP)' },
  { file: 'COMP', code: '25COMD301', name: 'Discrete Mathematics (COMP)' },
  { file: 'COMP', code: '25COMC301', name: 'Digital Marketing and Social Media (COMP)' },

  // ECE
  { file: 'ECE', code: '25ECPC302', name: 'Digital Electronics and Microcontroller (ECE)' },
  { file: 'ECE', code: '25ECPC303', name: 'Data Structure and Algorithms (ECE)' },
  { file: 'ECE', code: '25ECPC304', name: 'Computer Organization and Architecture (ECE)' },
  { file: 'ECE', code: '25ECMD301', name: 'Engineering Mathematics III (ECE)' },

  // ENTC
  { file: 'ENTC', code: '25ETPC302', name: 'Digital System Design & Applications (ENTC)' },
  { file: 'ENTC', code: '25ETPC303', name: 'Network Analysis & Synthesis (ENTC)' },
  { file: 'ENTC', code: '25ETPC304', name: 'Data Structures & Algorithms (ENTC)' },
  { file: 'ENTC', code: '25ETMD301', name: 'Engineering Mathematics – III (ENTC)' },
  { file: 'ENTC', code: '25ETVS303', name: 'Fundamental of C Programming (ENTC)' },
];

const results = {};

for (const c of coursesToExtract) {
  const filePath = `C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/${c.file}_sy.txt`;
  const text = fs.readFileSync(filePath, 'utf8');
  
  // Find where course syllabus starts
  let codeIdx = 0;
  let section = null;
  while ((codeIdx = text.indexOf(c.code, codeIdx)) !== -1) {
    const chunk = text.slice(codeIdx, codeIdx + 5000);
    if (chunk.includes('Course Contents:')) {
      const ccStart = chunk.indexOf('Course Contents:');
      const ccEnd = chunk.indexOf('Reference Books:') !== -1 ? chunk.indexOf('Reference Books:') : (chunk.indexOf('Text Books:') !== -1 ? chunk.indexOf('Text Books:') : chunk.length);
      section = chunk.slice(ccStart, ccEnd);
      break;
    }
    codeIdx += c.code.length;
  }
  
  results[c.code] = {
    name: c.name,
    section: section ? section.trim() : 'NOT FOUND'
  };
}

fs.writeFileSync('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/extracted_sy_courses.json', JSON.stringify(results, null, 2));
console.log('Saved extracted courses to scratch/extracted_sy_courses.json');
