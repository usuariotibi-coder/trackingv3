import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ApolloProvider } from "@apollo/client/react";
import { createApolloClient } from "./config/apolloClient.ts";
//import { registerSW } from 'virtual:pwa-register';

//registerSW({ immediate: true })

const client = createApolloClient();

const root = createRoot(document.getElementById("root")!);

// StrictMode solo en desarrollo para mejor debugging
if (import.meta.env.DEV) {
  const { StrictMode } = await import("react");
  root.render(
    <StrictMode>
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    </StrictMode>,
  );
} else {
  root.render(
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>,
  );
}
