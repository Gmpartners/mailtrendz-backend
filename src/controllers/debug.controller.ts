import { Request, Response } from 'express'

class DebugController {
  // IP tracking functionality has been completely removed
  getSystemInfo = (_req: Request, res: Response) => {
    const systemInfo = {
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }

    res.json({
      success: true,
      message: 'System debug info',
      data: systemInfo
    })
  }
}

export default new DebugController()