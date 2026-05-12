const bcrypt = require('bcryptjs');

async function test() {
  console.time('hash');
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);
  console.timeEnd('hash');

  console.time('compare');
  const res = await bcrypt.compare('password123', hash);
  console.timeEnd('compare');
  console.log('Result:', res);
}

test();
