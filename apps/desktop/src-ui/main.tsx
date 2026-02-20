import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "hsl(222, 18%, 14%)",
          color: "hsl(210, 20%, 94%)",
          border: "1px solid hsl(222, 14%, 22%)",
          borderRadius: "0.6rem",
          fontSize: "0.875rem",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        },
        success: {
          iconTheme: { primary: "#10B981", secondary: "#fff" },
        },
        error: {
          iconTheme: { primary: "#EF4444", secondary: "#fff" },
        },
      }}
    />
  </React.StrictMode>,
);
