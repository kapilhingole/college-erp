const fs = require('fs');

function parseCourseDetails(filePath, deptName) {
  const text = fs.readFileSync(filePath, 'utf8');
  console.log(`\n######################################################################`);
  console.log(`                     ${deptName} DETAILED UNITS                       `);
  console.log(`######################################################################`);
  
  // Find where each Course starts
  const lines = text.split('\n');
  let currentCourse = null;
  let inContents = false;
  let currentUnit = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // match Course Code like 25ADPC302, 25COPC302, etc.
    const codeMatch = line.match(/^(25[A-Z]{2}[A-Z0-9]{4,5})\s*$/);
    if (codeMatch) {
      currentCourse = codeMatch[1];
    }
    
    // Look for Course Name or Title
    if (line.includes('Course Contents:')) {
      inContents = true;
      console.log(`\n>>> COURSE: ${currentCourse} <<<`);
    }
    
    if (inContents) {
      if (line.match(/^Unit\s+[I|V|X|\d]+/i) || line.match(/^[1-6]\.\s+Unit/i) || line.match(/^[1-6]\.\s+[A-Z]/)) {
        console.log(`   ${line}`);
      }
      if (line.match(/\b\d+\s*Hrs\b/i) || line.match(/^\d{1,2}$/)) {
        if (line.length < 10) console.log(`      [Duration: ${line}]`);
      }
      // Stop condition for course contents
      if (line.includes('Text Books:') || line.includes('Reference Books:') || line.includes('Course Outcomes:')) {
        inContents = false;
      }
    }
  }
}

parseCourseDetails('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/AIDS_sy.txt', 'AIDS');
parseCourseDetails('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/COMP_sy.txt', 'COMP');
parseCourseDetails('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/ECE_sy.txt', 'ECE');
parseCourseDetails('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/ENTC_sy.txt', 'ENTC');
