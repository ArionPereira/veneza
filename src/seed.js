import { iso, NOMES, wdDe } from "./dates.js";

export const PREVISTO_PADRAO = 100;

export const TEMPLATE_WD = {
  1:["m3","g1","g2","a1","s1","d2","b1"], 2:["m2","g1","g2","a3","s2","d1","b2"],
  3:["m6","g1","g2","a2","s3","d3","b1"], 4:["m5","g2","a4","s1","d1","b2"],
  5:["m8","g1","g2","a1","s2","d2","b1"]
};

export const TIPOS_SEED = [
  {id:"cafe",  nome:"Café da manhã", ativo:false},
  {id:"almoco",nome:"Almoço",        ativo:true},
  {id:"janta", nome:"Janta",         ativo:false},
  {id:"ceia",  nome:"Ceia",          ativo:false},
];

export const novaRef = (pratos) => ({ pratos: pratos||[], previsto: PREVISTO_PADRAO, realizado: null });

export const INSUMOS_SEED = [
  {id:"arroz",       nome:"Arroz",                    unidade:"kg", preco:5.5, fc:1.0, fcc:2.5},
  {id:"feijao",      nome:"Feijão carioca",            unidade:"kg", preco:8.0, fc:1.0, fcc:2.6},
  {id:"fuba",        nome:"Fubá",                     unidade:"kg", preco:5.0, fc:1.0, fcc:4.0},
  {id:"macarrao",    nome:"Macarrão",                 unidade:"kg", preco:7.0, fc:1.0, fcc:2.5},
  {id:"far_mand",    nome:"Farinha de mandioca",      unidade:"kg", preco:6.0, fc:1.0, fcc:1.0},
  {id:"frango_osso", nome:"Frango (coxa/sobrecoxa)",  unidade:"kg", preco:9.0, fc:1.15,fcc:0.85},
  {id:"file_frango", nome:"Filé de frango",           unidade:"kg", preco:14.0,fc:1.05,fcc:0.75},
  {id:"lombo",       nome:"Lombo suíno",              unidade:"kg", preco:16.0,fc:1.15,fcc:0.7},
  {id:"costela_suina",nome:"Costelinha suína",        unidade:"kg", preco:14.0,fc:1.3, fcc:0.65},
  {id:"acem",        nome:"Acém / músculo bovino",    unidade:"kg", preco:28.0,fc:1.25,fcc:0.65},
  {id:"costela_bov", nome:"Costela bovina",           unidade:"kg", preco:22.0,fc:1.4, fcc:0.6},
  {id:"carne_seca",  nome:"Carne seca",               unidade:"kg", preco:38.0,fc:1.2, fcc:0.9},
  {id:"tilapia",     nome:"Filé de tilápia",          unidade:"kg", preco:32.0,fc:1.05,fcc:0.85},
  {id:"mandioca",    nome:"Mandioca",                 unidade:"kg", preco:4.5, fc:1.3, fcc:1.1},
  {id:"cebola",      nome:"Cebola",                   unidade:"kg", preco:4.0, fc:1.1, fcc:1.0},
  {id:"alho",        nome:"Alho",                     unidade:"kg", preco:20.0,fc:1.15,fcc:1.0},
  {id:"tomate",      nome:"Tomate",                   unidade:"kg", preco:6.0, fc:1.08,fcc:1.0},
  {id:"oleo",        nome:"Óleo",                     unidade:"L",  preco:9.0, fc:1.0, fcc:1.0},
  {id:"alface",      nome:"Alface",                   unidade:"kg", preco:8.0, fc:1.25,fcc:1.0},
  {id:"repolho",     nome:"Repolho",                  unidade:"kg", preco:3.5, fc:1.15,fcc:1.0},
  {id:"beterraba",   nome:"Beterraba",                unidade:"kg", preco:5.0, fc:1.2, fcc:1.0},
  {id:"couve",       nome:"Couve",                    unidade:"kg", preco:7.0, fc:1.3, fcc:0.6},
  {id:"quiabo",      nome:"Quiabo",                   unidade:"kg", preco:9.0, fc:1.1, fcc:0.85},
  {id:"banana",      nome:"Banana",                   unidade:"kg", preco:4.0, fc:1.35,fcc:1.0},
  {id:"doce_leite",  nome:"Doce de leite",            unidade:"kg", preco:16.0,fc:1.0, fcc:1.0},
  {id:"pacoca",      nome:"Paçoca",                   unidade:"kg", preco:18.0,fc:1.0, fcc:1.0},
  {id:"milho_verde", nome:"Milho verde",              unidade:"kg", preco:5.0, fc:1.6, fcc:1.0},
  {id:"polpa_mar",   nome:"Polpa de maracujá",        unidade:"kg", preco:14.0,fc:1.0, fcc:1.0},
  {id:"acucar",      nome:"Açúcar",                   unidade:"kg", preco:4.5, fc:1.0, fcc:1.0},
  {id:"pequi",       nome:"Pequi",                    unidade:"kg", preco:15.0,fc:1.5, fcc:1.0},
  {id:"guariroba",   nome:"Guariroba",                unidade:"kg", preco:22.0,fc:1.4, fcc:0.7},
];

