import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";

createRoot(document.getElementById("root")).render(<App/>);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", ()=>{ navigator.serviceWorker.register("sw.js").catch(function(){}); });
}

window.addEventListener("beforeinstallprompt", function(e) {
  e.preventDefault();
  var b = document.createElement("button");
  b.textContent = "Instalar app";
  b.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;background:#004D94;color:#fff;border:none;border-radius:10px;padding:11px 18px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.22)";
  b.onclick = async function() { b.remove(); e.prompt(); await e.userChoice; };
  document.body.appendChild(b);
});
