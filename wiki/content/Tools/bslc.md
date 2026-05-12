# Barrier Sealing Length Calculator (BSLC)

The **Barrier Sealing Length Calculator (BSLC)** is used to estimate how much bismuth alloy and thermite are needed to achieve a target barrier in an inclined wellbore.

It helps answer questions such as:

- "Do we have enough volume to achieve full radial coverage?"
- "What effective barrier length (mMD) do we get with this volume?"
- "What true vertical thickness (TVT) does that correspond to?"
- "How much thermite mass/length is required for this barrier objective?"

---

## What BSLC is for

BSLC is intended for **design-stage and planning-stage barrier sizing**. It links geometry (diameter and inclination), barrier target basis (volume/mass/length/effective length/TVT), and thermite properties into one consistent calculation set.

Use BSLC when you need to:

- Size a bismuth barrier for a given well geometry.
- Compare design alternatives across inclination.
- Convert between barrier targets and execution quantities (thermite kg or m).
- Check whether a design meets a 500 mmMD benchmark target.

---

## Quick start workflow

1. Open `bslc.html`.
2. In **Geometry**, enter:
   - Borehole diameter (`mm` or `in`)
   - Inclination (`0` to `<90` degrees)
   - Optional interval (blank uses auto interval)
3. In **Calculation Basis**, choose one input basis:
   - Volume
   - Thermite Mass
   - Thermite Length
   - Effective Length
   - TVT
4. In **Thermite**, confirm thermite type and material properties.
5. Review:
   - KPI cards
   - Cross-section plot
   - Calculated values table
   - Inclination sweep table and chart
6. Export PNG/SVG and/or settings JSON for traceability.

---

## Input sections in detail

### 1) Geometry tab

- **Plot Title**: Label used in exports/reporting.
- **Borehole Diameter**: Internal diameter used in geometric calculations.
- **Wellbore Inclination (°)**: Angle from vertical.
- **Wellbore Interval**: Displayed interval in plots; can be auto.

#### Notes

- `0°` means vertical.
- At higher inclination, minimum volume for full radial coverage increases.

### 2) Basis tab (calculation driver)

Only one basis should drive the case at a time:

- **Volume (L)**: Directly enter bismuth alloy volume.
- **Thermite Mass (kg)**: Enter thermite mass; BSLC back-calculates volume and barrier.
- **Thermite Length (m)**: Enter thermite length; BSLC converts to mass then volume.
- **Effective Length (mMD)**: Enter required measured-depth effective barrier length; BSLC back-calculates volume/mass/length.
- **TVT (mTVT)**: Enter required true vertical thickness; BSLC back-calculates effective length and volume/mass/length.

### 3) Thermite tab

- **Thermite Type**: Preset (`THX-3`, `THX-4`) or `Custom`.
- **Thermite Name**: Reporting label.
- **Alloy Density (g/cc)**: Density of produced alloy.
- **Conversion Factor (0-1)**: Alloy produced per thermite mass (ideal yield factor).
- **Loss Factor (0 to <1)**: Fractional process loss.
- **Thermite Density (g/cc)**: Bulk thermite density.
- **Thermite Outer Diameter (mm)**: Used to convert thermite length to volume/mass.

### 4) Setup tab

- **Plot Aspect Ratio**
- **Bismuth fill color**
- **Black export outline toggle**
- **Critical volume outline toggle** (inclined wells)

---

## Core outputs and what they mean

### KPI cards

- **Effective Barrier Length (mMD)**: Along-well effective seal length after full radial coverage condition is met.
- **True Vertical Thickness (mTVT)**: Vertical component of effective barrier.
- **Bismuth Volume (L)**: Total alloy volume represented in current case.
- **Thermite Length Used (m)**
- **Thermite Mass Used (kg)**
- **500 mmMD Requirement (L)**: Volume required to achieve 0.5 mMD effective barrier.

### Calculated values table

Includes:

- Total bismuth volume
- Minimum volume for full radial coverage
- Effective barrier length
- TVT
- Volume required for 500 mmMD
- Bismuth mass
- Thermite mass/length used
- Required thermite mass

### Sweep table and chart

The inclination sweep reports required volume by angle (`0` to `80°`) for:

- Full radial coverage threshold
- 500 mmMD target
- Optional custom effective-length target
- Optional TVT target

---

## Calculation logic (engineering model summary)

Given borehole diameter `D` and inclination `theta`:

- Borehole cross-sectional area:
  - `A = pi * D^2 / 4`
- Low-side wedge length for full radial coverage onset:
  - `W_min = D * tan(theta)`
- Minimum volume for full radial coverage:
  - `V_min = 0.5 * A * W_min`