export const PRATOS_SEED = [
  {id:"m1",nome:"Galinhada com pequi",            categoria:"Prato principal",sazonal:true, ficha:[["frango_osso",110],["arroz",80],["pequi",25],["cebola",8],["oleo",5]]},
  {id:"m2",nome:"Frango grelhado",                categoria:"Prato principal",sazonal:false,ficha:[["file_frango",110],["alho",2],["oleo",4]]},
  {id:"m3",nome:"Lombo suíno assado",             categoria:"Prato principal",sazonal:false,ficha:[["lombo",120],["alho",3],["oleo",3]]},
  {id:"m4",nome:"Costelinha suína",               categoria:"Prato principal",sazonal:false,ficha:[["costela_suina",140],["alho",3],["oleo",3]]},
  {id:"m5",nome:"Maria Isabel (arroz com carne seca)",categoria:"Prato principal",sazonal:false,ficha:[["carne_seca",70],["arroz",90],["cebola",8],["oleo",5]]},
  {id:"m6",nome:"Vaca atolada",                   categoria:"Prato principal",sazonal:false,ficha:[["costela_bov",130],["mandioca",100],["cebola",8],["oleo",5]]},
  {id:"m7",nome:"Carne de panela",                categoria:"Prato principal",sazonal:false,ficha:[["acem",120],["tomate",15],["cebola",8],["oleo",5]]},
  {id:"m8",nome:"Tilápia assada",                 categoria:"Prato principal",sazonal:false,ficha:[["tilapia",130],["alho",2],["oleo",4]]},
  {id:"g1",nome:"Arroz branco",                   categoria:"Guarnição",      sazonal:false,ficha:[["arroz",80],["oleo",3]]},
  {id:"g2",nome:"Feijão carioca",                 categoria:"Guarnição",      sazonal:false,ficha:[["feijao",45],["cebola",5],["alho",2],["oleo",3]]},
  {id:"g3",nome:"Arroz com pequi",                categoria:"Guarnição",      sazonal:true, ficha:[["arroz",80],["pequi",20],["oleo",4]]},
  {id:"g4",nome:"Angu (polenta)",                 categoria:"Guarnição",      sazonal:false,ficha:[["fuba",40],["oleo",3]]},
  {id:"g5",nome:"Tutu de feijão",                 categoria:"Guarnição",      sazonal:false,ficha:[["feijao",40],["far_mand",15],["oleo",4]]},
  {id:"g6",nome:"Macarrão alho e óleo",           categoria:"Guarnição",      sazonal:false,ficha:[["macarrao",90],["alho",3],["oleo",5]]},
  {id:"a1",nome:"Mandioca cozida",                categoria:"Acompanhamento", sazonal:false,ficha:[["mandioca",120]]},
  {id:"a2",nome:"Quiabo refogado",                categoria:"Acompanhamento", sazonal:false,ficha:[["quiabo",80],["cebola",5],["oleo",4]]},
  {id:"a3",nome:"Couve refogada",                 categoria:"Acompanhamento", sazonal:false,ficha:[["couve",60],["alho",2],["oleo",4]]},
  {id:"a4",nome:"Farofa",                         categoria:"Acompanhamento", sazonal:false,ficha:[["far_mand",30],["cebola",5],["oleo",5]]},
  {id:"a5",nome:"Guariroba refogada",             categoria:"Acompanhamento", sazonal:true, ficha:[["guariroba",70],["cebola",5],["oleo",5]]},
  {id:"s1",nome:"Salada de alface e tomate",      categoria:"Salada",         sazonal:false,ficha:[["alface",40],["tomate",40]]},
  {id:"s2",nome:"Salada de repolho",              categoria:"Salada",         sazonal:false,ficha:[["repolho",70]]},
  {id:"s3",nome:"Beterraba cozida",               categoria:"Salada",         sazonal:false,ficha:[["beterraba",70]]},
  {id:"d1",nome:"Banana",                         categoria:"Sobremesa",      sazonal:false,ficha:[["banana",120]]},
  {id:"d2",nome:"Doce de leite",                  categoria:"Sobremesa",      sazonal:false,ficha:[["doce_leite",50]]},
  {id:"d3",nome:"Paçoca",                         categoria:"Sobremesa",      sazonal:false,ficha:[["pacoca",25]]},
  {id:"d4",nome:"Pamonha doce",                   categoria:"Sobremesa",      sazonal:true, ficha:[["milho_verde",120],["acucar",20]]},
  {id:"b1",nome:"Suco de maracujá",               categoria:"Bebida",         sazonal:false,ficha:[["polpa_mar",30],["acucar",20]]},
  {id:"b2",nome:"Refresco",                       categoria:"Bebida",         sazonal:false,ficha:[["acucar",15]]},
];

