// Vercel Serverless Function - Historical Air Quality
import { generateMockHistory, validateHours } from '../../public/js/aq-core.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { hallId, parameter, hours } = req.query;

    // Validate hours
    const hoursVal = validateHours(hours);
    const h = hoursVal.ok ? hoursVal.value : 24;

    // For now, return mock historical data
    // In production, you'd fetch from a time-series database or OpenAQ historical endpoint
    const mockData = generateMockHistory(h);

    // Filter to requested parameter if specified
    let data = mockData;
    if (parameter && typeof parameter === 'string') {
      data = mockData.map(d => ({
        time: d.time,
        [parameter]: d[parameter]
      }));
    }

    return res.status(200).json({
      success: true,
      data,
      parameter: parameter || 'all',
      hours: h
    });

  } catch (err) {
    console.error('History API error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch historical data' });
  }
}