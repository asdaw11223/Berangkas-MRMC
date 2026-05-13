
// =================================================
// REQUIRE
// =================================================

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
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
// GLOBAL SHEETS
// =================================================

let sheets = {};

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

  const rows = await sheet.getRows({
    limit: 1,
    offset: Math.max(
      sheet.rowCount - 2,
      0
    )
  });

  if (rows.length === 0) {
    return 0;
  }

  return Number(
    rows[0].get('Total')
  ) || 0;
}

// =================================================
// GET NOMOR
// =================================================

async function getNextNumber(sheet) {

  const rows = await sheet.getRows({
    limit: 1,
    offset: Math.max(
      sheet.rowCount - 2,
      0
    )
  });

  if (rows.length === 0) {
    return '001';
  }

  const last =
    Number(rows[0].get('Nomor')) || 0;

  return String(last + 1)
    .padStart(3, '0');
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
      Number(item.get('Jumlah')) || 0;

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

  // =========================
  // BARANG BELUM ADA
  // =========================

  if (!item) {

    if (type === 'remove') {
      throw new Error(
        'BARANG_TIDAK_ADA'
      );
    }

    await gudangSheet.addRow({
      Barang: barang,
      Total: jumlah
    });

    return;
  }

  let total =
    Number(item.get('Total')) || 0;

  // =========================
  // ADD
  // =========================

  if (type === 'add') {

    total += jumlah;

  }

  // =========================
  // REMOVE
  // =========================

  else {

    if (jumlah > total) {
      throw new Error(
        'STOK_TIDAK_CUKUP'
      );
    }

    total -= jumlah;
  }

  item.set('Total', total);

  await item.save();
}

// =================================================
// READY
// =================================================

client.once(
  'clientReady',
  async () => {

    await doc.loadInfo();

    sheets = {
      setoran:
        doc.sheetsByTitle['SETORAN'],

      member:
        doc.sheetsByTitle['MEMBER'],

      brangkas:
        doc.sheetsByTitle['BRANGKAS'],

      gudang:
        doc.sheetsByTitle['GUDANG'],

      dirty:
        doc.sheetsByTitle['DIRTY'],

      legal:
        doc.sheetsByTitle['LEGAL']
    };

    console.log(
      `${client.user.tag} online!`
    );
  }
);

// =================================================
// INTERACTION
// =================================================

