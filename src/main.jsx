import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./style.css";

import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";

import { initRevenueCat } from "./revenuecat/purchases";

async function initNativeStuff() {
  if (Capacitor.getPlatform() === "ios") {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (e) {
      console.warn("StatusBar plugin not ready:", e);
    }
  }

  // initialize RevenueCat on native platforms //
  try {
    await initRevenueCat();
  } catch (err) {
    console.error("RevenueCat init failed:", err);
  }
}

// run once on startup //
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
