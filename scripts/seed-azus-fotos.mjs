// Sobe as fotos dos 18 modelos da Loja Azus pro Supabase Storage.
//
// Roda UMA vez, localmente (não faz parte do build/deploy do app).
// As fotos de origem são as do catálogo público da Azus no Canva —
// já resolvidas abaixo, então este script não depende do site do
// Canva continuar acessível depois de rodado.
//
// Uso:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node scripts/seed-azus-fotos.mjs
//
// A SUPABASE_SERVICE_ROLE_KEY fica só na sua máquina (pega em
// Supabase → Project Settings → API → service_role) — nunca vai pro
// bundle do app nem pro git.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar.");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const BUCKET = "azus_fotos";
const ORIGEM = "https://catalogosazus.my.canva.site/alfaiatariasazus3";

// Até 4 fotos reais por modelo (as maiores, sem duplicar elementos
// decorativos/de fundo que se repetem em todas as páginas do catálogo).
const FOTOS = {
  "atenas-slim": [
    "/_assets/media/20c4c1ea5982baf9cb977ec5e35d1a58.jpg",
    "/_assets/media/2fdf5051e82a98a7fe20223a7798e679.jpg",
    "/_assets/media/b785ee60a0510810a367ff77d32a976e.jpg",
    "/_assets/media/d6a6e892573ad3721917300044031b78.jpg",
  ],
  "atenas-super-slim": [
    "/_assets/media/f0b404001871f3c36c2c7bcc38fd427e.jpg",
    "/_assets/media/abf88e4b2386563a045496d38575086d.jpg",
    "/_assets/media/71b06e964cd96a29ebef8730e7b9acd6.jpg",
    "/_assets/media/ba01ab37171635e8085a67a41c4e14d7.jpg",
  ],
  "verona": [
    "/_assets/media/e8757fc48c70fbc73aaad8b744f47a62.jpg",
    "/_assets/media/522082d32e30f9e1720099738d6db2fa.jpg",
    "/_assets/media/7c2597a2d8e45bfa7df2d8f7436ae74a.jpg",
    "/_assets/media/085e059228356f8a4823f9a1a81706cc.jpg",
  ],
  "viena": [
    "/_assets/media/4b547f55f280ea547a1d6b3e7116ae5c.jpg",
    "/_assets/media/c9f520072b9dc92b24bc95f7dcb6a0ae.jpg",
    "/_assets/media/76b8e9c8144bfab9d25d1bf37b208f4b.jpg",
    "/_assets/media/e6f911aec900ec78bc9bd882c421fd5d.jpg",
  ],
  "toquio-com-fivelas": [
    "/_assets/media/e28fc06a4c55906e0a5ac7a3815dc4f8.jpg",
    "/_assets/media/f174f6e86918e9ac7ff970f43f9d654f.jpg",
    "/_assets/media/5b549547f13fceb95e84452d043ad66f.jpg",
    "/_assets/media/55265b5ad9630e3bc5b2b79847e21b75.jpg",
  ],
  "versalhes": [
    "/_assets/media/76f7999ac58c2d013e7af77e1e1787a4.jpg",
    "/_assets/media/e3f8bbb879b39001249478dd9249e059.jpg",
    "/_assets/media/19cde960164782947e0902c866342138.jpg",
    "/_assets/media/da02da906e1b86e9c68a7699c37eb679.jpg",
  ],
  "gurkha-lisboa": [
    "/_assets/media/09ad53278ef9cf489657bdeb2c297e39.jpg",
    "/_assets/media/b05c642b09bbb0ae94e896c623ed3a52.png",
    "/_assets/media/1b1a6d53be6e8f3b15b1743d9de29f92.jpg",
    "/_assets/media/173d03cd7697e6c70c47a54e6bb87a74.jpg",
  ],
  "gurkha-phuket": [
    "/_assets/media/ecb67eb031af7c571ee184d9e6d562e8.jpg",
    "/_assets/media/508039ba87a5e0a91cf9f33ce05d06de.jpg",
    "/_assets/media/5d68c36855bb10f4ab6ecf2ef9218f10.jpg",
    "/_assets/media/c2d7597d1eedbc6ef91676797b4a725b.jpg",
  ],
  "patan": [
    "/_assets/media/d0f576db7a1dfc6c2203d8b8be5ffd8c.jpg",
    "/_assets/media/ca763c06db9b797ecc9a87468da1578d.jpg",
    "/_assets/media/ab7c9038bbb713e179cdd3d89ffd0748.jpg",
    "/_assets/media/327979bf556cb64296911f6c0326b08c.jpg",
  ],
  "gurkha-york": [
    "/_assets/media/ef1e62f4670a10d85b5934813e271e70.jpg",
    "/_assets/media/bfe7f8b4652b8cf9a6019bbffea73194.jpg",
    "/_assets/media/9df3ffdfd9415303d38b5143b9687e55.jpg",
    "/_assets/media/066fc8fa34214a3e2e91e2e71794190a.jpg",
  ],
  "gurkha-veneto": [
    "/_assets/media/49add0b4ffc403bf9375ad34a278e8d5.jpg",
    "/_assets/media/047a207056b2747bd9f3598fbab65857.jpg",
    "/_assets/media/83e62892784ae38b4af366b0e2dc7335.jpg",
    "/_assets/media/15f9bf398be22a3e9620caf8a420c385.jpg",
  ],
  "gurkha-veneza": [
    "/_assets/media/ad403b33909bd350f9ebfc501f6341d9.jpg",
    "/_assets/media/ca8863c786007f57e4397860e8a7e279.jpg",
    "/_assets/media/8635421a5205ce6fae076628c305036c.jpg",
    "/_assets/media/1ea0e09237a309001c70744c6440597f.jpg",
  ],
  "bellagio": [
    "/_assets/media/8112bb7904d0faccc9853253b74fd0a6.jpg",
    "/_assets/media/186317fa593806370fb1e5c4b7afecde.jpg",
    "/_assets/media/51b160cdd112a0b137c4d798fd2b5e68.jpg",
    "/_assets/media/d8f8dbe980a6e8c345bfce9abd191ea6.jpg",
  ],
  "porto": [
    "/_assets/media/25191d98d7ef4b8204bd45b149fcfecd.jpg",
    "/_assets/media/3add451928a8ca54140bf98f3ef7eceb.jpg",
    "/_assets/media/68037830777bfb22126f80f4bd5f2b22.jpg",
    "/_assets/media/b7b55e2dcae18c33365b826019b86e02.jpg",
  ],
  "luso-principe-de-galles": [
    "/_assets/media/c251c1a6534ea6e3afece77aaeb32ab8.jpg",
    "/_assets/media/b4adfbc37201a21784ef3689bdb1a0a9.jpg",
    "/_assets/media/cb1cdd4616ef5aaadc5bbe9c5c3dfb0d.jpg",
    "/_assets/media/863a81d180a7542d7ecf2bae544d6cd8.jpg",
  ],
  "marca-dagua": [
    "/_assets/media/0e21d079381d239b1a28baa9eb6943b8.jpg",
    "/_assets/media/1df206a18464bd6de29123082ddff827.jpg",
    "/_assets/media/58515e930ebc8c2f2259dfd67eb70fd1.jpg",
    "/_assets/media/69f9545f4b64316428a2950fb4370b8d.jpg",
  ],
  "florenca": [
    "/_assets/media/72e95e9c4f39e5ed0ab28f90cb3332c3.jpg",
    "/_assets/media/2777ac14be77d85e2d5e76b1ef749406.jpg",
    "/_assets/media/1f5012f08939170c3e633590d041ba74.jpg",
    "/_assets/media/09c71d7c277c0d4231f1143d1f26eea4.jpg",
  ],
  "marselha": [
    "/_assets/media/ea13a547939097afb5535213290d6f9b.png",
    "/_assets/media/dbc4a9302e866d680fac04f32c73c991.jpg",
    "/_assets/media/0de6653794001f96527069b650b044e4.jpg",
    "/_assets/media/850753a83bc40cf3bad503b7aec0066b.jpg",
  ],
};

