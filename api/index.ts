let appPromise: Promise<any>;

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) {
      appPromise = import('../server/src/index.js');
    }
    const module = await appPromise;
    const app = module.default || module;
    return app(req, res);
  } catch (error: any) {
    console.error('Failed to boot Express app:', error);
    res.status(500).json({
      error: 'Failed to boot Express app',
      message: error?.message,
      stack: error?.stack
    });
  }
}
