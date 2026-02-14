import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
//import { registerSW } from 'virtual:pwa-register';

//registerSW({ immediate: true })

const client = new ApolloClient({
  link: new HttpLink({
    //uri: "https://tracking00-production-142e.up.railway.app/api/graphql",
    uri: "http://localhost:8000/api/graphql",
  }),
  cache: new InMemoryCache(),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </StrictMode>,
);
