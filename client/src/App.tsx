import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Home from "./pages/Home";
import AppointmentList from "./pages/AppointmentList";
import TherapistSchedule from "./pages/TherapistSchedule";
import Invoices from "./pages/Invoices";
import Expenses from "./pages/Expenses";
import ExpenseForm from "./pages/ExpenseForm";
import ExpenseDetails from "./pages/ExpenseDetails";
import TherapistPayments from "./pages/TherapistPayments";
import TherapistPaymentDetails from "./pages/TherapistPaymentDetails";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/appointments" component={AppointmentList} />
      <Route path="/schedule" component={TherapistSchedule} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/expenses/new" component={ExpenseForm} />
      <Route path="/expenses/:id" component={ExpenseDetails} />
      <Route path="/therapist-payments" component={TherapistPayments} />
      <Route path="/therapist-payments/:id" component={TherapistPaymentDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50">
      <Router />
      <Toaster />
    </div>
  );
}

export default App;
