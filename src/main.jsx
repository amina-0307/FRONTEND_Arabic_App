import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./style.css";

import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";
import { initRevenueCat } from "./revenuecat/purchases";

async function initNativeStuff() {
  const platform = Capacitor.getPlatform();

  if (platform === "ios") {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (e) {
      console.warn("StatusBar plugin not ready:", e);
    }
  }

  //configure RevenueCat ONCE per app launch (native only) //
  if (platform !== "web") {
    try {
      await initRevenueCat();
    } catch (err) {
      console.error("RevenueCat init failed:", err);
    }
  }
}

// start native init //
initNativeStuff();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
