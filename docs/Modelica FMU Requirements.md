# Uploading Modelica / FMU models to Alfalfa

Alfalfa can run Functional Mock-up Units (FMUs) through its **modelica** job path.
This document describes what an FMU must look like to upload **and run**
successfully, and how to prepare FMUs exported from Modelica tools (e.g.
OpenModelica, Dymola, the _FMU Compilation Workbench_) so they are compatible.

## How Alfalfa handles an FMU

1. **Upload / submit.** A file whose name ends in `.fmu` is routed to the
   modelica job by extension. `alfalfa_worker/jobs/modelica/create_run.py` simply
   copies the uploaded file to `model.fmu` and marks the run `READY`. **No FMU
   validation happens at upload time**, so an upload appearing to "succeed" does
   _not_ guarantee the model will run.
2. **Run start.** When the run is started,
   `alfalfa_worker/jobs/modelica/step_run.py` → `initialize_simulation()` loads the
   FMU with `pyfmi.load_fmu` (via `alfalfa_worker/lib/testcase.py::TestCase`) and
   `setup_points()` creates Alfalfa `Point` records:
   - **INPUT** points from variables with causality `input`.
   - **OUTPUT** points from variables with causality `output`.

If loading or metadata extraction fails, the run goes to `ERROR` at start —
which typically looks like "the FMU didn't upload" from the UI.

## Requirements

An FMU must satisfy **all** of the following to run in Alfalfa:

| Requirement           | Detail                                                                                                                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FMI version**       | `2.0`. Alfalfa rejects other versions (`TestCase` raises `FMU must be version 2.0.`).                                                                                                                                              |
| **FMI kind**          | **Co-Simulation** (the FMU must contain a `<CoSimulation>` element). Model-Exchange-only FMUs are not supported.                                                                                                                   |
| **Platform binaries** | The FMU must contain binaries for the **worker runtime platform, `linux64`** (`binaries/linux64/`). The worker runs inside a Linux container, so `darwin64`/`win64`-only FMUs will fail to load even if they work on your desktop. |
| **Inputs**            | Variables you want to drive must have causality `input`.                                                                                                                                                                           |
| **Outputs**           | Variables you want to read must have causality `output`.                                                                                                                                                                           |

### Points and naming conventions

- **Plain FMUs are supported.** A variable named `T_in` (causality `input`) becomes
  an INPUT point named `T_in`; `Q_flow` (causality `output`) becomes an OUTPUT
  point named `Q_flow`. You do **not** have to follow the BOPTEST convention to
  get points.
- **BOPTEST overwrite convention (optional).** If an input is named
  `<name>_activate` it is treated as the enable flag for a paired `<name>_u`
  value input (only the `_u` input becomes a point; the `_activate` flag is set
  automatically during `advance`). Outputs are conventionally named `<name>_y`.
  Use this only if you specifically want BOPTEST-style overwrite semantics.

### Optional resources

- **`resources/kpis.json`** (inside the FMU zip). BOPTEST-wrapped FMUs embed a
  `resources/kpis.json` (and optional `resources/*.csv` forecast/price/weather
  data). Alfalfa now **tolerates its absence** (it proceeds with an empty KPI
  definition), but if you want KPI calculations or forecast data you must embed
  these files under `resources/` inside the FMU.
- **Units / min / max.** BOPTEST FMUs declare a `unit` (and often min/max) on
  every I/O variable. Alfalfa now **tolerates missing** unit/min/max/description
  (common for dimensionless control signals such as a `0..1` valve command).

## Preparing _FMU Compilation Workbench_ models

The workbench exports FMI 2.0 Co-Simulation FMUs with `linux64` binaries and
**plain** physical I/O (e.g. `BoilerPolynomial_FMU`: inputs `T_in`, `m_flow`,
`u`; outputs `Q_flow`, `T_out`). These are valid and, with current Alfalfa, run
directly: they upload, reach `READY`, start `RUNNING`, and produce INPUT/OUTPUT
points.

Two things to keep in mind:

1. **Build for `linux64`.** Ensure the FMU embeds `binaries/linux64/*.so` (the
   workbench `output/build-linux64` target). macOS/Windows-only binaries will not
   load in the worker.
2. **Provide meaningful inputs / start values.** These are single-component
   "two-port" wrappers. Run with zero/default inputs and the underlying Modelica
   component may hit physical assertions (e.g. `T >= 1 K`). Drive the inputs
   (`T_in`, `m_flow`, `u`, …) with realistic values via the Alfalfa client.

If you want KPI reporting, add a `resources/kpis.json` inside the FMU zip
(minimally `{}`); otherwise it is not required.

## Historical note: two BOPTEST-only assumptions that used to block plain FMUs

Earlier versions of `TestCase`/`Data_Manager` assumed every FMU was a
BOPTEST-wrapped model and would raise before the run could start when:

1. `resources/kpis.json` was missing from the FMU zip
   (`KeyError: 'resources/kpis.json'`), and
2. any non-`_activate` I/O variable had no declared `unit`
   (`FMUException: No unit was found for the variable ...`).

Both are now handled gracefully, so plain OpenModelica FMUs run without needing
to be re-wrapped BOPTEST-style.
