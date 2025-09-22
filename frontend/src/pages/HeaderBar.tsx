import React from "react";
import { AppBar, Toolbar, Typography, Chip, Stack } from "@mui/material";
import { telemetryLive } from "../store/telemetryLive";

export default function HeaderBar() {
  const connected = telemetryLive.useState((s) => s.connected);
  const paused = telemetryLive.useState((s) => s.paused);

  const status =
    paused ? <Chip label="Pausado" color="warning" size="small" /> :
    connected ? <Chip label="Ao vivo" color="success" size="small" /> :
    <Chip label="Desconectado" size="small" />;

  return (
    <AppBar position="sticky" elevation={1}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Telemetria
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {status}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