export const CARDAPIO_SEED = {
  Segunda:["m3","g1","g2","a1","s1","d2","b1"], Terça:["m2","g1","g2","a3","s2","d1","b2"],
  Quarta: ["m6","g1","g2","a2","s3","d3","b1"], Quinta:["m5","g2","a4","s1","d1","b2"],
  Sexta:  ["m8","g1","g2","a1","s2","d2","b1"]
};

export const normPratos = (arr) =>
  arr.map(p => ({ ...p, ficha:(p.ficha||[]).map(l => Array.isArray(l) ? {insumoId:l[0], g:l[1]} : l) }));

export function semearCardapioDatas() {
  const novo={}; const hoje=new Date(); const wd=hoje.getDay();
  const seg=new Date(hoje); seg.setDate(hoje.getDate()-((wd+6)%7));
  for(let i=0;i<7;i++){
    const d=new Date(seg); d.setDate(seg.getDate()+i);
    const t=TEMPLATE_WD[d.getDay()]; if(t) novo[iso(d)]={ almoco: novaRef(t.slice()) };
  }
  return novo;
}

export function migrar(e) {
  const out = {...e};
  if (!out.tiposRefeicao || !out.tiposRefeicao.length) out.tiposRefeicao = TIPOS_SEED.map(t=>({...t}));
  if (typeof out.previstoPadrao !== "number") out.previstoPadrao = out.headcount || PREVISTO_PADRAO;
  const adOld  = e.adesao   || {};
  const headOld = e.headcount || PREVISTO_PADRAO;
  const prevDe = (dataISO) => {
    const wd = wdDe(dataISO);
    const pct = (adOld[wd] != null ? adOld[wd] : adOld[NOMES[wd]]);
    return pct != null ? Math.round(headOld*pct/100) : (headOld||PREVISTO_PADRAO);
  };
  let card = e.cardapio || {};
  const temData = Object.keys(card).some(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
  if (!temData) {
    const novo={}; const hoje=new Date(); const wd=hoje.getDay();
    const seg=new Date(hoje); seg.setDate(hoje.getDate()-((wd+6)%7));
    for(let i=0;i<7;i++){
      const d=new Date(seg); d.setDate(seg.getDate()+i);
      const nm=NOMES[d.getDay()]; if(card[nm]&&card[nm].length) novo[iso(d)]=card[nm].slice();
    }
    card = novo;
  }
  const cardNovo = {};
  Object.keys(card).forEach(dataISO => {
    const v = card[dataISO];
    if (Array.isArray(v)) {
      if (v.length) cardNovo[dataISO] = { almoco:{ pratos:v.slice(), previsto:prevDe(dataISO), realizado:null } };
    } else if (v && typeof v === "object") {
      cardNovo[dataISO] = v;
    }
  });
  out.cardapio = cardNovo;
  return out;
}
