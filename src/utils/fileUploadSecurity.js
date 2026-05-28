const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

// Whitelist of allowed extensions and their matching MIME types & binary Magic Numbers (hex headers)
const SECURITY_CONFIG = {
  images: {
    extensions: ['.jpg', '.jpeg', '.png'],
    mimes: ['image/jpeg', 'image/png'],
    // Hex signatures to match
    magicNumbers: [
      { signature: 'FFD8FF', offset: 0, name: 'JPEG/JPG' },
      { signature: '89504E470D0A1A0A', offset: 0, name: 'PNG' }
    ]
  },
  documents: {
    extensions: ['.pdf', '.docx', '.xlsx', '.jpg', '.jpeg', '.png'],
    mimes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ],
    magicNumbers: [
      { signature: 'FFD8FF', offset: 0, name: 'JPEG/JPG' },
      { signature: '89504E470D0A1A0A', offset: 0, name: 'PNG' },
      { signature: '25504446', offset: 0, name: 'PDF' },
      { signature: '504B0304', offset: 0, name: 'ZIP/OfficeDoc' } // ZIP, DOCX, XLSX
    ]
  }
};

/**
 * Validates the file extension against the whitelist
 */
function validateExtension(filename, category) {
  const ext = path.extname(filename || '').toLowerCase();
  const allowed = SECURITY_CONFIG[category]?.extensions || [];
  return allowed.includes(ext);
}

/**
 * Validates the binary header (magic number) of the file
 */
async function validateMagicNumber(filePath, category) {
  const allowedHeaders = SECURITY_CONFIG[category]?.magicNumbers || [];
  if (allowedHeaders.length === 0) return true;

  let fileHandle;
  try {
    fileHandle = await fs.promises.open(filePath, 'r');
    // Read first 16 bytes for checking headers
    const buffer = Buffer.alloc(16);
    await fileHandle.read(buffer, 0, 16, 0);
    const hex = buffer.toString('hex').toUpperCase();

    // Check if any matching signature exists
    for (const item of allowedHeaders) {
      const sig = item.signature.toUpperCase();
      if (hex.startsWith(sig)) {
        return true; // Match found!
      }
    }
    return false; // No allowed magic number matched the file content
  } catch (err) {
    console.error('[SECURITY UPLOAD] Failed to read magic numbers:', err);
    return false;
  } finally {
    if (fileHandle) {
      await fileHandle.close().catch(() => {});
    }
  }
}

/**
 * Scans the file for known malware signatures (e.g. EICAR test string)
 * and optionally runs a local command line scan using Windows Defender if available.
 */
async function scanFile(filePath) {
  try {
    // 1. Signature-based scan (EICAR check)
    const content = await fs.promises.readFile(filePath);
    const EICAR_PATTERN = /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*/;
    if (EICAR_PATTERN.test(content.toString()) || content.toString().includes('EICAR')) {
      console.warn(`[SECURITY WARNING] EICAR virus test signature matched in ${filePath}`);
      return { safe: false, reason: 'Malicious payload detected (EICAR test pattern)' };
    }

    // 2. Local Antivirus Engine Scan (Windows Defender MpCmdRun)
    if (process.platform === 'win32') {
      const defenderPath = 'C:\\Program Files\\Windows Defender\\MpCmdRun.exe';
      if (fs.existsSync(defenderPath)) {
        const isSafe = await new Promise((resolve) => {
          // Execute Windows Defender quick custom file scan
          execFile(
            defenderPath,
            ['-Scan', '-ScanType', '3', '-File', filePath, '-DisableRemediation'],
            { timeout: 5000 },
            (error, stdout, stderr) => {
              if (error) {
                // Exit code 2 usually means a threat/infection was found
                if (error.code === 2 || stdout.includes('threat') || stdout.includes('infected')) {
                  console.error(`[SECURITY UPLOAD] Windows Defender detected a threat in file: ${filePath}`);
                  resolve(false);
                } else {
                  // Other failures or timeouts (defender returned unexpected error code)
                  console.warn('[SECURITY UPLOAD] Antivirus command execution returned non-zero code:', error);
                  resolve(true); // Fallback to safe if scanner had internal issue
                }
              } else {
                resolve(true);
              }
            }
          );
        });

        if (!isSafe) {
          return { safe: false, reason: 'Antivirus scan flag: threat detected' };
        }
      }
    }

    return { safe: true };
  } catch (err) {
    console.error('[SECURITY UPLOAD] Scan failed, fallback to quarantine check:', err);
    return { safe: false, reason: 'Malware scan process failure' };
  }
}

/**
 * Generates a cryptographically secure, randomized filename
 */
function generateSecureFilename(originalname) {
  const ext = path.extname(originalname || '').toLowerCase();
  const uuid = crypto.randomUUID();
  return `${uuid}${ext}`;
}

module.exports = {
  SECURITY_CONFIG,
  validateExtension,
  validateMagicNumber,
  scanFile,
  generateSecureFilename
};
