import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#121E30", color: "#CBD5E1",
              border: "1px solid rgba(16,185,129,0.2)",
              fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
              borderRadius: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            },
            success: { iconTheme: { primary: "#10B981", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#F43F5E", secondary: "#fff" } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);