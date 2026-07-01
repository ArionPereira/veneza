import React from "react";
const { useState } = React;

import { ModalNome } from "./ui.jsx";
import { Hub } from "./Hub.jsx";
import { Restaurante } from "./modules/Restaurante.jsx";
import { PCM } from "./modules/PCM/PCM.jsx";
import { Pluviometria } from "./modules/operacionais/Pluviometria.jsx";
import { Abastecimento } from "./modules/operacionais/Abastecimento.jsx";
import { Almoxarifado } from "./modules/operacionais/Almoxarifado.jsx";

const RENDERIZADORES = {
  restaurante: props => <Restaurante {...props} />,
  pcm: props => <PCM {...props} />,
  pluviometria: props => <Pluviometria {...props} />,
  abastecimento: props => <Abastecimento {...props} />,
  almoxarifado: props => <Almoxarifado {...props} />,
};

const SEM_NOME_GLOBAL = { pcm: true };

export function App() {
  const [modulo, setModulo] = useState(null);
  const [nome, setNome] = useState(localStorage.getItem("refeitorio_nome") || "");
  const [pedirNome, setPedirNome] = useState(false);

  const escolher = id => {
    setModulo(id);
    if (!SEM_NOME_GLOBAL[id] && !nome) setPedirNome(true);
  };
  const confirmarNome = v => {
    localStorage.setItem("refeitorio_nome", v);
    setNome(v);
    setPedirNome(false);
  };
  const voltarAoHub = () => setModulo(null);

  if (!modulo) return <Hub onSelect={escolher} nome={nome} />;
  if (!SEM_NOME_GLOBAL[modulo] && (pedirNome || !nome)) {
    return <ModalNome onOk={confirmarNome} onVoltar={voltarAoHub} />;
  }
  const render = RENDERIZADORES[modulo];
  return render ? render({ nome, setNome, onSair: voltarAoHub }) : <Hub onSelect={escolher} nome={nome} />;
}
