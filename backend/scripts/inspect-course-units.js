const fs = require('fs');

function inspectCourse(fileName, courseCode) {
  const text = fs.readFileSync(fileName, 'utf8');
  const idx = text.indexOf(courseCode);
  if (idx === -1) {
    console.log(`Course ${courseCode} not found in ${fileName}`);
    return;
  }
  // Print next 3500 characters
  console.log(`\n=================== ${courseCode} in ${fileName} ===================`);
  console.log(text.slice(idx, idx + 4500));
}

// AIDS
inspectCourse('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/AIDS_sy.txt', '25ADPC302');
inspectCourse('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/AIDS_sy.txt', '25ADPC303');
inspectCourse('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/AIDS_sy.txt', '25ADPC304');
inspectCourse('C:/Users/LENOVO/.gemini/antigravity/brain/41afaf75-1d89-4a0f-a120-c10cb6756e5d/scratch/AIDS_sy.txt', '25ADMD301');
