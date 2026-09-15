import 'dotenv/config';

export async function callExternalApi() {
  const baseUrl = process.env.EXTERNAL_API_URL;
  const apiKey = process.env.EXTERNAL_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('External API belum dikonfigurasi.');
  }

  // Adapter placeholder. Endpoint dan request/response akan diisi setelah
  // dokumentasi API yang valid tersedia.
  throw new Error('External API adapter belum diimplementasikan.');
}
