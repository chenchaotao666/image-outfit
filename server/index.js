const http = require('node:http');
const { loadEnv, config } = require('./config');
const { createApi } = require('./api');

// systemd opens the protected configuration before launching the service user.
loadEnv(process.argv[2] === '--env-stdin' ? 0 : process.env.IMAGE_OUTFIT_ENV_FILE);
const settings = config();
const handleApi = createApi(settings);

http.createServer(async (req, res) => {
  if (await handleApi(req, res)) return;
  res.writeHead(404);
  res.end();
}).listen(settings.port, settings.host, () => {
  console.log(`API listening on http://${settings.host}:${settings.port}/api`);
});
