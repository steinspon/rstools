# PVT Calculator

The **PVT Calculator** solves state changes between two gas states using:

- **Ideal gas mode**: `P1V1/T1 = P2V2/T2`
- **Real gas mode (N2)**: `P1V1/(Z1T1) = P2V2/(Z2T2)`

## What it does

- Solves one unknown among `P1, V1, T1, P2, V2, T2` when the other five are provided.
- Supports unit conversion for pressure, volume, and temperature.
- Supports two gas models:
  - **Real Gas (N2)** (default)
  - **Ideal Gas**
- Includes **Isochoric mode** (`V1 = V2 = 1`) with volume fields hidden.
- Shows a **Pressure vs Temperature** path plot with hover readouts.

## Input behavior

- The auto-calculated field is locked to keep the case mathematically consistent.
- If a user attempts to edit the locked field, a modal offers:
  - **Cancel**
  - **Clear Fields**
- Stepper controls:
  - `V1` and `V2`: step by `1`
  - Other numeric fields: nearest-5 stepping

## Graph behavior

- X-axis: temperature in **Celsius**
- Y-axis: pressure in **bar**
- Endpoints are labeled `P1,T1` and `P2,T2`.
- Path is generated from intermediate sampled states using the selected gas model.

## Where to open it

- Tool page: `rih-pressure.html`
