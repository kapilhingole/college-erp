const fs = require('fs');

function inspectCourse(fileName, courseCode) {
  const text = fs.readFileSync(fileName, 'utf8');
  let pos = 0;
  const indices = [];
  while ((pos = text.indexOf(courseCode, pos)) !== -1) {
    indices.push(pos);
    pos += courseCode.length;
  }
  console.log(`\n=================== ${courseCode} (${indices.length} hits) ===================`);
  for (let idx of indices) {
    const chunk = text.slice(idx, idx + 3500);
    if (chunk.includes('Unit I') || chunk.includes('Unit-I') || chunk.includes('Course Contents') || chunk.includes('Unit 1') || chunk.includes('1.')) {
      console.log(chunk);
      break;
    }
  }
}

// COMP
inspectCourse('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/COMP_sy.txt', '25COPC302');
inspectCourse('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/COMP_sy.txt', '25COPC303');
inspectCourse('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/COMP_sy.txt', '25COPC304');
inspectCourse('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/COMP_sy.txt', '25COMD301');
