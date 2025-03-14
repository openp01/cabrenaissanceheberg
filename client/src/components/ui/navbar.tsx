import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { Calendar, ClipboardList, CreditCard, LogOut, User, Menu, Settings, Users } from "lucide-react";

export function Navbar() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  // Fonction pour gérer la déconnexion
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Obtenir le nom d'affichage en fonction du rôle
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return "Administrateur";
      case UserRole.SECRETARIAT:
        return "Secrétariat";
      case UserRole.THERAPIST:
        return "Thérapeute";
      default:
        return role;
    }
  };

  // Déterminer si un lien est actif
  const isActive = (path: string) => location === path;
  
  // Afficher un bouton de déconnexion directement si l'utilisateur est connecté
  if (user) {
    console.log("Navbar: Utilisateur connecté", user);
  } else {
    console.log("Navbar: Aucun utilisateur connecté");
  }

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      {/* Logo et titre */}
      <div className="flex items-center space-x-2">
        <Link href="/">
          <span className="text-xl font-bold text-primary cursor-pointer">
            Centre d'Orthophonie
          </span>
        </Link>
      </div>

      {/* Navigation principale - affichée si l'utilisateur est connecté */}
      {user && (
        <div className="flex items-center space-x-4 ml-4">
          <Link href="/appointments">
            <Button
              variant={isActive("/appointments") ? "default" : "secondary"}
              className="flex items-center font-bold"
              size="lg"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Rendez-vous
            </Button>
          </Link>
          
          <Link href="/schedule">
            <Button
              variant={isActive("/schedule") ? "default" : "secondary"}
              className="flex items-center font-bold"
              size="lg"
            >
              <ClipboardList className="mr-2 h-5 w-5" />
              Planning
            </Button>
          </Link>

          {/* Afficher ces liens uniquement pour le personnel administratif */}
          {(user.role === UserRole.ADMIN || user.role === UserRole.SECRETARIAT) && (
            <>
              <Link href="/invoices">
                <Button
                  variant={isActive("/invoices") ? "default" : "secondary"}
                  className="flex items-center font-bold"
                  size="lg"
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Factures
                </Button>
              </Link>

              <Link href="/payments">
                <Button
                  variant={isActive("/payments") ? "default" : "secondary"}
                  className="flex items-center font-bold"
                  size="lg"
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Paiements
                </Button>
              </Link>
            </>
          )}
          
          {/* Lien vers le profil utilisateur */}
          <Link href="/profile">
            <Button
              variant={isActive("/profile") ? "default" : "primary"}
              className="flex items-center font-bold"
              size="lg"
            >
              <Settings className="mr-2 h-5 w-5" />
              Profil
            </Button>
          </Link>
          
          {/* Lien vers la gestion des utilisateurs (admin uniquement) */}
          {user.role === UserRole.ADMIN && (
            <Link href="/admin/users">
              <Button
                variant={isActive("/admin/users") ? "default" : "primary"}
                className="flex items-center font-bold"
                size="lg"
              >
                <Users className="mr-2 h-5 w-5" />
                Utilisateurs
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Profil utilisateur ou bouton de connexion */}
      <div className="flex items-center space-x-2">
        {user ? (
          <>
            <Link href="/logout">
              <Button variant="destructive" className="flex items-center">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  {user.username}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {user.username}
                  <div className="text-xs text-muted-foreground">
                    {getRoleDisplayName(user.role)}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/profile")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Mon profil
                </DropdownMenuItem>
                
                {/* Option admin pour gérer les utilisateurs */}
                {user.role === UserRole.ADMIN && (
                  <DropdownMenuItem onClick={() => setLocation("/admin/users")}>
                    <Users className="mr-2 h-4 w-4" />
                    Gestion des utilisateurs
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Link href="/auth">
            <Button variant="ghost" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              Connexion
            </Button>
          </Link>
        )}

        {/* Menu mobile */}
        <div className="block md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {user ? (
                <>
                  <DropdownMenuItem onClick={() => setLocation("/appointments")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Rendez-vous
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/schedule")}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Planning
                  </DropdownMenuItem>
                  
                  {/* Options admin */}
                  {(user.role === UserRole.ADMIN || user.role === UserRole.SECRETARIAT) && (
                    <>
                      <DropdownMenuItem onClick={() => setLocation("/invoices")}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Factures
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation("/payments")}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Paiements
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/profile")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Mon profil
                  </DropdownMenuItem>
                  
                  {/* Option admin pour gérer les utilisateurs */}
                  {user.role === UserRole.ADMIN && (
                    <DropdownMenuItem onClick={() => setLocation("/admin/users")}>
                      <Users className="mr-2 h-4 w-4" />
                      Gestion des utilisateurs
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => setLocation("/auth")}>
                  <User className="mr-2 h-4 w-4" />
                  Connexion
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}