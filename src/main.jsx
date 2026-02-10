import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./style.css";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";

if (Capacitor.getPlatform() === "ios") {
  async () => {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (e) {
      console.warn("StatusBar plugin not ready:", e);
    }
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
