import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteProps } from "wouter";

interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType;
  roles?: string[]; // Rôles autorisés pour accéder à cette route
}

export function ProtectedRoute({
  path,
  component: Component,
  roles,
  ...rest
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route
        path={path}
        {...rest}
        component={() => (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      />
    );
  }

  // Vérifier si l'utilisateur est authentifié
  if (!user) {
    return (
      <Route
        path={path}
        {...rest}
        component={() => <Redirect to="/auth" />}
      />
    );
  }

  // Vérifier les rôles si spécifiés
  if (roles && !roles.includes(user.role)) {
    return (
      <Route
        path={path}
        {...rest}
        component={() => (
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-2xl font-bold text-red-500 mb-4">
              Accès refusé
            </h1>
            <p className="text-center text-gray-600">
              Vous n'avez pas les autorisations nécessaires pour accéder à cette page.
            </p>
          </div>
        )}
      />
    );
  }

  // Si toutes les vérifications sont passées, rendre le composant
  return <Route path={path} component={Component} {...rest} />;
}