require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[Server] ClotAI 백엔드 실행 중 → http://localhost:${PORT}`);
  console.log(`[Server] 환경: ${process.env.NODE_ENV}`);
});
