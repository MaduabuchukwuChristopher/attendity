import type { RequestHandler } from 'express';
import { contactService } from '../services/contact.service.js';

export const submitContactInquiry: RequestHandler = async (request, response, next) => {
  try {
    const data = await contactService.submit(request.body, request.ip ?? 'unknown');
    response.status(201).json({
      success: true,
      message: 'Your demonstration request has been received.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
