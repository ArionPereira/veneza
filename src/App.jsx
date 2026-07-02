import React from "react";
const { useState } = React;

import { Hub } from "./Hub.jsx";
import { Login } from "./acesso.jsx";
import { Restaurante } from "./modules/Restaurante.jsx";
import { PCM } from "./modules/PCM/PCM.jsx";
import { Pluviometria } from "./modules/operacionais/Pluviometria.jsx";
import { Abastecimento } from "./modules/operacionais/Abastecimento.jsx";
import { Almoxarifado } from "./modules/operacionais/Almoxarifado.jsx";
import { Chorei } from "./modules/Chorei/Chorei.jsx";

const RENDERIZADORES = {
  restaurante: props => <Restaurante {...props} />,
  pcm: props => <PCM {...props} />,
  pluviometria: props => <Pluviometria {...props} />,
  abastecimento: props => <Abastecimento {...props} />,
  almoxarifado: props => <Almoxarifado {...props} />,
  chorei: props => <Chorei {...props} />,
};

const carregarSessao = () => {
  try { return JSON.parse(localStorage.getItem("veneza_sessao") || "null"); }
  catch { return null; }
};

export function App() {
  const [sessao, setSessao] = useState(carregarSessao);
  const [modulo, setModulo] = useState(null);

  const entrar = (u) => { localStorage.setItem("veneza_sessao", JSON.stringify(u)); setSessao(u); };
  const sair = () => { localStorage.removeItem("veneza_sessao"); setSessao(null); setModulo(null); };
  const voltarAoHub = () => setModulo(null);

  if (!sessao) return <Login onEntrar={entrar} />;

  const podeVer = (id) => sessao.role === "master" || (sessao.modulos || []).includes(id);

  if (!modulo || !podeVer(modulo)) {
    return <Hub sessao={sessao} onSelect={id => podeVer(id) && setModulo(id)} onSair={sair} podeVer={podeVer} />;
  }
  const render = RENDERIZADORES[modulo];
  return render
    ? render({ nome: sessao.nome, setNome: () => {}, onSair: voltarAoHub, sessao })
    : <Hub sessao={sessao} onSelect={id => podeVer(id) && setModulo(id)} onSair={sair} podeVer={podeVer} />;
}
