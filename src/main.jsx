import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App";
import "./index.css";


const qc = new QueryClient();


ReactDOM.createRoot(document.getElementById("root")).render(
<React.StrictMode>
<QueryClientProvider client={qc}>
<AuthProvider>
<BrowserRouter>
<App />
</BrowserRouter>
</AuthProvider>
</QueryClientProvider>
</React.StrictMode>
);