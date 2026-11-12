const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function sleep(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const start = Date.now();
    while (Date.now() - start < ms) {}
  }
}

function isDockerRunning() {
  try {
    execSync('docker info', {
      stdio: 'ignore',
      shell: process.platform === 'win32' ? true : undefined,
    });
    return true;
  } catch {
    return false;
  }
}

function tryStartDockerDesktop() {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  if (isWin) {
    const candidates = [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'DockerDesktop', 'Docker Desktop.exe'),
      'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
      'C:\\Program Files (x86)\\Docker\\Docker\\Docker Desktop.exe',
    ];

    for (const exePath of candidates) {
      if (fs.existsSync(exePath)) {
        try {
          const child = spawn(exePath, [], { detached: true, stdio: 'ignore' });
          child.unref();
          return true;
        } catch {}
      }
    }
  } else if (isMac) {
    if (fs.existsSync('/Applications/Docker.app')) {
      try {
        const child = spawn('open', ['-a', 'Docker'], { detached: true, stdio: 'ignore' });
        child.unref();
        return true;
      } catch {}
    }
  }
  return false;
}

function run(cmd, cwd = rootDir) {
  execSync(cmd, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32' ? true : undefined,
  });
}

function runQuiet(cmd, cwd = rootDir) {
  try {
    execSync(cmd, {
      cwd,
      stdio: 'ignore',
      shell: process.platform === 'win32' ? true : undefined,
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('  BrewLite Monorepo | Khoi chay Docker Fullstack      ');
  console.log('======================================================\n');

  process.stdout.write('[*] Kiem tra Docker daemon ........................ ');

  let dockerOk = isDockerRunning();

  if (!dockerOk) {
    console.log('[STARTING]');
    console.log('    [INFO] Docker Engine chua bat. Dang mo Docker Desktop...');
    const launched = tryStartDockerDesktop();

    if (launched) {
      process.stdout.write('    [WAIT] Dang doi Docker daemon san sang');
      for (let i = 0; i < 15; i++) {
        process.stdout.write('.');
        sleep(2000);
        if (isDockerRunning()) {
          dockerOk = true;
          break;
        }
      }
      console.log('');
    }

    if (!dockerOk) {
      console.log('\n[ERROR] Khong the ket noi toi Docker daemon.');
      console.log('Luu y: Vui long mo ung dung Docker Desktop tren may ban roi chay lai lenh nay.\n');
      process.exit(1);
    }
  }

  console.log('[OK]');

  process.stdout.write('[*] Giai phong container cu & port 3000, 4000 ..... ');
  runQuiet('docker compose down') || runQuiet('docker-compose down');
  try {
    runQuiet('npx --yes kill-port 3000 4000');
  } catch {}
  console.log('[OK]');

  console.log('[*] Build va khoi dong cac service (Postgres, API, Web)...');
  try {
    run('docker compose up -d --build');
  } catch {
    run('docker-compose up -d --build');
  }

  console.log('\n------------------------------------------------------');
  console.log('Dich vu dang hoat dong:');
  console.log('  > Frontend : http://localhost:3000');
  console.log('  > Backend  : http://localhost:4000');
  console.log('  > Swagger  : http://localhost:4000/api/docs');
  console.log('\nLenh quan ly:');
  console.log('  - Xem logs    : npm run docker:logs');
  console.log('  - Trang thai  : npm run docker:ps');
  console.log('  - Dung lai    : npm run docker:down');
  console.log('------------------------------------------------------\n');
}

main().catch((err) => {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
});
