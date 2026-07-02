import React from "react";
const { useMemo, useState } = React;
import { C, SERIF, SH } from "../../constants.js";
import { fmtData } from "./choreiconst.js";
import { ItemCard } from "./ItemCard.jsx";

export function Historico({ equipe, itens, sessao, usuarios, recarregar }) {
  const [erro, setErro] = useState("");
  const [dias, setDias] = useState(30);

  const eMaster = sessao?.role === "master";
  const podeEscrever = eMaster || equipe?.responsavel_id === sessao?.id;

  // agrupa por dia (data de criação)
  const porDia = useMemo(() => {
    const m = {};
    itens.forEach(i => {
      const d = (i.criado_em || "").slice(0,10);
      (m[d] = m[d] || []).push(i);
    });
    // ordena datas desc e limita
    return Object.keys(m).sort((a,b) => a<b?1:-1).slice(0, dias).map(d => ({ data:d, itens:m[d] }));
  }, [itens, dias]);

  return (
    <div style={{ marginTop:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:10 }}>
        <div>
          <div style={{ fontSize:11, letterSpacing:1, textTransform:"uppercase", color:C.accent, fontWeight:700 }}>Histórico</div>
          <div style={{ fontFamily:SERIF, fontSize:19, color:C.brand, fontWeight:600 }}>Equipe {equipe?.nome}</div>
        </div>
        <select value={dias} onChange={e => setDias(Number(e.target.value))}
          style={{ border:"1px solid "+C.line, borderRadius:8, padding:"6px 10px", fontSize:13, background:C.paper, color:C.ink }}>
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
          <option value={9999}>Tudo</option>
        </select>
      </div>

      {erro && (
        <div style={{ marginBottom:10, fontSize:13, color:C.clay, background:"#FBEAE3",
          border:"1px solid "+C.clay, borderRadius:8, padding:"8px 10px" }}>{erro}</div>
      )}

      {porDia.length === 0 && (
        <div style={{ fontSize:13, color:C.muted, padding:"20px 0", textAlign:"center" }}>
          Nenhum registro dessa equipe ainda.
        </div>
      )}

      {porDia.map(({ data, itens: lista }) => (
        <div key={data} style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <div style={{ height:1, background:C.line, flex:"1 1 auto" }} />
            <span style={{ fontSize:12, color:C.muted, fontWeight:700, background:C.paper,
              border:"1px solid "+C.line, borderRadius:20, padding:"2px 12px" }}>
              {fmtData(data)}
            </span>
            <div style={{ height:1, background:C.line, flex:"1 1 auto" }} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {lista.map(i => (
              <ItemCard key={i.id} item={i} sessao={sessao} usuarios={usuarios}
                podeEscrever={podeEscrever} recarregar={recarregar} onErro={setErro} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
