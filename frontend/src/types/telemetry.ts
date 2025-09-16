export type CarGPS = { latitude: number; longitude: number };
export type CarIMU = {
  accelerationX: number; accelerationY: number; accelerationZ: number;
  spinX: number; spinY: number; spinZ: number;
  scale_dps: 250 | 500 | 1000 | 2000;
};
export type CarDrive = { pwm?: number; speed_est_mps?: number };

export type ControlsDerived = {
  steering_deg: number;                       // direita + / esquerda -
  steering_side: 'left'|'right'|'straight';
  speed_cmd_byte: number;                     // 0..255
  speed_cmd_pct: number;                      // 0..1
  speed_cmd_mps: number;                      // m/s
  movement_direction_text: 'front'|'back';
};

export type CentricControls = {
  curve_direction: number;                    // 0..360
  speed: number;                              // 0..255
  movement_direction: 0|1;                    // 0=back, 1=front
  derived?: ControlsDerived;
};

export type TelemetryProcessed = {
  ts: number;                                 // epoch ms
  ts_iso: string;                             // "YYYY-MM-DDTHH:MM:SS.mmmZ"
  ts_local: string;                           // "YYYY-MM-DD HH:MM:SS.mmm±HH:MM"
  src?: string;
  car: { gps?: CarGPS; imu?: CarIMU; drive?: CarDrive };
  centric: { controls: CentricControls };
};

export type TelemetryRaw = {
  received_at: number;
  src?: string;
  raw: {
    car: { gps?: CarGPS; imu?: CarIMU; drive?: CarDrive };
    centric: { controls: Omit<CentricControls, "derived"> };
    src?: string;
  };
};
