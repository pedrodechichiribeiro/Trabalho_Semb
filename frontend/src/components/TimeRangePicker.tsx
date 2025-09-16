import React from "react";
import { Box, ToggleButtonGroup, ToggleButton } from "@mui/material";

type Props = {
  value: number; // minutos
  onChange: (min: number) => void;
};

export default function TimeRangePicker({ value, onChange }: Props) {
  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
      <ToggleButtonGroup
        size="small"
        value={value}
        exclusive
        onChange={(_, v) => v && onChange(v)}
      >
        {[5, 10, 30, 60].map((m) => (
          <ToggleButton key={m} value={m}>{m} min</ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
