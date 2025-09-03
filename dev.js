/**
 * Development script to run both frontend and backend concurrently
 * Usage: node dev.js
 */

const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  frontend: '\x1b[36m', // Cyan
  backend: '\x1b[32m',  // Green
  error: '\x1b[31m',    // Red
  reset: '\x1b[0m'      // Reset
};

// Function to create a process
function createProcess(name, command, args, cwd) {
  console.log(`${colors[name]}Starting ${name}...${colors.reset}`);
  
  const proc = spawn(command, args, {
    cwd: path.join(__dirname, cwd),
    shell: true,
    stdio: 'pipe'
  });
  
  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      console.log(`${colors[name]}[${name}] ${line}${colors.reset}`);
    });
  });
  
  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      console.log(`${colors.error}[${name} ERROR] ${line}${colors.reset}`);
    });
  });
  
  proc.on('close', (code) => {
    if (code !== 0) {
      console.log(`${colors.error}[${name}] Process exited with code ${code}${colors.reset}`);
    }
  });
  
  return proc;
}

// Start backend
const backend = createProcess('backend', 'npm', ['run', 'dev'], 'backend');

// Start frontend
const frontend = createProcess('frontend', 'npm', ['start'], 'frontend');

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down development servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});
