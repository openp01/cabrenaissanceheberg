import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Home from "./pages/Home";
import AppointmentList from "./pages/AppointmentList";
import TherapistSchedule from "./pages/TherapistSchedule";
import Invoices from "./pages/Invoices";
import Expenses from "./pages/Expenses";
import ExpenseForm from "./pages/ExpenseForm";
import ExpenseDetails from "./pages/ExpenseDetails";
import EditExpenseForm from "./pages/EditExpenseForm";
import Payments from "./pages/Payments";
import NotFound from "./pages/not-found";
import AuthPage from "./pages/auth-page";
import LogoutPage from "./pages/logout-page";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { UserRole } from "@shared/schema";

function Router() {
  return (
    <Switch>
      {/* Routes d'authentification - accessibles à tous */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/logout" component={LogoutPage} />
      
      {/* Routes protégées - requiert authentification */}
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/appointments" component={AppointmentList} />
      
      {/* Route pour les thérapeutes et le personnel administratif */}
      <ProtectedRoute 
        path="/schedule" 
        component={TherapistSchedule} 
        roles={[UserRole.THERAPIST, UserRole.SECRETARIAT, UserRole.ADMIN]} 
      />
      
      {/* Routes pour le personnel administratif uniquement */}
      <ProtectedRoute 
        path="/invoices" 
        component={Invoices} 
        roles={[UserRole.SECRETARIAT, UserRole.ADMIN]} 
      />
      <ProtectedRoute 
        path="/expenses" 
        component={Expenses} 
        roles={[UserRole.SECRETARIAT, UserRole.ADMIN]} 
      />
      <ProtectedRoute 
        path="/expenses/new" 
        component={ExpenseForm} 
        roles={[UserRole.SECRETARIAT, UserRole.ADMIN]} 
      />
      <ProtectedRoute 
        path="/expenses/edit/:id" 
        component={EditExpenseForm} 
        roles={[UserRole.SECRETARIAT, UserRole.ADMIN]} 
      />
      <ProtectedRoute 
        path="/expenses/:id" 
        component={ExpenseDetails} 
        roles={[UserRole.SECRETARIAT, UserRole.ADMIN]} 
      />
      <ProtectedRoute 
        path="/payments" 
        component={Payments} 
        roles={[UserRole.SECRETARIAT, UserRole.ADMIN]} 
      />
      
      {/* Route 404 - accessible à tous */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col font-sans bg-gray-50">
        <Router />
        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;
