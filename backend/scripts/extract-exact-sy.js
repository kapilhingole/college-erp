const fs = require('fs');

function extractExactCourse(filePath, courseCode) {
  const text = fs.readFileSync(filePath, 'utf8');
  let pos = 0;
  let syllabusBlock = null;

  while ((pos = text.indexOf(courseCode, pos)) !== -1) {
    const chunk = text.slice(pos, pos + 6000);
    // Check if this chunk has "Course Objectives:" and "Course Contents:"
    if (chunk.includes('Course Objectives:') && chunk.includes('Course Contents:')) {
      const ccStart = chunk.indexOf('Course Contents:');
      const ccEnd = chunk.indexOf('Text Books:') !== -1 ? chunk.indexOf('Text Books:') : (chunk.indexOf('Reference Books:') !== -1 ? chunk.indexOf('Reference Books:') : 4500);
      syllabusBlock = chunk.slice(ccStart, ccEnd);
      break;
    }
    pos += courseCode.length;
  }
  return syllabusBlock;
}

const courses = [
  // AIDS
  { file: 'AIDS', code: '25ADPC302', name: 'Data Structure and Algorithms' },
  { file: 'AIDS', code: '25ADPC303', name: 'Object Oriented Programming with C++' },
  { file: 'AIDS', code: '25ADPC304', name: 'Computer Graphics' },
  { file: 'AIDS', code: '25ADMD301', name: 'Statistics for AI' },
  { file: 'AIDS', code: '25ADMC301', name: 'Digital Marketing and Social Media' },
  { file: 'AIDS', code: '25ADVS303', name: 'Advanced Python Programming' },

  // COMP
  { file: 'COMP', code: '25COPC302', name: 'Data Structures' },
  { file: 'COMP', code: '25COPC303', name: 'Processor Architecture and System Design' },
  { file: 'COMP', code: '25COPC304', name: 'Java Programming' },
  { file: 'COMP', code: '25COMD301', name: 'Discrete Mathematics' },
  { file: 'COMP', code: '25COMC301', name: 'Digital Marketing and Social Media' },

  // ECE
  { file: 'ECE', code: '25ECPC302', name: 'Digital Electronics and Microcontroller' },
  { file: 'ECE', code: '25ECPC303', name: 'Data Structure and Algorithms' },
  { file: 'ECE', code: '25ECPC304', name: 'Computer Organization and Architecture' },
  { file: 'ECE', code: '25ECMD301', name: 'Engineering Mathematics III' },
  { file: 'ECE', code: '25ECVS303', name: 'Problem Solving Technique - I' },
  { file: 'ECE', code: '25ECVS304', name: 'Electronics Workshop' },

  // ENTC
  { file: 'ENTC', code: '25ETPC302', name: 'Digital System Design & Applications' },
  { file: 'ENTC', code: '25ETPC303', name: 'Network Analysis & Synthesis' },
  { file: 'ENTC', code: '25ETPC304', name: 'Data Structures & Algorithms' },
  { file: 'ENTC', code: '25ETMD301', name: 'Engineering Mathematics – III' },
  { file: 'ENTC', code: '25ETVS302', name: 'Problem Solving Technique – I' },
  { file: 'ENTC', code: '25ETVS303', name: 'Fundamental of C Programming' },
];

const parsed = {};
for (const c of courses) {
  const filePath = `C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/${c.file}_sy.txt`;
  const block = extractExactCourse(filePath, c.code);
  parsed[c.code] = { name: c.name, file: c.file, block: block ? block.trim() : 'NOT_FOUND' };
}

fs.writeFileSync('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/exact_sy_syllabus.json', JSON.stringify(parsed, null, 2));
console.log('Saved exact courses to scratch/exact_sy_syllabus.json');

for (const [code, item] of Object.entries(parsed)) {
  console.log(`${code} (${item.name}): ${item.block !== 'NOT_FOUND' ? 'SUCCESS (' + item.block.length + ' chars)' : 'FAILED'}`);
}
