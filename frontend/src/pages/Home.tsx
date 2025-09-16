import React, { useEffect } from "react";
import { CssBaseline } from "@mui/material";
import HeaderBar from "./HeaderBar";
import ChartsPage from "./ChartsPage";
import { telemetryLive } from "../store/telemetryLive";

export default function Home() {
  // Conecta WS ao montar e desconecta ao desmontar
  useEffect(() => {
    telemetryLive.connect();
    return () => telemetryLive.disconnect();
  }, []);

  // Seleciona apenas o array de itens (estável por referência)
  const items = telemetryLive.useState((s) => s.items);

  return (
    <>
      <CssBaseline />
      <HeaderBar />
      <ChartsPage items={items} />
    </>
  );
}
