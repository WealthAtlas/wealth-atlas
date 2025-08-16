import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { HomeContainer } from '../containers/HomeContainer';

export function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeContainer />} />
      </Routes>
    </Router>
  );
}
