<h1 align="center">
	<br>
	<img src="assest/AppiumInstaller-Logo.jpg" alt="Appium Installer">
	<br>
	<br>
</h1>

<p align="center">
  <b>Your one-stop CLI for setting up Appium 2.0</b>
  <br>
  Install the server, drivers, plugins, configure environments, manage devices — all from a single interactive menu.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/appium-installer"><img src="https://img.shields.io/npm/v/appium-installer.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/appium-installer"><img src="https://img.shields.io/npm/dm/appium-installer.svg" alt="npm downloads"></a>
  <a href="https://github.com/AppiumTestDistribution/appium-installer/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/appium-installer.svg" alt="license"></a>
</p>

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Features](#features)
  - [Quick Setup Profiles](#quick-setup-profiles)
  - [Install Appium Server](#install-appium-server)
  - [Install Appium Drivers](#install-appium-drivers)
  - [Install Appium Plugins](#install-appium-plugins)
  - [Setup Android Environment](#setup-android-environment)
  - [Setup iOS Environment](#setup-ios-environment)
  - [Run Appium Doctor](#run-appium-doctor)
  - [Environment Status Dashboard](#environment-status-dashboard)
  - [Check for Updates](#check-for-updates)
  - [Launch Emulators / Simulators](#launch-emulators--simulators)
  - [Device Manager](#device-manager)
- [Platform Support](#platform-support)
- [Local Development](#local-development)
- [Contributing](#contributing)
- [License](#license)

---

## Prerequisites

- **Node.js 16** or later

## Installation

```bash
npm install -g appium-installer
```

## Quick Start

Run the installer:

```bash
appium-installer
```

An interactive menu appears with everything you need:

```
    ╔═╗ ╔═╗ ╔═╗ ╦ ╦ ╔╦╗
    ╠═╣ ╠═╝ ╠═╝ ║ ║ ║║║
    ╩ ╩ ╩   ╩   ╩ ╚═╝╩ ╩
    ╦ ╔╗╔ ╔═╗ ╔╦╗ ╔═╗ ╦  ╦  ╔═╗ ╦═╗
    ║ ║║║ ╚═╗  ║  ╠═╣ ║  ║  ║╣  ╠╦╝
    ╩ ╝╚╝ ╚═╝  ╩  ╩ ╩ ╩═╝╩═╝╚═╝ ╩╚═

  What would you like to do?
  ❯ Setup Android Environment
    Setup iOS Environment
    Quick Setup Profiles
    ────── Install & Configure ──────
    Install Appium Server
    Install Appium Drivers
    Install Appium Plugins
    ────── Diagnostics & Tools ──────
    Run Appium Doctor
    Show Environment Status
    Check for Updates
    ────── Devices ─────────────────
    Launch Emulators/Simulators
    Device Manager
    Exit
```

Navigate with arrow keys, press Enter to select. The menu loops until you choose **Exit**, so you can perform multiple tasks in a single session.

---

## Features

### Quick Setup Profiles

Get a fully working Appium environment in one step. Pick a profile and the installer handles the rest — server, drivers, environment setup, and diagnostics.

| Profile | What it installs |
|---------|-----------------|
| **Android Testing** | Appium Server (latest) + UiAutomator2 driver + Android environment + Appium Doctor |
| **iOS Testing** | Appium Server (latest) + XCUITest driver + iOS environment + Appium Doctor *(macOS only)* |
| **Full Mobile Testing** | Everything above — Android + iOS combined (adapts to your OS) |
| **Web on Mobile** | Appium Server (latest) + Chromium driver + Gecko driver |

Each profile runs step-by-step with progress indicators and a summary at the end showing which steps passed or failed.

---

### Install Appium Server

Install the Appium 2.0 server globally via npm. You get two options:

- **Latest version** — installs the most recent stable release
- **Custom version** — enter a specific version number (validated against the npm registry)

```
? Choose your version:
  ❯ Select latest Server version
    Select custom Server version
```

---

### Install Appium Drivers

Install one or more official Appium 2.0 drivers. The tool fetches the list of available drivers from your Appium installation and presents them as checkboxes.

Supported drivers include:

- `uiautomator2` — Android UIAutomator2
- `xcuitest` — iOS XCUITest
- `espresso` — Android Espresso
- `safari` — Safari (iOS)
- `gecko` — Firefox / Gecko
- `chromium` — Chrome / Chromium
- `mac2` — macOS

For each selected driver you choose between **latest** or a **custom version** (validated against the driver's npm package).

---

### Install Appium Plugins

Select from 13 community and official plugins:

- `appium-device-farm`
- `appium-wait-plugin`
- `appium-dashboard`
- `appium-gestures-plugin`
- `appium-reporter-plugin`
- `@appium/images-plugin`
- `@appium/relaxed-caps-plugin`
- `@appium/execute-driver-plugin`
- `appium-element-flash`
- `appium-ocr-plugin`
- `appium-altunity-plugin`
- `appium-ddlog-plugin`
- `appium-otel-plugin`

**Installation sources:**

| Source | Description |
|--------|-------------|
| `npm` | Install from npm registry (default) |
| `github` | Install from a GitHub repository |
| `git` | Install from any git URL |
| `local` | Install from a local file path |

If a selected plugin is already installed, the tool checks for updates and applies them automatically.

---

### Setup Android Environment

Uses `@nightwatch/mobile-helper` to walk you through configuring:

- Android SDK
- Java / JDK
- Environment variables (`ANDROID_HOME`, `JAVA_HOME`)
- Android emulators

Works on macOS, Windows, and Linux.

---

### Setup iOS Environment

*(macOS only)*

Configures everything needed for iOS testing:

- Xcode and Xcode Command Line Tools
- iOS Simulators
- Real device dependencies

---

### Run Appium Doctor

Runs the built-in `appium-doctor` diagnostics for your chosen platform:

```
? Select platform:
  ❯ android
    ios
    dev
```

- **android** — checks Android SDK, Java, `ANDROID_HOME`, ADB, etc.
- **ios** — checks Xcode, simulators, WebDriverAgent, Carthage, etc.
- **dev** — general developer environment checks

---

### Environment Status Dashboard

A single-screen health check that shows everything at a glance:

- **System** — Appium Server, Node.js, Java, and Xcode versions
- **Environment Variables** — `ANDROID_HOME` and `JAVA_HOME` status
- **Installed Drivers** — names and versions
- **Installed Plugins** — names and versions
- **Connected Devices** — Android devices via ADB and booted iOS simulators
- **Health bar** — overall pass/fail count (e.g. `6/7 checks passing`)

---

### Check for Updates

Scans your installed Appium components and tells you what's outdated:

- Appium Server
- All installed drivers
- All installed plugins

You can interactively confirm which updates to apply.

---

### Launch Emulators / Simulators

Quickly boot an emulator or simulator without leaving the terminal:

- Lists all available Android AVDs and iOS simulators
- Select one and it launches in the background
- Platform-aware: on macOS you see both Android and iOS options; on Windows/Linux, Android only

---

### Device Manager

A full device control panel with a persistent loop:

```
  📱  Device Manager
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ● 2 running   ○ 3 available   |   Android 3   iOS 2

  #   Name                Platform   OS     Status     ID
  ─────────────────────────────────────────────────────────
  1   Pixel_7             Android    -      ● Online    emulator-5554
  2   iPhone 15 Pro       iOS        17.2   ● Booted    A1B2C3D4...
  3   Pixel_6a            Android    -      ○ Ready     -
  ...
```

**Actions:**

- **Launch a device** — boot a stopped emulator or simulator
- **Shutdown a device** — stop a running emulator or simulator
- **Launch multiple devices** — select several devices to boot at once
- **Refresh** — rescan for device changes
- **Back** — return to the main menu

---

## Platform Support

| Feature | macOS | Windows | Linux |
|---------|:-----:|:-------:|:-----:|
| Install Appium Server | Yes | Yes | Yes |
| Install Drivers & Plugins | Yes | Yes | Yes |
| Setup Android Environment | Yes | Yes | Yes |
| Setup iOS Environment | Yes | -- | -- |
| Android Emulators | Yes | Yes | Yes |
| iOS Simulators | Yes | -- | -- |
| Device Manager | Yes | Yes* | Yes* |
| Quick Setup — Android | Yes | Yes | Yes |
| Quick Setup — iOS | Yes | -- | -- |
| Quick Setup — Full Mobile | Yes (Android + iOS) | Android only | Android only |

*\* Android devices only on Windows/Linux*

---

## Local Development

```bash
# Clone and install dependencies
git clone https://github.com/AppiumTestDistribution/appium-installer.git
cd appium-installer
npm install

# Build and link
npm run build
npm link

# Now you can run
appium-installer
```

**Available scripts:**

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile `src/` to `dist/` via Babel |
| `npm run clean` | Remove `dist/`, `coverage/`, and `.tmp/` |
| `npm run prettier` | Format source files with Prettier |

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on the [GitHub repository](https://github.com/AppiumTestDistribution/appium-installer).

## License

ISC
