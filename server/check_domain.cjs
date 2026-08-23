const mysql = require('mysql2/promise');

async function findDomains() {
  const conn = await mysql.createConnection('mysql://u368199755_crmpaday:Support@@12345@@@193.203.184.216:3306/u368199755_crmpaday');
  const [tables] = await conn.query('SHOW TABLES');
  for (const row of tables) {
    const t = Object.values(row)[0];
    try {
      const [cols] = await conn.query(`DESCRIBE \`${t}\``);
      const textCols = cols.filter(c => c.Type.includes('varchar') || c.Type.includes('text')).map(c => `\`${c.Field}\``);
      if (textCols.length > 0) {
        const where = textCols.map(c => `${c} LIKE 'http%'`).join(' OR ');
        const [matches] = await conn.query(`SELECT ${textCols.join(', ')} FROM \`${t}\` WHERE ${where} LIMIT 2`);
        if (matches.length > 0) {
          console.log(`=== Matches in ${t} ===`);
          console.log(matches);
        }
      }
    } catch (e) {}
  }
  await conn.end();
}

findDomains().catch(console.error);
