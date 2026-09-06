// e2e/global-setup.ts

async function globalSetup() {
  const response = await fetch('http://127.0.0.1:3000/api/admin/cleanup', { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Pre-suite cleanup failed: ${response.status} ${response.statusText}`);
  }
}

export default globalSetup;
