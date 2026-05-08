require('dotenv').config();

const {
  Client,
  GatewayIntentBits
} = require('discord.js');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});
const creds = JSON.parse(
  process.env.GOOGLE_CREDENTIALS
);

const serviceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const doc = new GoogleSpreadsheet(
  process.env.SHEET_ID,
  serviceAccountAuth
);

// ================= FORMAT RUPIAH =================
function rupiah(angka) {
  return Number(angka).toLocaleString('id-ID');
}

// ================= TOTAL TERAKHIR =================
async function getLastTotal(sheet) {

  const rows = await sheet.getRows();

  if (rows.length === 0) {
    return 0;
  }

  const lastRow = rows[rows.length - 1];

  return parseInt(lastRow.get('Total')) || 0;
}

// ================= NOMOR OTOMATIS =================
async function getNextNumber(sheet) {

  const rows = await sheet.getRows();

  if (rows.length === 0) {
    return '001';
  }

  const lastRow = rows[rows.length - 1];

  const lastNumber =
    parseInt(lastRow.get('Nomor')) || 0;

  return String(lastNumber + 1)
    .padStart(3, '0');
}

// ================= LOAD SHEET =================
async function loadSheets() {

  await doc.loadInfo();

  return {
    setoran: doc.sheetsByTitle['SETORAN'],
    brangkas: doc.sheetsByTitle['BRANGKAS'],
    gudang: doc.sheetsByTitle['GUDANG'],
    dirty: doc.sheetsByTitle['DIRTY'],
    legal: doc.sheetsByTitle['LEGAL']
  };
}

// ================= UPDATE GUDANG =================
async function updateGudang(
  gudangSheet,
  barang,
  jumlah,
  type
) {

  const rows = await gudangSheet.getRows();

  const item = rows.find(r =>
    r.get('Barang')
      ?.toLowerCase() === barang.toLowerCase()
  );

  if (item) {

    let total =
      parseInt(item.get('Total')) || 0;

    if (type === 'add') {
      total += jumlah;
    } else {
      total -= jumlah;
    }

    item.set('Total', total);

    await item.save();

  } else {

    await gudangSheet.addRow({
      Barang: barang,
      Total: jumlah
    });
  }
}

// ================= BOT READY =================
client.once('clientReady', () => {
  console.log(`${client.user.tag} online!`);
});

