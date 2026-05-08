require('dotenv').config();

const {
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const commands = [

  // =================================================
  // SETORAN
  // =================================================
  new SlashCommandBuilder()
    .setName('setoran')
    .setDescription('Tambah log setoran')

    .addStringOption(option =>
      option
        .setName('barang')
        .setDescription('Nama barang')
        .setRequired(true)
    )

    .addIntegerOption(option =>
      option
        .setName('jumlah')
        .setDescription('Jumlah barang')
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('penerima')
        .setDescription('Nama penerima')
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('minggu')
        .setDescription('Minggu ke berapa')
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('keterangan')
        .setDescription('Keterangan')
        .setRequired(true)
    ),

  // =================================================
  // CEK SETORAN
  // =================================================
  new SlashCommandBuilder()
    .setName('ceksetoran')
    .setDescription('Cek setoran berdasarkan minggu')

    .addStringOption(option =>
      option
        .setName('minggu')
        .setDescription('Masukkan minggu')
        .setRequired(true)
    ),

  // =================================================
  // GUDANG
  // =================================================
  new SlashCommandBuilder()
    .setName('gudang')
    .setDescription('Cek isi gudang'),

  // =================================================
  // PEMASUKAN
  // =================================================
  new SlashCommandBuilder()
    .setName('pemasukan')
    .setDescription('Tambah pemasukan uang')

    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Pilih type uang')
        .addChoices(
          { name: '💷 Dirty Money', value: 'dirty' },
          { name: '💵 Legal Money', value: 'legal' }
        )
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('kelompok')
        .setDescription('Nama kelompok')
        .setRequired(true)
    )

    .addIntegerOption(option =>
      option
        .setName('jumlah')
        .setDescription('Jumlah uang')
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('keterangan')
        .setDescription('Keterangan')
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('password')
        .setDescription('Password bot')
        .setRequired(true)
    ),

  // =================================================
  // PENGELUARAN
  // =================================================
  new SlashCommandBuilder()
    .setName('pengeluaran')
    .setDescription('Tambah pengeluaran uang')

    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Pilih type uang')
        .addChoices(
          { name: '💷 Dirty Money', value: 'dirty' },
          { name: '💵 Legal Money', value: 'legal' }
        )
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('kelompok')
        .setDescription('Nama kelompok')
        .setRequired(true)
    )

    .addIntegerOption(option =>
      option
        .setName('jumlah')
        .setDescription('Jumlah uang')
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('keterangan')
        .setDescription('Keterangan')
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('password')
        .setDescription('Password bot')
        .setRequired(true)
    ),

  // =================================================
  // CEK PEMASUKAN
  // =================================================
  new SlashCommandBuilder()
    .setName('cekpemasukan')
    .setDescription('Cek data pemasukan')

    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('dirty atau legal')
        .addChoices(
          { name: '💷 Dirty Money', value: 'dirty' },
          { name: '💵 Legal Money', value: 'legal' }
        )
        .setRequired(true)
    ),

  // =================================================
  // CEK PENGELUARAN
  // =================================================
  new SlashCommandBuilder()
    .setName('cekpengeluaran')
    .setDescription('Cek data pengeluaran')

    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('dirty atau legal')
        .addChoices(
          { name: '💷 Dirty Money', value: 'dirty' },
          { name: '💵 Legal Money', value: 'legal' }
        )
        .setRequired(true)
    ),

  // =================================================
  // SALDO
  // =================================================
  new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Cek saldo gang')

].map(command => command.toJSON());

// =================================================
// REGISTER COMMAND
// =================================================

const rest = new REST({ version: '10' })
  .setToken(process.env.TOKEN);

(async () => {

  try {

    console.log('Registering commands...');

    await rest.put(
      Routes.applicationCommands(
        process.env.CLIENT_ID
      ),
      { body: commands }
    );

    console.log('Commands registered!');

  } catch (error) {

    console.error(error);

  }

})();
