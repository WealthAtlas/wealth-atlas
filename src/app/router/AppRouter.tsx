import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { MainContainer } from '../containers/MainContainer';
import { ImportContainer } from '../containers/import/ImportContainer';
import { DecisionJournalContainer } from '../containers/journal/DecisionJournalContainer';
import { SettingsContainer } from '../containers/settings/SettingsContainer';

export function AppRouter() {
  // Vite exposes the configured base as import.meta.env.BASE_URL; use it for GH Pages routing
  const basename = import.meta.env.BASE_URL || '/';
  return (
    <Router basename={basename}>
      <Routes>
        <Route path="/" element={<MainContainer />} />
        <Route path="/dashboard" element={<MainContainer />} />
        <Route path="/assets" element={<MainContainer />} />
        <Route path="/loans" element={<MainContainer />} />
        <Route path="/expenses" element={<MainContainer />} />
        <Route path="/goals" element={<MainContainer />} />
        <Route path="/import" element={<ImportContainer />} />
        <Route path="/journal" element={<DecisionJournalContainer />} />
        <Route path="/settings" element={<SettingsContainer />} />
      </Routes>
    </Router>
  );
}
