import React from "react";
const { useState } = React;

import { ModalNome } from "./ui.jsx";
import { Hub } from "./Hub.jsx";
import { Restaurante } from "./modules/Restaurante.jsx";
import { PCM } from "./modules/PCM/PCM.jsx";

// Registro de módulos renderizáveis do hub.
const RENDERIZADORES = {
  restaurante: (props) => <Restaurante {...props} />,
  pcm:         (props) => <PCM {...props} />,
};

export function App() {
  const [modulo,    setModulo]    = useState(null);
  const [nome,      setNome]      = useState(localStorage.getItem("refeitorio_nome") || "");
  const [pedirNome, setPedirNome] = useState(false);

  // Escolha de módulo no hub → pede nome se ainda não tiver, depois entra.
  const escolher = (id) => {
    setModulo(id);
    if (!nome) setPedirNome(true);
  };

  const confirmarNome = (v) => {
    localStorage.setItem("refeitorio_nome", v);
    setNome(v);
    setPedirNome(false);
  };

  const voltarAoHub = () => { setModulo(null); };

  // Página inicial: escolha do módulo.
  if (!modulo) return <Hub onSelect={escolher} nome={nome} />;

  // Pede o nome antes de acessar o módulo (sem senha, inicialmente).
  if (pedirNome || !nome) {
    return <ModalNome onOk={confirmarNome} onVoltar={voltarAoHub} />;
  }

  const render = RENDERIZADORES[modulo];
  if (!render) return <Hub onSelect={escolher} nome={nome} />;
  return render({ nome, setNome, onSair: voltarAoHub });
}
