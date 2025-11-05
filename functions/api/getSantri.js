// functions/api/getSantri.js
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(request.url);
  // <- sekarang dukung ?kelas= ATAU ?kelasId=
  const kelasParam = url.searchParams.get("kelas") || url.searchParams.get("kelasId");

  if (!kelasParam) {
    return new Response(JSON.stringify({ error: "Parameter 'kelas' atau 'kelasId' wajib diisi" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // Kandidat lokasi file roster di repo GitHub kamu
  const candidates = [
    // root repo: <kelas>.json  (sesuai kode awalmu)
    `https://api.github.com/repos/muqoddammtb/server/contents/${encodeURIComponent(kelasParam)}.json`,

    // Jika kamu simpan di subfolder, tinggal buka komentar baris ini:
    // `https://api.github.com/repos/muqoddammtb/server/contents/kelas/${encodeURIComponent(kelasParam)}.json`,
  ];

  try {
    let lastErr = null;

    for (const apiUrl of candidates) {
      try {
        const gh = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "cf-pages-functions",
          },
          cf: { cacheTtl: 0, cacheEverything: false },
        });

        if (!gh.ok) { lastErr = new Error(`GitHub ${gh.status}`); continue; }

        const result = await gh.json();       // { content: "base64", ... }
        const decoded = atob(result.content); // base64 -> JSON string

        // Kembalikan isi JSON mentah (array atau object) agar frontendmu tetap kompatibel
        return new Response(decoded, {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
        });
      } catch (e) {
        lastErr = e;
      }
    }

    throw lastErr || new Error("Gagal fetch roster dari semua kandidat path");
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}
