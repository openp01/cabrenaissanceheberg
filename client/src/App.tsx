import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import AppointmentList from "@/pages/AppointmentList";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/appointments" component={AppointmentList} />
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
