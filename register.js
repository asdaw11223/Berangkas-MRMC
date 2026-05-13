require('dotenv').config();

const {
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

// =================================================
// PILIHAN MINGGU
// =================================================

const mingguChoices = [

  { name: 'Minggu 1', value: 'Minggu 1' },
  { name: 'Minggu 2', value: 'Minggu 2' },
  { name: 'Minggu 3', value: 'Minggu 3' },
  { name: 'Minggu 4', value: 'Minggu 4' },
  { name: 'Minggu 5', value: 'Minggu 5' }

];

// =================================================
// COMMANDS
// =================================================

const commands = [

  // =================================================
  // SETORAN
  // =================================================

  new SlashCommandBuilder()

    .setName('setoran')
    .setDescription(
      'Tambah log setoran'
    )

    .addStringOption(option =>

      option
        .setName('barang')
        .setDescription(
          'Nama barang'
        )
        .setRequired(true)
    )

    .addIntegerOption(option =>

      option
        .setName('jumlah')
        .setDescription(
          'Jumlah barang'
        )
        .setMinValue(1)
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('penyetor')
        .setDescription(
          'Nama penyetor'
        )
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('penerima')
        .setDescription(
          'Nama penerima'
        )
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('minggu')
        .setDescription(
          'Pilih minggu'
        )
        .addChoices(
          ...mingguChoices
        )
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('keterangan')
        .setDescription(
          'Keterangan setoran'
        )
        .setRequired(true)
    ),

  // =================================================
  // CEK SETORAN
  // =================================================

  new SlashCommandBuilder()

    .setName('ceksetoran')
    .setDescription(
      'Cek setoran member'
    )

    .addStringOption(option =>

      option
        .setName('minggu')
        .setDescription(
          'Pilih minggu'
        )
        .addChoices(
          ...mingguChoices
        )
        .setRequired(true)
    ),

  // =================================================
  // LOG SETORAN
  // =================================================

  new SlashCommandBuilder()

    .setName('logsetoran')
    .setDescription(
      'Cek seluruh log setoran'
    )

    .addStringOption(option =>

      option
        .setName('minggu')
        .setDescription(
          'Pilih minggu'
        )
        .addChoices(
          ...mingguChoices
        )
        .setRequired(true)
    ),

  // =================================================
  // GUDANG
  // =================================================

  new SlashCommandBuilder()

    .setName('gudang')
    .setDescription(
      'Lihat isi gudang'
    ),

  // =================================================
  // DEPOSIT
  // =================================================

  new SlashCommandBuilder()

    .setName('deposit')
    .setDescription(
      'Deposit barang ke brangkas'
    )

    .addStringOption(option =>

      option
        .setName('barang')
        .setDescription(
          'Nama barang'
        )
        .setRequired(true)
    )

    .addIntegerOption(option =>

      option
        .setName('jumlah')
        .setDescription(
          'Jumlah barang'
        )
        .setMinValue(1)
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('keterangan')
        .setDescription(
          'Keterangan deposit'
        )
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('password')
        .setDescription(
          'Password bot'
        )
        .setRequired(true)
    ),

  // =================================================
  // WITHDRAW
  // =================================================

  new SlashCommandBuilder()

    .setName('withdraw')
    .setDescription(
      'Withdraw barang dari brangkas'
    )

    .addStringOption(option =>

      option
        .setName('barang')
        .setDescription(
          'Nama barang'
        )
        .setRequired(true)
    )

    .addIntegerOption(option =>

      option
        .setName('jumlah')
        .setDescription(
          'Jumlah barang'
        )
        .setMinValue(1)
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('keterangan')
        .setDescription(
          'Keterangan withdraw'
        )
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('password')
        .setDescription(
          'Password bot'
        )
        .setRequired(true)
    ),

  // =================================================
  // PEMASUKAN
  // =================================================

  new SlashCommandBuilder()

    .setName('pemasukan')
    .setDescription(
      'Tambah pemasukan uang'
    )

    .addStringOption(option =>

      option
        .setName('type')
        .setDescription(
          'Pilih type uang'
        )
        .addChoices(

          {
            name: '💷 Dirty Money',
            value: 'dirty'
          },

          {
            name: '💵 Legal Money',
            value: 'legal'
          }

        )
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('kelompok')
        .setDescription(
          'Nama kelompok'
        )
        .setRequired(true)
    )

    .addIntegerOption(option =>

      option
        .setName('jumlah')
        .setDescription(
          'Jumlah uang'
        )
        .setMinValue(1)
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('keterangan')
        .setDescription(
          'Keterangan pemasukan'
        )
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('password')
        .setDescription(
          'Password bot'
        )
        .setRequired(true)
    ),

  // =================================================
  // PENGELUARAN
  // =================================================

  new SlashCommandBuilder()

    .setName('pengeluaran')
    .setDescription(
      'Tambah pengeluaran uang'
    )

    .addStringOption(option =>

      option
        .setName('type')
        .setDescription(
          'Pilih type uang'
        )
        .addChoices(

          {
            name: '💷 Dirty Money',
            value: 'dirty'
          },

          {
            name: '💵 Legal Money',
            value: 'legal'
          }

        )
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('kelompok')
        .setDescription(
          'Nama kelompok'
        )
        .setRequired(true)
    )

    .addIntegerOption(option =>

      option
        .setName('jumlah')
        .setDescription(
          'Jumlah uang'
        )
        .setMinValue(1)
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('keterangan')
        .setDescription(
          'Keterangan pengeluaran'
        )
        .setRequired(true)
    )

    .addStringOption(option =>

      option
        .setName('password')
        .setDescription(
          'Password bot'
        )
        .setRequired(true)
    ),

  // =================================================
  // CEK PEMASUKAN
  // =================================================

  new SlashCommandBuilder()

    .setName('cekpemasukan')
    .setDescription(
      'Cek data pemasukan'
    )

    .addStringOption(option =>

      option
        .setName('type')
        .setDescription(
          'Pilih type uang'
        )
        .addChoices(

          {
            name: '💷 Dirty Money',
            value: 'dirty'
          },

          {
            name: '💵 Legal Money',
            value: 'legal'
          }

        )
        .setRequired(true)
    ),

  // =================================================
  // CEK PENGELUARAN
  // =================================================

  new SlashCommandBuilder()

    .setName('cekpengeluaran')
    .setDescription(
      'Cek data pengeluaran'
    )

    .addStringOption(option =>

      option
        .setName('type')
        .setDescription(
          'Pilih type uang'
        )
        .addChoices(

          {
            name: '💷 Dirty Money',
            value: 'dirty'
          },

          {
            name: '💵 Legal Money',
            value: 'legal'
          }

        )
        .setRequired(true)
    ),

  // =================================================
  // SALDO
  // =================================================

  new SlashCommandBuilder()

    .setName('saldo')
    .setDescription(
      'Cek saldo gang'
    )

].map(command => command.toJSON());

// =================================================
// REST
// =================================================

const rest = new REST({
  version: '10'
}).setToken(
  process.env.TOKEN
);

// =================================================
// REGISTER
// =================================================

(async () => {

  try {

    console.log(
      'Registering commands...'
    );

    await rest.put(

      Routes.applicationCommands(
        process.env.CLIENT_ID
      ),

      {
        body: commands
      }
    );

    console.log(
      'Commands registered!'
    );

  } catch (error) {

    console.error(error);

  }

})();
