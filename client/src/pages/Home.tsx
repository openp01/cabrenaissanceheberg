import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, FileText, WalletIcon, Plus, List, LineChart } from "lucide-react";

export default function Home() {
  const [location, setLocation] = useLocation();
  
  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
                Centre d'Orthophonie
              </h1>
              <p className="text-gray-600 mt-1">
                Système de gestion pour le secrétariat
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Navigation Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Rendez-vous Card */}
          <Card className="overflow-hidden transition-all hover:shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Rendez-vous</CardTitle>
                <CalendarDays className="h-8 w-8 text-blue-100" />
              </div>
              <CardDescription className="text-blue-100">
                Gérer les rendez-vous des patients
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Planifiez de nouveaux rendez-vous et gérez le calendrier des consultations.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                className="w-full" 
                onClick={() => handleNavigation("/")}
                variant="default"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau rendez-vous
              </Button>
              <Button 
                className="w-full" 
                onClick={() => handleNavigation("/appointments")}
                variant="outline"
              >
                <List className="h-4 w-4 mr-2" />
                Liste des rendez-vous
              </Button>
            </CardFooter>
          </Card>
          
          {/* Emploi du temps Card */}
          <Card className="overflow-hidden transition-all hover:shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Emploi du temps</CardTitle>
                <Clock className="h-8 w-8 text-green-100" />
              </div>
              <CardDescription className="text-green-100">
                Planning des orthophonistes
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Consultez et organisez l'emploi du temps des thérapeutes du centre.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => handleNavigation("/schedule")}
                variant="default"
              >
                <Clock className="h-4 w-4 mr-2" />
                Voir l'emploi du temps
              </Button>
            </CardFooter>
          </Card>
          
          {/* Factures Card */}
          <Card className="overflow-hidden transition-all hover:shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Factures</CardTitle>
                <FileText className="h-8 w-8 text-purple-100" />
              </div>
              <CardDescription className="text-purple-100">
                Gestion des factures clients
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Accédez aux factures, téléchargez-les au format PDF et envoyez-les par email.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => handleNavigation("/invoices")}
                variant="default"
              >
                <FileText className="h-4 w-4 mr-2" />
                Gérer les factures
              </Button>
            </CardFooter>
          </Card>
          
          {/* Dépenses Card */}
          <Card className="overflow-hidden transition-all hover:shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Dépenses</CardTitle>
                <WalletIcon className="h-8 w-8 text-amber-100" />
              </div>
              <CardDescription className="text-amber-100">
                Suivi des dépenses du cabinet
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Enregistrez et suivez les dépenses du cabinet avec justificatifs.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                className="w-full" 
                onClick={() => handleNavigation("/expenses/new")}
                variant="default"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle dépense
              </Button>
              <Button 
                className="w-full" 
                onClick={() => handleNavigation("/expenses")}
                variant="outline"
              >
                <LineChart className="h-4 w-4 mr-2" />
                Suivi des dépenses
              </Button>
            </CardFooter>
          </Card>
          
        </div>
        
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>© 2025 Centre d'Orthophonie - Système de gestion</p>
        </div>
      </main>
    </div>
  );
}
