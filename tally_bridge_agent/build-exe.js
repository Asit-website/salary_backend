const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const pngToIco = require('png-to-ico').default;
const { rcedit } = require('rcedit');

async function build() {
  console.log('1. Converting favicon_real.png to icon.ico...');
  const iconSource = path.join(__dirname, '..', '..', 'thinktech_kiosk', 'assets', 'favicon_real.png');
  const iconIco = path.join(__dirname, 'icon.ico');
  
  try {
    const buf = await pngToIco(iconSource);
    fs.writeFileSync(iconIco, buf);
    console.log('✅ icon.ico generated successfully.');
  } catch (err) {
    console.error('❌ Error generating ico:', err.message);
    process.exit(1);
  }

  console.log('2. Preparing built base binary in .pkg-cache...');
  const cacheDir = 'C:\\Users\\Admin\\.pkg-cache\\v3.4';
  const fetchedPath = path.join(cacheDir, 'fetched-v18.5.0-win-x64');
  const backupPath = path.join(cacheDir, 'fetched-v18.5.0-win-x64.bak');
  const builtPath = path.join(cacheDir, 'built-v18.5.0-win-x64');

  try {
    // Restore fetchedPath from backup first to make sure it's clean (since we modified it in previous runs)
    if (fs.existsSync(backupPath)) {
      console.log('Restoring clean fetched base binary from backup...');
      fs.copyFileSync(backupPath, fetchedPath);
      console.log('✅ Clean fetched base binary restored.');
    }

    if (!fs.existsSync(fetchedPath)) {
      console.error('❌ Failed to locate fetched binary.');
      process.exit(1);
    }

    console.log('Copying fetched base binary to built path...');
    fs.copyFileSync(fetchedPath, builtPath);
    console.log('✅ Base binary copied to built path.');
  } catch (err) {
    console.error('❌ Error preparing base binary:', err.message);
    process.exit(1);
  }

  console.log('3. Applying icon to built base binary...');
  try {
    await rcedit(builtPath, {
      icon: iconIco
    });
    console.log('✅ Custom icon applied to built base binary.');
  } catch (err) {
    console.error('❌ Error applying icon to built binary:', err.message);
    process.exit(1);
  }

  console.log('4. Running pkg build (will use the icon-patched built binary)...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ pkg build finished successfully.');
  } catch (err) {
    console.error('❌ Error running pkg:', err.message);
    process.exit(1);
  }

  console.log('\n🎉 Build process completed successfully! The .exe has the custom icon and will open correctly.');
}

build();
