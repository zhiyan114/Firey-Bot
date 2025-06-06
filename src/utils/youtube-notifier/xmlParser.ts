'use strict';
/**
 * Module dependencies.
 */
import xml2js from 'xml2js';
import { Response } from 'express';
import YouTubeNotifier from './index';
import { request } from './index';

/**
 * Constants
 */
const regexp = /^(text\/xml|application\/([\w!#$%&*`\-.^~]+\+)?xml)$/i;

// Internal type definition for error
interface error extends Error {
  status?: number;
}


/**
 * Test whether request has body
 *
 * @see connect.utils
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 * @param {YouTubeNotifier} notifier
 * @return {*}
 */
function xmlbodyparser(req: request, res: Response, notifier: YouTubeNotifier) {
  let data = '';

  const parser = new xml2js.Parser({
    async: false,
    explicitArray: true,
    normalize: true,
    normalizeTags: true,
    trim: true,
  });

  /**
   * @param {Error} err
   * @param {Object} xml
   */
  function responseHandler(err: error | null, xml: unknown) {
    if (err) {
      err.status = 400;
      return notifier._onRequest(req, res);
    }

    req.body = xml || req.body;
    req.rawBody = data;
    notifier._onRequest(req, res);
  }

  if (req._body) return notifier._onRequest(req, res);

  req.body = req.body || {};

  if (!hasBody(req) || !regexp.test(mime(req))) return notifier._onRequest(req, res);

  req._body = true;

  // Explicitly cast incoming to string
  req.setEncoding('utf-8');
  req.on('data', (chunk: string) => {
    data += chunk;
  });
  // ! saxParser is not DEFINED, fix later once the issue is found !
  // In case `parseString` callback never was called, ensure response is sent
  //parser.saxParser.onend = () => {
  //  if (req.complete && req.rawBody === undefined) {
  //    return responseHandler(null);
  //  }
  //};

  req.on('end', () => {
    // Invalid xml, length required
    if (data.trim().length === 0) {
      return notifier._onRequest(req, res);
    }

    parser.parseString(data, responseHandler);
  });
}

/**
 * Test whether request has body
 *
 * @see connect.utils
 * @param {IncomingMessage} req
 * @return boolean
 */
function hasBody(req: request) {
  const encoding = 'transfer-encoding' in req.headers;
  const length = 'content-length' in req.headers && req.headers['content-length'] !== '0';
  return encoding || length;
}

/**
 * Get request mime-type without character encoding
 *
 * @see connect.utils
 * @param {IncomingMessage} req
 * @return string
 */
function mime(req: request) {
  const str = req.headers['content-type'] || '';
  return str.split(';')[0];
}

export default xmlbodyparser;