client.on(
  'interactionCreate',
  async interaction => {

    try {

      // =============================================
      // CHAT COMMAND
      // =============================================

      if (
        interaction.isChatInputCommand()
      ) {

        await interaction.deferReply();

        // =================================================
        // SETORAN
        // =================================================

        if (
          interaction.commandName ===
          'setoran'
        ) {

          const nomor =
            await getNextNumber(
              sheets.setoran
            );

          const barang =
            interaction.options.getString(
              'barang'
            );

          const jumlah =
            interaction.options.getInteger(
              'jumlah'
            );

          const penyetor =
            interaction.options.getString(
              'penyetor'
            );

          const penerima =
            interaction.options.getString(
              'penerima'
            );

          const minggu =
            interaction.options.getString(
              'minggu'
            );

          const keterangan =
            interaction.options.getString(
              'keterangan'
            );

          const tanggal =
            new Date()
              .toLocaleDateString(
                'id-ID'
              );

          await sheets.setoran.addRow({

            Nomor: nomor,
            Barang: barang,
            Jumlah: jumlah,
            Tanggal: tanggal,
            Keterangan: keterangan,
            Penerima: penerima,
            Minggu: minggu,
            Penyetor: penyetor
          });

          await updateGudang(
            sheets.gudang,
            barang,
            jumlah,
            'add'
          );

          await updateMember(
            sheets.member,
            penyetor,
            barang,
            jumlah,
            minggu
          );

          const embed =
            new EmbedBuilder()
              .setColor('Green')
              .setTitle(
                '✅ SETORAN BERHASIL'
              )
              .setDescription(
`\`\`\`
NO         : ${nomor}
BARANG     : ${barang}
JUMLAH     : ${jumlah}
TANGGAL    : ${tanggal}
KETERANGAN : ${keterangan}
PENERIMA   : ${penerima}
MINGGU     : ${minggu}
PENYETOR   : ${penyetor}
\`\`\`
`
              );

          return interaction.editReply({
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
            await sheets.gudang.getRows({
              limit: 50
            });

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

          rows.forEach((r, i) => {

            const no =
              String(i + 1)
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

          return interaction.editReply({
            embeds: [embed]
          });
        }

        // =================================================
        // DEPOSIT
        // =================================================

        if (
          interaction.commandName ===
          'deposit'
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

          const nomor =
            await getNextNumber(
              sheets.brangkas
            );

          const barang =
            interaction.options.getString(
              'barang'
            );

          const jumlah =
            interaction.options.getInteger(
              'jumlah'
            );

          const keterangan =
            interaction.options.getString(
              'keterangan'
            );

          const tanggal =
            new Date()
              .toLocaleDateString(
                'id-ID'
              );

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

          return interaction.editReply({
            content:
`# 📥 DEPOSIT BERHASIL

\`\`\`
NO         : ${nomor}
BARANG     : ${barang}
JUMLAH     : ${jumlah}
KETERANGAN : ${keterangan}
TANGGAL    : ${tanggal}
\`\`\`
`
          });
        }

        // =================================================
        // WITHDRAW
        // =================================================

        if (
          interaction.commandName ===
          'withdraw'
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

          const nomor =
            await getNextNumber(
              sheets.brangkas
            );

          const barang =
            interaction.options.getString(
              'barang'
            );

          const jumlah =
            interaction.options.getInteger(
              'jumlah'
            );

          const keterangan =
            interaction.options.getString(
              'keterangan'
            );

          const tanggal =
            new Date()
              .toLocaleDateString(
                'id-ID'
              );

          try {

            await updateGudang(
              sheets.gudang,
              barang,
              jumlah,
              'remove'
            );

          } catch (err) {

            if (
              err.message ===
              'BARANG_TIDAK_ADA'
            ) {

              return interaction.editReply({
                content:
                  '❌ Barang tidak ada di gudang.'
              });
            }

            if (
              err.message ===
              'STOK_TIDAK_CUKUP'
            ) {

              return interaction.editReply({
                content:
                  '❌ Stock gudang tidak cukup.'
              });
            }

            throw err;
          }

          await sheets.brangkas.addRow({

            Nomor: nomor,
            Barang: barang,
            Jumlah: jumlah,
            Keterangan: keterangan,
            Tanggal: tanggal,
            Type: 'withdraw'
          });

          return interaction.editReply({
            content:
`# 📤 WITHDRAW BERHASIL

\`\`\`
NO         : ${nomor}
BARANG     : ${barang}
JUMLAH     : ${jumlah}
KETERANGAN : ${keterangan}
TANGGAL    : ${tanggal}
\`\`\`
`
          });
        }

      }

      // =============================================
      // SELECT MENU
      // =============================================

      if (
        interaction.isStringSelectMenu()
      ) {

      }

      // =============================================
      // MODAL
      // =============================================

      if (
        interaction.isModalSubmit()
      ) {

      }

    } catch (err) {

      console.error(err);

      if (
        interaction.deferred ||
        interaction.replied
      ) {

        interaction.editReply({
          content:
            '❌ Terjadi error.'
        }).catch(() => {});

      } else {

        interaction.reply({
          content:
            '❌ Terjadi error.',
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);

// =================================================
// ERROR HANDLER
// =================================================

process.on(
  'unhandledRejection',
  console.error
);

process.on(
  'uncaughtException',
  console.error
);

// =================================================
// LOGIN
// =================================================

client.login(
  process.env.TOKEN
);
