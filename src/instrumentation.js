export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerNodeRuntime } = await import('./lib/register.js');
    registerNodeRuntime();
  }
}
