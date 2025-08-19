import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AssetTypesContainer } from '../containers/AssetTypesContainer';
import { MainContainer } from '../containers/MainContainer';
import { SettingsContainer } from '../containers/SettingsContainer';

export function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainContainer />} />
        <Route path="/dashboard" element={<MainContainer />} />
        <Route path="/assets" element={<MainContainer />} />
        <Route path="/loans" element={<MainContainer />} />
        <Route path="/expenses" element={<MainContainer />} />
        <Route path="/goals" element={<MainContainer />} />
        <Route path="/settings" element={<SettingsContainer />} />
        <Route path="/asset-types" element={<AssetTypesContainer />} />
      </Routes>
    </Router>
  );
}
