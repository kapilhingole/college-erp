const fs = require('fs');

function extractUnitsForCourse(text, courseCode, courseName) {
  const codeIdx = text.indexOf(courseCode);
  if (codeIdx === -1) return null;
  
  // Find "Course Contents:" after codeIdx
  const ccIdx = text.indexOf('Course Contents:', codeIdx);
  if (ccIdx === -1) return null;
  
  const section = text.slice(ccIdx, ccIdx + 4500);
  return { courseCode, courseName, section };
}

['AIDS', 'COMP', 'ECE', 'ENTC'].forEach(dept => {
  const text = fs.readFileSync(`C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/${dept}_sy.txt`, 'utf8');
  console.log(`\n============================ ${dept} SYLLABUS ============================`);
  
  // Find all course codes like 25XXPC30X, 25XXMD30X, 25XXVS30X, 25XXMC30X
  const regex = /(25[A-Z]{2}[A-Z0-9]{5})/g;
  const codes = Array.from(new Set(text.match(regex) || []));
  console.log('Detected course codes:', codes);
});