// ================= INTERACTION =================
client.on('interactionCreate', async interaction => {

  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply();

  const sheets = await loadSheets();

  // =================================================
  // SETORAN
  // =================================================
  if (interaction.commandName === 'setoran') {

    const password =
      interaction.options.getString('password');

    if (password !== process.env.PASSWORD_BOT) {

      return interaction.editReply({
        content: '❌ Password salah.'
      });
    }

    const nomor =
      await getNextNumber(sheets.setoran);

    const barang =
      interaction.options.getString('barang');

    const jumlah =
      interaction.options.getInteger('jumlah');

    const penerima =
      interaction.options.getString('penerima');

    const keterangan =
      interaction.options.getString('keterangan');

    const minggu =
      interaction.options.getString('minggu');

    const tanggal =
      new Date().toLocaleDateString('id-ID');

    await sheets.setoran.addRow({
      Nomor: nomor,
      Barang: barang,
      Jumlah: jumlah,
      Tanggal: tanggal,
      Keterangan: keterangan,
      Penerima: penerima,
      Minggu: minggu
    });

    await updateGudang(
      sheets.gudang,
      barang,
      jumlah,
      'add'
    );

    await interaction.editReply({
      content: `# ✅ SETORAN BERHASIL

\`\`\`
NO         : ${nomor}
BARANG     : ${barang}
JUMLAH     : ${jumlah}
MINGGU     : ${minggu}
PENERIMA   : ${penerima}
KETERANGAN : ${keterangan}
TANGGAL    : ${tanggal}
\`\`\`
`
    });
  }

  // =================================================
  // CEK SETORAN
  // =================================================
  if (interaction.commandName === 'ceksetoran') {

    const mingguCari =
      interaction.options.getString('minggu');

    const rows =
      await sheets.setoran.getRows();

    const hasil = rows.filter(r => {

      const minggu =
        r.get('Minggu');

      return minggu === mingguCari;
    });

    if (hasil.length === 0) {

      return interaction.editReply(
        `❌ Tidak ada setoran minggu ${mingguCari}`
      );
    }

    let text = `\`\`\`
SETORAN MINGGU ${mingguCari}
------------------------------------------------------------------------------------------------
NO  | BARANG         | JUMLAH | MINGGU | PENERIMA     | KETERANGAN
------------------------------------------------------------------------------------------------
`;

    hasil.forEach(r => {

      const no =
        String(r.get('Nomor'))
          .padEnd(3, ' ');

      const barang =
        String(r.get('Barang'))
          .padEnd(15, ' ');

      const jumlah =
        String(r.get('Jumlah'))
          .padEnd(6, ' ');

      const minggu =
        String(r.get('Minggu'))
          .padEnd(6, ' ');

      const penerima =
        String(r.get('Penerima'))
          .padEnd(13, ' ');

      const keterangan =
        String(r.get('Keterangan'));

      text +=
`${no} | ${barang} | ${jumlah} | ${minggu} | ${penerima} | ${keterangan}
`;
    });

    text += '```';

    await interaction.editReply(text);
  }

  // =================================================
  // DEPOSIT
  // =================================================
  if (interaction.commandName === 'deposit') {

    const password =
      interaction.options.getString('password');

    if (password !== process.env.PASSWORD_BOT) {

      return interaction.editReply({
        content: '❌ Password salah.'
      });
    }

    const nomor =
      await getNextNumber(sheets.brangkas);

    const barang =
      interaction.options.getString('barang');

    const jumlah =
      interaction.options.getInteger('jumlah');

    const keterangan =
      interaction.options.getString('keterangan');

    const tanggal =
      new Date().toLocaleDateString('id-ID');

    await sheets.brangkas.addRow({
      Nomor: nomor,
      Barang: barang,
      Jumlah: jumlah,
      Keterangan: keterangan,
      Tanggal: tanggal,
      Type: 'deposit'
    });

    await updateGudang(
      sheets.gudang,
      barang,
      jumlah,
      'add'
    );

    await interaction.editReply({
      content: `# 📥 DEPOSIT BERHASIL

\`\`\`
NO         : ${nomor}
BARANG     : ${barang}
JUMLAH     : ${jumlah}
AKSI       : DEPOSIT
KETERANGAN : ${keterangan}
TANGGAL    : ${tanggal}
\`\`\`
`
    });
  }

  // =================================================
  // WITHDRAW
  // =================================================
  if (interaction.commandName === 'withdraw') {

    const password =
      interaction.options.getString('password');

    if (password !== process.env.PASSWORD_BOT) {

      return interaction.editReply({
        content: '❌ Password salah.'
      });
    }

    const nomor =
      await getNextNumber(sheets.brangkas);

    const barang =
      interaction.options.getString('barang');

    const jumlah =
      interaction.options.getInteger('jumlah');

    const keterangan =
      interaction.options.getString('keterangan');

    const tanggal =
      new Date().toLocaleDateString('id-ID');

    await sheets.brangkas.addRow({
      Nomor: nomor,
      Barang: barang,
      Jumlah: jumlah,
      Keterangan: keterangan,
      Tanggal: tanggal,
      Type: 'withdraw'
    });

    await updateGudang(
      sheets.gudang,
      barang,
      jumlah,
      'remove'
    );

    await interaction.editReply({
      content: `# 📤 WITHDRAW BERHASIL

\`\`\`
NO         : ${nomor}
BARANG     : ${barang}
JUMLAH     : ${jumlah}
AKSI       : WITHDRAW
KETERANGAN : ${keterangan}
TANGGAL    : ${tanggal}
\`\`\`
`
    });
  }

  // =================================================
  // GUDANG
  // =================================================
  if (interaction.commandName === 'gudang') {

    const rows =
      await sheets.gudang.getRows();

    if (rows.length === 0) {

      return interaction.editReply(
        'Gudang kosong.'
      );
    }

    let text = `\`\`\`
NO | BARANG              | TOTAL
--------------------------------
`;

    rows.forEach((r, index) => {

      const no =
        String(index + 1).padEnd(2, ' ');

      const barang =
        String(r.get('Barang'))
          .padEnd(20, ' ');

      const total =
        String(r.get('Total'));

      text += `${no} | ${barang} | ${total}
`;
    });

    text += '```';

    await interaction.editReply(text);
  }

  // =================================================
  // PEMASUKAN
  // =================================================
  if (interaction.commandName === 'pemasukan') {

    const password =
      interaction.options.getString('password');

    if (password !== process.env.PASSWORD_BOT) {

      return interaction.editReply({
        content: '❌ Password salah.'
      });
    }

    const type =
      interaction.options.getString('type');

    const kelompok =
      interaction.options.getString('kelompok');

    const jumlah =
      interaction.options.getInteger('jumlah');

    const keterangan =
      interaction.options.getString('keterangan');

    const sheet =
      type === 'dirty'
        ? sheets.dirty
        : sheets.legal;

    const nomor =
      await getNextNumber(sheet);

    const totalSebelumnya =
      await getLastTotal(sheet);

    const totalBaru =
      totalSebelumnya + jumlah;

    const tanggal =
      new Date().toLocaleDateString('id-ID');

    await sheet.addRow({
      Nomor: nomor,
      Kelompok: kelompok,
      Jumlah: jumlah,
      Keterangan: keterangan,
      Total: totalBaru,
      Tanggal: tanggal,
      Type: 'pemasukan'
    });

    const icon =
      type === 'dirty'
        ? '💷'
        : '💵';

    await interaction.editReply({
      content: `# ${icon} PEMASUKAN BERHASIL

\`\`\`
NO          : ${nomor}
TYPE        : ${type.toUpperCase()}
KELOMPOK    : ${kelompok}
JUMLAH      : Rp ${rupiah(jumlah)}
TOTAL BARU  : Rp ${rupiah(totalBaru)}
KETERANGAN  : ${keterangan}
TANGGAL     : ${tanggal}
\`\`\`
`
    });
  }

  // =================================================
  // PENGELUARAN
  // =================================================
  if (interaction.commandName === 'pengeluaran') {

    const password =
      interaction.options.getString('password');

    if (password !== process.env.PASSWORD_BOT) {

      return interaction.editReply({
        content: '❌ Password salah.'
      });
    }

    const type =
      interaction.options.getString('type');

    const kelompok =
      interaction.options.getString('kelompok');

    const jumlah =
      interaction.options.getInteger('jumlah');

    const keterangan =
      interaction.options.getString('keterangan');

    const sheet =
      type === 'dirty'
        ? sheets.dirty
        : sheets.legal;

    const nomor =
      await getNextNumber(sheet);

    const totalSebelumnya =
      await getLastTotal(sheet);

    if (jumlah > totalSebelumnya) {

      return interaction.editReply({
        content: '❌ Saldo tidak cukup.'
      });
    }

    const totalBaru =
      totalSebelumnya - jumlah;

    const tanggal =
      new Date().toLocaleDateString('id-ID');

    await sheet.addRow({
      Nomor: nomor,
      Kelompok: kelompok,
      Jumlah: jumlah,
      Keterangan: keterangan,
      Total: totalBaru,
      Tanggal: tanggal,
      Type: 'pengeluaran'
    });

    const icon =
      type === 'dirty'
        ? '💷'
        : '💵';

    await interaction.editReply({
      content: `# ${icon} PENGELUARAN BERHASIL

\`\`\`
NO          : ${nomor}
TYPE        : ${type.toUpperCase()}
KELOMPOK    : ${kelompok}
JUMLAH      : Rp ${rupiah(jumlah)}
TOTAL BARU  : Rp ${rupiah(totalBaru)}
KETERANGAN  : ${keterangan}
TANGGAL     : ${tanggal}
\`\`\`
`
    });
  }

  // =================================================
  // SALDO
  // =================================================
  if (interaction.commandName === 'saldo') {

    const dirtyTotal =
      await getLastTotal(sheets.dirty);

    const legalTotal =
      await getLastTotal(sheets.legal);

    await interaction.editReply({
      content: `# 💰 SALDO GANG

\`\`\`
💷 DIRTY MONEY : Rp ${rupiah(dirtyTotal)}

💵 LEGAL MONEY : Rp ${rupiah(legalTotal)}
\`\`\`
`
    });
  }

});

client.login(process.env.TOKEN);
