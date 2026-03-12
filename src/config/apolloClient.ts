import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const typePolicies = {
  SesionTrabajoType: {
    fields: {
      procesoOp: {
        merge(existing: any, incoming: any) {
          return { ...existing, ...incoming };
        },
      },
    },
  },
  ProcesoOpType: {
    fields: {
      sesiones: {
        merge(_existing: any, incoming: any) {
          return { ...incoming };
        },
      },
    },
  },
};

export const createApolloClient = () => {
  return new ApolloClient({
    link: new HttpLink({
      uri:
        import.meta.env.VITE_GRAPHQL_URI ||
        "https://tracking00-production-142e.up.railway.app/api/graphql",
      credentials: "include",
    }),
    cache: new InMemoryCache({
      typePolicies,
    }),
  });
};
