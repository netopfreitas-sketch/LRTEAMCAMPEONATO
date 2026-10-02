const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

const HASH = "lrteam:campeonato";
const text = (v, max) => (v == null ? "" : String(v).slice(0, max));

function clean(key, value) {
  if (/^g([0-9]|1[0-9])$/.test(key)) {
    if (!value || typeof value !== "object") return null;
    return { a: text(value.a, 8), b: text(value.b, 8) };
  }
  if (key === "sorteio") {
    if (!value || typeof value !== "object") return null;
    const out = {};
    Object.keys(value).slice(0, 20).forEach((n) => {
      out[text(n, 30)] = text(value[n], 4);
    });
    return out;
  }
  if (key === "final") {
    if (!value || typeof value !== "object") return null;
    const out = {};
    ["first", "pE", "pD", "sE", "sD"].forEach((k) => {
      out[k] = text(value[k], 30);
    });
    return out;
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const all = (await redis.hgetall(HASH)) || {};
      return res.status(200).json(all);
    }
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const value = clean(body.key, body.value);
      if (value === null) return res.status(400).json({ error: "dados inválidos" });
      await redis.hset(HASH, { [body.key]: value });
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: "erro no servidor" });
  }
};
