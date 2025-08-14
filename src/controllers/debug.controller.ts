import { Request, Response } from 'express'
import ipTrackingService from '../services/ip-tracking.service'

class DebugController {
  checkIpExtraction = (req: Request, res: Response) => {
    const extractedIp = ipTrackingService.extractRealIp(req)
    
    const ipInfo = {
      extractedIp,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
        'cf-connecting-ip': req.headers['cf-connecting-ip'],
        'user-agent': req.headers['user-agent']
      },
      express: {
        'req.ip': req.ip,
        'req.ips': req.ips,
        'req.connection.remoteAddress': req.connection?.remoteAddress,
        'req.socket.remoteAddress': req.socket?.remoteAddress
      }
    }

    res.json({
      success: true,
      message: 'IP extraction debug info',
      data: ipInfo
    })
  }
}

export default new DebugController()