async function baixar(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("HTTP " + resp.status + " ao baixar " + url);
  const buf = Buffer.from(await resp.arrayBuffer());
  const ext = (url.split(".").pop() || "jpg").toLowerCase();
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  return { buf, ext, contentType };
}

async function main() {
  const { data: produtos, error } = await sb.from("azus_produtos").select("id, slug, nome");
  if (error) throw error;
  const porSlug = Object.fromEntries(produtos.map(p => [p.slug, p]));

  for (const [slug, caminhos] of Object.entries(FOTOS)) {
    const produto = porSlug[slug];
    if (!produto) {
      console.warn("⚠ produto não encontrado no banco (rode o SQL antes):", slug);
      continue;
    }

    const { data: existentes } = await sb.from("azus_produto_fotos").select("id").eq("produto_id", produto.id);
    if (existentes && existentes.length > 0) {
      console.log("↷ já tem fotos, pulando:", slug);
      continue;
    }

    console.log("→", produto.nome, "(" + slug + ")");
    for (let i = 0; i < caminhos.length; i++) {
      const url = ORIGEM + caminhos[i];
      try {
        const { buf, ext, contentType } = await baixar(url);
        const path = slug + "/" + (i + 1) + "." + ext;
        const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, { upsert: true, contentType });
        if (upErr) throw upErr;
        const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
        const { error: insErr } = await sb.from("azus_produto_fotos").insert({
          produto_id: produto.id,
          url: pub.publicUrl,
          ordem: i + 1,
        });
        if (insErr) throw insErr;
        console.log("   ok foto", i + 1);
      } catch (e) {
        console.error("   ✗ falhou foto", i + 1, "de", slug, "-", e.message || e);
      }
    }
  }
  console.log("Concluído.");
}

main().catch(e => { console.error(e); process.exit(1); });
