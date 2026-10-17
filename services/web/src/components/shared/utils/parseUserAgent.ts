import { UAParser } from 'ua-parser-js';

export default function parseUserAgent(userAgent: string) {
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  const result = {
    browser: browser.name
      ? `${browser.name} ${browser.major ? browser.major : ''}`
      : 'Unknown client',
    os: os.name ? `${os.name} ${os.version ? os.version : ''}` : 'Unknown OS',
    device: device.type || device.model || 'Desktop',
  };
  return result;
}
