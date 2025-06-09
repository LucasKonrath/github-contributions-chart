import { fetchDataForAllYears } from '../../../utils/api/fetch'

const USERNAMES = [
  'marcelobnbck',
  'xmacedo',
  'andeerlb',
  'karane',
  'lee22br',
  'vfurinii',
  'joaoguilhermedesa',
  'icarocaetano'
];

export default async (req, res) => {
  const { format } = req.query;
  const results = [];
  for (const username of USERNAMES) {
    const data = await fetchDataForAllYears(username, format);
    console.log('Fetched for', username, 'data:', data);
    results.push({ username, data });
    // Wait 2 seconds before next request to avoid GitHub rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
  res.json(results);
}