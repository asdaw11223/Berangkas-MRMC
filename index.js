require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require('discord.js');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// =================================================
// DISCORD CLIENT
// =================================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// =================================================
// GOOGLE AUTH
// =================================================

const creds = JSON.parse(
  process.env.GOOGLE_CREDENTIALS
);

const serviceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const doc = new GoogleSpreadsheet(
  process.env.SHEET_ID,
  serviceAccountAuth
);

// =================================================
// FORMAT RUPIAH
// =================================================

function rupiah(angka) {
  return Number(angka).toLocaleString('id-ID');
}

// =================================================
// GET TOTAL TERAKHIR
// =================================================

async function getLastTotal(sheet) {

  const rows = await sheet.getRows();

  if (rows.length === 0) {
    return 0;
  }

  const lastRow = rows[rows.length - 1];

  return parseInt(lastRow.get('Total')) || 0;
}

// =================================================
// GET NOMOR
// =================================================

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

// =================================================
// LOAD SHEETS
// =================================================

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

// =================================================
// UPDATE GUDANG
// =================================================

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

// =================================================
// READY
// =================================================

client.once('clientReady', () => {
  console.log(`${client.user.tag} online!`);
});

// =================================================
// INTERACTION
// =================================================

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

    const minggu =
      interaction.options.getString('minggu');

    const keterangan =
      interaction.options.getString('keterangan');

    const tanggal =
      new Date().toLocaleDateString('id-ID');

    await sheets.setoran.addRow({
      Nomor: nomor,
      Barang: barang,
      Jumlah: jumlah,
      Minggu: minggu,
      Penerima: penerima,
      Keterangan: keterangan,
      Tanggal: tanggal
    });

    await updateGudang(
      sheets.gudang,
      barang,
      jumlah,
      'add'
    );

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('✅ SETORAN BERHASIL')
      .addFields(
        { name: 'NO', value: nomor, inline: true },
        { name: 'BARANG', value: barang, inline: true },
        { name: 'JUMLAH', value: String(jumlah), inline: true },
        { name: 'MINGGU', value: minggu, inline: true },
        { name: 'PENERIMA', value: penerima, inline: true },
        { name: 'KETERANGAN', value: keterangan, inline: false },
        { name: 'TANGGAL', value: tanggal, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed]
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

    const hasil = rows.filter(r =>
      r.get('Minggu') === mingguCari
    );

    if (hasil.length === 0) {

      return interaction.editReply({
        content:
          `❌ Tidak ada setoran minggu ${mingguCari}`
      });
    }

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle(`📦 SETORAN MINGGU ${mingguCari}`)
      .setTimestamp();

    hasil.slice(0, 25).forEach(r => {

      embed.addFields({
        name:
          `${r.get('Nomor')} • ${r.get('Barang')}`,
        value:
`Jumlah : ${r.get('Jumlah')}
Penerima : ${r.get('Penerima')}
Keterangan : ${r.get('Keterangan')}`,
        inline: false
      });

    });

    await interaction.editReply({
      embeds: [embed]
    });
  }

  // =================================================
  // GUDANG
  // =================================================

  if (interaction.commandName === 'gudang') {

    const rows =
      await sheets.gudang.getRows();

    if (rows.length === 0) {

      return interaction.editReply({
        content: 'Gudang kosong.'
      });
    }

    const embed = new EmbedBuilder()
      .setColor('Orange')
      .setTitle('📦 ISI GUDANG')
      .setTimestamp();

    rows.slice(0, 25).forEach((r, index) => {

      embed.addFields({
        name:
          `${index + 1}. ${r.get('Barang')}`,
        value:
          `Total : ${r.get('Total')}`,
        inline: true
      });

    });

    await interaction.editReply({
      embeds: [embed]
    });
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

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle(`${icon} PEMASUKAN BERHASIL`)
      .addFields(
        { name: 'NO', value: nomor, inline: true },
        { name: 'TYPE', value: type.toUpperCase(), inline: true },
        { name: 'KELOMPOK', value: kelompok, inline: true },
        { name: 'JUMLAH', value: `Rp ${rupiah(jumlah)}`, inline: true },
        { name: 'TOTAL BARU', value: `Rp ${rupiah(totalBaru)}`, inline: true },
        { name: 'KETERANGAN', value: keterangan, inline: false },
        { name: 'TANGGAL', value: tanggal, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed]
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

    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle(`${icon} PENGELUARAN BERHASIL`)
      .addFields(
        { name: 'NO', value: nomor, inline: true },
        { name: 'TYPE', value: type.toUpperCase(), inline: true },
        { name: 'KELOMPOK', value: kelompok, inline: true },
        { name: 'JUMLAH', value: `Rp ${rupiah(jumlah)}`, inline: true },
        { name: 'TOTAL BARU', value: `Rp ${rupiah(totalBaru)}`, inline: true },
        { name: 'KETERANGAN', value: keterangan, inline: false },
        { name: 'TANGGAL', value: tanggal, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed]
    });
  }

  // =================================================
  // CEK PEMASUKAN
  // =================================================

  if (interaction.commandName === 'cekpemasukan') {

    const type =
      interaction.options.getString('type');

    const sheet =
      type === 'dirty'
        ? sheets.dirty
        : sheets.legal;

    const rows =
      await sheet.getRows();

    const hasil = rows.filter(r =>
      r.get('Type') === 'pemasukan'
    );

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle(`💰 CEK PEMASUKAN ${type.toUpperCase()}`)
      .setTimestamp();

    hasil.slice(-25).reverse().forEach(r => {

      embed.addFields({
        name:
          `${r.get('Nomor')} • Rp ${rupiah(r.get('Jumlah'))}`,
        value:
`Kelompok : ${r.get('Kelompok')}
Keterangan : ${r.get('Keterangan')}
Total : Rp ${rupiah(r.get('Total'))}`,
        inline: false
      });

    });

    await interaction.editReply({
      embeds: [embed]
    });
  }

  // =================================================
  // CEK PENGELUARAN
  // =================================================

  if (interaction.commandName === 'cekpengeluaran') {

    const type =
      interaction.options.getString('type');

    const sheet =
      type === 'dirty'
        ? sheets.dirty
        : sheets.legal;

    const rows =
      await sheet.getRows();

    const hasil = rows.filter(r =>
      r.get('Type') === 'pengeluaran'
    );

    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle(`💸 CEK PENGELUARAN ${type.toUpperCase()}`)
      .setTimestamp();

    hasil.slice(-25).reverse().forEach(r => {

      embed.addFields({
        name:
          `${r.get('Nomor')} • Rp ${rupiah(r.get('Jumlah'))}`,
        value:
`Kelompok : ${r.get('Kelompok')}
Keterangan : ${r.get('Keterangan')}
Total : Rp ${rupiah(r.get('Total'))}`,
        inline: false
      });

    });

    await interaction.editReply({
      embeds: [embed]
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

    const embed = new EmbedBuilder()
      .setColor('Gold')
      .setTitle('💰 SALDO GANG')
      .addFields(
        {
          name: '💷 DIRTY MONEY',
          value: `Rp ${rupiah(dirtyTotal)}`,
          inline: false
        },
        {
          name: '💵 LEGAL MONEY',
          value: `Rp ${rupiah(legalTotal)}`,
          inline: false
        }
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed]
    });
  }

});

client.login(process.env.TOKEN);
