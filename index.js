// =================================================
// REQUIRE
// =================================================

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

const {
  GoogleSpreadsheet
} = require('google-spreadsheet');

const {
  JWT
} = require('google-auth-library');

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
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets'
  ]
});

const doc = new GoogleSpreadsheet(
  process.env.SHEET_ID,
  serviceAccountAuth
);

// =================================================
// FORMAT RUPIAH
// =================================================

function rupiah(angka) {
  return Number(angka)
    .toLocaleString('id-ID');
}

// =================================================
// GET TOTAL
// =================================================

async function getLastTotal(sheet) {

  const rows = await sheet.getRows();

  if (rows.length === 0) {
    return 0;
  }

  const lastRow = rows[rows.length - 1];

  return parseInt(
    lastRow.get('Total')
  ) || 0;
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
// LOAD SHEET
// =================================================

async function loadSheets() {

  await doc.loadInfo();

  return {
    setoran: doc.sheetsByTitle['SETORAN'],
    member: doc.sheetsByTitle['MEMBER'],
    brangkas: doc.sheetsByTitle['BRANGKAS'],
    gudang: doc.sheetsByTitle['GUDANG'],
    dirty: doc.sheetsByTitle['DIRTY'],
    legal: doc.sheetsByTitle['LEGAL']
  };
}

// =================================================
// UPDATE MEMBER
// =================================================

async function updateMember(
  memberSheet,
  nama,
  barang,
  jumlah,
  minggu
) {

  const rows =
    await memberSheet.getRows();

  const item = rows.find(r =>

    r.get('Nama')
      ?.toLowerCase() ===
    nama.toLowerCase()

    &&

    r.get('Setoran')
      ?.toLowerCase() ===
    barang.toLowerCase()

    &&

    r.get('Minggu') === minggu
  );

  if (item) {

    let total =
      parseInt(item.get('Jumlah')) || 0;

    total += jumlah;

    item.set('Jumlah', total);

    await item.save();

  } else {

    const nomor =
      await getNextNumber(memberSheet);

    await memberSheet.addRow({
      Nomor: nomor,
      Nama: nama,
      Setoran: barang,
      Jumlah: jumlah,
      Minggu: minggu
    });
  }
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

  const rows =
    await gudangSheet.getRows();

  const item = rows.find(r =>
    r.get('Barang')
      ?.toLowerCase() ===
    barang.toLowerCase()
  );

  if (item) {

    let total =
      parseInt(item.get('Total')) || 0;

    // =========================
    // VALIDASI STOK
    // =========================

    if (
      type === 'remove' &&
      jumlah > total
    ) {

      return {
        success: false,
        stock: total
      };
    }

    if (type === 'add') {
      total += jumlah;
    } else {
      total -= jumlah;
    }

    // biar ga minus
    if (total < 0) {
      total = 0;
    }

    item.set('Total', total);

    await item.save();

    return {
      success: true
    };

  } else {

    if (type === 'remove') {

      return {
        success: false,
        stock: 0
      };
    }

    await gudangSheet.addRow({
      Barang: barang,
      Total: jumlah
    });

    return {
      success: true
    };
  }
}

// =================================================
// READY
// =================================================

client.once('clientReady', () => {
  console.log(
    `${client.user.tag} online!`
  );
});

// =================================================
// INTERACTION
// =================================================

client.on(
  'interactionCreate',
  async interaction => {

    if (
      !interaction.isChatInputCommand()
    ) return;

    await interaction.deferReply();

    const sheets =
      await loadSheets();
// ================================================= // SETORAN // ================================================= 
    if ( interaction.commandName === 'setoran' ) { 
      const nomor = await getNextNumber( sheets.setoran ); 
      const barang = interaction.options.getString( 'barang' ); 
      const jumlah = interaction.options.getInteger( 'jumlah' ); 
      const penyetor = interaction.options.getString( 'penyetor' ); 
      const penerima = interaction.options.getString( 'penerima' ); 
      const minggu = interaction.options.getString( 'minggu' ); 
      const keterangan = interaction.options.getString( 'keterangan' ); 
      const tanggal = new Date() .toLocaleDateString( 'id-ID' );

      await sheets.setoran.addRow({ 
        Nomor: nomor, 
        Barang: barang, 
        Jumlah: jumlah, 
        Tanggal: tanggal, 
        Keterangan: keterangan, 
        Penerima: penerima, 
        Minggu: minggu, 
        Penyetor: penyetor });

      await updateGudang( sheets.gudang, barang, jumlah, 'add' );
      await updateMember( sheets.member, penyetor, barang, jumlah, minggu );

      let text = `\`\`\`
NO : ${nomor}
BARANG : ${barang}
JUMLAH : ${jumlah} 
TANGGAL : ${tanggal} 
KETERANGAN : ${keterangan} 
PENERIMA : ${penerima} 
MINGGU : ${minggu} 
PENYETOR : ${penyetor} 
\`\`\`
`;

     const embed = new EmbedBuilder() .setColor('Green') .setTitle( '✅ SETORAN BERHASIL' ) .setDescription(text); await interaction.editReply({ embeds: [embed] });
    }
    
// =================================================
// CEK SETORAN MEMBER
// =================================================

if (
  interaction.commandName ===
  'ceksetoran'
) {

  const mingguCari =
    interaction.options.getString(
      'minggu'
    );

  const rows =
    await sheets.member.getRows();

  const hasil = rows.filter(r =>
    r.get('Minggu') ===
    mingguCari
  );

  if (hasil.length === 0) {

    return interaction.editReply({
      content:
        `❌ Tidak ada data minggu ${mingguCari}`
    });
  }

  let text = `\`\`\`
NO  | NAMA           | BARANG         | JUMLAH
---------------------------------------------------------
`;

  hasil.forEach(r => {

    const no =
      String(r.get('Nomor'))
        .padEnd(3, ' ');

    const nama =
      String(r.get('Nama'))
        .padEnd(14, ' ');

    const barang =
      String(r.get('Setoran'))
        .padEnd(15, ' ');

    const jumlah =
      String(r.get('Jumlah'));

    text +=
`${no} | ${nama} | ${barang} | ${jumlah}
`;

  });

  text += '```';

  const embed =
    new EmbedBuilder()
      .setColor('Blue')
      .setTitle(
        `📦 SETORAN MEMBER MINGGU ${mingguCari}`
      )
      .setDescription(text);

  await interaction.editReply({
    embeds: [embed]
  });
}

// =================================================
// LOG SETORAN
// =================================================

if (
  interaction.commandName ===
  'logsetoran'
) {

  const mingguCari =
    interaction.options.getString(
      'minggu'
    );

  const rows =
    await sheets.setoran.getRows();

  const hasil = rows.filter(r =>
    r.get('Minggu') ===
    mingguCari
  );

  if (hasil.length === 0) {

    return interaction.editReply({
      content:
        `❌ Tidak ada log minggu ${mingguCari}`
    });
  }

  let text = `\`\`\`
NO  | BARANG         | JUMLAH | PENYETOR     | PENERIMA
----------------------------------------------------------------
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

    const penyetor =
      String(r.get('Penyetor'))
        .padEnd(12, ' ');

    const penerima =
      String(r.get('Penerima'));

    text +=
`${no} | ${barang} | ${jumlah} | ${penyetor} | ${penerima}
`;

  });

  text += '```';

  const embed =
    new EmbedBuilder()
      .setColor('Blue')
      .setTitle(
        `📦 LOG SETORAN MINGGU ${mingguCari}`
      )
      .setDescription(text);

  await interaction.editReply({
    embeds: [embed]
  });
}

    // =================================================
    // GUDANG
    // =================================================

    if (
      interaction.commandName ===
      'gudang'
    ) {

      const rows =
        await sheets.gudang.getRows();

      if (rows.length === 0) {

        return interaction.editReply({
          content:
            'Gudang kosong.'
        });
      }

      let text = `\`\`\`
NO  | BARANG               | TOTAL
---------------------------------------
`;

      rows.forEach((r, index) => {

        const no =
          String(index + 1)
            .padEnd(3, ' ');

        const barang =
          String(r.get('Barang'))
            .padEnd(20, ' ');

        const total =
          String(r.get('Total'));

        text +=
`${no} | ${barang} | ${total}
`;

      });

      text += '```';

      const embed =
        new EmbedBuilder()
          .setColor('Orange')
          .setTitle(
            '📦 ISI GUDANG'
          )
          .setDescription(text);

      await interaction.editReply({
        embeds: [embed]
      });
    }

    // =================================================
    // SALDO
    // =================================================

    if (
      interaction.commandName ===
      'saldo'
    ) {

      const dirtyTotal =
        await getLastTotal(
          sheets.dirty
        );

      const legalTotal =
        await getLastTotal(
          sheets.legal
        );

      let text = `\`\`\`
TYPE            | TOTAL
-------------------------------
DIRTY MONEY     | Rp ${rupiah(dirtyTotal)}
LEGAL MONEY     | Rp ${rupiah(legalTotal)}
\`\`\`
`;

      const embed =
        new EmbedBuilder()
          .setColor('Gold')
          .setTitle(
            '💰 SALDO GANG'
          )
          .setDescription(text);

      await interaction.editReply({
        embeds: [embed]
      });
    }

    // =================================================
    // PEMASUKAN
    // =================================================

    if (
      interaction.commandName ===
      'pemasukan'
    ) {

      const password =
        interaction.options.getString(
          'password'
        );

      if (
        password !==
        process.env.PASSWORD_BOT
      ) {

        return interaction.editReply({
          content:
            '❌ Password salah.'
        });
      }

      const type =
        interaction.options.getString(
          'type'
        );

      const kelompok =
        interaction.options.getString(
          'kelompok'
        );

      const jumlah =
        interaction.options.getInteger(
          'jumlah'
        );

      const keterangan =
        interaction.options.getString(
          'keterangan'
        );

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
        new Date()
          .toLocaleDateString(
            'id-ID'
          );

      await sheet.addRow({
        Nomor: nomor,
        Kelompok: kelompok,
        Jumlah: jumlah,
        Keterangan: keterangan,
        Total: totalBaru,
        Tanggal: tanggal,
        Type: 'pemasukan'
      });

      let text = `\`\`\`
NO         : ${nomor}
TYPE       : ${type}
KELOMPOK   : ${kelompok}
JUMLAH     : Rp ${rupiah(jumlah)}
TOTAL BARU : Rp ${rupiah(totalBaru)}
KETERANGAN : ${keterangan}
\`\`\`
`;

      const embed =
        new EmbedBuilder()
          .setColor('Green')
          .setTitle(
            '💰 PEMASUKAN BERHASIL'
          )
          .setDescription(text);

      await interaction.editReply({
        embeds: [embed]
      });
    }

    // =================================================
    // PENGELUARAN
    // =================================================

    if (
      interaction.commandName ===
      'pengeluaran'
    ) {

      const password =
        interaction.options.getString(
          'password'
        );

      if (
        password !==
        process.env.PASSWORD_BOT
      ) {

        return interaction.editReply({
          content:
            '❌ Password salah.'
        });
      }

      const type =
        interaction.options.getString(
          'type'
        );

      const kelompok =
        interaction.options.getString(
          'kelompok'
        );

      const jumlah =
        interaction.options.getInteger(
          'jumlah'
        );

      const keterangan =
        interaction.options.getString(
          'keterangan'
        );

      const sheet =
        type === 'dirty'
          ? sheets.dirty
          : sheets.legal;

      const nomor =
        await getNextNumber(sheet);

      const totalSebelumnya =
        await getLastTotal(sheet);

      if (
        jumlah >
        totalSebelumnya
      ) {

        return interaction.editReply({
          content:
            '❌ Saldo tidak cukup.'
        });
      }

      const totalBaru =
        totalSebelumnya - jumlah;

      const tanggal =
        new Date()
          .toLocaleDateString(
            'id-ID'
          );

      await sheet.addRow({
        Nomor: nomor,
        Kelompok: kelompok,
        Jumlah: jumlah,
        Keterangan: keterangan,
        Total: totalBaru,
        Tanggal: tanggal,
        Type: 'pengeluaran'
      });

      let text = `\`\`\`
NO         : ${nomor}
TYPE       : ${type}
KELOMPOK   : ${kelompok}
JUMLAH     : Rp ${rupiah(jumlah)}
TOTAL BARU : Rp ${rupiah(totalBaru)}
KETERANGAN : ${keterangan}
\`\`\`
`;

      const embed =
        new EmbedBuilder()
          .setColor('Red')
          .setTitle(
            '💸 PENGELUARAN BERHASIL'
          )
          .setDescription(text);

      await interaction.editReply({
        embeds: [embed]
      });
    }

    // =================================================
    // CEK PEMASUKAN
    // =================================================

    if (
      interaction.commandName ===
      'cekpemasukan'
    ) {

      const type =
        interaction.options.getString(
          'type'
        );

      const sheet =
        type === 'dirty'
          ? sheets.dirty
          : sheets.legal;

      const rows =
        await sheet.getRows();

      const hasil = rows.filter(r =>
        r.get('Type') ===
        'pemasukan'
      );

      let text = `\`\`\`
NO  | KELOMPOK     | JUMLAH       | KETERANGAN
------------------------------------------------------------
`;

      hasil.reverse()
        .slice(0, 20)
        .forEach(r => {

          const no =
            String(r.get('Nomor'))
              .padEnd(3, ' ');

          const kelompok =
            String(r.get('Kelompok'))
              .padEnd(12, ' ');

          const jumlah =
            (`Rp ${rupiah(r.get('Jumlah'))}`)
              .padEnd(12, ' ');

          const keterangan =
            String(r.get('Keterangan'));

          text +=
`${no} | ${kelompok} | ${jumlah} | ${keterangan}
`;

        });

      text += '```';

      const embed =
        new EmbedBuilder()
          .setColor('Green')
          .setTitle(
            `💰 PEMASUKAN ${type.toUpperCase()}`
          )
          .setDescription(text);

      await interaction.editReply({
        embeds: [embed]
      });
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

    const gudangResult =
  await updateGudang(
    sheets.gudang,
    barang,
    jumlah,
    'remove'
  );

if (!gudangResult.success) {

  return interaction.editReply({
    content:
`❌ STOCK TIDAK CUKUP

STOCK SAAT INI:
${gudangResult.stock}
`
  });
}

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
    // CEK PENGELUARAN
    // =================================================

    if (
      interaction.commandName ===
      'cekpengeluaran'
    ) {

      const type =
        interaction.options.getString(
          'type'
        );

      const sheet =
        type === 'dirty'
          ? sheets.dirty
          : sheets.legal;

      const rows =
        await sheet.getRows();

      const hasil = rows.filter(r =>
        r.get('Type') ===
        'pengeluaran'
      );

      let text = `\`\`\`
NO  | KELOMPOK     | JUMLAH       | KETERANGAN
------------------------------------------------------------
`;

      hasil.reverse()
        .slice(0, 20)
        .forEach(r => {

          const no =
            String(r.get('Nomor'))
              .padEnd(3, ' ');

          const kelompok =
            String(r.get('Kelompok'))
              .padEnd(12, ' ');

          const jumlah =
            (`Rp ${rupiah(r.get('Jumlah'))}`)
              .padEnd(12, ' ');

          const keterangan =
            String(r.get('Keterangan'));

          text +=
`${no} | ${kelompok} | ${jumlah} | ${keterangan}
`;

        });

      text += '```';

      const embed =
        new EmbedBuilder()
          .setColor('Red')
          .setTitle(
            `💸 PENGELUARAN ${type.toUpperCase()}`
          )
          .setDescription(text);

      await interaction.editReply({
        embeds: [embed]
      });
    }

  }
);

client.login(
  process.env.TOKEN
);
