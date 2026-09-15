import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import { addAccount, getAccounts, takeAvailableAccount, setAccountStatus } from './accounts.js';
import { enqueue, dequeue, getJobs, updateJob } from './queue.js';
import { waitForOtp, submitOtp } from './otp.js';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN belum diatur.');

const bot = new Telegraf(token);
const maxQueue = Number(process.env.MAX_QUEUE_PER_USER || 5);
const otpTimeout = Number(process.env.OTP_TIMEOUT_SECONDS || 180) * 1000;

const menu = Markup.keyboard([
  ['➕ Tambah Stok', '🚀 Mulai Run'],
  ['📊 Status', '📦 Stok']
]).resize();

const states = new Map();

bot.start((ctx) => {
  states.delete(ctx.from.id);
  return ctx.reply('🤖 Ryntele Bot\n\nPilih menu di bawah.', menu);
});

bot.hears('➕ Tambah Stok', (ctx) => {
  states.set(ctx.from.id, { type: 'add-stock' });
  return ctx.reply('Kirim email yang ingin dimasukkan ke stok.');
});

bot.hears('📦 Stok', (ctx) => {
  const accounts = getAccounts(ctx.from.id);
  const available = accounts.filter((a) => a.status === 'available').length;
  return ctx.reply(`📦 Stok kamu: ${available} akun tersedia.`);
});

bot.hears('📊 Status', (ctx) => {
  const jobs = getJobs(ctx.from.id);
  if (!jobs.length) return ctx.reply('📊 Belum ada job.');
  const text = jobs.slice(-10).map((j) => `• ${j.id.slice(0, 8)} — ${j.status}`).join('\n');
  return ctx.reply(`📊 Status Job:\n${text}`);
});

bot.hears('🚀 Mulai Run', async (ctx) => {
  const userId = ctx.from.id;
  const runningOrQueued = getJobs(userId).filter((j) => ['queued', 'running', 'waiting-otp'].includes(j.status)).length;
  if (runningOrQueued >= maxQueue) return ctx.reply(`⚠️ Limit antrean kamu adalah ${maxQueue} job.`);

  const account = takeAvailableAccount(userId);
  if (!account) return ctx.reply('❌ Tidak ada stok akun yang tersedia.');

  setAccountStatus(account.id, 'processing');
  const job = { id: crypto.randomUUID(), userId, accountId: account.id, email: account.email };
  enqueue(job);
  await ctx.reply(`🚀 Job dibuat untuk ${account.email}\nID: ${job.id.slice(0, 8)}`);
  runNextJob(ctx.telegram).catch(console.error);
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const state = states.get(userId);
  if (state?.type === 'add-stock') {
    try {
      const account = addAccount(userId, ctx.message.text);
      states.delete(userId);
      return ctx.reply(`✅ Ditambahkan ke stok:\n${account.email}`, menu);
    } catch (error) {
      return ctx.reply(`❌ ${error.message}`);
    }
  }

  if (state?.type === 'otp') {
    const accepted = submitOtp(state.jobId, userId, ctx.message.text);
    if (!accepted) return ctx.reply('❌ OTP tidak valid atau job sudah tidak menunggu OTP.');
    states.delete(userId);
    return ctx.reply('✅ OTP diterima. Job dilanjutkan.');
  }
});

async function runNextJob(telegram) {
  const job = dequeue();
  if (!job) return;

  updateJob(job.id, { status: 'waiting-otp' });
  await telegram.sendMessage(job.userId,
    `🔐 OTP Manual Dibutuhkan\nAkun: ${job.email}\n\nSilakan kirim OTP 4–8 digit.`
  );

  // Automation/login integration will be connected here after the permitted
  // service/API contract is confirmed.
  states.set(job.userId, { type: 'otp', jobId: job.id });

  try {
    const otp = await waitForOtp(job.id, job.userId, otpTimeout);
    updateJob(job.id, { status: 'completed', otpReceived: true, completedAt: Date.now() });
    setAccountStatus(job.accountId, 'completed');
    await telegram.sendMessage(job.userId, `✅ OTP diterima untuk ${job.email}.\nJob selesai pada tahap verifikasi.`);
    return otp;
  } catch (error) {
    updateJob(job.id, { status: 'failed', error: error.message });
    setAccountStatus(job.accountId, 'available');
    await telegram.sendMessage(job.userId, `❌ Job gagal: ${error.message}`);
  }
}

bot.catch((error, ctx) => {
  console.error('Bot error:', error);
  ctx.reply('❌ Terjadi kesalahan internal.').catch(() => {});
});

bot.launch();
console.log('Ryntele Bot running.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