- Effective barrier length from volume:
  - `L_eff = max(0, (V - V_min) / A)`
- TVT from effective length:
  - `TVT = L_eff * cos(theta)`
- Volume for 500 mmMD benchmark:
  - `V_500 = V_min + A * 0.5`

Thermite/yield relationships:

- Effective yield:
  - `yield_eff = conversion_factor * (1 - loss_factor)`
- Bismuth mass:
  - `m_bismuth = V * rho_alloy`
- Required thermite mass:
  - `m_thermite_required = m_bismuth / yield_eff`
- Thermite volume per meter:
  - `Vt_per_m = pi * OD_thermite^2 / 4`
- Thermite mass from entered thermite length:
  - `m_thermite_from_length = Vt_per_m * L_thermite * rho_thermite`

---

## Recommended usage patterns

### A) You know required barrier target (effective length or TVT)

1. Enter geometry.
2. Choose **Effective Length** or **TVT** basis.
3. Enter target value.
4. Verify required volume and required thermite outputs.
5. Review 500 mmMD comparison margin.

### B) You know available thermite

1. Enter geometry.
2. Choose **Thermite Mass** or **Thermite Length** basis.
3. Enter available thermite quantity.
4. Review resulting effective length and TVT.
5. Check warnings for insufficient full radial coverage.

### C) You know planned bismuth volume

1. Choose **Volume** basis.
2. Enter planned volume.
3. Review effective length, TVT, and thermite demand.

---

## Warnings and validation checks

BSLC flags important issues, including:

- Invalid diameter/inclination ranges.
- Missing active basis input.
- Thermite property incompleteness.
- Inconsistency between entered thermite mass and thermite length.
- Inconsistency between entered thermite values and volume/yield combination.
- Volume below minimum radial coverage threshold (effective length becomes zero).

Treat warnings as design review triggers, not merely UI notices.

---

## Export and data management

BSLC supports:

- **Import/Export settings JSON** for reproducibility.
- **Well plot export** (PNG and SVG).
- **Inclination chart export** (PNG and SVG).

Recommended practice:

- Export settings JSON with every plotted figure used in reporting.
- Keep thermite property assumptions version-controlled with design packages.

---

## Good practice and QA checklist

- Keep all units explicit in review notes.
- Lock one calculation basis at a time; avoid manually forcing multiple conflicting drivers.
- Check that thermite inputs are physically realistic for your system.
- Always compare against:
  - Minimum full radial coverage volume
  - 500 mmMD benchmark volume
- Use the sweep chart to understand inclination sensitivity before finalizing design.

---

## Terminology index (glossary)

### Alloy Density
Density of produced bismuth alloy (`g/cc`), used to convert alloy volume to alloy mass.

### Barrier Length (Effective Barrier Length)
Along-well effective sealing length after full radial coverage is achieved (`mMD`).

### Bismuth Volume
Total alloy volume represented in the case (`L`).

### Calculation Basis
The selected primary input mode (`Volume`, `Thermite Mass`, `Thermite Length`, `Effective Length`, or `TVT`).

### Conversion Factor
Mass conversion ratio from thermite to alloy (before applying loss factor), between `0` and `1`.

### Critical Volume
Minimum volume needed to transition from partial low-side wedge fill to full radial coverage at a given inclination.

### Effective Minimum Sealing Length
Practical minimum effective barrier target used for planning/compliance checks after radial coverage is achieved. In BSLC, the common benchmark is **500 mmMD** effective barrier length.

### Effective Yield
Net conversion from thermite to alloy after losses:
`effective_yield = conversion_factor * (1 - loss_factor)`.

### Full Radial Coverage
State where alloy fills the full cross-sectional radial height; additional alloy then extends effective barrier length.

### Inclination
Well angle from vertical (`0°` is vertical, `<90°` allowed).

### Loss Factor
Fractional loss term (`0` to `<1`) representing inefficiencies/material losses.

### mMD
Meters measured depth (along-well distance).

### mTVT (TVT)
Meters true vertical thickness; vertical component of effective barrier.

### Minimum Volume for Full Radial Coverage
Geometric threshold volume at a given diameter and inclination required before any positive effective barrier length is achieved.

### Thermite Density
Bulk thermite density (`g/cc`), used with thermite OD and length to compute thermite mass.

### Thermite Length Used
Calculated or entered thermite measured length (`m`) corresponding to the case.

### Thermite Mass Used
Calculated or entered thermite mass (`kg`) corresponding to the case.

### Thermite Outer Diameter
Outer diameter of thermite column (`mm`) used in thermite volume-per-meter conversion.

### 500 mmMD Requirement
Required alloy volume to achieve `0.5 mMD` effective barrier length under current geometry assumptions.

