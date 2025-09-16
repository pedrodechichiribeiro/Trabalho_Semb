import React, { useMemo } from "react";
import { Box, Container } from "@mui/material";
import Card from "../components/Card";
import SteeringChart from "../charts/SteeringChart";
import SpeedChart from "../charts/SpeedChart";
import PwmChart from "../charts/PwmChart";
import DirectionChart from "../charts/DirectionChart";
import GpsMap from "../charts/GpsMap";
import ImuSingleChart from "../charts/ImuSingleChart";
import SteeringAngleChart from "../charts/SteeringAngleChart";
import GpsLatLonChart from "../charts/GpsLatLonChart";
import type { TelemetryProcessed } from "../types/telemetry";

function buildSeries(items: TelemetryProcessed[]) {
  const speedCar: [number, number][] = [];
  const speedCmd: [number, number][] = [];
  const pwm: [number, number][] = [];

  const accX: [number, number][] = [];
  const accY: [number, number][] = [];
  const accZ: [number, number][] = [];
  const spinX: [number, number][] = [];
  const spinY: [number, number][] = [];
  const spinZ: [number, number][] = [];

  const steeringAngle: [number, number][] = [];
  const directionFB: [number, number][] = [];

  const gps2d: [number, number][] = [];      // [lon, lat] (para mapa)
  const latLonPairs: [number, number][] = []; // [lat, lon] (para scatter pedido)

  for (const d of items) {
    const ts = d.ts;

    if (d.car.drive?.speed_est_mps != null) speedCar.push([ts, d.car.drive.speed_est_mps]);
    if (d.car.drive?.pwm != null) pwm.push([ts, d.car.drive.pwm]);

    const cmd = d.centric.controls.derived?.speed_cmd_mps;
    if (cmd != null) speedCmd.push([ts, cmd]);

    const imu = d.car.imu;
    if (imu) {
      accX.push([ts, imu.accelerationX]);
      accY.push([ts, imu.accelerationY]);
      accZ.push([ts, imu.accelerationZ]);
      spinX.push([ts, imu.spinX]);
      spinY.push([ts, imu.spinY]);
      spinZ.push([ts, imu.spinZ]);
    }

    const dir = d.centric.controls.movement_direction;
    if (dir != null) directionFB.push([ts, dir]);

    const steering = d.centric.controls.derived?.steering_deg;
    if (steering != null) steeringAngle.push([ts, steering]);

    const gps = d.car.gps;
    if (gps) {
      gps2d.push([gps.longitude, gps.latitude]);
      latLonPairs.push([gps.latitude, gps.longitude]); // << X=lat, Y=lon
    }
  }

  return {
    speedCar,
    speedCmd,
    pwm,
    imu: { accX, accY, accZ, spinX, spinY, spinZ },
    steeringAngle,
    directionFB,
    gps2d,
    latLonPairs,
  };
}

export default function ChartsPage({ items }: { items: TelemetryProcessed[] }) {
  const angleNow = items.at(-1)?.centric.controls.derived?.steering_deg ?? 0;
  const series = useMemo(() => buildSeries(items), [items]);

  return (
    <Box component="section">
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {/* Card principal: Volante (live) */}
        <Card title="Volante" sourceLabel="Central">
          <SteeringChart angleDeg={angleNow} />
        </Card>

        <Box sx={{ mt: 2 }} />

        {/* ===================== GRÁFICOS DO CARRO (2 colunas) ===================== */}
        <Card title="Gráficos do carro">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Card title="Velocidade (m/s)" sourceLabel="Carro">
              <SpeedChart name="Velocidade (m/s)" series={series.speedCar} />
            </Card>

            <Card title="PWM (0–255)" sourceLabel="Carro">
              <PwmChart series={series.pwm} />
            </Card>

            {/* IMU: 1 variável por gráfico */}
            <Card title="IMU — accX" sourceLabel="Carro">
              <ImuSingleChart name="accX" series={series.imu.accX} />
            </Card>
            <Card title="IMU — accY" sourceLabel="Carro">
              <ImuSingleChart name="accY" series={series.imu.accY} />
            </Card>
            <Card title="IMU — accZ" sourceLabel="Carro">
              <ImuSingleChart name="accZ" series={series.imu.accZ} />
            </Card>

            <Card title="IMU — spinX" sourceLabel="Carro">
              <ImuSingleChart name="spinX" series={series.imu.spinX} />
            </Card>
            <Card title="IMU — spinY" sourceLabel="Carro">
              <ImuSingleChart name="spinY" series={series.imu.spinY} />
            </Card>
            <Card title="IMU — spinZ" sourceLabel="Carro">
              <ImuSingleChart name="spinZ" series={series.imu.spinZ} />
            </Card>

            {/* NOVO: scatter X=lat, Y=lon */}
            <Card title="GPS (lat × lon)" sourceLabel="Carro">
              <GpsLatLonChart pairs={series.latLonPairs} />
            </Card>

            {/* Mapa com trilha + último ponto */}
            <Card title="Mapa (GPS)" sourceLabel="Carro" height={360}>
              <GpsMap points={series.gps2d} />
            </Card>
          </Box>
        </Card>

        <Box sx={{ mt: 2 }} />

        {/* ===================== GRÁFICOS DA CENTRAL (2 colunas) ===================== */}
        <Card title="Gráficos da central">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Card title="Vel. Comando (m/s)" sourceLabel="Central">
              <SpeedChart name="Vel. Comando (m/s)" series={series.speedCmd} />
            </Card>

            <Card title="Direção (ângulo, °)" sourceLabel="Central">
              <SteeringAngleChart series={series.steeringAngle} />
            </Card>

            <Card title="Movimento (1=front,0=back)" sourceLabel="Central">
              <DirectionChart series={series.directionFB} />
            </Card>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}
