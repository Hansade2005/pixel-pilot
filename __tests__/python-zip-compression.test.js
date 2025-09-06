/**
 * Test for Python ZIP compression command fix
 * 
 * This test verifies that the Python script used for creating ZIP files
 * in the Cloudflare Pages deployment process has proper bash escaping.
 * 
 * The issue was that the original command used double quotes with string 
 * concatenation, which caused bash syntax errors when parentheses appeared
 * in the Python code (specifically in .format(file_size)).
 * 
 * The fix replaces the string concatenation approach with template literals
 * and single quotes, which properly escapes the Python code for bash execution.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Python ZIP compression command', () => {
  const testDir = '/tmp/test-zip-compression';
  
  beforeEach(() => {
    // Create test directory structure
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'dist', 'test.txt'), 'test content');
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should execute Python ZIP creation command without bash syntax errors', () => {
    // This is the new fixed command format
    const pythonCommand = `python3 -c '
import zipfile, os, sys
try:
    os.chdir("${testDir}")
    excluded_dirs = ["node_modules", ".git", ".next", "__pycache__"]
    excluded_files = [".DS_Store", ".env", "*.log"]
    with zipfile.ZipFile("dist.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("dist"):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if d not in excluded_dirs]
            
            for file in files:
                # Skip excluded files
                if not any(file.endswith(ext) for ext in excluded_files):
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, ".")
                    zipf.write(file_path, arcname)

    # Get file size and print
    file_size = os.path.getsize("dist.zip")
    print("Created dist.zip " + str(file_size) + " bytes")
    sys.exit(0)
except Exception as e:
    print("Compression error: " + str(e), file=sys.stderr)
    sys.exit(1)
'`;

    // Should not throw any errors
    expect(() => {
      const result = execSync(pythonCommand, { encoding: 'utf8' });
      expect(result).toContain('Created dist.zip');
    }).not.toThrow();

    // Verify ZIP file was created
    expect(fs.existsSync(path.join(testDir, 'dist.zip'))).toBe(true);
  });

  it('should fail with the old command format (demonstrating the bug)', () => {
    // This is the old problematic command format
    const oldPythonCommand = 'python3 -c "' +
      'import zipfile, os, sys\n' +
      'try:\n' +
      `    os.chdir("${testDir}")\n` +
      '    excluded_dirs = ["node_modules", ".git", ".next", "__pycache__"]\n' +
      '    excluded_files = [".DS_Store", ".env", "*.log"]\n' +
      '    with zipfile.ZipFile("dist.zip", "w", zipfile.ZIP_DEFLATED) as zipf:\n' +
      '        for root, dirs, files in os.walk("dist"):\n' +
      '            dirs[:] = [d for d in dirs if d not in excluded_dirs]\n' +
      '            for file in files:\n' +
      '                if not any(file.endswith(ext) for ext in excluded_files):\n' +
      '                    file_path = os.path.join(root, file)\n' +
      '                    arcname = os.path.relpath(file_path, ".")\n' +
      '                    zipf.write(file_path, arcname)\n' +
      '    file_size = os.path.getsize("dist.zip")\n' +
      '    print("Created dist.zip ({} bytes)".format(file_size))\n' +
      '    sys.exit(0)\n' +
      'except Exception as e:\n' +
      '    print("Compression error: " + str(e), file=sys.stderr)\n' +
      '    sys.exit(1)\n' +
      '"';

    // Should throw due to bash syntax error
    expect(() => {
      execSync(oldPythonCommand, { encoding: 'utf8' });
    }).toThrow(/syntax error|unexpected token/i);
  });
});