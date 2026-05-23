const fs = require('fs');
const path = require('path');

const logsDir = path.join('C:', 'Users', 'Admin', '.gemini', 'antigravity', 'brain', 'd4d57bbc-2875-4680-b762-b86ee2379844', '.system_generated', 'logs');
console.log('Logs Dir exists?', fs.existsSync(logsDir));

if (fs.existsSync(logsDir)) {
  const files = fs.readdirSync(logsDir);
  console.log('Files in logs:', files);
  const transcriptPath = path.join(logsDir, 'transcript.jsonl');
  if (fs.existsSync(transcriptPath)) {
    console.log('Found transcript.jsonl!');
    // Read the transcript line by line and find any view_file or write_file of leave.js
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n');
    console.log('Transcript lines count:', lines.length);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('leave.js') && lines[i].includes('view_file')) {
        console.log(`Line ${i + 1} has leave.js view_file match!`);
      }
    }
  }
}
