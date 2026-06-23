import app from '../server/src/index.js';

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (error: any) {
    console.error('Failed to execute Express app:', error);
    res.status(500).json({
      error: 'Failed to execute Express app',
      message: error?.message,
      stack: error?.stack
    });
  }
}
