import React from "react";
import { FormControlLabel, Switch } from "@mui/material";

type Props = { live: boolean; onChange: (live: boolean) => void };

export default function LiveToggle({ live, onChange }: Props) {
  return (
    <FormControlLabel
      control={<Switch checked={live} onChange={(e) => onChange(e.target.checked)} />}
      label={live ? "Ao vivo" : "Pausado"}
    />
  );
}
