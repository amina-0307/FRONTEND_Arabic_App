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
    await initRevenueCat();
  }
}

(async () => {
  try {
    await initNativeStuff(); // waits until RevenueCat is configured //
  } catch (e) {
    console.error("Native init failed:", e);
  }

  // start native init //
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();
